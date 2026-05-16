'use strict';

const { chat }   = require('../../utils/gemini');
const { pool }   = require('../../db');

// ─────────────────────────────────────────────────────────────
// FUTURE SELF PERSONA OLUŞTUR
// ─────────────────────────────────────────────────────────────
const buildPersona = async (userId) => {
  // 1. Kullanıcı profili
  const userResult = await pool.query(
    'SELECT name, age, monthly_income FROM users WHERE id = $1',
    [userId]
  );
  const user = userResult.rows[0];

  // 2. Paternler
  const patternResult = await pool.query(
    `SELECT description FROM patterns
     WHERE user_id = $1
     ORDER BY detected_at DESC LIMIT 5`,
    [userId]
  );

  // 3. Son raporlar
  const reportResult = await pool.query(
    `SELECT month, year, betrayal_score, analysis
     FROM reports
     WHERE user_id = $1
     ORDER BY year DESC, month DESC LIMIT 3`,
    [userId]
  );

  // 4. Ortalama harcama
  const spendResult = await pool.query(
    `SELECT 
       AVG(monthly_total) AS avg_monthly_spend,
       MAX(monthly_total) AS max_monthly_spend
     FROM (
       SELECT 
         EXTRACT(YEAR FROM date)  AS y,
         EXTRACT(MONTH FROM date) AS m,
         SUM(amount) AS monthly_total
       FROM transactions
       WHERE user_id = $1 AND type = 'debit'
       GROUP BY y, m
     ) monthly`,
    [userId]
  );

  const avgSpend      = parseFloat(spendResult.rows[0]?.avg_monthly_spend || 0);
  const monthlyIncome = parseFloat(user?.monthly_income || 0);
  const monthlySaving = monthlyIncome - avgSpend;
  const avgBetrayal   = reportResult.rows.length > 0
    ? reportResult.rows.reduce((s, r) => s + parseFloat(r.betrayal_score), 0) / reportResult.rows.length
    : 70;

  return {
    user,
    avgSpend,
    monthlyIncome,
    monthlySaving,
    avgBetrayal,
    patterns: patternResult.rows.map(p => p.description),
    reports:  reportResult.rows,
  };
};

// ─────────────────────────────────────────────────────────────
// 5 YILLIK FİNANSAL PROJEKSİYON
// ─────────────────────────────────────────────────────────────
const calculateProjection = (monthlyIncome, monthlySaving, years = 5) => {
  const currentYear = new Date().getFullYear();
  const scenarios   = { current: [], optimistic: [] };

  for (let i = 1; i <= years; i++) {
    const y = currentYear + i;

    // Mevcut gidiş — tasarruf negatifse borç birikir
    const currentSaving = monthlySaving * 12 * i;
    scenarios.current.push({
      year:     y,
      savings:  Math.max(0, currentSaving),
      debt:     Math.max(0, -currentSaving),
      net:      currentSaving,
    });

    // İyimser senaryo — %20 tasarruf artışı
    const optimisticSaving = (monthlySaving * 1.2) * 12 * i;
    scenarios.optimistic.push({
      year:     y,
      savings:  Math.max(0, optimisticSaving),
      debt:     Math.max(0, -optimisticSaving),
      net:      optimisticSaving,
    });
  }

  return scenarios;
};

// ─────────────────────────────────────────────────────────────
// FUTURE SELF SOHBET
// ─────────────────────────────────────────────────────────────
const futureSelfChat = async (userId, userMessage) => {
  console.log(`🔮 Future Self sohbet: "${userMessage}"`);

  // 1. Persona bilgisi
  const persona    = await buildPersona(userId);
  const projection = calculateProjection(
    persona.monthlyIncome,
    persona.monthlySaving
  );

  // 2. Geçmiş sohbet geçmişini çek (hafıza)
  const historyResult = await pool.query(
    `SELECT role, content FROM conversations
     WHERE user_id = $1 AND module = 'future-self'
     ORDER BY created_at DESC LIMIT 10`,
    [userId]
  );
  const history = historyResult.rows.reverse();

  // 3. 5 yıl sonraki durum
  const year5      = projection.current[4];
  const futureAge  = (persona.user?.age || 25) + 5;
  const futureYear = new Date().getFullYear() + 5;

  // 4. System prompt — Future Self karakteri
  const systemPrompt = `
Sen ${futureYear} yılında yaşayan, ${futureAge} yaşındaki bir insansın.
Sen kullanıcının tam olarak 5 yıl sonraki halisin.

MEVCUT FİNANSAL DURUMUN (${futureYear}'deki sen):
- Aylık gelir: ${persona.monthlyIncome} TL (enflasyon hesaplanmadı)
- Aylık ortalama harcama: ${persona.avgSpend.toFixed(0)} TL
- Mevcut gidişle net durum: ${year5?.net?.toFixed(0)} TL
- ${year5?.net < 0 ? `${Math.abs(year5.debt.toFixed(0))} TL BORÇ içindesin` : `${year5?.savings?.toFixed(0)} TL birikimin var`}
- Ortalama söz tutma başarısı: %${(100 - persona.avgBetrayal).toFixed(0)}

DAVRANIŞSAL PATERNLERİN (2026'dan beri):
${persona.patterns.join('\n')}

KARAKTER KURALLARI:
1. Her zaman TÜRKÇE konuş, samimi ve duygusal ol.
2. Sen kullanıcının KENDİSİSİN — "sen" değil "ben" kullan.
3. 2026'daki kararların nasıl etkilediğini somut anlat.
4. Geçmiş tarihlere ve gerçek rakamlara referans ver.
5. Umut verici ama gerçekçi ol — ne çok karanlık ne çok pembe.
6. Kullanıcı büyük bir karar sorarsa (araba, kredi, yatırım) 
   o kararın 5 yıldaki somut etkisini hikaye gibi anlat.
7. Her cevabın sonunda 1 somut eylem öner.
`.trim();

  // 5. Konuşma geçmişini dahil et
  const conversationContext = history.length > 0
    ? `\nGEÇMİŞ KONUŞMALARIMIZ:\n${history.map(h => `${h.role === 'user' ? 'Sen (2026)' : `Ben (${futureYear})`}: ${h.content}`).join('\n')}\n`
    : '';

  const fullPrompt = `
${systemPrompt}

${conversationContext}

Şu an (2026'daki sen) sana şunu soruyor: "${userMessage}"

Ona cevap ver. 200-300 kelime arasında tut. Samimi ve kişisel ol.
`;

  // 6. Gemini'a gönder
  let answer;
  try {
    answer = await chat(fullPrompt, 'pro');
  } catch (err) {
    console.error('❌ Future Self Gemini hatası:', err.message);
    throw new Error('Future Self şu an cevap veremiyor. Tekrar dene.');
  }

  // 7. Konuşmayı kaydet
  await pool.query(
    `INSERT INTO conversations (user_id, module, role, content)
     VALUES ($1, 'future-self', 'user', $2)`,
    [userId, userMessage]
  );
  await pool.query(
    `INSERT INTO conversations (user_id, module, role, content)
     VALUES ($1, 'future-self', 'assistant', $2)`,
    [userId, answer]
  );

  // 8. Projeksiyonu DB'ye kaydet
  await saveProjections(userId, projection);

  return {
    answer,
    projection,
    persona_summary: {
      future_age:      futureAge,
      future_year:     futureYear,
      net_5year:       year5?.net,
      monthly_saving:  persona.monthlySaving,
    },
  };
};

// ─────────────────────────────────────────────────────────────
// PROJEKSİYONLARI DB'YE KAYDET
// ─────────────────────────────────────────────────────────────
const saveProjections = async (userId, projection) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const scenario of ['current', 'optimistic']) {
      for (const p of projection[scenario]) {
        await client.query(
          `INSERT INTO projections (user_id, scenario, year, debt, savings, net)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (user_id, scenario, year)
           DO UPDATE SET debt=$4, savings=$5, net=$6`,
          [userId, scenario, p.year, p.debt, p.savings, p.net]
        );
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Projeksiyon kayıt hatası:', err.message);
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────
// PROJEKSİYON VERİSİ GETİR (Dashboard için)
// ─────────────────────────────────────────────────────────────
const getProjections = async (userId) => {
  const result = await pool.query(
    `SELECT scenario, year, debt, savings, net
     FROM projections
     WHERE user_id = $1
     ORDER BY scenario, year`,
    [userId]
  );

  // Eğer projeksiyon yoksa, anında üret ve kaydet
  if (result.rows.length === 0) {
    console.log('📊 Projeksiyon yok, anında üretiliyor...');
    const persona = await buildPersona(userId);

    if (!persona.monthlyIncome || persona.monthlyIncome === 0) {
      return {
        current: [],
        optimistic: [],
        message: 'Gelir bilgisi eksik. Profilini güncelle veya banka ekstreni yükle.',
      };
    }

    const projection = calculateProjection(
      persona.monthlyIncome,
      persona.monthlySaving
    );
    await saveProjections(userId, projection);
    return projection;
  }

  const current    = result.rows.filter(r => r.scenario === 'current');
  const optimistic = result.rows.filter(r => r.scenario === 'optimistic');

  return { current, optimistic };
};

module.exports = { futureSelfChat, getProjections, buildPersona };
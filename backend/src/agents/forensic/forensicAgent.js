'use strict';

const { chatJSON, chat } = require('../../utils/gemini');
const { pool }           = require('../../db');

// ─────────────────────────────────────────────────────────────
// SYSTEM INSTRUCTIONS — Her agent için ayrı rol
// ─────────────────────────────────────────────────────────────
const PATTERN_SYSTEM = `
Sen bir Davranış Analisti ve Veri Bilimcisin.
Banka işlem verilerini inceleyerek kullanıcının finansal davranış
kalıplarını tespit ediyorsun.

KURALLAR:
1. Sadece geçerli JSON döndür. Markdown YASAK.
2. Metinde olmayan veriyi UYDURMA.
3. Her patern için somut kanıt (tarih, tutar, gün) göster.
4. Güven skoru 0-1 arasında gerçekçi ver.
`.trim();

const COMPARISON_SYSTEM = `
Sen bir Karşılaştırmalı Finans Analistsin.
Farklı dönemlerin harcama verilerini karşılaştırıp
anlamlı farklılıkları tespit ediyorsun.

KURALLAR:
1. Sadece geçerli JSON döndür.
2. Yüzde hesaplamalarını doğru yap.
3. Önemsiz farklılıkları (<%5) atlayabilirsin.
`.trim();

const TRIGGER_SYSTEM = `
Sen bir Davranışsal Ekonomi Uzmanısın.
Finansal harcama tetikleyicilerini (trigger) tespit ediyorsun.
Hangi koşullarda (gün, saat, durum) harcama arttığını buluyorsun.

KURALLAR:
1. Sadece geçerli JSON döndür.
2. Korelasyon ≠ nedensellik. "Olabilir", "görünüyor" gibi ifadeler kullan.
3. En az 3 veri noktasıyla desteklenen paternleri raporla.
`.trim();

const ADVICE_SYSTEM = `
Sen empatik bir Kişisel Finans Koçusun.
Veri analizine dayanarak somut, uygulanabilir öneriler üretiyorsun.

KURALLAR:
1. Sadece geçerli JSON döndür.
2. Maksimum 3 öneri ver — az ama etkili.
3. Her öneri için tahmini aylık tasarruf hesapla.
4. Suçlayıcı değil, yönlendirici bir dil kullan.
`.trim();

// ─────────────────────────────────────────────────────────────
// AGENT 1 — Pattern Detection
// Tekrarlayan davranış kalıplarını bulur
// ─────────────────────────────────────────────────────────────
const patternDetectionAgent = async (transactions, userId) => {
  console.log('🔍 Pattern Detection Agent çalışıyor...');

  // İşlemleri özetle (token tasarrufu için ham veriyi gönderme)
  const summary = buildTransactionSummary(transactions);

  const prompt = `
Aşağıdaki kullanıcının banka işlem özetini analiz et.
Tekrarlayan davranış kalıplarını tespit et.

İŞLEM ÖZETİ:
${JSON.stringify(summary, null, 2)}

Şu formatta döndür:
{
  "patterns": [
    {
      "type": "time_based",
      "title": "Pazartesi Sabahı Kahve Alışkanlığı",
      "description": "Her Pazartesi sabahı kahve harcaması yapılıyor",
      "evidence": ["2026-01-06: 45₺", "2026-01-13: 52₺"],
      "frequency": "weekly",
      "avg_amount": 48.5,
      "confidence": 0.85
    }
  ]
}

Pattern tipleri: time_based | category_spike | night_shopping | weekend_effect | stress_spending
`;

  const result = await chatJSON(prompt, 'pro', PATTERN_SYSTEM);

  // DB'ye kaydet
  if (result.patterns?.length > 0) {
    for (const p of result.patterns) {
      await pool.query(
        `INSERT INTO patterns (user_id, pattern_type, description, data, confidence)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [userId, p.type, p.title, JSON.stringify(p), p.confidence]
      );
    }
  }

  return result;
};

// ─────────────────────────────────────────────────────────────
// AGENT 2 — Comparison Agent
// Dönemler arası karşılaştırma yapar
// ─────────────────────────────────────────────────────────────
const comparisonAgent = async (transactions, targetMonth, targetYear) => {
  console.log('📊 Comparison Agent çalışıyor...');

  // Hedef ay ve bir önceki ay verilerini ayır
  const targetTxs = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() + 1 === targetMonth && d.getFullYear() === targetYear;
  });

  const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
  const prevYear  = targetMonth === 1 ? targetYear - 1 : targetYear;
  const prevTxs   = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() + 1 === prevMonth && d.getFullYear() === prevYear;
  });

  if (targetTxs.length === 0) {
    return { comparison: null, message: 'Hedef ay için veri yok' };
  }

  const targetSummary = buildCategorySummary(targetTxs);
  const prevSummary   = buildCategorySummary(prevTxs);

  const prompt = `
Kullanıcının iki aylık harcama verilerini karşılaştır.

HEDEF AY (${targetMonth}/${targetYear}):
${JSON.stringify(targetSummary, null, 2)}

ÖNCEKİ AY (${prevMonth}/${prevYear}):
${JSON.stringify(prevSummary, null, 2)}

Şu formatta döndür:
{
  "target_month": { "total": 15000, "by_category": {} },
  "prev_month":   { "total": 12000, "by_category": {} },
  "total_diff":   3000,
  "total_diff_pct": 25,
  "significant_changes": [
    {
      "category": "Yemek-Dışarı",
      "prev_amount": 2000,
      "target_amount": 3200,
      "diff": 1200,
      "diff_pct": 60,
      "direction": "increase"
    }
  ],
  "summary": "Bu ay geçen aya göre %25 fazla harcadın..."
}
`;

  return await chatJSON(prompt, 'flash', COMPARISON_SYSTEM);
};

// ─────────────────────────────────────────────────────────────
// AGENT 3 — Trigger Correlation Agent
// Harcama tetikleyicilerini tespit eder
// ─────────────────────────────────────────────────────────────
const triggerCorrelationAgent = async (transactions) => {
  console.log('⚡ Trigger Correlation Agent çalışıyor...');

  // Gün ve saat bazlı gruplandır
  const byDayOfWeek  = groupByDayOfWeek(transactions);
  const byHour       = groupByHour(transactions);
  const byDayOfMonth = groupByDayOfMonth(transactions);

  const prompt = `
Kullanıcının harcama tetikleyicilerini analiz et.

HAFTANIN GÜNLERİNE GÖRE ORTALAMA HARCAMA:
${JSON.stringify(byDayOfWeek, null, 2)}

SAATE GÖRE HARCAMA DAĞILIMI:
${JSON.stringify(byHour, null, 2)}

AYLIK HARCAMA DAĞILIMI (gün bazlı):
${JSON.stringify(byDayOfMonth, null, 2)}

Şu formatta döndür:
{
  "triggers": [
    {
      "type": "day_of_week",
      "trigger": "Cuma akşamları",
      "description": "Cuma günleri diğer günlere göre %60 fazla harcama",
      "avg_amount": 450,
      "comparison_avg": 280,
      "diff_pct": 60,
      "hypothesis": "Hafta sonu öncesi rahatlama eğilimi olabilir"
    }
  ],
  "peak_spending_time": "Cuma 20:00-23:00",
  "lowest_spending_day": "Salı"
}
`;

  return await chatJSON(prompt, 'flash', TRIGGER_SYSTEM);
};

// ─────────────────────────────────────────────────────────────
// AGENT 4 — Recommendation Agent
// Somut öneriler üretir
// ─────────────────────────────────────────────────────────────
const recommendationAgent = async (patterns, comparison, triggers, userIncome) => {
  console.log('💡 Recommendation Agent çalışıyor...');

  const prompt = `
Kullanıcının finansal analiz sonuçlarına dayanarak somut öneriler üret.

TESPİT EDİLEN PATERNLER:
${JSON.stringify(patterns?.patterns?.slice(0, 3) || [], null, 2)}

DÖNEM KARŞILAŞTIRMASI:
${JSON.stringify(comparison?.significant_changes?.slice(0, 5) || [], null, 2)}

TETİKLEYİCİLER:
${JSON.stringify(triggers?.triggers?.slice(0, 3) || [], null, 2)}

KULLANICI AYLIK GELİRİ: ${userIncome || 'Bilinmiyor'} TL

Şu formatta döndür:
{
  "recommendations": [
    {
      "priority": 1,
      "title": "Cuma akşamları yemek hazırla",
      "description": "Cuma akşamları yemek dışarı harcaman haftalık ortalamanın 2 katı...",
      "estimated_monthly_saving": 800,
      "difficulty": "easy",
      "action": "Perşembe akşamları Cuma için yemek hazırla"
    }
  ],
  "total_potential_saving": 1500,
  "priority_action": "Bu hafta yapabileceğin tek değişiklik..."
}
`;

  return await chatJSON(prompt, 'pro', ADVICE_SYSTEM);
};

// ─────────────────────────────────────────────────────────────
// ANA FONKSİYON — Tüm agent'ları zincirle
// ─────────────────────────────────────────────────────────────
const runForensicAnalysis = async (userId, question, month, year) => {
  console.log(`\n🕵️  Forensic analiz başlıyor: "${question}"`);

  // 1. Kullanıcının işlemlerini DB'den çek
  const txResult = await pool.query(
    `SELECT * FROM transactions 
     WHERE user_id = $1 
     ORDER BY date DESC 
     LIMIT 500`,
    [userId]
  );
  const transactions = txResult.rows;

  if (transactions.length === 0) {
    return { error: 'Henüz işlem verisi yok. Önce banka ekstreni yükle.' };
  }

  // 2. Kullanıcı bilgilerini çek
  const userResult = await pool.query(
    'SELECT monthly_income FROM users WHERE id = $1',
    [userId]
  );
  const userIncome = userResult.rows[0]?.monthly_income;

  // 3. Agent zinciri — rate limit için araya kısa bekleme
  const targetMonth = month || new Date().getMonth() + 1;
  const targetYear  = year  || new Date().getFullYear();

  const patterns = await patternDetectionAgent(transactions, userId);
  await new Promise(r => setTimeout(r, 3000));

  const comparison = await comparisonAgent(transactions, targetMonth, targetYear);
  await new Promise(r => setTimeout(r, 3000));

  const triggers = await triggerCorrelationAgent(transactions);
  await new Promise(r => setTimeout(r, 3000));

  // 4. Recommendation agent (diğerlerinin çıktısına bağımlı)
  const recommendations = await recommendationAgent(
    patterns, comparison, triggers, userIncome
  );

  // 5. Kullanıcının sorusuna özel cevap üret
  const finalAnswer = await generateForensicAnswer(
    question, transactions, patterns, comparison, triggers, recommendations
  );

  // 6. Konuşma geçmişine kaydet
  await saveConversation(userId, question, finalAnswer);

  return {
    answer: finalAnswer,
    patterns,
    comparison,
    triggers,
    recommendations,
  };
};

// ─────────────────────────────────────────────────────────────
// KULLANICININ SORUSUNA ÖZEL CEVAP
// ─────────────────────────────────────────────────────────────
const generateForensicAnswer = async (
  question, transactions, patterns, comparison, triggers, recommendations
) => {
  const context = `
TESPİT EDİLEN PATERNLER: ${JSON.stringify(patterns?.patterns?.slice(0,3) || [])}
DÖNEM KARŞILAŞTIRMASI: ${JSON.stringify(comparison?.significant_changes?.slice(0,5) || [])}
TETİKLEYİCİLER: ${JSON.stringify(triggers?.triggers?.slice(0,3) || [])}
ÖNERİLER: ${JSON.stringify(recommendations?.recommendations?.slice(0,2) || [])}
  `.trim();

  const prompt = `
Kullanıcı sana şu soruyu sordu: "${question}"

Analiz sonuçlarına dayanarak bu soruyu yanıtla.
Türkçe, samimi ve somut cevap ver. 
Rakamlar ve tarihler kullan, soyut kalma.
300-400 kelime arasında tut.

BAĞLAM:
${context}
  `;

  return await chat(prompt, 'pro');
};

// ─────────────────────────────────────────────────────────────
// YARDIMCI FONKSİYONLAR
// ─────────────────────────────────────────────────────────────
const buildTransactionSummary = (transactions) => {
  const byCategory  = {};
  const byDayOfWeek = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
  const byHour      = {};
  let totalDebit = 0;

  for (const t of transactions) {
    if (t.type !== 'debit') continue;
    totalDebit += parseFloat(t.amount);

    // Kategori
    const cat = t.category || 'Diğer';
    byCategory[cat] = (byCategory[cat] || 0) + parseFloat(t.amount);

    // Haftanın günü
    const day = new Date(t.date).getDay();
    byDayOfWeek[day] = (byDayOfWeek[day] || 0) + parseFloat(t.amount);

    // Saat
    if (t.hour !== null) {
      byHour[t.hour] = (byHour[t.hour] || 0) + parseFloat(t.amount);
    }
  }

  return {
    total_transactions: transactions.length,
    total_debit: totalDebit,
    by_category: byCategory,
    by_day_of_week: byDayOfWeek,
    by_hour: byHour,
    date_range: {
      start: transactions[transactions.length - 1]?.date,
      end:   transactions[0]?.date,
    },
  };
};

const buildCategorySummary = (transactions) => {
  const result = {};
  for (const t of transactions) {
    if (t.type !== 'debit') continue;
    const cat = t.category || 'Diğer';
    result[cat] = (result[cat] || 0) + parseFloat(t.amount);
  }
  return result;
};

const DAYS = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];

const groupByDayOfWeek = (transactions) => {
  const groups = {};
  for (const t of transactions) {
    if (t.type !== 'debit') continue;
    const dayName = DAYS[new Date(t.date).getDay()];
    if (!groups[dayName]) groups[dayName] = { total: 0, count: 0 };
    groups[dayName].total += parseFloat(t.amount);
    groups[dayName].count++;
  }
  // Ortalama hesapla
  for (const day of Object.keys(groups)) {
    groups[day].avg = Math.round(groups[day].total / groups[day].count);
  }
  return groups;
};

const groupByHour = (transactions) => {
  const groups = {};
  for (const t of transactions) {
    if (t.type !== 'debit' || t.hour === null) continue;
    const slot = `${t.hour}:00`;
    groups[slot] = (groups[slot] || 0) + parseFloat(t.amount);
  }
  return groups;
};

const groupByDayOfMonth = (transactions) => {
  const groups = {};
  for (const t of transactions) {
    if (t.type !== 'debit') continue;
    const day = new Date(t.date).getDate();
    groups[day] = (groups[day] || 0) + parseFloat(t.amount);
  }
  return groups;
};

const saveConversation = async (userId, question, answer) => {
  await pool.query(
    `INSERT INTO conversations (user_id, module, role, content)
     VALUES ($1, 'forensic', 'user', $2)`,
    [userId, question]
  );
  await pool.query(
    `INSERT INTO conversations (user_id, module, role, content)
     VALUES ($1, 'forensic', 'assistant', $2)`,
    [userId, answer]
  );
};

module.exports = {
  runForensicAnalysis,
  patternDetectionAgent,
  comparisonAgent,
  triggerCorrelationAgent,
  recommendationAgent,
};
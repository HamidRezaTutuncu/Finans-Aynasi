'use strict';

const { chatJSON, chat } = require('../../utils/gemini');
const { pool }           = require('../../db');

// ─────────────────────────────────────────────────────────────
// SYSTEM INSTRUCTIONS
// ─────────────────────────────────────────────────────────────
const PATTERN_SYSTEM = `
Sen davranış analisti ve veri bilimcisin. 
Banka işlem ÖZETLERİNDEN davranış paternlerini tespit ediyorsun.

KURALLAR:
1. SADECE geçerli JSON döndür. Markdown YASAK.
2. SADECE sana verilen verilerdeki rakamları kullan. UYDURMA.
3. Bir patern raporlamak için en az 3 veri noktası olmalı.
4. Güven skoru gerçekçi olsun (0.5 - 0.95 arası).
`.trim();

const ADVICE_SYSTEM = `
Sen empatik finans koçusun. Veri analizine dayanarak somut öneri üretiyorsun.

KURALLAR:
1. SADECE JSON döndür.
2. Maksimum 3 öneri, kısa ve net.
3. Suçlayıcı değil, yönlendirici.
4. Her öneri için TAHMİNI aylık tasarruf belirt.
`.trim();

const FINAL_ANSWER_SYSTEM = `
Sen Finans Aynası'nın Adli Muhasebe Uzmanısın.
Kullanıcıya kendi finansal verisi hakkında SOMUT, SAMİMİ ve DOĞRU yanıt veriyorsun.

KURALLAR (ASLA İHLAL EDİLEMEZ):
1. Sadece sana verilen GERÇEK VERİ bölümündeki rakamları kullan.
2. ASLA "geçen ay" karşılaştırması yapma — eğer COMPARISON_DATA boşsa.
3. Hafta içi/sonu rakamlarını SADECE verilen GERÇEK VERİ'den al.
4. Türkçe, samimi, 200-300 kelime.
5. Markdown kullan (bold, liste) okunaklı olsun.
6. Sonunda 1 somut eylem öner.
`.trim();

// ─────────────────────────────────────────────────────────────
// AGENT 1 — Pattern Detection (AI)
// ─────────────────────────────────────────────────────────────
const patternDetectionAgent = async (transactions, userId) => {
  console.log('🔍 Pattern Detection...');
  const summary = buildTransactionSummary(transactions);

  const prompt = `
Banka işlem özetini analiz et, davranış paternlerini tespit et.

İŞLEM ÖZETİ:
${JSON.stringify(summary, null, 2)}

JSON formatı:
{
  "patterns": [
    {
      "type": "time_based",
      "title": "Pazartesi Sabahı Kahve Alışkanlığı",
      "description": "Her Pazartesi 08:30 civarı kahve harcaması",
      "evidence": ["Pazartesi günü ortalama: 155 TL", "Toplam 12 işlem"],
      "frequency": "weekly",
      "avg_amount": 155,
      "confidence": 0.85
    }
  ]
}

Pattern tipleri: time_based | category_spike | night_shopping | weekend_effect | stress_spending
`;

  const result = await chatJSON(prompt, 'flash', PATTERN_SYSTEM);

  // DB'ye kaydet
  if (result.patterns?.length > 0) {
    for (const p of result.patterns) {
      try {
        await pool.query(
          `INSERT INTO patterns (user_id, pattern_type, description, data, confidence)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [userId, p.type, p.title, JSON.stringify(p), p.confidence]
        );
      } catch (e) { /* ignore duplicates */ }
    }
  }

  return result;
};

// ─────────────────────────────────────────────────────────────
// AGENT 2 — Comparison (DETERMINISTIK + AI)
// AI'a hesap yaptırmıyoruz, JS hesaplıyor
// ─────────────────────────────────────────────────────────────
const comparisonAgent = (transactions, targetMonth, targetYear) => {
  console.log('📊 Comparison (JS hesaplıyor)...');

  const targetTxs = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() + 1 === targetMonth && d.getFullYear() === targetYear;
  });

  if (targetTxs.length === 0) {
    return { comparison: null, message: 'Hedef ay için veri yok' };
  }

  const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
  const prevYear  = targetMonth === 1 ? targetYear - 1 : targetYear;
  const prevTxs   = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() + 1 === prevMonth && d.getFullYear() === prevYear;
  });

  const targetSummary = buildCategorySummary(targetTxs);
  const targetTotal = Object.values(targetSummary).reduce((s, v) => s + v, 0);

  if (prevTxs.length === 0) {
    return {
      target_month: { month: targetMonth, year: targetYear, total: targetTotal, by_category: targetSummary },
      prev_month: null,
      target_only: true,
      message: `${prevMonth}/${prevYear} verisi yok. Karşılaştırma yapılamaz.`,
    };
  }

  const prevSummary = buildCategorySummary(prevTxs);
  const prevTotal = Object.values(prevSummary).reduce((s, v) => s + v, 0);

  // JS ile değişimleri hesapla
  const allCategories = new Set([...Object.keys(targetSummary), ...Object.keys(prevSummary)]);
  const significantChanges = [];

  for (const cat of allCategories) {
    const targetAmt = targetSummary[cat] || 0;
    const prevAmt   = prevSummary[cat]   || 0;
    const diff = targetAmt - prevAmt;
    const diffPct = prevAmt > 0 ? (diff / prevAmt) * 100 : null;

    // %20'den büyük veya 500 TL'den fazla değişim
    if (Math.abs(diff) >= 500 || (diffPct !== null && Math.abs(diffPct) >= 20)) {
      significantChanges.push({
        category: cat,
        prev_amount: Math.round(prevAmt),
        target_amount: Math.round(targetAmt),
        diff: Math.round(diff),
        diff_pct: diffPct !== null ? Math.round(diffPct) : null,
        direction: diff > 0 ? 'increase' : 'decrease',
      });
    }
  }

  // En büyük değişimleri öne al
  significantChanges.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  const totalDiff = targetTotal - prevTotal;
  const totalDiffPct = prevTotal > 0 ? Math.round((totalDiff / prevTotal) * 100) : null;

  return {
    target_month: { month: targetMonth, year: targetYear, total: Math.round(targetTotal), by_category: targetSummary },
    prev_month:   { month: prevMonth, year: prevYear, total: Math.round(prevTotal), by_category: prevSummary },
    total_diff: Math.round(totalDiff),
    total_diff_pct: totalDiffPct,
    significant_changes: significantChanges.slice(0, 5),
  };
};

// ─────────────────────────────────────────────────────────────
// AGENT 3 — Trigger (AI)
// ─────────────────────────────────────────────────────────────
const triggerCorrelationAgent = async (transactions) => {
  console.log('⚡ Trigger Analysis...');
  const byDayOfWeek  = groupByDayOfWeek(transactions);
  const byHour       = groupByHour(transactions);

  const prompt = `
Harcama tetikleyicilerini analiz et.

HAFTANIN GÜNLERİ:
${JSON.stringify(byDayOfWeek, null, 2)}

SAAT DAĞILIMI:
${JSON.stringify(byHour, null, 2)}

Bu verilerden çıkardığın paternleri JSON olarak döndür:
{
  "triggers": [
    {
      "type": "day_of_week",
      "trigger": "Cuma akşamları",
      "description": "Cuma günleri yüksek harcama",
      "avg_amount": 450,
      "hypothesis": "Hafta sonu rahatlama eğilimi"
    }
  ],
  "peak_spending_day": "Cuma",
  "lowest_spending_day": "Salı"
}

ÖNEMLİ: SADECE verilen rakamları kullan. UYDURMA.
`;

  return await chatJSON(prompt, 'flash', PATTERN_SYSTEM);
};

// ─────────────────────────────────────────────────────────────
// AGENT 4 — Recommendation (AI)
// ─────────────────────────────────────────────────────────────
const recommendationAgent = async (patterns, comparison, triggers, userIncome) => {
  console.log('💡 Recommendation...');

  const prompt = `
Analiz sonuçlarına dayanarak somut öneri üret.

PATERNLER:
${JSON.stringify(patterns?.patterns?.slice(0, 3) || [], null, 2)}

ÖNEMLİ DEĞİŞİMLER:
${JSON.stringify(comparison?.significant_changes?.slice(0, 5) || [], null, 2)}

TETİKLEYİCİLER:
${JSON.stringify(triggers?.triggers?.slice(0, 3) || [], null, 2)}

AYLIK GELİR: ${userIncome || 'Bilinmiyor'} TL

JSON:
{
  "recommendations": [
    {
      "priority": 1,
      "title": "Cuma akşamları yemek hazırla",
      "description": "Cuma yemek dışarı harcaman çok yüksek...",
      "estimated_monthly_saving": 800,
      "difficulty": "easy",
      "action": "Perşembe gece yemek hazırla"
    }
  ],
  "total_potential_saving": 1500,
  "priority_action": "Bu hafta tek değişiklik..."
}
`;

  return await chatJSON(prompt, 'flash', ADVICE_SYSTEM);
};

// ─────────────────────────────────────────────────────────────
// ANA FONKSİYON
// ─────────────────────────────────────────────────────────────
const runForensicAnalysis = async (userId, question, month, year) => {
  console.log(`\n🕵️ Forensic: "${question}"`);

  const txResult = await pool.query(
    `SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC LIMIT 500`,
    [userId]
  );
  const transactions = txResult.rows;
  if (transactions.length === 0) {
    return { error: 'Henüz işlem verisi yok. Önce banka ekstreni yükle.' };
  }

  const userResult = await pool.query('SELECT monthly_income FROM users WHERE id = $1', [userId]);
  const userIncome = userResult.rows[0]?.monthly_income;

  const targetMonth = month || new Date().getMonth() + 1;
  const targetYear  = year  || new Date().getFullYear();

  // Pattern + Trigger paralel
  const [patterns, triggers] = await Promise.all([
    patternDetectionAgent(transactions, userId),
    triggerCorrelationAgent(transactions),
  ]);

  // Comparison — JS deterministik (AI çağrısı YOK)
  const comparison = comparisonAgent(transactions, targetMonth, targetYear);

  // Recommendation
  const recommendations = await recommendationAgent(patterns, comparison, triggers, userIncome);

  // Final answer
  const finalAnswer = await generateForensicAnswer(
    question, transactions, patterns, comparison, triggers, recommendations
  );

  await saveConversation(userId, question, finalAnswer);

  return {
    answer: finalAnswer,
    patterns, comparison, triggers, recommendations,
  };
};

// ─────────────────────────────────────────────────────────────
// FINAL ANSWER — Gerçek verilerle, halüsinasyon yok
// ─────────────────────────────────────────────────────────────
const generateForensicAnswer = async (
  question, transactions, patterns, comparison, triggers, recommendations
) => {
  // GERÇEK ham veriler — JS hesapladı
  const summary = buildTransactionSummary(transactions);
  const totalSpend = summary.total_debit;

  const topCategories = Object.entries(summary.by_category)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, amt]) => `${cat}: ${Math.round(amt).toLocaleString('tr-TR')} TL (%${Math.round(amt*100/totalSpend)})`)
    .join('\n');

  // Gün bazlı dağılım (gerçek)
  const dayBreakdown = Object.entries(summary.by_day_of_week)
    .map(([day, amt]) => `${DAYS[day]}: ${Math.round(amt).toLocaleString('tr-TR')} TL`)
    .join('\n');

  const context = `
GERÇEK VERİ (Bu rakamlar JS tarafından hesaplandı, %100 doğru):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Toplam harcama: ${Math.round(totalSpend).toLocaleString('tr-TR')} TL
İşlem sayısı: ${transactions.length}
Tarih aralığı: ${summary.date_range.start} → ${summary.date_range.end}

KATEGORİ DAĞILIMI (büyükten küçüğe):
${topCategories}

GÜN DAĞILIMI (haftanın günleri):
${dayBreakdown}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TESPİT EDİLEN PATERNLER (AI yorumları):
${JSON.stringify(patterns?.patterns?.slice(0, 3) || [], null, 2)}

DÖNEM KARŞILAŞTIRMASI:
${comparison?.target_only 
  ? 'Geçen ay verisi yok, karşılaştırma yapılmadı.' 
  : JSON.stringify(comparison?.significant_changes?.slice(0, 5) || [], null, 2)}

TETİKLEYİCİLER:
${JSON.stringify(triggers?.triggers?.slice(0, 3) || [], null, 2)}

ÖNERİLER:
${JSON.stringify(recommendations?.recommendations?.slice(0, 2) || [], null, 2)}
`.trim();

  const prompt = `
Kullanıcının sorusu: "${question}"

KURALLAR (İHLAL EDİLEMEZ):
1. GERÇEK VERİ bölümündeki rakamları KULLAN.
2. "GERÇEK VERİ"de OLMAYAN rakam UYDURMA.
3. Geçen ay karşılaştırması SADECE "DÖNEM KARŞILAŞTIRMASI" verisi varsa yap.
4. Gün/saat dağılımını GERÇEK VERİ'den oku, AI patern yorumundan değil.
5. Türkçe, samimi, **markdown** kullan (bold, listeler).
6. 200-300 kelime arası.
7. Sonunda 1 somut eylem öner.

${context}
`;

  return await chat(prompt, 'flash', FINAL_ANSWER_SYSTEM);
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const DAYS = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];

const buildTransactionSummary = (transactions) => {
  const byCategory  = {};
  const byDayOfWeek = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
  const byHour      = {};
  let totalDebit = 0;

  for (const t of transactions) {
    if (t.type !== 'debit') continue;
    const amount = parseFloat(t.amount);
    totalDebit += amount;

    const cat = t.category || 'Diğer';
    byCategory[cat] = (byCategory[cat] || 0) + amount;

    const day = new Date(t.date).getDay();
    byDayOfWeek[day] = (byDayOfWeek[day] || 0) + amount;

    if (t.hour !== null && t.hour !== undefined) {
      byHour[t.hour] = (byHour[t.hour] || 0) + amount;
    }
  }

  const dates = transactions.map(t => t.date).sort();
  return {
    total_transactions: transactions.length,
    total_debit: totalDebit,
    by_category: byCategory,
    by_day_of_week: byDayOfWeek,
    by_hour: byHour,
    date_range: {
      start: dates[0],
      end:   dates[dates.length - 1],
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

const groupByDayOfWeek = (transactions) => {
  const groups = {};
  for (const t of transactions) {
    if (t.type !== 'debit') continue;
    const dayName = DAYS[new Date(t.date).getDay()];
    if (!groups[dayName]) groups[dayName] = { total: 0, count: 0 };
    groups[dayName].total += parseFloat(t.amount);
    groups[dayName].count++;
  }
  for (const day of Object.keys(groups)) {
    groups[day].avg = Math.round(groups[day].total / groups[day].count);
    groups[day].total = Math.round(groups[day].total);
  }
  return groups;
};

const groupByHour = (transactions) => {
  const groups = {};
  for (const t of transactions) {
    if (t.type !== 'debit' || t.hour === null || t.hour === undefined) continue;
    const slot = `${t.hour}:00`;
    groups[slot] = (groups[slot] || 0) + parseFloat(t.amount);
  }
  // Round
  for (const k of Object.keys(groups)) groups[k] = Math.round(groups[k]);
  return groups;
};

const saveConversation = async (userId, question, answer) => {
  try {
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
  } catch (err) {
    console.warn('Conversation save warning:', err.message);
  }
};

module.exports = {
  runForensicAnalysis,
  patternDetectionAgent,
  comparisonAgent,
  triggerCorrelationAgent,
  recommendationAgent,
};
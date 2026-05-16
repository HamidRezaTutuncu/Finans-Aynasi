'use strict';

const { pool } = require('../../db');

// ─────────────────────────────────────────────────────────────
// HEALTH SCORE HESAPLA
// 0-100 arası, 4 faktör
// ─────────────────────────────────────────────────────────────
const calculateHealthScore = async (userId) => {
  console.log('🏥 Health Score hesaplanıyor...');

  // 1. Kullanıcı geliri
  const userResult = await pool.query(
    'SELECT monthly_income FROM users WHERE id = $1',
    [userId]
  );
  const monthlyIncome = parseFloat(userResult.rows[0]?.monthly_income || 0);

  // 2. Son 3 ayın harcamaları
  const spendResult = await pool.query(
    `SELECT 
       EXTRACT(YEAR FROM date)  AS y,
       EXTRACT(MONTH FROM date) AS m,
       SUM(amount) AS total
     FROM transactions
     WHERE user_id = $1 AND type = 'debit'
     GROUP BY y, m
     ORDER BY y DESC, m DESC
     LIMIT 3`,
    [userId]
  );
  const monthlySpends = spendResult.rows.map(r => parseFloat(r.total));

  // 3. Son raporlardan aldatma ortalaması
  const reportResult = await pool.query(
    `SELECT betrayal_score FROM reports
     WHERE user_id = $1
     ORDER BY year DESC, month DESC
     LIMIT 3`,
    [userId]
  );
  const betrayalScores = reportResult.rows.map(r => parseFloat(r.betrayal_score));

  // 4. Tespit edilen kötü paternler
  const patternResult = await pool.query(
    `SELECT pattern_type, confidence FROM patterns
     WHERE user_id = $1
       AND pattern_type IN ('night_shopping', 'stress_spending', 'category_spike')
     ORDER BY detected_at DESC
     LIMIT 10`,
    [userId]
  );
  const badPatterns = patternResult.rows;

  // ─────────────────────────────────────────────────────────────
  // FAKTÖR HESAPLAMALARI
  // ─────────────────────────────────────────────────────────────

  // FAKTÖR 1: Tasarruf Oranı (0-100)
  // İdeal: gelirin %20+ tasarruf, kötü: negatif
  let savingScore = 50; // Veri yoksa nötr
  if (monthlyIncome > 0 && monthlySpends.length > 0) {
    const avgSpend = monthlySpends.reduce((a, b) => a + b, 0) / monthlySpends.length;
    const savingRate = (monthlyIncome - avgSpend) / monthlyIncome;
    // %20+ tasarruf = 100, %0 tasarruf = 50, negatif = 0
    savingScore = Math.max(0, Math.min(100, 50 + (savingRate * 250)));
  }

  // FAKTÖR 2: Söz Tutma (0-100)
  // Aldatma 0 ise mükemmel, 100 ise rezalet
  let promiseScore = 50;
  if (betrayalScores.length > 0) {
    const avgBetrayal = betrayalScores.reduce((a, b) => a + b, 0) / betrayalScores.length;
    promiseScore = 100 - avgBetrayal;
  }

  // FAKTÖR 3: Harcama Trendi (0-100)
  // Son ay > önceki ay = kötü, az = iyi
  let trendScore = 70; // Veri yoksa hafif olumlu
  if (monthlySpends.length >= 2) {
    const lastMonth = monthlySpends[0];
    const prevMonth = monthlySpends[1];
    const change = (lastMonth - prevMonth) / prevMonth;
    // %20 azalış = 100, sabit = 70, %20 artış = 40, %50+ artış = 0
    trendScore = Math.max(0, Math.min(100, 70 - (change * 150)));
  }

  // FAKTÖR 4: Risk Paternleri (0-100)
  // 0 kötü patern = 100, çok varsa düşük
  let riskScore = 100;
  if (badPatterns.length > 0) {
    const avgConfidence = badPatterns.reduce((s, p) => s + parseFloat(p.confidence || 0), 0) / badPatterns.length;
    // Her kötü patern -15 puan (max -75)
    const penalty = Math.min(75, badPatterns.length * 15 * avgConfidence);
    riskScore = 100 - penalty;
  }

  // ─────────────────────────────────────────────────────────────
  // AĞIRLIKLI TOPLAM
  // ─────────────────────────────────────────────────────────────
  const finalScore = Math.round(
    savingScore   * 0.40 +
    promiseScore  * 0.30 +
    trendScore    * 0.20 +
    riskScore     * 0.10
  );

  // ─────────────────────────────────────────────────────────────
  // GRADE & STATUS
  // ─────────────────────────────────────────────────────────────
  const { grade, status, color, advice } = getGradeInfo(finalScore);

  return {
    score: finalScore,
    grade,
    status,
    color,
    advice,
    breakdown: {
      saving: {
        score: Math.round(savingScore),
        weight: 40,
        label: 'Tasarruf Oranı',
      },
      promise: {
        score: Math.round(promiseScore),
        weight: 30,
        label: 'Söz Tutma',
      },
      trend: {
        score: Math.round(trendScore),
        weight: 20,
        label: 'Harcama Trendi',
      },
      risk: {
        score: Math.round(riskScore),
        weight: 10,
        label: 'Risk Paternleri',
      },
    },
    meta: {
      monthly_income: monthlyIncome,
      avg_monthly_spend: monthlySpends.length > 0
        ? Math.round(monthlySpends.reduce((a, b) => a + b, 0) / monthlySpends.length)
        : 0,
      bad_patterns_count: badPatterns.length,
      analyzed_months: monthlySpends.length,
    },
  };
};

// ─────────────────────────────────────────────────────────────
// GRADE BILGISI
// ─────────────────────────────────────────────────────────────
const getGradeInfo = (score) => {
  if (score >= 85) return {
    grade: 'A',
    status: 'Mükemmel',
    color: '#10b981', // yeşil
    advice: 'Harika gidiyorsun! Bu disiplini koru ve birikimini değerlendirmeyi düşün.',
  };
  if (score >= 70) return {
    grade: 'B+',
    status: 'İyi',
    color: '#22c55e', // açık yeşil
    advice: 'İyi gidiyorsun. Küçük iyileştirmelerle A grubuna geçebilirsin.',
  };
  if (score >= 55) return {
    grade: 'B',
    status: 'Ortalama',
    color: '#eab308', // sarı
    advice: 'Ortalamasın. Tasarruf oranını yükseltmek en hızlı kazanım olur.',
  };
  if (score >= 40) return {
    grade: 'C',
    status: 'Dikkat',
    color: '#f97316', // turuncu
    advice: 'Harcama paternlerini gözden geçirmen lazım. Söz Aynası modülünü dene.',
  };
  if (score >= 25) return {
    grade: 'D',
    status: 'Riskli',
    color: '#ef4444', // kırmızı
    advice: 'Finansal durumun risk altında. Önceliklerini yeniden belirlemelisin.',
  };
  return {
    grade: 'F',
    status: 'Kritik',
    color: '#991b1b', // koyu kırmızı
    advice: 'Acilen harcamalarını kısman ve bir bütçe planı yapman gerekiyor.',
  };
};

module.exports = { calculateHealthScore };
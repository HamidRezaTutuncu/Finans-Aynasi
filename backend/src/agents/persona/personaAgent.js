'use strict';

const { pool } = require('../../db');
const { chat } = require('../../utils/gemini');

// ─────────────────────────────────────────────────────────────
// 5 KİŞİLİK TİPİ
// ─────────────────────────────────────────────────────────────
const PERSONAS = {
  karinca: {
    type: 'karinca',
    name: 'Karınca',
    icon: '🐜',
    color: '#10b981',
    title: 'Sen bir Karıncasın',
    description: 'Tutumlu, planlı ve geleceği düşünen biri. Her kuruşun hesabını biliyorsun.',
    traits: ['Düzenli tasarruf', 'Plan yapma', 'Az dürtüsel harcama'],
    strengths: [
      'Finansal disiplin yüksek',
      'Acil durum fonun var veya birikiyor',
      'Uzun vadeli düşünüyorsun',
    ],
    weaknesses: [
      'Bazen hayatı ıskaladığını hissedebilirsin',
      'Yatırım yerine sadece biriktirmek değerini eritir',
    ],
  },
  avci: {
    type: 'avci',
    name: 'Avcı',
    icon: '🦊',
    color: '#ef4444',
    title: 'Sen bir Avcısın',
    description: 'Fırsatçı, indirim avcısı, hızlı karar veren biri. Anlık fırsatları kaçırmıyorsun.',
    traits: ['İndirim takibi', 'Hızlı satın alma kararı', 'Kategori spike\'ları'],
    strengths: [
      'Fırsatları yakalayabiliyorsun',
      'Pazarlık ve karşılaştırma yeteneğin yüksek',
    ],
    weaknesses: [
      '"İndirimli" diye gereksiz şeyler alıyor olabilirsin',
      'Dürtüsel kararlar kâr gibi görünen zarar olabilir',
    ],
  },
  atesbocegi: {
    type: 'atesbocegi',
    name: 'Ateşböceği',
    icon: '🦋',
    color: '#f59e0b',
    title: 'Sen bir Ateşböceğisin',
    description: 'Anlık keyifler ve sosyal deneyimler için yaşıyorsun. Hayatın tadını anda çıkarıyorsun.',
    traits: ['Sosyal harcamalar', 'Gece alışverişi', 'Deneyim odaklı'],
    strengths: [
      'Hayatın tadını çıkarıyorsun',
      'Sosyal ilişkilerin güçlü',
      'Anılar biriktiriyorsun',
    ],
    weaknesses: [
      'Plansız harcamalar birikim yapmanı zorlaştırıyor',
      'Gece kararları çoğu zaman pişmanlık getirir',
    ],
  },
  kumarbaz: {
    type: 'kumarbaz',
    name: 'Kumarbaz',
    icon: '🎰',
    color: '#dc2626',
    title: 'Sen bir Kumarbazsın',
    description: 'Risk seven, dalgalı harcama yapan biri. Ya çok kazanıyor ya çok kaybediyorsun.',
    traits: ['Dalgalı aylık harcamalar', 'Yüksek riskli kararlar', 'Anlık değişimler'],
    strengths: [
      'Risk almaktan korkmuyorsun',
      'Hızlı karar veriyorsun',
    ],
    weaknesses: [
      'Aylık tutarsızlık finansal stres yaratıyor',
      'Beklenmedik durumlara hazırlıksızsın',
      'Borç döngüsüne girme riskin var',
    ],
  },
  koruyucu: {
    type: 'koruyucu',
    name: 'Koruyucu',
    icon: '🛡️',
    color: '#3b82f6',
    title: 'Sen bir Koruyucusun',
    description: 'Güvenli, muhafazakar bir karakter. Risk almaktan kaçınıyor, parayı saklıyorsun.',
    traits: ['Düşük harcama', 'Az çeşitlilik', 'Risk almama'],
    strengths: [
      'Finansal stresin düşük',
      'Borç riski neredeyse yok',
      'Acil durumlara hazırsın',
    ],
    weaknesses: [
      'Para sadece birikiyor ama büyümüyor',
      'Yatırım kaçırma maliyetin yüksek',
      'Hayatı ıskalama riski',
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// METRIK HESAPLAMALARI
// ─────────────────────────────────────────────────────────────
const calculateMetrics = async (userId) => {
  // Tüm transactions
  const txResult = await pool.query(
    `SELECT date, hour, amount, category, type
     FROM transactions
     WHERE user_id = $1
     ORDER BY date DESC
     LIMIT 500`,
    [userId]
  );
  const txs = txResult.rows.filter(t => t.type === 'debit');

  if (txs.length === 0) return null;

  // Aylık toplamlar (varyans için)
  const monthlyMap = {};
  let totalSpend = 0;
  let nightSpend = 0;
  let weekendSpend = 0;
  let categoryMap = {};
  let onlineSpend = 0;
  let socialSpend = 0;

  for (const t of txs) {
    const amt = parseFloat(t.amount);
    const date = new Date(t.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;

    monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + amt;
    totalSpend += amt;

    // Gece harcaması (22:00 sonrası)
    if (t.hour !== null && (t.hour >= 22 || t.hour < 4)) {
      nightSpend += amt;
    }

    // Hafta sonu (Cuma, Cumartesi, Pazar)
    const day = date.getDay();
    if (day === 0 || day === 5 || day === 6) {
      weekendSpend += amt;
    }

    // Kategori dağılımı
    const cat = t.category || 'Diğer';
    categoryMap[cat] = (categoryMap[cat] || 0) + amt;

    if (cat === 'Online-Alışveriş') onlineSpend += amt;
    if (cat === 'Yemek-Dışarı' || cat === 'Eğlence') socialSpend += amt;
  }

  // Aylık varyans (kumarbazlık göstergesi)
  const monthlyTotals = Object.values(monthlyMap);
  const avgMonthly = monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.length;
  const variance = monthlyTotals.length > 1
    ? Math.sqrt(monthlyTotals.reduce((s, v) => s + Math.pow(v - avgMonthly, 2), 0) / monthlyTotals.length)
    : 0;
  const volatilityScore = avgMonthly > 0 ? Math.min(100, (variance / avgMonthly) * 100) : 0;

  // Gelir bilgisi
  const userResult = await pool.query(
    'SELECT monthly_income FROM users WHERE id = $1',
    [userId]
  );
  const monthlyIncome = parseFloat(userResult.rows[0]?.monthly_income || 0);

  // Pattern bilgisi (avcı için)
  const patternResult = await pool.query(
    `SELECT pattern_type FROM patterns
     WHERE user_id = $1`,
    [userId]
  );
  const hasCategorySpike = patternResult.rows.some(p => p.pattern_type === 'category_spike');
  const hasNightShopping = patternResult.rows.some(p => p.pattern_type === 'night_shopping');
  const hasStressSpending = patternResult.rows.some(p => p.pattern_type === 'stress_spending');

  // Tasarruf oranı
  const savingRate = monthlyIncome > 0 
    ? ((monthlyIncome - avgMonthly) / monthlyIncome) * 100 
    : 0;

  return {
    saving_score:    Math.max(0, Math.min(100, savingRate * 2.5)), // %20 tasarruf = 50, %40 = 100
    impulse_score:   hasCategorySpike ? 75 : (hasStressSpending ? 60 : 35),
    night_score:     totalSpend > 0 ? (nightSpend / totalSpend) * 100 : 0,
    social_score:    totalSpend > 0 ? (socialSpend / totalSpend) * 100 : 0,
    weekend_score:   totalSpend > 0 ? (weekendSpend / totalSpend) * 100 : 0,
    volatility_score: Math.round(volatilityScore),
    diversity_score: Object.keys(categoryMap).length * 10, // çeşitlilik
    online_ratio:    totalSpend > 0 ? (onlineSpend / totalSpend) * 100 : 0,
    has_category_spike: hasCategorySpike,
    has_night_shopping: hasNightShopping,
    has_stress_spending: hasStressSpending,
    monthly_avg: Math.round(avgMonthly),
    saving_rate: Math.round(savingRate),
  };
};

// ─────────────────────────────────────────────────────────────
// KARAR AĞACI — Hangi persona uyuyor?
// ─────────────────────────────────────────────────────────────
const decidePersonaType = (m) => {
  // Veri yoksa default Koruyucu
  if (!m) return 'koruyucu';

  // Yüksek volatilite → Kumarbaz
  if (m.volatility_score >= 50) return 'kumarbaz';

  // Yüksek gece/sosyal → Ateşböceği
  if (m.social_score >= 30 || m.night_score >= 15 || m.has_night_shopping) {
    return 'atesbocegi';
  }

  // Yüksek dürtüsel + kategori spike → Avcı
  if (m.impulse_score >= 60 || m.has_category_spike || m.online_ratio >= 25) {
    return 'avci';
  }

  // Yüksek tasarruf → Karınca
  if (m.saving_score >= 50) return 'karinca';

  // Düşük çeşitlilik, düşük harcama → Koruyucu
  if (m.diversity_score <= 30) return 'koruyucu';

  // Default: Karınca
  return 'karinca';
};

// ─────────────────────────────────────────────────────────────
// AI DESTEKLİ KİŞİSEL TAVSİYE
// ─────────────────────────────────────────────────────────────
const generatePersonalAdvice = async (personaType, metrics) => {
  const persona = PERSONAS[personaType];

  const prompt = `
Sen empatik bir kişisel finans koçusun.

Kullanıcının para kişiliği: ${persona.name} ${persona.icon}
Tanım: ${persona.description}

Metrikler:
- Aylık ortalama harcama: ${metrics.monthly_avg} TL
- Tasarruf oranı: %${metrics.saving_rate}
- Gece harcama oranı: %${Math.round(metrics.night_score)}
- Sosyal harcama oranı: %${Math.round(metrics.social_score)}
- Aylık dalgalanma: %${metrics.volatility_score}

GÖREV:
${persona.name} kişiliğine özel, 2-3 cümlelik samimi bir tavsiye yaz.
Tavsiye somut, uygulanabilir ve umut verici olsun.
"Sen" diliyle, suçlayıcı olmadan, yönlendirici ol.

Sadece tavsiye metnini döndür, başka hiçbir şey yazma.
`;

  try {
    const advice = await chat(prompt, 'flash');
    return advice.trim();
  } catch (err) {
    console.error('Persona advice hatası:', err.message);
    return `${persona.name} olarak güçlü yanların var. Bu ay küçük bir iyileştirme dene.`;
  }
};

// ─────────────────────────────────────────────────────────────
// ANA FONKSİYON
// ─────────────────────────────────────────────────────────────
const getMoneyPersona = async (userId) => {
  console.log('🎭 Para Kişiliği analiz ediliyor...');

  const metrics = await calculateMetrics(userId);

  if (!metrics) {
    return {
      error: 'Henüz yeterli işlem verisi yok. Önce banka ekstreni yükle.',
    };
  }

  const personaType = decidePersonaType(metrics);
  const persona     = PERSONAS[personaType];
  const advice      = await generatePersonalAdvice(personaType, metrics);

  return {
    ...persona,
    advice,
    metrics: {
      saving_score:     Math.round(metrics.saving_score),
      impulse_score:    Math.round(metrics.impulse_score),
      night_score:      Math.round(metrics.night_score),
      social_score:     Math.round(metrics.social_score),
      weekend_score:    Math.round(metrics.weekend_score),
      volatility_score: Math.round(metrics.volatility_score),
      monthly_avg:      metrics.monthly_avg,
      saving_rate:      metrics.saving_rate,
    },
    all_personas: Object.values(PERSONAS).map(p => ({
      type: p.type,
      name: p.name,
      icon: p.icon,
      color: p.color,
      is_current: p.type === personaType,
    })),
  };
};

module.exports = { getMoneyPersona, PERSONAS };
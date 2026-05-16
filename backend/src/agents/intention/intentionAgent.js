'use strict';

const { chat }   = require('../../utils/gemini');
const { chatJSON } = require('../../utils/gemini');
const { pool }     = require('../../db');
const { z }        = require('zod');

// ─────────────────────────────────────────────────────────────
// ZOD ŞEMALARI
// ─────────────────────────────────────────────────────────────
const IntentionResultSchema = z.object({
  goal_type:       z.string(),
  description:     z.string(),
  target_value:    z.number().nullable(),
  actual_value:    z.number().nullable(),
  achievement_pct: z.number().nullable(),
  status:          z.enum(['success','partial','failed','succeeded','completed','achieved']),
  analysis:        z.string(),
});

const BetrayalReportSchema = z.object({
  betrayal_score:    z.number().min(0).max(100),
  summary:           z.string(),
  intention_results: z.array(IntentionResultSchema),
  betrayal_days:     z.array(z.object({
    date:              z.string(),
    day_name:          z.string(),
    total_spent:       z.number(),
    broken_intentions: z.array(z.string()),
    note:              z.string(),
  })),
  pattern:       z.string(),
  single_change: z.string(),
});

const SuggestionSchema = z.object({
  suggestions: z.array(z.object({
    goal_type:    z.string(),
    description:  z.string(),
    target_value: z.number().nullable(),
  })),
  reasoning: z.string(),
});

// ─────────────────────────────────────────────────────────────
// SYSTEM INSTRUCTIONS
// ─────────────────────────────────────────────────────────────
const BETRAYAL_SYSTEM = `
Sen bir Davranışsal Finans Analistsin.
Kullanıcının kendine verdiği sözleri ne kadar tuttuğunu
objektif olarak ölçüyorsun.

KURALLAR:
1. Sadece geçerli JSON döndür. Markdown YASAK.
2. Yüzde hesaplamalarını doğru yap.
3. Suçlayıcı değil, gözlemci bir dil kullan.
4. Her bulgu için somut veri göster.
5. Aldatma katsayısı 0-100 arasında olacak.
   0 = tüm sözler tutuldu, 100 = hiçbir söz tutulmadı.
6. status alanı için SADECE şu değerleri kullan: failed, partial, success
`.trim();

const SUGGESTION_SYSTEM = `
Sen empatik bir Kişisel Finans Koçusun.
Geçmiş verilere bakarak kullanıcı için gerçekçi,
ulaşılabilir hedefler öneriyorsun.

KURALLAR:
1. Sadece geçerli JSON döndür.
2. Maksimum 3 öneri ver.
3. Hedefler gerçekçi olsun — çok iddialı önerme.
4. Geçmişteki başarısızlıklardan ders çıkar.
`.trim();

// ─────────────────────────────────────────────────────────────
// JSON PARSE YARDIMCISI — Kesilmiş JSON'u kurtarır
// ─────────────────────────────────────────────────────────────
const safeParseJSON = (text) => {
  // Önce direkt parse dene
  try {
    return JSON.parse(text);
  } catch {}

  // JSON bloğunu bul
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON bloğu bulunamadı');

  let str = jsonMatch[0];

  // Direkt parse dene
  try {
    return JSON.parse(str);
  } catch {}

  // Kesilmişse kapat
  const openBraces    = (str.match(/{/g)  || []).length;
  const closeBraces   = (str.match(/}/g)  || []).length;
  const openBrackets  = (str.match(/\[/g) || []).length;
  const closeBrackets = (str.match(/]/g)  || []).length;

  for (let i = 0; i < openBrackets - closeBrackets; i++) str += ']';
  for (let i = 0; i < openBraces   - closeBraces;   i++) str += '}';

  return JSON.parse(str);
};

// ─────────────────────────────────────────────────────────────
// ALDATMA RAPORU ÜRET
// ─────────────────────────────────────────────────────────────
const generateBetrayalReport = async (userId, month, year) => {
  console.log(`📊 Aldatma raporu: ${month}/${year}`);

  // 1. Sözleri çek
  const intentionsResult = await pool.query(
    `SELECT * FROM intentions
     WHERE user_id = $1 AND month = $2 AND year = $3`,
    [userId, month, year]
  );
  const intentions = intentionsResult.rows;
  if (intentions.length === 0) {
    return { error: 'Bu ay için söz bulunamadı. Önce söz ver.' };
  }

  // 2. İşlemleri çek — sadece özet gönder (token tasarrufu)
  const txResult = await pool.query(
    `SELECT date, category, amount, merchant, hour
     FROM transactions
     WHERE user_id = $1
       AND EXTRACT(MONTH FROM date) = $2
       AND EXTRACT(YEAR FROM date)  = $3
       AND type = 'debit'
     ORDER BY date ASC`,
    [userId, month, year]
  );
  const transactions = txResult.rows;

  // 3. Kullanıcı geliri
  const userResult = await pool.query(
    'SELECT monthly_income FROM users WHERE id = $1',
    [userId]
  );
  const userIncome = userResult.rows[0]?.monthly_income;

  // Kategori özeti
  const categorySummary = transactions.reduce((acc, t) => {
    const cat = t.category || 'Diğer';
    acc[cat] = (acc[cat] || 0) + parseFloat(t.amount);
    return acc;
  }, {});

  const totalSpent = transactions
    .reduce((s, t) => s + parseFloat(t.amount), 0)
    .toFixed(0);

  // 4. Gemini analizi
  const prompt = `
Kullanıcının ${month}/${year} ayına ait söz ve harcama verilerini analiz et.

VERİLEN SÖZLER:
${JSON.stringify(intentions.map(i => ({
  goal_type:   i.goal_type,
  description: i.goal_description,
  target:      i.target_value,
})), null, 2)}

KATEGORİ BAZLI HARCAMALAR:
${JSON.stringify(categorySummary, null, 2)}

TOPLAM HARCAMA: ${totalSpent} TL
İŞLEM SAYISI: ${transactions.length}
AYLIK GELİR: ${userIncome || 'Bilinmiyor'} TL

Şu JSON formatında döndür (başka hiçbir şey yazma):
{
  "betrayal_score": 75,
  "summary": "kısa özet",
  "intention_results": [
    {
      "goal_type": "savings",
      "description": "1500 TL tasarruf",
      "target_value": 1500,
      "actual_value": 180,
      "achievement_pct": 12,
      "status": "failed",
      "analysis": "kısa analiz"
    }
  ],
  "betrayal_days": [
    {
      "date": "2026-02-07",
      "day_name": "Cuma",
      "total_spent": 720,
      "broken_intentions": ["söz açıklaması"],
      "note": "kısa not"
    }
  ],
  "pattern": "kısa patern açıklaması",
  "single_change": "tek öneri"
}

ÖNEMLİ: status için SADECE failed, partial veya success kullan.
`;

  // 5. Gemini'a gönder — chat kullan, sonra manuel parse et
  let raw;
  try {
    const rawText = await chat(prompt, 'pro', BETRAYAL_SYSTEM);
    raw = safeParseJSON(rawText);
  } catch (err) {
    console.error('❌ Gemini/Parse hatası:', err.message);
    throw new Error('AI analizi sırasında hata oluştu. Lütfen tekrar dene.');
  }

  // 6. Zod ile doğrula (hata fırlatma, sadece uyar)
  const validated = BetrayalReportSchema.safeParse(raw);
  const report    = validated.success ? validated.data : raw;

  if (!validated.success) {
    console.warn('⚠️  Zod uyarısı:', validated.error.flatten());
  }

  // 7. DB'ye kaydet (atomik)
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const ir of report.intention_results || []) {
      await client.query(
        `UPDATE intentions
         SET actual_value = $1, status = $2
         WHERE user_id = $3 AND month = $4 AND year = $5
           AND goal_type = $6`,
        [ir.actual_value, ir.status, userId, month, year, ir.goal_type]
      );
    }

    await client.query(
      `INSERT INTO reports
         (user_id, month, year, betrayal_score, analysis, recommendations)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, year, month)
       DO UPDATE SET
         betrayal_score  = EXCLUDED.betrayal_score,
         analysis        = EXCLUDED.analysis,
         recommendations = EXCLUDED.recommendations`,
      [
        userId, month, year,
        report.betrayal_score,
        JSON.stringify(report),
        JSON.stringify({ single_change: report.single_change }),
      ]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return report;
};

// ─────────────────────────────────────────────────────────────
// SONRAKI AY İÇİN SÖZ ÖNERİSİ
// ─────────────────────────────────────────────────────────────
const suggestIntentions = async (userId) => {
  console.log('💡 Söz önerileri üretiliyor...');

  const patternResult = await pool.query(
    `SELECT description, pattern_type FROM patterns
     WHERE user_id = $1
     ORDER BY detected_at DESC LIMIT 5`,
    [userId]
  );

  const reportResult = await pool.query(
    `SELECT month, year, betrayal_score
     FROM reports
     WHERE user_id = $1
     ORDER BY year DESC, month DESC LIMIT 3`,
    [userId]
  );

  if (patternResult.rows.length === 0) {
    return {
      suggestions: [
        { goal_type: 'savings',    description: 'Bu ay 1.000 TL tasarruf et',         target_value: 1000 },
        { goal_type: 'food',       description: 'Yemek dışarı harcamasını %30 azalt', target_value: null },
        { goal_type: 'night_shop', description: 'Gece 22:00 sonrası alışveriş yapma', target_value: null },
      ],
      reasoning: 'Henüz yeterli veri yok, genel öneriler sunuldu.',
    };
  }

  const prompt = `
Kullanıcının geçmiş verilerine bakarak önümüzdeki ay için
gerçekçi 3 adet finansal söz öner.

TESPİT EDİLEN PATERNLER:
${JSON.stringify(patternResult.rows, null, 2)}

GEÇMIŞ RAPORLAR:
${JSON.stringify(reportResult.rows, null, 2)}

Şu JSON formatında döndür:
{
  "suggestions": [
    {
      "goal_type": "savings",
      "description": "Bu ay 800 TL tasarruf et",
      "target_value": 800
    }
  ],
  "reasoning": "Geçmiş veriler gösteriyor ki..."
}

goal_type: savings | food | night_shop | transport | online_shopping | custom
`;

  let raw;
  try {
    const rawText = await chat(prompt, 'flash', SUGGESTION_SYSTEM);
    raw = safeParseJSON(rawText);
  } catch {
    return {
      suggestions: [
        { goal_type: 'savings',    description: 'Bu ay 1.000 TL tasarruf et',         target_value: 1000 },
        { goal_type: 'food',       description: 'Yemek dışarı harcamasını %30 azalt', target_value: null },
        { goal_type: 'night_shop', description: 'Gece 22:00 sonrası alışveriş yapma', target_value: null },
      ],
      reasoning: 'AI önerisi alınamadı, varsayılan öneriler gösteriliyor.',
    };
  }

  const validated = SuggestionSchema.safeParse(raw);
  return validated.success ? validated.data : raw;
};

module.exports = { generateBetrayalReport, suggestIntentions };
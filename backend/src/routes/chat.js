'use strict';

const express        = require('express');
const { mediumCache, getOrSet } = require('../services/cache');
const authMiddleware = require('../middleware/auth');
const { routeMessage, MODULES } = require('../agents/router/routerAgent');

const { runForensicAnalysis }        = require('../agents/forensic/forensicAgent');
const { futureSelfChat, simulateScenario } = require('../agents/future-self/futureSelfAgent');
const { calculateHealthScore }       = require('../agents/health/healthAgent');
const { getMoneyPersona }            = require('../agents/persona/personaAgent');
const { chat, chatJSON }             = require('../utils/gemini');
const { pool }                       = require('../db');

const router = express.Router();

// ── Tek Chat Endpoint
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Mesaj boş olamaz' });
    }

    const route = await routeMessage(message);
    console.log(`🧭 Yönlendirme: ${route.module} (${(route.confidence * 100).toFixed(0)}%)`);

    let agentResponse;
    switch (route.module) {
      case 'forensic':    agentResponse = await handleForensic(req.userId, message); break;
      case 'future-self': agentResponse = await handleFutureSelf(req.userId, message); break;
      case 'what-if':     agentResponse = await handleWhatIf(req.userId, message); break;
      case 'intention':   agentResponse = await handleIntention(req.userId, message); break;
      case 'health':      agentResponse = await handleHealth(req.userId); break;
      case 'persona':     agentResponse = await handlePersona(req.userId); break;
      default:            agentResponse = await handleGeneral(req.userId, message); break;
    }

    res.json({
      routing: {
        module:      route.module,
        module_name: route.name,
        module_icon: route.icon,
        module_color: route.color,
        confidence:  route.confidence,
      },
      ...agentResponse,
    });

  } catch (err) { next(err); }
});

router.get('/modules', (req, res) => {
  const modules = Object.values(MODULES).filter(m => m.key !== 'general');
  res.json({ modules });
});

// ─────────────────────────────────────────────────────────────
// HANDLERS
// ─────────────────────────────────────────────────────────────

const handleForensic = async (userId, message) => {
  const normalizedMsg = message.toLowerCase().trim();
  const cacheKey = `${userId}:forensic:${normalizedMsg}`;
  return await getOrSet(mediumCache, cacheKey, async () => {
    const now = new Date();
    const result = await runForensicAnalysis(
      userId, message, now.getMonth() + 1, now.getFullYear()
    );
    return {
      answer: result.answer || result.error,
      data: {
        patterns:        result.patterns || null,
        comparison:      result.comparison || null,
        recommendations: result.recommendations || null,
      },
    };
  });
};

const handleFutureSelf = async (userId, message) => {
  const result = await futureSelfChat(userId, message);
  return {
    answer: result.answer,
    data: {
      projection:     result.projection || null,
      persona_summary: result.persona_summary || null,
    },
  };
};

const handleWhatIf = async (userId, message) => {
  const amountMatch = message.match(/(\d+[\.,]?\d*)\s*(tl|lira|₺)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 500;
  const isExpense = /alsam|harcasam|versem|ödesem/i.test(message);
  const changeType = isExpense ? 'expense' : 'save';

  const result = await simulateScenario(userId, message, amount, changeType);
  return {
    answer: result.story || result.error,
    data: {
      scenario:    result.scenario || null,
      diff_5year:  result.diff_5year || null,
      milestones:  result.milestones || null,
    },
  };
};

// ─────────────────────────────────────────────────────────────
// INTENTION — GERÇEKTEN SÖZ KAYDEDER
// ─────────────────────────────────────────────────────────────
const INTENTION_PARSE_SYSTEM = `
Sen finansal söz/hedef parser'sın. Kullanıcının mesajından söz bilgilerini çıkar.

Sadece JSON döndür:
{
  "is_promise": true/false,
  "goal_type": "savings" | "food" | "night_shop" | "transport" | "online_shopping" | "entertainment" | "custom",
  "goal_description": "kullanıcının söz açıklaması",
  "target_value": sayı veya null,
  "month": 1-12,
  "year": 2026
}

ÖRNEKLER:
"Bu ay 1500 TL tasarruf edeceğim" 
→ {"is_promise":true,"goal_type":"savings","goal_description":"Bu ay 1500 TL tasarruf et","target_value":1500,"month":<şu ay>,"year":<şu yıl>}

"Yemek dışarı harcamamı yarıya indireceğim"
→ {"is_promise":true,"goal_type":"food","goal_description":"Yemek dışarı harcamasını yarıya indir","target_value":null,"month":<şu ay>,"year":<şu yıl>}

"sözlerimi göster" veya "ne söz vermiştim"
→ {"is_promise":false}

KURALLAR:
1. Sadece JSON, markdown yok
2. Şu anki ay/yıl: ${new Date().getMonth() + 1}/${new Date().getFullYear()}
3. Eğer mesaj söz değilse is_promise: false
`.trim();

const handleIntention = async (userId, message) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear  = now.getFullYear();

  // 1. Gemini'a sor: bu söz mü, durum sorgusu mu?
  let parsed;
  try {
    parsed = await chatJSON(
      `Mesaj: "${message}"\n\nŞu an: ${currentMonth}/${currentYear}\n\nParse et:`,
      'lite',
      INTENTION_PARSE_SYSTEM
    );
  } catch (err) {
    parsed = { is_promise: false };
  }

  // 2. SÖZ VERİYORSA → DB'ye kaydet
  if (parsed.is_promise && parsed.goal_description) {
    try {
      const result = await pool.query(
        `INSERT INTO intentions
           (user_id, month, year, goal_type, goal_description, target_value)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          userId,
          parsed.month || currentMonth,
          parsed.year  || currentYear,
          parsed.goal_type || 'custom',
          parsed.goal_description,
          parsed.target_value || null,
        ]
      );

      const intention = result.rows[0];
      const targetStr = intention.target_value 
        ? ` Hedef: ${parseFloat(intention.target_value).toLocaleString('tr-TR')} TL.`
        : '';

      return {
        answer: `✅ Sözün kaydedildi!\n\n` +
                `**"${intention.goal_description}"**${targetStr}\n\n` +
                `Ay sonunda Söz Aynası raporunu oluşturup ne kadar tuttuğunu göreceğiz. ` +
                `Başka bir söz vermek istersen söyle!`,
        data: { 
          action: 'intention_created',
          intention,
        },
      };
    } catch (err) {
      console.error('Söz kaydetme hatası:', err);
      return {
        answer: 'Sözünü kaydederken bir sorun oluştu. Lütfen tekrar dene.',
        data: { error: err.message },
      };
    }
  }

  // 3. SÖZ DEĞİL → Mevcut sözleri göster
  const result = await pool.query(
    `SELECT * FROM intentions 
     WHERE user_id = $1 AND month = $2 AND year = $3
     ORDER BY created_at DESC`,
    [userId, currentMonth, currentYear]
  );

  if (result.rows.length === 0) {
    return {
      answer: `Bu ay henüz söz vermemişsin. 🪞\n\n` +
              `Örnek söz: "Bu ay 1500 TL tasarruf edeceğim" yazarsan kaydederim.\n\n` +
              `İstersen geçmiş aylara da bakabilirim, sadece söyle.`,
      data: { intentions: [] },
    };
  }

  const statusEmoji = { 
    active: '⏳', success: '✅', completed: '✅', 
    partial: '🟡', failed: '❌' 
  };

  const intentionList = result.rows.map(i => {
    const emoji = statusEmoji[i.status] || '⏳';
    const target = i.target_value ? ` (${parseFloat(i.target_value).toLocaleString('tr-TR')} TL)` : '';
    return `${emoji} ${i.goal_description}${target}`;
  }).join('\n');

  return {
    answer: `**Bu ayki sözlerin:**\n\n${intentionList}\n\n` +
            `Toplam ${result.rows.length} söz var. Yeni söz vermek için söyle!`,
    data: { intentions: result.rows },
  };
};

const handleHealth = async (userId) => {
  const result = await calculateHealthScore(userId);
  return {
    answer: `**Finansal sağlık skorun: ${result.score}/100** (${result.grade})\n\n` +
            `${result.status}\n\n` +
            `**Detaylar:**\n` +
            `• Tasarruf: ${result.breakdown.saving.score}/100\n` +
            `• Söz Tutma: ${result.breakdown.promise.score}/100\n` +
            `• Harcama Trendi: ${result.breakdown.trend.score}/100\n` +
            `• Risk: ${result.breakdown.risk.score}/100\n\n` +
            `💡 ${result.advice}`,
    data: result,
  };
};

const handlePersona = async (userId) => {
  const result = await getMoneyPersona(userId);
  if (result.error) return { answer: result.error, data: null };

  return {
    answer: `${result.icon} **${result.title}**\n\n${result.description}\n\n` +
            `**Güçlü yanların:**\n${result.strengths.map(s => `• ${s}`).join('\n')}\n\n` +
            `**Dikkat:**\n${result.weaknesses.map(w => `• ${w}`).join('\n')}\n\n` +
            `💡 ${result.advice}`,
    data: result,
  };
};

const handleGeneral = async (userId, message) => {
  const userResult = await pool.query(
    'SELECT name, monthly_income FROM users WHERE id = $1', [userId]
  );
  const user = userResult.rows[0];

  const prompt = `
Sen Finans Aynası AI asistanısın. Kullanıcının adı: ${user?.name || 'Kullanıcı'}.

Kullanıcı mesajı: "${message}"

KURALLAR:
1. Türkçe, samimi, 80-150 kelime.
2. Modüllere yönlendir:
   - 🕵️ Harcama analizi → "Harcamalarımı analiz et" sorabilir
   - 🔮 Gelecek → "5 yıl sonra nasıl olacağım?"
   - 🎲 What-If → "Sigarayı bıraksam ne olur?"
   - 🪞 Söz Aynası → "Bu ay X yapacağım" diyerek söz verebilir
   - 🏥 Sağlık skoru → "Finansal sağlığım nasıl?"
   - 🎭 Para Kişiliği → "Ben nasıl bir harcayıcıyım?"
3. Samimi ol, emoji kullan ama abartma.
`;

  const answer = await chat(prompt, 'flash');
  return { answer, data: null };
};

module.exports = router;
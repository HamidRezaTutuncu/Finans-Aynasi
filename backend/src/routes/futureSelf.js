const express        = require('express');
const { z }          = require('zod');
const authMiddleware = require('../middleware/auth');
const { pool }       = require('../db');
const {
  futureSelfChat,
  getProjections,
  buildPersona,
} = require('../agents/future-self/futureSelfAgent');

const router = express.Router();

const ChatSchema = z.object({
  message: z.string().min(1).max(1000),
});

// ── Future Self ile sohbet
router.post('/chat', authMiddleware, async (req, res, next) => {
  try {
    const parsed = ChatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error:   'Mesaj gerekli',
        details: parsed.error.flatten(),
      });
    }

    const result = await futureSelfChat(req.userId, parsed.data.message);
    res.json(result);
  } catch (err) { next(err); }
});

// ── Projeksiyon verisi (grafik için)
router.get('/projection', authMiddleware, async (req, res, next) => {
  try {
    const projections = await getProjections(req.userId);
    res.json(projections);
  } catch (err) { next(err); }
});

// ── Persona özeti (dashboard için)
router.get('/persona', authMiddleware, async (req, res, next) => {
  try {
    const persona = await buildPersona(req.userId);
    res.json({
      future_age:     (persona.user?.age || 25) + 5,
      future_year:    new Date().getFullYear() + 5,
      monthly_saving: persona.monthlySaving,
      avg_spend:      persona.avgSpend,
      avg_betrayal:   persona.avgBetrayal,
      patterns:       persona.patterns,
    });
  } catch (err) { next(err); }
});

// ── Sohbet geçmişi
router.get('/history', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT role, content, created_at
       FROM conversations
       WHERE user_id = $1 AND module = 'future-self'
       ORDER BY created_at ASC
       LIMIT 50`,
      [req.userId]
    );
    res.json({ history: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;
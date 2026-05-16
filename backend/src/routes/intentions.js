const express            = require('express');
const { z }              = require('zod');
const authMiddleware     = require('../middleware/auth');
const { pool }           = require('../db');
const { generateReportPDF } = require('../services/pdf/reportPdf');
const {
  generateBetrayalReport,
  suggestIntentions,
} = require('../agents/intention/intentionAgent');

const router = express.Router();

// Söz ekleme şeması
const AddIntentionSchema = z.object({
  month:            z.number().int().min(1).max(12),
  year:             z.number().int().min(2024).max(2030),
  goal_type:        z.string().min(1),
  goal_description: z.string().min(3),
  target_value:     z.number().positive().nullable().optional(),
});

// ── Söz ekle
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const parsed = AddIntentionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error:   'Geçersiz veri',
        details: parsed.error.flatten(),
      });
    }

    const { month, year, goal_type, goal_description, target_value } = parsed.data;

    const result = await pool.query(
      `INSERT INTO intentions
         (user_id, month, year, goal_type, goal_description, target_value)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [req.userId, month, year, goal_type, goal_description, target_value || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── Aya ait sözleri listele
router.get('/:month/:year', authMiddleware, async (req, res, next) => {
  try {
    const month = parseInt(req.params.month);
    const year  = parseInt(req.params.year);

    const result = await pool.query(
      `SELECT * FROM intentions
       WHERE user_id = $1 AND month = $2 AND year = $3
       ORDER BY created_at ASC`,
      [req.userId, month, year]
    );

    res.json({ intentions: result.rows, count: result.rows.length });
  } catch (err) { next(err); }
});

// ── Aldatma raporu üret
router.get('/report/:month/:year', authMiddleware, async (req, res, next) => {
  try {
    const month = parseInt(req.params.month);
    const year  = parseInt(req.params.year);

    if (isNaN(month) || isNaN(year)) {
      return res.status(400).json({ error: 'Geçersiz ay veya yıl' });
    }

    const report = await generateBetrayalReport(req.userId, month, year);
    res.json(report);
  } catch (err) { next(err); }
});

// ── Kaydedilmiş raporu getir (tekrar üretmeden)
router.get('/report/:month/:year/cached', authMiddleware, async (req, res, next) => {
  try {
    const month = parseInt(req.params.month);
    const year  = parseInt(req.params.year);

    const result = await pool.query(
      `SELECT * FROM reports
       WHERE user_id = $1 AND month = $2 AND year = $3`,
      [req.userId, month, year]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Rapor bulunamadı. Önce rapor üret.' });
    }

    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── AI destekli söz önerisi
router.get('/suggestions', authMiddleware, async (req, res, next) => {
  try {
    const suggestions = await suggestIntentions(req.userId);
    res.json(suggestions);
  } catch (err) { next(err); }
});

// ── Söz sil
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    await pool.query(
      'DELETE FROM intentions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    res.json({ message: 'Söz silindi' });
  } catch (err) { next(err); }
});
// ── Raporu PDF olarak indir
router.get('/report/:month/:year/pdf', authMiddleware, async (req, res, next) => {
  try {
    const month = parseInt(req.params.month);
    const year  = parseInt(req.params.year);

    if (isNaN(month) || isNaN(year)) {
      return res.status(400).json({ error: 'Geçersiz ay veya yıl' });
    }

    const pdfBuffer = await generateReportPDF(req.userId, month, year);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="finans-aynasi-${year}-${String(month).padStart(2, '0')}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (err) {
    if (err.message.includes('rapor bulunamadı')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
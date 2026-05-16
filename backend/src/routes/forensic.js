const express        = require('express');
const authMiddleware = require('../middleware/auth');
const { runForensicAnalysis } = require('../agents/forensic/forensicAgent');
const { pool } = require('../db');
const router = express.Router();

// ── Kullanıcıya ait tüm işlemlerin özeti
router.get('/summary', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
         COUNT(*)                                    AS total_count,
         SUM(CASE WHEN type='debit' THEN amount END) AS total_spent,
         SUM(CASE WHEN type='credit' THEN amount END) AS total_income,
         MIN(date) AS earliest_date,
         MAX(date) AS latest_date,
         json_object_agg(category, cat_total) AS by_category
       FROM (
         SELECT *, SUM(amount) OVER (PARTITION BY category) AS cat_total
         FROM transactions WHERE user_id = $1 AND type = 'debit'
       ) sub`,
      [req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── Kullanıcıya ait işlem listesi (filtreli)
router.get('/transactions', authMiddleware, async (req, res, next) => {
  try {
    const { month, year, category, limit = 100 } = req.query;
    let query = `SELECT * FROM transactions WHERE user_id = $1`;
    const params = [req.userId];

    if (month && year) {
      params.push(year, month);
      query += ` AND EXTRACT(YEAR FROM date) = $${params.length - 1}
                 AND EXTRACT(MONTH FROM date) = $${params.length}`;
    }
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    query += ` ORDER BY date DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json({ transactions: result.rows, count: result.rows.length });
  } catch (err) { next(err); }
});

// ── Ana forensic soru-cevap endpoint'i
router.post('/ask', authMiddleware, async (req, res, next) => {
  try {
    const { question, month, year } = req.body;
    if (!question?.trim()) {
      return res.status(400).json({ error: 'Soru boş olamaz' });
    }

    const result = await runForensicAnalysis(
      req.userId,
      question,
      month ? parseInt(month) : null,
      year  ? parseInt(year)  : null
    );

    res.json(result);
  } catch (err) { next(err); }
});

// ── Sadece pattern'leri getir (dashboard için)
router.get('/patterns', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM patterns 
       WHERE user_id = $1 
       ORDER BY detected_at DESC 
       LIMIT 20`,
      [req.userId]
    );
    res.json({ patterns: result.rows });
  } catch (err) { next(err); }
});

// ── Konuşma geçmişi
router.get('/history', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT role, content, created_at 
       FROM conversations 
       WHERE user_id = $1 AND module = 'forensic'
       ORDER BY created_at ASC
       LIMIT 50`,
      [req.userId]
    );
    res.json({ history: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;
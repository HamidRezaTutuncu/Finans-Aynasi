const express = require('express');
const { pool } = require('../db');
const { mockTransactions } = require('../data/mockTransactions');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// SADECE development ortamında kullan
router.post('/mock-data', authMiddleware, async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Production ortamında yasak' });
  }
  try {
    const client = await pool.connect();
    let count = 0;
    try {
      await client.query('BEGIN');
      // Önce mevcut test verisini temizle
      await client.query(
        'DELETE FROM transactions WHERE user_id = $1', [req.userId]
      );
      for (const t of mockTransactions) {
        await client.query(
          `INSERT INTO transactions
             (user_id,date,hour,description,amount,type,category,merchant)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [req.userId,t.date,t.hour,t.description,
           t.amount,t.type,t.category,t.merchant]
        );
        count++;
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    res.json({ message: `${count} mock işlem yüklendi` });
  } catch (err) { next(err); }
});

module.exports = router;
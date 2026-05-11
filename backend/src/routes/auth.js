const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { pool } = require('../db');
const router   = express.Router();

// ── KAYIT ────────────────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, age, city, monthly_income } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'İsim, email ve şifre zorunlu' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, age, city, monthly_income)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, name, email, created_at`,
      [name, email, hash, age || null, city || null, monthly_income || null]
    );

    const user  = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Bu email zaten kayıtlı' });
    }
    next(err);
  }
});

// ── GİRİŞ ────────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre zorunlu' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Email veya şifre hatalı' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
});

// ── PROFİL ───────────────────────────────────────────────────────
router.get('/me', require('../middleware/auth'), async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, age, city, monthly_income, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');

const app = express();

// ── Güvenlik & Middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// ── Routes ────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

app.use('/api/auth',        authRoutes);
app.use('/api/upload',      uploadRoutes);
app.use('/api/forensic',    require('./routes/forensic'));
app.use('/api/intentions',  require('./routes/intentions'));
app.use('/api/future-self', require('./routes/futureSelf'));
app.use('/api/health',      require('./routes/health'));
app.use('/api/persona',     require('./routes/persona'));

// Mock data — sadece dev ortamında aktif
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/seed', require('./routes/seed'));
}

// ── Merkezi Hata Handler ──────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Sunucu hatası';
  console.error(`[ERROR] ${status} — ${message}`, err.stack || '');
  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`🚀 FinansAynasi server: http://localhost:${PORT}`)
);
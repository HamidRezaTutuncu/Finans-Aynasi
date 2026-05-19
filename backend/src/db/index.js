const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false  // ← EKLE!
  },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => console.error('❌ DB bağlantı hatası:', err));

// Basit test fonksiyonu
const testConnection = async () => {
  const client = await pool.connect();
  const res = await client.query('SELECT NOW()');
  client.release();
  console.log('✅ DB bağlantısı OK:', res.rows[0].now);
};

module.exports = { pool, testConnection };

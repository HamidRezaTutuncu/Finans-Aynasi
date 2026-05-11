require('dotenv').config();
const { pool } = require('./index');

const run = async () => {
  const client = await pool.connect();
  try {
    console.log('🔄 Migration başlıyor...');

    // pgvector extension — yoksa yüklü olmayabilir, hata verirse geç
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
      console.log('✅ pgvector extension hazır');
    } catch {
      console.warn('⚠️  pgvector yüklenemedi, vektör özellikleri devre dışı');
    }

    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // ── USERS ────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        name             VARCHAR(100) NOT NULL,
        email            VARCHAR(150) UNIQUE NOT NULL,
        password_hash    VARCHAR(255) NOT NULL,
        age              INTEGER,
        city             VARCHAR(100),
        monthly_income   DECIMAL(12,2),
        writing_samples  TEXT[],
        created_at       TIMESTAMPTZ  DEFAULT NOW()
      );
    `);

    // ── TRANSACTIONS ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date          DATE         NOT NULL,
        hour          SMALLINT     CHECK (hour BETWEEN 0 AND 23),
        description   TEXT,
        amount        DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
        type          VARCHAR(10)  NOT NULL CHECK (type IN ('debit','credit')),
        category      VARCHAR(100),
        sub_category  VARCHAR(100),
        merchant      VARCHAR(200),
        raw_text      TEXT,
        embedding     vector(768),
        created_at    TIMESTAMPTZ  DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_tx_user      ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_tx_date      ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_tx_category  ON transactions(category);
      CREATE INDEX IF NOT EXISTS idx_tx_type      ON transactions(type);
    `);

    // ── PATTERNS ─────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS patterns (
        id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pattern_type  VARCHAR(100),
        description   TEXT,
        data          JSONB,
        confidence    DECIMAL(4,2) CHECK (confidence BETWEEN 0 AND 1),
        detected_at   TIMESTAMPTZ  DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_pat_user ON patterns(user_id);
    `);

    // ── INTENTIONS / SÖZLER ───────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS intentions (
        id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        month             SMALLINT    NOT NULL CHECK (month BETWEEN 1 AND 12),
        year              INTEGER     NOT NULL,
        goal_type         VARCHAR(100),
        goal_description  TEXT,
        target_value      DECIMAL(12,2),
        actual_value      DECIMAL(12,2),
        status            VARCHAR(20)  DEFAULT 'active'
                          CHECK (status IN ('active','completed','failed')),
        created_at        TIMESTAMPTZ  DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_int_user_month
        ON intentions(user_id, year, month);
    `);

    // ── REPORTS ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        month           SMALLINT    NOT NULL,
        year            INTEGER     NOT NULL,
        betrayal_score  DECIMAL(5,2) CHECK (betrayal_score BETWEEN 0 AND 100),
        analysis        JSONB,
        recommendations JSONB,
        created_at      TIMESTAMPTZ  DEFAULT NOW(),
        UNIQUE (user_id, year, month)
      );
    `);

    // ── CONVERSATIONS ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        module     VARCHAR(50) NOT NULL
                   CHECK (module IN ('forensic','intention','future-self')),
        role       VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant')),
        content    TEXT        NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_conv_user_module
        ON conversations(user_id, module, created_at);
    `);

    // ── PROJECTIONS ───────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS projections (
        id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        scenario   VARCHAR(20) NOT NULL CHECK (scenario IN ('current','optimistic')),
        year       INTEGER     NOT NULL,
        debt       DECIMAL(12,2),
        savings    DECIMAL(12,2),
        net        DECIMAL(12,2),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_id, scenario, year)
      );
    `);

    // ── BUDGETS ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        month      SMALLINT    NOT NULL,
        year       INTEGER     NOT NULL,
        category   VARCHAR(100) NOT NULL,
        limit_amt  DECIMAL(12,2) NOT NULL,
        spent_amt  DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_id, year, month, category)
      );
    `);

    console.log('✅ Tüm tablolar hazır');
  } catch (err) {
    console.error('❌ Migration hatası:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

run().then(() => process.exit(0)).catch(() => process.exit(1));
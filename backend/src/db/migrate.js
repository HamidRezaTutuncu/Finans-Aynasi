'use strict';

const { pool } = require('./index');
const bcrypt = require('bcrypt');

/**
 * Production Migration with Test Data
 * Prospekt - Mirror of Finance
 * 
 * Tablolar:
 * 1. users
 * 2. transactions
 * 3. intentions (Söz Aynası)
 * 4. conversations
 * 5. patterns
 * 6. money_personas
 * 7. health_scores
 * 8. prompts (system instructions)
 */

const migrate = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Migration başladı...\n');

    // ========================================
    // 1. USERS TABLE
    // ========================================
    console.log('📝 Users table oluşturuluyor...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        age INTEGER,
        city VARCHAR(100),
        monthly_income DECIMAL(12,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
    console.log('✅ Users table hazır\n');

    // ========================================
    // 2. TRANSACTIONS TABLE
    // ========================================
    console.log('📝 Transactions table oluşturuluyor...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        hour INTEGER,
        description TEXT,
        amount DECIMAL(12,2) NOT NULL,
        type VARCHAR(20) CHECK (type IN ('debit', 'credit')),
        category VARCHAR(100),
        merchant VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        CONSTRAINT transactions_amount_positive CHECK (amount > 0)
      );
      
      CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(user_id, category);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    `);
    console.log('✅ Transactions table hazır\n');

    // ========================================
    // 3. INTENTIONS TABLE (Söz Aynası)
    // ========================================
    console.log('📝 Intentions table oluşturuluyor...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS intentions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
        year INTEGER NOT NULL,
        goal_type VARCHAR(100),
        goal_description TEXT NOT NULL,
        target_value DECIMAL(12,2),
        actual_value DECIMAL(12,2),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'partial')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(user_id, month, year, goal_description)
      );
      
      CREATE INDEX IF NOT EXISTS idx_intentions_user_month_year ON intentions(user_id, month, year);
    `);
    console.log('✅ Intentions table hazır\n');

    // ========================================
    // 4. CONVERSATIONS TABLE
    // ========================================
    console.log('📝 Conversations table oluşturuluyor...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        module VARCHAR(50) CHECK (module IN ('forensic', 'future-self', 'what-if', 'intention', 'health', 'persona', 'general')),
        role VARCHAR(20) CHECK (role IN ('user', 'assistant')),
        content TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_module ON conversations(user_id, module);
    `);
    console.log('✅ Conversations table hazır\n');

    // ========================================
    // 5. PATTERNS TABLE
    // ========================================
    console.log('📝 Patterns table oluşturuluyor...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS patterns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pattern_type VARCHAR(100),
        description TEXT,
        data JSONB,
        confidence DECIMAL(3,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(user_id, pattern_type, description)
      );
      
      CREATE INDEX IF NOT EXISTS idx_patterns_user ON patterns(user_id);
    `);
    console.log('✅ Patterns table hazır\n');

    // ========================================
    // 6. MONEY_PERSONAS TABLE
    // ========================================
    console.log('📝 Money Personas table oluşturuluyor...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS money_personas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        persona_type VARCHAR(100),
        icon VARCHAR(50),
        title VARCHAR(100),
        description TEXT,
        data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_personas_user ON money_personas(user_id);
    `);
    console.log('✅ Money Personas table hazır\n');

    // ========================================
    // 7. HEALTH_SCORES TABLE
    // ========================================
    console.log('📝 Health Scores table oluşturuluyor...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS health_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        score DECIMAL(5,2) CHECK (score >= 0 AND score <= 100),
        grade VARCHAR(10),
        breakdown JSONB,
        status VARCHAR(255),
        advice TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_health_user_date ON health_scores(user_id, created_at);
    `);
    console.log('✅ Health Scores table hazır\n');

    // ========================================
    // 8. PROMPTS TABLE
    // ========================================
    console.log('📝 Prompts table oluşturuluyor...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS prompts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_name VARCHAR(100) NOT NULL,
        version INTEGER DEFAULT 1,
        system_prompt TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(agent_name, version)
      );
    `);
    console.log('✅ Prompts table hazır\n');

    // ========================================
    // TEST VERİSİ EKLEME
    // ========================================
    console.log('🧪 Test verisi ekleniyor...\n');

    // Test User
    const hashedPassword = await bcrypt.hash('Test123456!', 10);
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, name, age, city, monthly_income)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      ['test@prospekt.com', hashedPassword, 'Ahmet Yılmaz', 28, 'İstanbul', 45000]
    );
    const userId = userResult.rows[0].id;
    console.log(`✅ Test user oluşturuldu: ${userId}`);

    // Test Transactions (3 ay verisi — 92 işlem)
    const transactions = [
      // ŞUBAT 2026
      { date: '2026-02-02', hour: 8, desc: 'STARBUCKS KADIKOY ISTANBUL TR', amount: 145, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-02-03', hour: 12, desc: 'BIM KADIKÖY ISTANBUL TR', amount: 287.50, type: 'debit', cat: 'Market-Gıda', merchant: 'Bim' },
      { date: '2026-02-03', hour: 19, desc: 'YEMEKSEPETI ISTANBUL TR', amount: 165, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Yemeksepeti' },
      { date: '2026-02-04', hour: 9, desc: 'MIGROS ATASHEHIR ISTANBUL TR', amount: 542.30, type: 'debit', cat: 'Market-Gıda', merchant: 'Migros' },
      { date: '2026-02-05', hour: 14, desc: 'TURK TELEKOM MOBIL FATURA ÖDEME', amount: 489.50, type: 'debit', cat: 'Fatura-Abonelik', merchant: 'Türk Telekom' },
      { date: '2026-02-05', hour: 22, desc: 'TRENDYOL.COM ISTANBUL TR', amount: 1245.90, type: 'debit', cat: 'Online-Alışveriş', merchant: 'Trendyol' },
      { date: '2026-02-06', hour: 20, desc: 'MCDONALDS BAGDAT CADDESI ISTANBUL TR', amount: 380, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'McDonalds' },
      { date: '2026-02-06', hour: 21, desc: 'BURGER KING KADIKÖY ISTANBUL TR', amount: 295, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Burger King' },
      { date: '2026-02-06', hour: 23, desc: 'AMAZON.COM.TR ISTANBUL TR', amount: 1890, type: 'debit', cat: 'Online-Alışveriş', merchant: 'Amazon' },
      { date: '2026-02-07', hour: 14, desc: 'MIGROS ATASHEHIR ISTANBUL TR', amount: 867.40, type: 'debit', cat: 'Market-Gıda', merchant: 'Migros' },
      { date: '2026-02-07', hour: 19, desc: 'CINEMAXIMUM AKASYA ISTANBUL TR', amount: 450, type: 'debit', cat: 'Eğlence', merchant: 'CinemaXimum' },
      { date: '2026-02-08', hour: 13, desc: 'DIVAN PASTANE ISTANBUL TR', amount: 320, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Divan' },
      { date: '2026-02-09', hour: 8, desc: 'STARBUCKS KADIKÖY ISTANBUL TR', amount: 155, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-02-10', hour: 12, desc: 'CAFETERIA OFIS ISTANBUL TR', amount: 95, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Cafeteria' },
      { date: '2026-02-10', hour: 18, desc: 'AYAKKABI DUNYASI ISTANBUL TR', amount: 1450, type: 'debit', cat: 'Kişisel-Bakım', merchant: 'Ayakkabı Dünyası' },
      { date: '2026-02-11', hour: 9, desc: 'BIM KADIKÖY ISTANBUL TR', amount: 198.50, type: 'debit', cat: 'Market-Gıda', merchant: 'Bim' },
      { date: '2026-02-11', hour: 23, desc: 'GAMESEEN.COM PLAYSTATION US', amount: 890, type: 'debit', cat: 'Eğlence', merchant: 'GameSeen' },
      { date: '2026-02-12', hour: 14, desc: 'ECZANE FATIH ISTANBUL TR', amount: 245.80, type: 'debit', cat: 'Sağlık', merchant: 'Eczane' },
      { date: '2026-02-13', hour: 13, desc: 'MAAS YATIRMA IS BANKASI', amount: 45000, type: 'credit', cat: 'Maaş-Gelir', merchant: 'İş Bankası' },
      { date: '2026-02-13', hour: 20, desc: 'YEMEKSEPETI ISTANBUL TR', amount: 285, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Yemeksepeti' },
      { date: '2026-02-13', hour: 21, desc: 'STARBUCKS BAGDAT ISTANBUL TR', amount: 175, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-02-13', hour: 23, desc: 'TRENDYOL.COM ISTANBUL TR', amount: 2340, type: 'debit', cat: 'Online-Alışveriş', merchant: 'Trendyol' },
      { date: '2026-02-14', hour: 19, desc: 'KARAKOY LOKANTASI ISTANBUL TR', amount: 1850, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Karaköy Lokantası' },
      { date: '2026-02-14', hour: 20, desc: 'FLO MAGAZA ISTANBUL TR', amount: 1290, type: 'debit', cat: 'Kişisel-Bakım', merchant: 'FLO' },
      { date: '2026-02-15', hour: 11, desc: 'MIGROS BAGDAT ISTANBUL TR', amount: 1245.60, type: 'debit', cat: 'Market-Gıda', merchant: 'Migros' },
      { date: '2026-02-16', hour: 8, desc: 'STARBUCKS KADIKÖY ISTANBUL TR', amount: 155, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-02-17', hour: 12, desc: 'DOMINO PIZZA ISTANBUL TR', amount: 220, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Dominos' },
      { date: '2026-02-17', hour: 18, desc: 'DECATHLON ISTANBUL TR', amount: 875.50, type: 'debit', cat: 'Kişisel-Bakım', merchant: 'Decathlon' },
      { date: '2026-02-18', hour: 10, desc: 'NETFLIX TURKEY ISTANBUL TR', amount: 199.99, type: 'debit', cat: 'Eğlence', merchant: 'Netflix' },
      { date: '2026-02-18', hour: 22, desc: 'HEPSIBURADA.COM ISTANBUL TR', amount: 1567, type: 'debit', cat: 'Online-Alışveriş', merchant: 'Hepsiburada' },
      { date: '2026-02-19', hour: 14, desc: 'BIM KADIKÖY ISTANBUL TR', amount: 342.80, type: 'debit', cat: 'Market-Gıda', merchant: 'Bim' },
      { date: '2026-02-20', hour: 19, desc: 'MCDONALDS ALTUNIZADE ISTANBUL TR', amount: 420, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'McDonalds' },
      { date: '2026-02-20', hour: 22, desc: 'AMAZON.COM.TR ISTANBUL TR', amount: 2890, type: 'debit', cat: 'Online-Alışveriş', merchant: 'Amazon' },
      { date: '2026-02-21', hour: 15, desc: 'CARREFOURSA MARMARA ISTANBUL TR', amount: 985.30, type: 'debit', cat: 'Market-Gıda', merchant: 'Carrefoursa' },
      { date: '2026-02-21', hour: 20, desc: 'STARBUCKS AKASYA ISTANBUL TR', amount: 165, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-02-22', hour: 14, desc: 'DIVAN PASTANE ISTANBUL TR', amount: 285, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Divan' },
      { date: '2026-02-23', hour: 8, desc: 'STARBUCKS KADIKÖY ISTANBUL TR', amount: 155, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-02-24', hour: 11, desc: 'SPOTIFY PREMIUM IRELAND', amount: 59.99, type: 'debit', cat: 'Eğlence', merchant: 'Spotify' },
      { date: '2026-02-24', hour: 19, desc: 'MEDIAMARKT MARMARA ISTANBUL TR', amount: 4250, type: 'debit', cat: 'Online-Alışveriş', merchant: 'MediaMarkt' },
      { date: '2026-02-25', hour: 12, desc: 'TOSLA OFIS YEMEK ISTANBUL TR', amount: 110, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Tosla' },
      { date: '2026-02-26', hour: 14, desc: 'ECZANE BAGCILAR ISTANBUL TR', amount: 187.50, type: 'debit', cat: 'Sağlık', merchant: 'Eczane' },
      { date: '2026-02-27', hour: 20, desc: 'YEMEKSEPETI ISTANBUL TR', amount: 245, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Yemeksepeti' },
      { date: '2026-02-27', hour: 23, desc: 'TRENDYOL.COM ISTANBUL TR', amount: 1875, type: 'debit', cat: 'Online-Alışveriş', merchant: 'Trendyol' },
      { date: '2026-02-28', hour: 13, desc: 'MIGROS BAGDAT ISTANBUL TR', amount: 768.40, type: 'debit', cat: 'Market-Gıda', merchant: 'Migros' },

      // MART 2026
      { date: '2026-03-02', hour: 8, desc: 'STARBUCKS KADIKÖY ISTANBUL TR', amount: 155, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-03-02', hour: 19, desc: 'VODAFONE FATURA ÖDEME', amount: 268.50, type: 'debit', cat: 'Fatura-Abonelik', merchant: 'Vodafone' },
      { date: '2026-03-03', hour: 12, desc: 'DOMINO PIZZA ISTANBUL TR', amount: 195, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Dominos' },
      { date: '2026-03-04', hour: 9, desc: 'MIGROS ATASHEHIR ISTANBUL TR', amount: 645.80, type: 'debit', cat: 'Market-Gıda', merchant: 'Migros' },
      { date: '2026-03-04', hour: 22, desc: 'HEPSIBURADA.COM ISTANBUL TR', amount: 890, type: 'debit', cat: 'Online-Alışveriş', merchant: 'Hepsiburada' },
      { date: '2026-03-05', hour: 14, desc: 'TURK TELEKOM MOBIL FATURA ÖDEME', amount: 489.50, type: 'debit', cat: 'Fatura-Abonelik', merchant: 'Türk Telekom' },
      { date: '2026-03-06', hour: 20, desc: 'MCDONALDS BAGDAT CADDESI ISTANBUL TR', amount: 410, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'McDonalds' },
      { date: '2026-03-06', hour: 21, desc: 'STARBUCKS BAGDAT ISTANBUL TR', amount: 165, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-03-06', hour: 23, desc: 'TRENDYOL.COM ISTANBUL TR', amount: 2150, type: 'debit', cat: 'Online-Alışveriş', merchant: 'Trendyol' },
      { date: '2026-03-07', hour: 15, desc: 'MIGROS BAGDAT ISTANBUL TR', amount: 1120.40, type: 'debit', cat: 'Market-Gıda', merchant: 'Migros' },
      { date: '2026-03-07', hour: 19, desc: 'BURGER KING AKASYA ISTANBUL TR', amount: 320, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Burger King' },
      { date: '2026-03-08', hour: 13, desc: 'DIVAN PASTANE ISTANBUL TR', amount: 350, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Divan' },
      { date: '2026-03-09', hour: 8, desc: 'STARBUCKS KADIKÖY ISTANBUL TR', amount: 155, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-03-10', hour: 12, desc: 'CAFETERIA OFIS ISTANBUL TR', amount: 95, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Cafeteria' },
      { date: '2026-03-10', hour: 18, desc: 'ZARA ISTANBUL TR', amount: 1850, type: 'debit', cat: 'Kişisel-Bakım', merchant: 'Zara' },
      { date: '2026-03-11', hour: 11, desc: 'BIM KADIKÖY ISTANBUL TR', amount: 245.60, type: 'debit', cat: 'Market-Gıda', merchant: 'Bim' },
      { date: '2026-03-12', hour: 13, desc: 'MAAS YATIRMA IS BANKASI', amount: 45000, type: 'credit', cat: 'Maaş-Gelir', merchant: 'İş Bankası' },
      { date: '2026-03-12', hour: 22, desc: 'AMAZON.COM.TR ISTANBUL TR', amount: 1450, type: 'debit', cat: 'Online-Alışveriş', merchant: 'Amazon' },
      { date: '2026-03-13', hour: 20, desc: 'YEMEKSEPETI ISTANBUL TR', amount: 320, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Yemeksepeti' },
      { date: '2026-03-13', hour: 22, desc: 'GAMESEEN.COM PLAYSTATION US', amount: 750, type: 'debit', cat: 'Eğlence', merchant: 'GameSeen' },
      { date: '2026-03-14', hour: 14, desc: 'CARREFOURSA MARMARA ISTANBUL TR', amount: 945.30, type: 'debit', cat: 'Market-Gıda', merchant: 'Carrefoursa' },
      { date: '2026-03-14', hour: 20, desc: 'CINEMAXIMUM AKASYA ISTANBUL TR', amount: 450, type: 'debit', cat: 'Eğlence', merchant: 'CinemaXimum' },
      { date: '2026-03-15', hour: 12, desc: 'STARBUCKS BAGDAT ISTANBUL TR', amount: 145, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-03-16', hour: 8, desc: 'STARBUCKS KADIKÖY ISTANBUL TR', amount: 155, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-03-17', hour: 19, desc: 'MEDIAMARKT MARMARA ISTANBUL TR', amount: 3850, type: 'debit', cat: 'Online-Alışveriş', merchant: 'MediaMarkt' },
      { date: '2026-03-18', hour: 10, desc: 'NETFLIX TURKEY ISTANBUL TR', amount: 199.99, type: 'debit', cat: 'Eğlence', merchant: 'Netflix' },
      { date: '2026-03-18', hour: 23, desc: 'HEPSIBURADA.COM ISTANBUL TR', amount: 1245, type: 'debit', cat: 'Online-Alışveriş', merchant: 'Hepsiburada' },
      { date: '2026-03-19', hour: 14, desc: 'ECZANE FATIH ISTANBUL TR', amount: 215, type: 'debit', cat: 'Sağlık', merchant: 'Eczane' },
      { date: '2026-03-20', hour: 19, desc: 'MCDONALDS ALTUNIZADE ISTANBUL TR', amount: 410, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'McDonalds' },
      { date: '2026-03-20', hour: 21, desc: 'STARBUCKS AKASYA ISTANBUL TR', amount: 175, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-03-20', hour: 23, desc: 'TRENDYOL.COM ISTANBUL TR', amount: 3450, type: 'debit', cat: 'Online-Alışveriş', merchant: 'Trendyol' },
      { date: '2026-03-21', hour: 14, desc: 'MIGROS BAGDAT ISTANBUL TR', amount: 845.20, type: 'debit', cat: 'Market-Gıda', merchant: 'Migros' },
      { date: '2026-03-22', hour: 15, desc: 'DIVAN PASTANE ISTANBUL TR', amount: 295, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Divan' },
      { date: '2026-03-23', hour: 8, desc: 'STARBUCKS KADIKÖY ISTANBUL TR', amount: 155, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-03-24', hour: 11, desc: 'SPOTIFY PREMIUM IRELAND', amount: 59.99, type: 'debit', cat: 'Eğlence', merchant: 'Spotify' },
      { date: '2026-03-24', hour: 19, desc: 'DECATHLON ISTANBUL TR', amount: 1245.50, type: 'debit', cat: 'Kişisel-Bakım', merchant: 'Decathlon' },
      { date: '2026-03-25', hour: 13, desc: 'TOSLA OFIS YEMEK ISTANBUL TR', amount: 110, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Tosla' },
      { date: '2026-03-26', hour: 15, desc: 'ECZANE BAGCILAR ISTANBUL TR', amount: 145, type: 'debit', cat: 'Sağlık', merchant: 'Eczane' },
      { date: '2026-03-26', hour: 22, desc: 'AMAZON.COM.TR ISTANBUL TR', amount: 1890, type: 'debit', cat: 'Online-Alışveriş', merchant: 'Amazon' },
      { date: '2026-03-27', hour: 20, desc: 'YEMEKSEPETI ISTANBUL TR', amount: 295, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Yemeksepeti' },
      { date: '2026-03-27', hour: 23, desc: 'GAMESEEN.COM PLAYSTATION US', amount: 1290, type: 'debit', cat: 'Eğlence', merchant: 'GameSeen' },
      { date: '2026-03-28', hour: 12, desc: 'CARREFOURSA MARMARA ISTANBUL TR', amount: 1245.80, type: 'debit', cat: 'Market-Gıda', merchant: 'Carrefoursa' },
      { date: '2026-03-28', hour: 19, desc: 'BURGER KING KADIKÖY ISTANBUL TR', amount: 285, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Burger King' },
      { date: '2026-03-29', hour: 14, desc: 'DIVAN PASTANE ISTANBUL TR', amount: 320, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Divan' },
      { date: '2026-03-30', hour: 8, desc: 'STARBUCKS KADIKÖY ISTANBUL TR', amount: 155, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-03-31', hour: 19, desc: 'ZARA ISTANBUL TR', amount: 1650, type: 'debit', cat: 'Kişisel-Bakım', merchant: 'Zara' },

      // NİSAN 2026
      { date: '2026-04-01', hour: 12, desc: 'VODAFONE FATURA ÖDEME', amount: 268.50, type: 'debit', cat: 'Fatura-Abonelik', merchant: 'Vodafone' },
      { date: '2026-04-02', hour: 14, desc: 'MIGROS ATASHEHIR ISTANBUL TR', amount: 678.40, type: 'debit', cat: 'Market-Gıda', merchant: 'Migros' },
      { date: '2026-04-03', hour: 20, desc: 'MCDONALDS BAGDAT CADDESI ISTANBUL TR', amount: 420, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'McDonalds' },
      { date: '2026-04-03', hour: 23, desc: 'TRENDYOL.COM ISTANBUL TR', amount: 2890, type: 'debit', cat: 'Online-Alışveriş', merchant: 'Trendyol' },
      { date: '2026-04-04', hour: 13, desc: 'STARBUCKS AKASYA ISTANBUL TR', amount: 165, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-04-04', hour: 19, desc: 'CINEMAXIMUM AKASYA ISTANBUL TR', amount: 380, type: 'debit', cat: 'Eğlence', merchant: 'CinemaXimum' },
      { date: '2026-04-05', hour: 14, desc: 'MIGROS BAGDAT ISTANBUL TR', amount: 945.30, type: 'debit', cat: 'Market-Gıda', merchant: 'Migros' },
      { date: '2026-04-06', hour: 8, desc: 'STARBUCKS KADIKÖY ISTANBUL TR', amount: 165, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-04-07', hour: 12, desc: 'DOMINO PIZZA ISTANBUL TR', amount: 245, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Dominos' },
      { date: '2026-04-08', hour: 9, desc: 'BIM KADIKÖY ISTANBUL TR', amount: 312.50, type: 'debit', cat: 'Market-Gıda', merchant: 'Bim' },
      { date: '2026-04-08', hour: 23, desc: 'HEPSIBURADA.COM ISTANBUL TR', amount: 1675, type: 'debit', cat: 'Online-Alışveriş', merchant: 'Hepsiburada' },
      { date: '2026-04-09', hour: 14, desc: 'TURK TELEKOM MOBIL FATURA ÖDEME', amount: 489.50, type: 'debit', cat: 'Fatura-Abonelik', merchant: 'Türk Telekom' },
      { date: '2026-04-10', hour: 13, desc: 'MAAS YATIRMA IS BANKASI', amount: 45000, type: 'credit', cat: 'Maaş-Gelir', merchant: 'İş Bankası' },
      { date: '2026-04-10', hour: 20, desc: 'YEMEKSEPETI ISTANBUL TR', amount: 350, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Yemeksepeti' },
      { date: '2026-04-10', hour: 22, desc: 'STARBUCKS BAGDAT ISTANBUL TR', amount: 165, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-04-10', hour: 23, desc: 'AMAZON.COM.TR ISTANBUL TR', amount: 2450, type: 'debit', cat: 'Online-Alışveriş', merchant: 'Amazon' },
      { date: '2026-04-11', hour: 14, desc: 'MEDIAMARKT MARMARA ISTANBUL TR', amount: 4890, type: 'debit', cat: 'Online-Alışveriş', merchant: 'MediaMarkt' },
      { date: '2026-04-11', hour: 19, desc: 'BURGER KING KADIKÖY ISTANBUL TR', amount: 320, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Burger King' },
      { date: '2026-04-12', hour: 13, desc: 'DIVAN PASTANE ISTANBUL TR', amount: 350, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Divan' },
      { date: '2026-04-13', hour: 8, desc: 'STARBUCKS KADIKÖY ISTANBUL TR', amount: 165, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-04-14', hour: 12, desc: 'CAFETERIA OFIS ISTANBUL TR', amount: 105, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Cafeteria' },
      { date: '2026-04-14', hour: 19, desc: 'ZARA ISTANBUL TR', amount: 2150, type: 'debit', cat: 'Kişisel-Bakım', merchant: 'Zara' },
      { date: '2026-04-15', hour: 18, desc: 'NETFLIX TURKEY ISTANBUL TR', amount: 199.99, type: 'debit', cat: 'Eğlence', merchant: 'Netflix' },
      { date: '2026-04-15', hour: 22, desc: 'TRENDYOL.COM ISTANBUL TR', amount: 1890, type: 'debit', cat: 'Online-Alışveriş', merchant: 'Trendyol' },
      { date: '2026-04-16', hour: 14, desc: 'ECZANE FATIH ISTANBUL TR', amount: 215, type: 'debit', cat: 'Sağlık', merchant: 'Eczane' },
      { date: '2026-04-17', hour: 19, desc: 'MCDONALDS ALTUNIZADE ISTANBUL TR', amount: 410, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'McDonalds' },
      { date: '2026-04-17', hour: 21, desc: 'STARBUCKS AKASYA ISTANBUL TR', amount: 175, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-04-17', hour: 22, desc: 'YEMEKSEPETI ISTANBUL TR', amount: 285, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Yemeksepeti' },
      { date: '2026-04-17', hour: 23, desc: 'AMAZON.COM.TR ISTANBUL TR', amount: 3450, type: 'debit', cat: 'Online-Alışveriş', merchant: 'Amazon' },
      { date: '2026-04-18', hour: 14, desc: 'CARREFOURSA MARMARA ISTANBUL TR', amount: 1289.50, type: 'debit', cat: 'Market-Gıda', merchant: 'Carrefoursa' },
      { date: '2026-04-19', hour: 13, desc: 'DIVAN PASTANE ISTANBUL TR', amount: 320, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Divan' },
      { date: '2026-04-20', hour: 8, desc: 'STARBUCKS KADIKÖY ISTANBUL TR', amount: 165, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-04-21', hour: 11, desc: 'SPOTIFY PREMIUM IRELAND', amount: 59.99, type: 'debit', cat: 'Eğlence', merchant: 'Spotify' },
      { date: '2026-04-21', hour: 19, desc: 'DECATHLON ISTANBUL TR', amount: 1450, type: 'debit', cat: 'Kişisel-Bakım', merchant: 'Decathlon' },
      { date: '2026-04-22', hour: 13, desc: 'BIM KADIKÖY ISTANBUL TR', amount: 287.50, type: 'debit', cat: 'Market-Gıda', merchant: 'Bim' },
      { date: '2026-04-22', hour: 23, desc: 'GAMESEEN.COM PLAYSTATION US', amount: 1450, type: 'debit', cat: 'Eğlence', merchant: 'GameSeen' },
      { date: '2026-04-23', hour: 14, desc: 'ECZANE BAGCILAR ISTANBUL TR', amount: 198, type: 'debit', cat: 'Sağlık', merchant: 'Eczane' },
      { date: '2026-04-24', hour: 20, desc: 'YEMEKSEPETI ISTANBUL TR', amount: 315, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Yemeksepeti' },
      { date: '2026-04-24', hour: 22, desc: 'TRENDYOL.COM ISTANBUL TR', amount: 2890, type: 'debit', cat: 'Online-Alışveriş', merchant: 'Trendyol' },
      { date: '2026-04-25', hour: 15, desc: 'MIGROS BAGDAT ISTANBUL TR', amount: 1145.30, type: 'debit', cat: 'Market-Gıda', merchant: 'Migros' },
      { date: '2026-04-26', hour: 14, desc: 'STARBUCKS BAGDAT ISTANBUL TR', amount: 155, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-04-27', hour: 8, desc: 'STARBUCKS KADIKÖY ISTANBUL TR', amount: 165, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Starbucks' },
      { date: '2026-04-28', hour: 12, desc: 'TOSLA OFIS YEMEK ISTANBUL TR', amount: 110, type: 'debit', cat: 'Yemek-Dışarı', merchant: 'Tosla' },
      { date: '2026-04-29', hour: 19, desc: 'MEDIAMARKT MARMARA ISTANBUL TR', amount: 3450, type: 'debit', cat: 'Online-Alışveriş', merchant: 'MediaMarkt' },
      { date: '2026-04-30', hour: 14, desc: 'TURK TELEKOM MOBIL FATURA ÖDEME', amount: 489.50, type: 'debit', cat: 'Fatura-Abonelik', merchant: 'Türk Telekom' },
    ];

    // Transactions'ı ekle
    let txCount = 0;
    for (const tx of transactions) {
      await client.query(
        `INSERT INTO transactions (user_id, date, hour, description, amount, type, category, merchant)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, tx.date, tx.hour, tx.desc, tx.amount, tx.type, tx.cat, tx.merchant]
      );
      txCount++;
    }
    console.log(`✅ ${txCount} işlem eklendi\n`);

    // Test Intentions (Söz Aynası)
    console.log('📝 Test Intentions ekleniyor...');
    await client.query(
      `INSERT INTO intentions (user_id, month, year, goal_type, goal_description, target_value, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, 4, 2026, 'savings', 'Bu ay 2000 TL tasarruf edeceğim', 2000, 'active']
    );
    await client.query(
      `INSERT INTO intentions (user_id, month, year, goal_type, goal_description, target_value, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, 4, 2026, 'food', 'Yemeksepetine 500 TL\\'den fazla harcamayacağım', 500, 'active']
    );
    console.log('✅ Test Intentions eklendi\n');

    console.log('═══════════════════════════════════════');
    console.log('✅ MIGRATION TAAMAMLANDı!\n');
    console.log('📊 Veritabanı Özeti:');
    console.log(`   • Users: 1 (test@prospekt.com)`);
    console.log(`   • Transactions: ${txCount} işlem (3 ay)`);
    console.log(`   • Intentions: 2 söz (Nisan 2026)`);
    console.log(`   • Tablolar: 8 tane`);
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Migration hatası:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

// Çalıştır
migrate().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

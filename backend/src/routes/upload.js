const express      = require('express');
const multer       = require('multer');
const { parseFile } = require('../services/parsers/transactionParser');
const { pool }     = require('../db');
const authMiddleware = require('../middleware/auth');
const { invalidateUser } = require('../services/cache');
const router       = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Sadece PDF, Excel veya CSV yüklenebilir'));
  },
});

router.post('/', authMiddleware, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya bulunamadı' });

    console.log(`📂 Dosya alındı: ${req.file.originalname} (${req.file.size} byte)`);

    // 1. Parse et
    const parsed = await parseFile(req.file.buffer, req.file.mimetype);

    if (parsed.total_count === 0) {
      return res.status(422).json({
        error: 'Dosyadan işlem çıkarılamadı. Formatı kontrol edin.',
      });
    }

    // 2. DB'ye toplu kaydet
    const client = await pool.connect();
    let saved = 0;

    try {
      await client.query('BEGIN');

      for (const t of parsed.transactions) {
        await client.query(
          `INSERT INTO transactions
             (user_id, date, hour, description, amount, type, category, sub_category, merchant)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT DO NOTHING`,
          [
            req.userId, t.date, t.hour,
            t.description, t.amount, t.type,
            t.category, t.sub_category || null, t.merchant || null,
          ]
        );
        saved++;
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // 3. Cache temizle — yeni veri geldi, eski analizler geçersiz
    invalidateUser(req.userId);

    console.log(`✅ ${saved} işlem DB'ye kaydedildi (cache temizlendi)`);

    res.json({
      message: `${saved} işlem başarıyla yüklendi`,
      total: saved,
      date_range: parsed.date_range,
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
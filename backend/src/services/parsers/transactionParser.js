'use strict';

const pdfParse  = require('pdf-parse');
const xlsx      = require('xlsx');
const { z }     = require('zod');
const { chatJSON } = require('../../utils/gemini');

// ─────────────────────────────────────────────────────────────────
// ZOD ŞEMASI — Gemini çıktısını doğrular
// ─────────────────────────────────────────────────────────────────
const TransactionSchema = z.object({
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'ISO tarih formatı lazım'),
  hour:         z.number().int().min(0).max(23).nullable(),
  description:  z.string().min(1),
  amount:       z.number().positive('Tutar pozitif olmalı'),
  type:         z.enum(['debit', 'credit']),
  category:     z.string().nullable(),
  sub_category: z.string().nullable().optional(),
  merchant:     z.string().nullable().optional(),
});

const ParsedBatchSchema = z.object({
  transactions: z.array(TransactionSchema),
});

// ─────────────────────────────────────────────────────────────────
// SYSTEM INSTRUCTION — Adli Muhasebeci Rolü
// ─────────────────────────────────────────────────────────────────
const FORENSIC_SYSTEM_INSTRUCTION = `
Sen bir Adli Muhasebe Uzmanısın. Görevin banka ekstresi metinlerini
titiz bir şekilde analiz edip yapılandırılmış JSON çıktısı üretmek.

KURALLAR (İSTİSNASIZ UYGULANIR):
1. Sadece ve sadece geçerli JSON döndür. Markdown, açıklama, önsöz YASAK.
2. Eğer bir değerden EMİN DEĞİLSEN null döndür. Asla tahmin etme.
3. HALLÜSINASYON YAPMA. Metinde olmayan işlem ekleme, mevcut işlemi değiştirme.
4. Tarihler her zaman "YYYY-MM-DD" ISO formatında olacak.
5. Tutarlar her zaman pozitif sayı olacak. Çıkış "debit", giriş "credit".
6. Aynı işlemi iki kez ekleme. Banka tekrar satırlarını (footer, header) yoksay.
7. Kategori seçiminde aşağıdaki listeden birini seç, yoksa "Diğer" kullan.

KATEGORİLER:
Yemek-Dışarı | Market-Gıda | Ulaşım | Eğlence | Online-Alışveriş |
Fatura-Abonelik | Sağlık | Kişisel-Bakım | Eğitim | Kira-Konut |
Maaş-Gelir | Transfer | ATM-Nakit | Diğer
`.trim();

// ─────────────────────────────────────────────────────────────────
// VERİ ÖN İŞLEME — Ham metni temizle
// ─────────────────────────────────────────────────────────────────
const preprocessText = (rawText) => {
  return rawText
    // Sayfa numaraları: "Sayfa 1 / 3", "Page 1 of 3"
    .replace(/sayfa\s+\d+\s*[\/of]+\s*\d+/gi, '')
    .replace(/page\s+\d+\s*[\/of]+\s*\d+/gi, '')
    // Banka başlıkları ve footer kalıpları
    .replace(/\b(IBAN|BIC|SWIFT|Müşteri No|Şube Kodu|Hesap No)[:\s\w]+/gi, '')
    .replace(/bu belge .{0,80}(bilgi|amaçlı)/gi, '')
    .replace(/gizli(lik)?[\s\w]{0,50}(politika|koşul)/gi, '')
    // Ardışık boş satırları tek satıra indir
    .replace(/\n{3,}/g, '\n\n')
    // Satır başı/sonu boşluk
    .split('\n').map(l => l.trim()).join('\n')
    .trim();
};

// ─────────────────────────────────────────────────────────────────
// CHUNKING — Uzun metni parçalara böl
// Token limiti: Gemini 2.0 Flash ~32k token → güvenli 6000 char/chunk
// ─────────────────────────────────────────────────────────────────
const CHUNK_SIZE   = 6000;  // karakter
const CHUNK_OVERLAP = 200;  // satır bağlamı için örtüşme

const chunkText = (text) => {
  if (text.length <= CHUNK_SIZE) return [text];

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + CHUNK_SIZE;

    // Chunk'u satır ortasında kesme — en yakın \n'e git
    if (end < text.length) {
      const newlineIdx = text.lastIndexOf('\n', end);
      if (newlineIdx > start + CHUNK_SIZE / 2) end = newlineIdx;
    }

    chunks.push(text.slice(start, end));
    start = end - CHUNK_OVERLAP; // bir sonraki chunk biraz önceden başlasın
  }

  return chunks;
};

// ─────────────────────────────────────────────────────────────────
// TEK CHUNK PARSE — Gemini'a gönder + Zod ile doğrula
// ─────────────────────────────────────────────────────────────────
const parseChunk = async (chunkText, chunkIndex, totalChunks) => {
  const prompt = `
Aşağıdaki banka ekstresi metnini analiz et.
Bu metin toplam ${totalChunks} parçadan oluşan ekstrenin ${chunkIndex + 1}. parçasıdır.

SADECE bu parçadaki işlemleri döndür, tekrar etme.

Çıktı formatı:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "hour": null,
      "description": "İşlem açıklaması",
      "amount": 150.00,
      "type": "debit",
      "category": "Yemek-Dışarı",
      "sub_category": null,
      "merchant": "Starbucks"
    }
  ]
}

EKTRE METNİ:
${chunkText}
  `.trim();

  let parsed;
  try {
    parsed = await chatJSON(prompt, 'flash', FORENSIC_SYSTEM_INSTRUCTION);
  } catch (err) {
    console.warn(`⚠️  Chunk ${chunkIndex + 1} Gemini hatası:`, err.message);
    return []; // bu chunk'u atla, diğerlerine devam et
  }

  // Zod ile doğrula
  const result = ParsedBatchSchema.safeParse(parsed);
  if (!result.success) {
    console.warn(`⚠️  Chunk ${chunkIndex + 1} Zod hatası:`, result.error.flatten());
    // Hatalı alanları temizleyerek devam et
    const cleaned = (parsed.transactions || []).filter(t => {
      const r = TransactionSchema.safeParse(t);
      return r.success;
    });
    return cleaned;
  }

  return result.data.transactions;
};

// ─────────────────────────────────────────────────────────────────
// MERGE LOGIC — Duplikasyon temizle
// Aynı (tarih + tutar + type) kombinasyonu olan işlemleri sil
// ─────────────────────────────────────────────────────────────────
const deduplicateTransactions = (transactions) => {
  const seen = new Set();
  return transactions.filter(t => {
    // Chunk overlap nedeniyle aynı işlem iki kez gelebilir
    const key = `${t.date}|${t.amount}|${t.type}|${(t.description || '').slice(0, 30)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ─────────────────────────────────────────────────────────────────
// PDF EXTRACTION
// ─────────────────────────────────────────────────────────────────
const extractFromPDF = async (buffer) => {
  const data = await pdfParse(buffer);
  if (!data.text || data.text.trim().length < 50) {
    throw new Error('PDF\'den metin çıkarılamadı. Taranmış (görüntü tabanlı) PDF olabilir.');
  }
  return data.text;
};

// ─────────────────────────────────────────────────────────────────
// EXCEL EXTRACTION
// ─────────────────────────────────────────────────────────────────
const extractFromExcel = (buffer) => {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Excel dosyasında sayfa bulunamadı.');
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_csv(sheet);
};

// ─────────────────────────────────────────────────────────────────
// ANA PARSE FONKSİYONU — Dışarıya açık
// ─────────────────────────────────────────────────────────────────
const parseFile = async (buffer, mimetype) => {
  // 1. Ham metni çıkar
  let rawText;
  if (mimetype === 'application/pdf') {
    rawText = await extractFromPDF(buffer);
  } else if (
    mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimetype === 'application/vnd.ms-excel' ||
    mimetype === 'text/csv'
  ) {
    rawText = extractFromExcel(buffer);
  } else {
    throw new Error('Desteklenmeyen format. PDF veya Excel yükleyin.');
  }

  // 2. Ön işleme
  const cleanText = preprocessText(rawText);
  console.log(`📄 Metin temizlendi: ${rawText.length} → ${cleanText.length} karakter`);

  // 3. Chunking
  const chunks = chunkText(cleanText);
  console.log(`✂️  ${chunks.length} chunk oluşturuldu`);

  // 4. Her chunk'u Gemini'a paralel gönder (ama rate limit için sıralı)
  const allTransactions = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`🤖 Chunk ${i + 1}/${chunks.length} işleniyor...`);
    const txs = await parseChunk(chunks[i], i, chunks.length);
    allTransactions.push(...txs);

    // Rate limit koruması: chunk aralarında kısa bekleme
    if (i < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 800));
    }
  }

  // 5. Duplikasyon temizle
  const unique = deduplicateTransactions(allTransactions);
  console.log(`✅ Parse tamamlandı: ${allTransactions.length} → ${unique.length} benzersiz işlem`);

  // Tarih aralığını hesapla
  const dates = unique.map(t => t.date).sort();
  const dateRange = dates.length > 0
    ? { start: dates[0], end: dates[dates.length - 1] }
    : null;

  return {
    transactions: unique,
    total_count: unique.length,
    date_range: dateRange,
  };
};

module.exports = { parseFile };
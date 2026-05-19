'use strict';

const pdfParse  = require('pdf-parse');
const xlsx      = require('xlsx');
const { z }     = require('zod');
const { chatJSON } = require('../../utils/gemini');

// ─────────────────────────────────────────────────────────────
// AKILLI KATEGORİZE — Merchant adından regex ile kategori bul
// AI'dan ÖNCE çalışır, doğruluk için
// ─────────────────────────────────────────────────────────────
const CATEGORY_RULES = [
  // Yemek-Dışarı
  { cat: 'Yemek-Dışarı', patterns: [
    /STARBUCKS/i, /MCDONALDS|MC DONALDS|MCDONALD'?S/i, /BURGER\s*KING/i,
    /DOMINO|PIZZA/i, /YEMEKSEPETI|YEMEK\s*SEPETI/i, /GETIR\s*YEMEK/i,
    /TRENDYOL\s*YEMEK/i, /KFC/i, /POPEYES/i, /SUBWAY/i,
    /KAFE|CAFE|COFFEE/i, /LOKANTA|RESTAURANT|RESTORAN/i,
    /PASTANE|PASTANESI|PATISSERIE/i, /DONER|DÖNER/i,
    /OZSUT|ÖZSÜT/i, /DIVAN/i, /SIMIT\s*SARAYI/i,
    /KARAKOY|KARAKÖY.*LOKANTA/i, /MIGUSTO|MI GUSTO/i,
    /PARAM.*YEMEKSEPETI/i, /TOSLA.*YEMEK/i,
  ]},
  // Market-Gıda
  { cat: 'Market-Gıda', patterns: [
    /MIGROS|MİGROS/i, /CARREFOUR/i, /BIM|BİM/i, /A101|A 101/i, /SOK\b|ŞOK/i,
    /MACROCENTER|MACRO\s*CENTER/i, /METRO\s*MARKET/i,
    /MARKET|BAKKAL|MANAV/i, /KASAP/i,
    /PERPA.*TEKEL|TEKEL/i, /ODEAL.*DEMIR/i, /DEMIR\s*MARKET/i,
    /AKSOMUN/i, /UNLU\s*MAM/i, /SARKUTERI|ŞARKÜTERİ/i,
  ]},
  // Online-Alışveriş
  { cat: 'Online-Alışveriş', patterns: [
    /TRENDYOL/i, /HEPSIBURADA|HEPSI\s*BURADA/i, /AMAZON/i,
    /N11\b/i, /GITTIGIDIYOR/i, /SAHIBINDEN/i, /CICEKSEPETI/i,
    /MEDIAMARKT|MEDIA\s*MARKT/i, /TEKNOSA/i, /VATAN\s*BIL/i,
    /APPLE\.COM/i, /GOOGLE\s*PLAY/i, /MICROSOFT/i,
    /BICEN\s*MAGAZACILIK/i,
  ]},
  // Ulaşım
  { cat: 'Ulaşım', patterns: [
    /TAKSI|TAKSİ|BITAKSI|UBER/i, /HAVAIST/i, /METRO\s*ISTANBUL/i,
    /IETT|İETT/i, /MARMARAY/i, /BELBIM|İSTANBUL\s*KART/i,
    /OPET|SHELL|BP|PETROL\s*OFISI|TURKPETROL/i,
    /BENZIN|YAKIT/i, /OTOPARK|PARK\s*ALANI/i,
    /MOKAUNITED.*BITAKSI/i,
  ]},
  // Eğlence
  { cat: 'Eğlence', patterns: [
    /CINEMAXIMUM|CINEMAX|CINEPLEX/i, /BEYAZ\s*PERDE/i,
    /NETFLIX/i, /SPOTIFY/i, /YOUTUBE\s*PREMIUM/i, /DISNEY/i,
    /BLUTV|EXXEN|GAIN/i,
    /STEAM|PLAYSTATION|XBOX|EPIC\s*GAMES/i, /GAMESEEN/i,
    /PAYCELL.*GAME/i, /TIYATRO|KONSER|BILET/i,
  ]},
  // Fatura-Abonelik
  { cat: 'Fatura-Abonelik', patterns: [
    /TURKCELL|TÜRKCELL/i, /VODAFONE/i, /TURK\s*TELEKOM|TT\s*MOBIL/i,
    /SU\s*FATURA|İSKİ|ASKI/i, /ELEKTRIK|TEDAS|EDAS|BEDAS/i,
    /DOGALGAZ|IGDAŞ|İGDAŞ/i,
    /CLAUDE\.AI|ANTHROPIC/i, /CHATGPT|OPENAI/i,
    /NATRO\.COM/i, /GODADDY/i,
  ]},
  // Sağlık
  { cat: 'Sağlık', patterns: [
    /ECZANE/i, /HASTANE|TIBBI|MEDIKAL/i, /DIS\s*HEKIMI|DİŞ/i,
    /MEDLINE|ACIBADEM|MEMORIAL/i, /OPTISYEN/i,
  ]},
  // Kişisel-Bakım
  { cat: 'Kişisel-Bakım', patterns: [
    /KUAFOR|BERBER/i, /SPA|MASAJ/i, /WATSONS|GRATIS|FLORMAR/i,
    /MAC\s*KOZMETIK|SEPHORA/i,
  ]},
  // ATM-Nakit
  { cat: 'ATM-Nakit', patterns: [
    /ATM/i, /NAKIT\s*AVANS|NAKİT\s*AVANS/i, /KASA\s*BIRIMI/i,
    /HARAMIDERE.*SANAYI/i,  // ATM bölgesi
  ]},
  // Transfer
  { cat: 'Transfer', patterns: [
    /HESAPTAN\s*AKTARIM/i, /HAVALE|EFT/i, /FAST/i,
    /TRPOS\s*ODEM|TR\s*POS\s*ODEM/i,
  ]},
  // Maaş-Gelir
  { cat: 'Maaş-Gelir', patterns: [
    /MAAS|MAAŞ/i, /UCRET|ÜCRET/i, /GELIR|YATIRMA/i,
  ]},
  // Kişisel ürün - Giyim
  { cat: 'Kişisel-Bakım', patterns: [
    /ZARA/i, /MANGO/i, /FLO|AYAKKABI/i, /KOTON/i, /LCW|LC\s*WAIKIKI/i,
    /DEFACTO|DEFAKTO/i, /HM\b|H\&M/i, /BERSHKA/i, /PULL\s*BEAR/i,
    /DECATHLON/i, /SPORTS|ADIDAS|NIKE|PUMA/i,
  ]},
];

const categorizeByMerchant = (description, merchant) => {
  const text = `${description || ''} ${merchant || ''}`.toUpperCase();
  for (const rule of CATEGORY_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) return rule.cat;
    }
  }
  return null; // bilemedi
};

// ─────────────────────────────────────────────────────────────
// MERCHANT TEMİZLEME — "STARBUCKS KADIKOY ISTANBUL TR" → "Starbucks"
// ─────────────────────────────────────────────────────────────
const extractMerchant = (description) => {
  if (!description) return null;
  let text = description.toUpperCase();
  
  // Yer bilgilerini sil
  text = text
    .replace(/\b(ISTANBUL|İSTANBUL|ANKARA|IZMIR|İZMİR|TR|TURKEY|TÜRKİYE)\b/gi, '')
    .replace(/\b(KADIKOY|KADIKÖY|BESIKTAS|BEŞIKTAŞ|SISLI|ŞİŞLİ|FATIH|FATİH)\b/gi, '')
    .replace(/\b(ATASEHIR|ATAŞEHIR|BAGDAT|BAĞDAT|ALTUNIZADE|AKASYA|MARMARA)\b/gi, '')
    .replace(/\b(US|UK|GB|LONDON|NEW\s*YORK)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // İlk 2-3 kelime al
  const words = text.split(/\s+/).filter(w => w.length > 1);
  const merchant = words.slice(0, 3).join(' ');
  
  // Title Case
  return merchant.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};

// ─────────────────────────────────────────────────────────────
// ZOD ŞEMASI
// ─────────────────────────────────────────────────────────────
const TransactionSchema = z.object({
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'ISO tarih lazım'),
  hour:         z.number().int().min(0).max(23).nullable(),
  description:  z.string().min(1),
  amount:       z.number().positive(),
  type:         z.enum(['debit', 'credit']),
  category:     z.string().nullable(),
  sub_category: z.string().nullable().optional(),
  merchant:     z.string().nullable().optional(),
});

const ParsedBatchSchema = z.object({
  transactions: z.array(TransactionSchema),
});

// ─────────────────────────────────────────────────────────────
// SYSTEM INSTRUCTION — Detaylı + Few-shot
// ─────────────────────────────────────────────────────────────
const FORENSIC_SYSTEM_INSTRUCTION = `
Sen Türk bankası ekstre uzmanısın. Banka ekstresi metinlerini analiz edip 
yapılandırılmış JSON çıktısı üretiyorsun.

KURALLAR (İSTİSNASIZ):
1. SADECE geçerli JSON döndür. Markdown, açıklama, önsöz YASAK.
2. Emin değilsen null döndür, TAHMİN ETME.
3. Metinde olmayan işlem EKLEME.
4. Tarihler: "YYYY-MM-DD" ISO formatında.
5. Tutarlar POZİTİF sayı. Çıkış=debit, giriş=credit.
6. Aynı işlemi 2 kez ekleme.
7. Banka header/footer satırlarını YOKSAY (IBAN, müşteri no, faiz oranı, taksit bilgisi, MaxiMil/MaxiPuan).

TARİH ÇIKARMA İPUÇLARI:
- "02/04/2026" → "2026-04-02"
- "04.05.2026" → "2026-05-04"
- "07/04/2026 10148ESENYURT" — tarih önce gelir
- "02/04/2026 MATIK OTOMAT 296" — tarih+merchant

TUTAR ÇIKARMA:
- "80,00" → 80.00 TL
- "1.107,25" → 1107.25 TL  (TR formatı: nokta binlik, virgül kuruş)
- Negatif olanlar iade/ödeme → type:credit, amount pozitif
- Faiz, ücret satırları normal debit

KATEGORİ (sadece bunlardan seç):
Yemek-Dışarı | Market-Gıda | Ulaşım | Eğlence | Online-Alışveriş |
Fatura-Abonelik | Sağlık | Kişisel-Bakım | Eğitim | Kira-Konut |
Maaş-Gelir | Transfer | ATM-Nakit | Diğer

KATEGORI EŞLEŞMELERİ:
- STARBUCKS, MCDONALDS, RESTAURANT, KAFE, PIZZA, DONER, LOKANTA → Yemek-Dışarı
- MIGROS, CARREFOUR, BIM, A101, MARKET, BAKKAL → Market-Gıda  
- TRENDYOL, AMAZON, HEPSIBURADA, MEDIAMARKT → Online-Alışveriş
- NETFLIX, SPOTIFY, CINEMAXIMUM, PLAYSTATION → Eğlence
- TURKCELL, VODAFONE, TT MOBIL, FATURA → Fatura-Abonelik
- TAKSI, METRO, IETT, BENZIN, BELBIM, HAVAIST → Ulaşım
- ECZANE, HASTANE → Sağlık
- ATM, NAKIT AVANS → ATM-Nakit
- HAVALE, EFT, HESAPTAN AKTARIM → Transfer

ATLANACAK SATIRLAR (yoksay):
- "MAXIPUAN İLAVE", "MAXIMIL"
- "FAIZ ORANI", "ASGARI ÖDEME"
- "MÜŞTERİ LİMİTİ", "KART LİMİTİ"
- "BİR ÖNCEKİ HESAP ÖZETİ"
- "ÖDEMELERİNİZ İÇİN TEŞEKKÜR"
- "AYLIK TAKSITLI BORÇ TOPLAMI"
`.trim();

// ─────────────────────────────────────────────────────────────
// VERİ ÖN İŞLEME
// ─────────────────────────────────────────────────────────────
const preprocessText = (rawText) => {
  return rawText
    .replace(/sayfa\s+\d+\s*[\/of]+\s*\d+/gi, '')
    .replace(/page\s+\d+\s*[\/of]+\s*\d+/gi, '')
    .replace(/\b(IBAN|BIC|SWIFT|Belge\s*Numarası|Müşteri\s*No|Şube\s*Kodu|Hesap\s*No)[:\s\w]+/gi, '')
    .replace(/\b(Müşteri|Toplam|Kullanılabilir)\s*Limit[:\s\w\.,]+/gi, '')
    .replace(/\bMAXIPUAN İLAVE.+$/gim, '')
    .replace(/\bORTAK ATM.+SORGU ÜCRETI/gi, '')
    .replace(/\b(Aylık|Yıllık)\s*%[\d,.]+/gi, '')
    .replace(/bu belge .{0,80}(bilgi|amaçlı)/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map(l => l.trim()).filter(l => l.length > 0).join('\n')
    .trim();
};

// ─────────────────────────────────────────────────────────────
// CHUNKING
// ─────────────────────────────────────────────────────────────
const CHUNK_SIZE   = 3500;
const CHUNK_OVERLAP = 200;

const chunkText = (text) => {
  if (text.length <= CHUNK_SIZE) return [text];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = start + CHUNK_SIZE;
    if (end < text.length) {
      const newlineIdx = text.lastIndexOf('\n', end);
      if (newlineIdx > start + CHUNK_SIZE / 2) end = newlineIdx;
    }
    chunks.push(text.slice(start, end));
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
};

// ─────────────────────────────────────────────────────────────
// TEK CHUNK PARSE
// ─────────────────────────────────────────────────────────────
const parseChunk = async (chunkText, chunkIndex, totalChunks) => {
  const prompt = `
Aşağıdaki banka ekstresi parçasını (${chunkIndex + 1}/${totalChunks}) analiz et.
SADECE bu parçadaki işlemleri JSON olarak döndür.

ÖRNEK GİRİŞ:
"02/04/2026 MATIK OTOMAT 296 ISTANBUL TR 80,00"

ÖRNEK ÇIKIŞ:
{
  "transactions": [{
    "date": "2026-04-02",
    "hour": null,
    "description": "MATIK OTOMAT 296 ISTANBUL TR",
    "amount": 80.00,
    "type": "debit",
    "category": "ATM-Nakit",
    "merchant": "Matik Otomat"
  }]
}

EKSTRE METNİ:
${chunkText}
  `.trim();

  let parsed;
  try {
    parsed = await chatJSON(prompt, 'lite', FORENSIC_SYSTEM_INSTRUCTION);
  } catch (err) {
    console.warn(`⚠️  Chunk ${chunkIndex + 1} Gemini hatası:`, err.message);
    return [];
  }

  // Validate + filter
  const transactions = (parsed.transactions || []).filter(t => {
    const r = TransactionSchema.safeParse(t);
    return r.success;
  });

  // ÖNEMLİ: AI'ın kategorisini OVERRIDE et — regex kategorisi daha güvenilir
  for (const t of transactions) {
    const regexCat = categorizeByMerchant(t.description, t.merchant);
    if (regexCat) {
      t.category = regexCat; // regex kazanır
    }
    // Merchant temizle
    if (!t.merchant) {
      t.merchant = extractMerchant(t.description);
    }
  }

  return transactions;
};

// ─────────────────────────────────────────────────────────────
// DUPLIKASYON TEMİZLE
// ─────────────────────────────────────────────────────────────
const deduplicateTransactions = (transactions) => {
  const seen = new Set();
  return transactions.filter(t => {
    const key = `${t.date}|${t.amount}|${t.type}|${(t.description || '').slice(0, 25)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ─────────────────────────────────────────────────────────────
// PDF / EXCEL EXTRACTION
// ─────────────────────────────────────────────────────────────
const extractFromPDF = async (buffer) => {
  const data = await pdfParse(buffer);
  if (!data.text || data.text.trim().length < 50) {
    throw new Error('PDF\'den metin çıkarılamadı.');
  }
  return data.text;
};

const extractFromExcel = (buffer) => {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Excel dosyasında sayfa bulunamadı.');
  return xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName]);
};

// ─────────────────────────────────────────────────────────────
// ANA PARSE
// ─────────────────────────────────────────────────────────────
const parseFile = async (buffer, mimetype) => {
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
    throw new Error('Desteklenmeyen format.');
  }

  const cleanText = preprocessText(rawText);
  console.log(`📄 Metin: ${rawText.length} → ${cleanText.length} karakter`);

  const chunks = chunkText(cleanText);
  console.log(`✂️  ${chunks.length} chunk`);

  const allTransactions = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`🤖 Chunk ${i + 1}/${chunks.length}...`);
    const txs = await parseChunk(chunks[i], i, chunks.length);
    allTransactions.push(...txs);
    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 800));
  }

  const unique = deduplicateTransactions(allTransactions);
  console.log(`✅ ${allTransactions.length} → ${unique.length} benzersiz`);

  const dates = unique.map(t => t.date).sort();
  return {
    transactions: unique,
    total_count: unique.length,
    date_range: dates.length > 0 ? { start: dates[0], end: dates[dates.length - 1] } : null,
  };
};

module.exports = { parseFile, categorizeByMerchant, extractMerchant };
// Mock banka ekstresi — Ahmet'in 3 aylık verisi
const mockTransactions = [
  // OCAK 2026
  { date:'2026-01-05', hour:8,  description:'Starbucks Coffee',      amount:65,   type:'debit',  category:'Yemek-Dışarı',      merchant:'Starbucks' },
  { date:'2026-01-06', hour:12, description:'Migros Market',         amount:450,  type:'debit',  category:'Market-Gıda',        merchant:'Migros' },
  { date:'2026-01-06', hour:20, description:'Pizza Hut',             amount:280,  type:'debit',  category:'Yemek-Dışarı',      merchant:'Pizza Hut' },
  { date:'2026-01-07', hour:9,  description:'Maaş',                  amount:18000,type:'credit', category:'Maaş-Gelir',         merchant:null },
  { date:'2026-01-08', hour:23, description:'Trendyol Sipariş',      amount:890,  type:'debit',  category:'Online-Alışveriş',  merchant:'Trendyol' },
  { date:'2026-01-12', hour:8,  description:'Starbucks Coffee',      amount:70,   type:'debit',  category:'Yemek-Dışarı',      merchant:'Starbucks' },
  { date:'2026-01-13', hour:19, description:'Burger House',          amount:245,  type:'debit',  category:'Yemek-Dışarı',      merchant:'Burger House' },
  { date:'2026-01-15', hour:14, description:'İGDAŞ Doğalgaz',        amount:320,  type:'debit',  category:'Fatura-Abonelik',   merchant:'İGDAŞ' },
  { date:'2026-01-19', hour:8,  description:'Starbucks Coffee',      amount:65,   type:'debit',  category:'Yemek-Dışarı',      merchant:'Starbucks' },
  { date:'2026-01-20', hour:22, description:'Hepsiburada Alışveriş', amount:1200, type:'debit',  category:'Online-Alışveriş',  merchant:'Hepsiburada' },
  { date:'2026-01-24', hour:20, description:'Uber',                  amount:85,   type:'debit',  category:'Ulaşım',            merchant:'Uber' },
  { date:'2026-01-25', hour:10, description:'Çiğköftem',             amount:120,  type:'debit',  category:'Yemek-Dışarı',      merchant:'Çiğköftem' },
  { date:'2026-01-26', hour:8,  description:'Starbucks Coffee',      amount:70,   type:'debit',  category:'Yemek-Dışarı',      merchant:'Starbucks' },
  { date:'2026-01-28', hour:23, description:'Amazon Alışveriş',      amount:560,  type:'debit',  category:'Online-Alışveriş',  merchant:'Amazon' },

  // ŞUBAT 2026 — Daha fazla harcama (anomali)
  { date:'2026-02-03', hour:8,  description:'Starbucks Coffee',      amount:65,   type:'debit',  category:'Yemek-Dışarı',      merchant:'Starbucks' },
  { date:'2026-02-05', hour:7,  description:'Maaş',                  amount:18000,type:'credit', category:'Maaş-Gelir',        merchant:null },
  { date:'2026-02-06', hour:22, description:'Trendyol Sipariş',      amount:1450, type:'debit',  category:'Online-Alışveriş',  merchant:'Trendyol' },
  { date:'2026-02-07', hour:20, description:'Burger House',          amount:380,  type:'debit',  category:'Yemek-Dışarı',      merchant:'Burger House' },
  { date:'2026-02-09', hour:8,  description:'Starbucks Coffee',      amount:75,   type:'debit',  category:'Yemek-Dışarı',      merchant:'Starbucks' },
  { date:'2026-02-10', hour:19, description:'Mado Kafe',             amount:290,  type:'debit',  category:'Yemek-Dışarı',      merchant:'Mado' },
  { date:'2026-02-13', hour:23, description:'Hepsiburada Alışveriş', amount:2100, type:'debit',  category:'Online-Alışveriş',  merchant:'Hepsiburada' },
  { date:'2026-02-14', hour:18, description:'Altın Çarşı Kuyumcu',   amount:850,  type:'debit',  category:'Kişisel-Bakım',     merchant:'Kuyumcu' },
  { date:'2026-02-16', hour:8,  description:'Starbucks Coffee',      amount:75,   type:'debit',  category:'Yemek-Dışarı',      merchant:'Starbucks' },
  { date:'2026-02-17', hour:20, description:'Çiğköftem',             amount:175,  type:'debit',  category:'Yemek-Dışarı',      merchant:'Çiğköftem' },
  { date:'2026-02-19', hour:1,  description:'Uber Eats',             amount:320,  type:'debit',  category:'Yemek-Dışarı',      merchant:'Uber Eats' },
  { date:'2026-02-20', hour:23, description:'Trendyol Sipariş',      amount:780,  type:'debit',  category:'Online-Alışveriş',  merchant:'Trendyol' },
  { date:'2026-02-21', hour:22, description:'Uber',                  amount:145,  type:'debit',  category:'Ulaşım',            merchant:'Uber' },
  { date:'2026-02-24', hour:20, description:'Burger House',          amount:410,  type:'debit',  category:'Yemek-Dışarı',      merchant:'Burger House' },
  { date:'2026-02-25', hour:23, description:'Amazon Alışveriş',      amount:1890, type:'debit',  category:'Online-Alışveriş',  merchant:'Amazon' },
  { date:'2026-02-26', hour:8,  description:'Starbucks Coffee',      amount:75,   type:'debit',  category:'Yemek-Dışarı',      merchant:'Starbucks' },

  // MART 2026
  { date:'2026-03-03', hour:8,  description:'Starbucks Coffee',      amount:65,   type:'debit',  category:'Yemek-Dışarı',      merchant:'Starbucks' },
  { date:'2026-03-06', hour:9,  description:'Maaş',                  amount:18000,type:'credit', category:'Maaş-Gelir',        merchant:null },
  { date:'2026-03-07', hour:19, description:'Migros Market',         amount:520,  type:'debit',  category:'Market-Gıda',       merchant:'Migros' },
  { date:'2026-03-10', hour:8,  description:'Starbucks Coffee',      amount:70,   type:'debit',  category:'Yemek-Dışarı',      merchant:'Starbucks' },
  { date:'2026-03-12', hour:21, description:'Burger House',          amount:290,  type:'debit',  category:'Yemek-Dışarı',      merchant:'Burger House' },
  { date:'2026-03-15', hour:14, description:'İGDAŞ Doğalgaz',        amount:290,  type:'debit',  category:'Fatura-Abonelik',   merchant:'İGDAŞ' },
  { date:'2026-03-17', hour:8,  description:'Starbucks Coffee',      amount:70,   type:'debit',  category:'Yemek-Dışarı',      merchant:'Starbucks' },
  { date:'2026-03-19', hour:22, description:'Trendyol Sipariş',      amount:650,  type:'debit',  category:'Online-Alışveriş',  merchant:'Trendyol' },
  { date:'2026-03-24', hour:8,  description:'Starbucks Coffee',      amount:70,   type:'debit',  category:'Yemek-Dışarı',      merchant:'Starbucks' },
];

module.exports = { mockTransactions };
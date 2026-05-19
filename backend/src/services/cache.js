'use strict';

const NodeCache = require('node-cache');

// ─────────────────────────────────────────────────────────────
// CACHE INSTANCE'LARI — Farklı TTL'ler için
// ─────────────────────────────────────────────────────────────

// Kısa süreli — Router Agent, sık değişen veriler
const shortCache = new NodeCache({ 
  stdTTL: 600,        // 10 dakika
  checkperiod: 120,   // 2 dakikada bir temizle
  useClones: false,
});

// Orta süreli — Forensic analiz, patterns
const mediumCache = new NodeCache({ 
  stdTTL: 1800,       // 30 dakika
  checkperiod: 300,
  useClones: false,
});

// Uzun süreli — Health Score, Para Kişiliği
const longCache = new NodeCache({ 
  stdTTL: 3600,       // 1 saat
  checkperiod: 600,
  useClones: false,
});

// ─────────────────────────────────────────────────────────────
// CACHE HELPER FONKSİYONLARI
// ─────────────────────────────────────────────────────────────

/**
 * Cache'den al veya hesapla ve cache'e koy
 * @param {NodeCache} cache - Hangi cache instance
 * @param {string} key - Cache anahtarı
 * @param {Function} fetchFn - Veri yoksa çalıştırılacak fonksiyon
 * @param {number} ttl - Opsiyonel özel TTL (saniye)
 */
const getOrSet = async (cache, key, fetchFn, ttl = null) => {
  // 1. Cache'de var mı?
  const cached = cache.get(key);
  if (cached !== undefined) {
    console.log(`⚡ Cache HIT: ${key}`);
    return { ...cached, _fromCache: true };
  }

  // 2. Yoksa hesapla
  console.log(`🔄 Cache MISS: ${key}`);
  const result = await fetchFn();

  // 3. Cache'e koy
  if (ttl) {
    cache.set(key, result, ttl);
  } else {
    cache.set(key, result);
  }

  return { ...result, _fromCache: false };
};

/**
 * Belirli bir kullanıcının tüm cache'ini temizle
 * (yeni veri yüklendiğinde veya söz verildiğinde)
 */
const invalidateUser = (userId) => {
  console.log(`🗑️  Cache temizlendi: ${userId}`);
  
  // Tüm cache'lerde bu user'ın key'lerini bul ve sil
  [shortCache, mediumCache, longCache].forEach(cache => {
    const keys = cache.keys();
    keys.forEach(key => {
      if (key.startsWith(userId)) {
        cache.del(key);
      }
    });
  });
};

/**
 * Tüm cache'i temizle
 */
const flushAll = () => {
  shortCache.flushAll();
  mediumCache.flushAll();
  longCache.flushAll();
  console.log('🗑️  Tüm cache temizlendi');
};

/**
 * Cache istatistikleri
 */
const getStats = () => ({
  short:  { keys: shortCache.keys().length, hits: shortCache.getStats().hits, misses: shortCache.getStats().misses },
  medium: { keys: mediumCache.keys().length, hits: mediumCache.getStats().hits, misses: mediumCache.getStats().misses },
  long:   { keys: longCache.keys().length, hits: longCache.getStats().hits, misses: longCache.getStats().misses },
});

module.exports = {
  shortCache,
  mediumCache,
  longCache,
  getOrSet,
  invalidateUser,
  flushAll,
  getStats,
};
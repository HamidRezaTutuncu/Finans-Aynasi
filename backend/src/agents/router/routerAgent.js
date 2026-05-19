'use strict';

const { chatJSON } = require('../../utils/gemini');
const { shortCache } = require('../../services/cache');

// ─────────────────────────────────────────────────────────────
// MODÜL TANIMLARI — Frontend'e de gidecek
// ─────────────────────────────────────────────────────────────
const MODULES = {
  forensic: {
    key:         'forensic',
    name:        'Adli Muhasebeci',
    icon:        '🕵️',
    color:       '#6366f1',
    description: 'Harcama analizi, patern tespiti, karşılaştırma',
  },
  'future-self': {
    key:         'future-self',
    name:        'Gelecekteki Ben',
    icon:        '🔮',
    color:       '#8b5cf6',
    description: '5 yıl sonraki halinle sohbet',
  },
  'what-if': {
    key:         'what-if',
    name:        'What-If Simülatör',
    icon:        '🎲',
    color:       '#ec4899',
    description: 'Senaryo bazlı finansal projeksiyon',
  },
  intention: {
    key:         'intention',
    name:        'Söz Aynası',
    icon:        '🪞',
    color:       '#f59e0b',
    description: 'Söz verme, takip ve aldatma raporu',
  },
  health: {
    key:         'health',
    name:        'Finansal Sağlık',
    icon:        '🏥',
    color:       '#10b981',
    description: 'Finansal sağlık skoru (0-100)',
  },
  persona: {
    key:         'persona',
    name:        'Para Kişiliği',
    icon:        '🎭',
    color:       '#f97316',
    description: 'Harcama kişilik analizi',
  },
  general: {
    key:         'general',
    name:        'Finans Asistanı',
    icon:        '💬',
    color:       '#6b7280',
    description: 'Genel finansal sohbet',
  },
};

// ─────────────────────────────────────────────────────────────
// ROUTER AGENT — Mesajı analiz et, doğru modüle yönlendir
// ─────────────────────────────────────────────────────────────
const ROUTER_SYSTEM = `
Sen bir mesaj yönlendirme uzmanısın.
Kullanıcının mesajını analiz edip hangi finansal modüle yönlendireceğine karar veriyorsun.

MODÜLLER:
1. forensic     — Harcama analizi, "ne kadar harcadım", "nereye gidiyor param", 
                   patern tespiti, kategori bazlı analiz, karşılaştırma soruları
2. future-self  — Gelecekteki beniyle konuşma, "5 yıl sonra", "gelecekte nasıl olur",
                   motivasyon, pişmanlık, gelecek vizyonu
3. what-if      — Senaryo soruları: "...yapmasam ne olur", "...kesersem", 
                   "...biriktirirsem", varsayımsal durumlar
4. intention    — Söz verme: "bu ay ... yapacağım", "söz veriyorum",
                   hedef koyma, söz takibi, rapor isteme
5. health       — Finansal sağlık skoru, "durumum nasıl", "sağlık puanım",
                   genel değerlendirme
6. persona      — Para kişiliği, "ben nasıl bir harcayıcıyım", "tipim ne",
                   karakter analizi
7. general      — Yukarıdakilere uymayan genel finansal sorular,
                   selamlaşma, teşekkür, belirsiz sorular

KURALLAR:
1. Sadece geçerli JSON döndür.
2. Bir modül seç, en uygun olanı.
3. Emin değilsen confidence düşük ver.
4. Kullanıcı yazım hatası yapabilir — bağlamdan anla.
5. Selamlaşma mesajlarını (merhaba, selam, naber) → general yap.

ÖNEMLİ İPUÇLARI:
- "ne kadar", "kaç TL", "harcama", "analiz" → forensic
- "yapmasam", "kesersem", "biriktirirsem", "olur mu" → what-if
- "gelecek", "5 yıl", "ileride", "pişman" → future-self
- "söz", "hedef", "bu ay", "yapacağım", "taahhüt" → intention
- "skor", "puan", "durum", "sağlık" → health
- "tipim", "kişiliğim", "nasıl biriyim", "karakter" → persona
`.trim();

const routeMessage = async (userMessage) => {
  console.log(`🧭 Router Agent: "${userMessage}"`);

  // Mesajı normalize et (küçük harf, trim)
  const normalizedMsg = userMessage.toLowerCase().trim();
  const cacheKey = `router:${normalizedMsg}`;

  // Cache'de var mı?
  const cached = shortCache.get(cacheKey);
  if (cached) {
    console.log(`⚡ Router Cache HIT: ${cached.module}`);
    return cached;
  }

  const prompt = `
Kullanıcı mesajı: "${userMessage}"

Şu formatta döndür:
{
  "module": "forensic",
  "confidence": 0.92,
  "reasoning": "Kullanıcı harcama analizi soruyor"
}

module değeri şunlardan biri olmalı:
forensic | future-self | what-if | intention | health | persona | general
`;

  try {
    const result = await chatJSON(prompt, 'lite', ROUTER_SYSTEM);

    const moduleKey = result.module || 'general';
    const moduleInfo = MODULES[moduleKey] || MODULES.general;

    const routeResult = {
      module:     moduleKey,
      confidence: result.confidence || 0.5,
      reasoning:  result.reasoning || '',
      ...moduleInfo,
    };

    // Cache'e kaydet (10 dakika)
    shortCache.set(cacheKey, routeResult);

    return routeResult;
  } catch (err) {
    console.error('Router Agent hatası:', err.message);
    return {
      module:     'general',
      confidence: 0.5,
      reasoning:  'Yönlendirme yapılamadı',
      ...MODULES.general,
    };
  }
};

module.exports = { routeMessage, MODULES };
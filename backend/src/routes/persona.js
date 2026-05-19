const express        = require('express');
const authMiddleware = require('../middleware/auth');
const { getMoneyPersona } = require('../agents/persona/personaAgent');
const { longCache, getOrSet } = require('../services/cache');

const router = express.Router();

// ── Para Kişiliği Analizi (6 saat cache)
router.get('/money-type', authMiddleware, async (req, res, next) => {
  try {
    const cacheKey = `${req.userId}:money-persona`;
    
    const result = await getOrSet(longCache, cacheKey, () => {
      return getMoneyPersona(req.userId);
    }, 21600); // 6 saat

    if (result.error) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
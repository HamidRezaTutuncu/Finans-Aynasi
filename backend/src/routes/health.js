const express        = require('express');
const authMiddleware = require('../middleware/auth');
const { calculateHealthScore } = require('../agents/health/healthAgent');
const { longCache, getOrSet }  = require('../services/cache');

const router = express.Router();

// ── Finansal Sağlık Skoru (1 saat cache)
router.get('/score', authMiddleware, async (req, res, next) => {
  try {
    const cacheKey = `${req.userId}:health-score`;
    
    const result = await getOrSet(longCache, cacheKey, () => {
      return calculateHealthScore(req.userId);
    });

    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
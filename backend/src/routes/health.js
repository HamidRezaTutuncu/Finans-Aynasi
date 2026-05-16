const express        = require('express');
const authMiddleware = require('../middleware/auth');
const { calculateHealthScore } = require('../agents/health/healthAgent');

const router = express.Router();

// ── Finansal Sağlık Skoru
router.get('/score', authMiddleware, async (req, res, next) => {
  try {
    const result = await calculateHealthScore(req.userId);
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
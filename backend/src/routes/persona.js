const express        = require('express');
const authMiddleware = require('../middleware/auth');
const { getMoneyPersona } = require('../agents/persona/personaAgent');

const router = express.Router();

// ── Para Kişiliği Analizi
router.get('/money-type', authMiddleware, async (req, res, next) => {
  try {
    const result = await getMoneyPersona(req.userId);

    if (result.error) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
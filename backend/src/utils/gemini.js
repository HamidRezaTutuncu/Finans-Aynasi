const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─────────────────────────────────────────────────────────────
// MODEL SEÇİMİ — Her iş için en uygun model
// ─────────────────────────────────────────────────────────────
const MODELS = {
  // En hızlı — basit structured output, JSON parse, routing
  lite:    'gemini-3.1-flash-lite',
  
  // Orta — genel kullanım
  flash:   'gemini-3.1-flash-lite',
  
  // Yavaş ama güçlü — karmaşık analiz, yaratıcı yazma
  pro:     'gemini-3.1-flash-lite',  // şimdilik flash, gerekirse pro'ya çevir
};

const getModel = (tier = 'flash', systemInstruction = '') => {
  const modelName = MODELS[tier] || MODELS.flash;

  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemInstruction || undefined,
    generationConfig: {
      temperature: tier === 'pro' ? 0.1 : (tier === 'lite' ? 0.2 : 0.4),
      maxOutputTokens: 16384,
    },
  });
};

const chat = async (prompt, tier = 'flash', systemInstruction = '') => {
  const model = getModel(tier, systemInstruction);
  const result = await model.generateContent(prompt);
  return result.response.text();
};

// ─────────────────────────────────────────────────────────────
// SAFE JSON PARSE
// ─────────────────────────────────────────────────────────────
const safeParseJSON = (raw) => {
  let cleaned = raw.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) { /* devam et */ }

  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let start, endChar;

  if (firstBrace === -1 && firstBracket === -1) {
    throw new Error('JSON bulunamadı');
  }

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    start = firstBracket;
    endChar = ']';
  } else {
    start = firstBrace;
    endChar = '}';
  }

  const lastEnd = cleaned.lastIndexOf(endChar);
  if (lastEnd > start) {
    try {
      return JSON.parse(cleaned.slice(start, lastEnd + 1));
    } catch (e) { /* devam et */ }
  }

  let partial = cleaned.slice(start);
  const quoteCount = (partial.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) partial += '"';

  partial = partial.replace(/,\s*$/, '');
  partial = partial.replace(/,\s*([}\]])/g, '$1');

  let openBraces = 0, openBrackets = 0, inString = false;
  for (let i = 0; i < partial.length; i++) {
    const ch = partial[i];
    const prev = i > 0 ? partial[i - 1] : '';
    if (ch === '"' && prev !== '\\') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') openBraces++;
    if (ch === '}') openBraces--;
    if (ch === '[') openBrackets++;
    if (ch === ']') openBrackets--;
  }

  for (let i = 0; i < openBrackets; i++) partial += ']';
  for (let i = 0; i < openBraces; i++)  partial += '}';

  try {
    return JSON.parse(partial);
  } catch (e) {
    throw new Error('JSON tamir edilemedi');
  }
};

const chatJSON = async (prompt, tier = 'flash', systemInstruction = '', retries = 2) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const model = getModel(tier, systemInstruction);
      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim();
      return safeParseJSON(raw);
    } catch (err) {
      console.warn(`⚠️  chatJSON [${tier}] deneme ${attempt}/${retries}: ${err.message}`);
      if (attempt === retries) {
        return { error: 'AI yanıt oluşturamadı', patterns: [], triggers: [], recommendations: [] };
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
};

module.exports = { chat, chatJSON, getModel, safeParseJSON, MODELS };
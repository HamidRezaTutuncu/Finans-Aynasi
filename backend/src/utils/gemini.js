const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getModel = (tier = 'flash', systemInstruction = '') => {
  const modelName = 'gemini-2.5-flash';

  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemInstruction || undefined,
    generationConfig: {
      temperature: tier === 'pro' ? 0.1 : 0.4,
      maxOutputTokens: 8192,
      
    },
  });
};

const chat = async (prompt, tier = 'flash', systemInstruction = '') => {
  const model = getModel(tier, systemInstruction);
  const result = await model.generateContent(prompt);
  return result.response.text();
};

const chatJSON = async (prompt, tier = 'flash', systemInstruction = '') => {
  const model = getModel(tier, systemInstruction);
  const result = await model.generateContent(prompt);
  let raw = result.response.text().trim();

  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('❌ Gemini geçersiz JSON döndürdü:\n', raw.slice(0, 500));
    throw new Error('Gemini geçersiz JSON döndürdü');
  }
};

module.exports = { chat, chatJSON, getModel };
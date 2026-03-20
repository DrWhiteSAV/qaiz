import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const geminiService = {
  async generateQuestions(topic: string, difficulty: string, count: number = 10) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Сгенерируй ${count} вопросов для квиза на тему "${topic}" со сложностью "${difficulty}". 
      Верни массив объектов в формате JSON с полями: text, options (массив из 4 строк), correctAnswer (строка из options), hint.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              correctAnswer: { type: Type.STRING },
              hint: { type: Type.STRING }
            },
            required: ["text", "options", "correctAnswer"]
          }
        }
      }
    });
    return JSON.parse(response.text);
  },

  async checkAnswer(question: string, userAnswer: string, correctAnswer: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Вопрос: "${question}". Правильный ответ: "${correctAnswer}". Ответ пользователя: "${userAnswer}". 
      Проверь, является ли ответ пользователя правильным по смыслу. Верни JSON: { "isCorrect": boolean, "explanation": string }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            explanation: { type: Type.STRING }
          },
          required: ["isCorrect"]
        }
      }
    });
    return JSON.parse(response.text);
  }
};

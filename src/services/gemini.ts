import { GoogleGenAI, Type } from "@google/genai";
import { getSupabase } from "../supabase";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is not configured");
  }
  return new GoogleGenAI({ apiKey });
};

const callAIWithRetry = async (fn: () => Promise<any>, maxRetries = 3, initialDelay = 1000) => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Check if it's a 429 error
      const isRateLimit = error?.message?.includes('429') || 
                          error?.status === 'RESOURCE_EXHAUSTED' ||
                          JSON.stringify(error).includes('429');
      
      if (isRateLimit && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i); // Exponential backoff
        console.warn(`Gemini API rate limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

export const geminiService = {
  async getPrompt(gameId: string, replacements: Record<string, string>) {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('prompts')
      .select('content')
      .eq('game_id', gameId)
      .single();

    if (error || !data) return null;

    let content = data.content;
    Object.entries(replacements).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{${key}}`, 'g'), value);
    });

    return content;
  },

  async generateJeopardyCategories(topic: string, difficulty: string): Promise<string[]> {
    const difficultyMap: Record<string, string> = {
      'dummy': 'очень простая, для новичков',
      'people': 'средняя, для обычных людей',
      'genius': 'высокая, для экспертов',
      'god': 'экстремальная, для знатоков'
    };
    const diffDesc = difficultyMap[difficulty] || difficulty;
    const prompt = `Сгенерируй 5 уникальных и интересных названий категорий для игры "Своя Иква" на тему "${topic}". 
    Сложность: ${diffDesc}. 
    Названия должны быть краткими (1-3 слова).
    Верни JSON массив строк.`;

    const ai = getAI();
    const response = await callAIWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    }));

    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error('Error parsing categories:', e);
      return ['Тема 1', 'Тема 2', 'Тема 3', 'Тема 4', 'Тема 5'];
    }
  },

  async generateQuestions(topic: string, difficulty: string, count: number = 10, type: string = 'normal', customPrompt?: string) {
    let prompt = customPrompt;
    
    if (!prompt) {
      const difficultyMap: Record<string, string> = {
        'dummy': 'очень простая, для новичков',
        'people': 'средняя, для обычных людей',
        'genius': 'высокая, для экспертов',
        'god': 'экстремальная, для знатоков'
      };
      const diffDesc = difficultyMap[difficulty] || difficulty;

      if (type === 'blitz') {
        prompt = `Сгенерируй ПАКЕТ из ${count} вопросов для КвИИЗа на тему "${topic}". 
        Сложность: ${diffDesc}.
        
        ТРЕБОВАНИЯ К ВОПРОСАМ:
        1. Каждый вопрос должен быть основан на интересном факте по теме "${topic}" с учетом уровня сложности.
        2. Вопрос должен представлять собой логическую цепочку или загадку, требующую эрудиции и смекалки, а не простого знания фактов.
        3. В тексте вопроса КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать однокоренные слова к правильному ответу.
        4. Обязательно добавляй в текст вопроса косвенные намеки и ключевые фразы, помогающие прийти к ответу.
        5. Ответ должен быть коротким (1-3 слова).
        6. Каждый вопрос должен сопровождаться подробным комментарием (explanation), который объясняет ответ и добавляет интересный факт.
        
        Верни массив объектов в формате JSON с полями: text, correctAnswer, hint, explanation.`;
      } else if (type === 'millionaire') {
        prompt = `Сгенерируй ПОЛНЫЙ ПАКЕТ из 15 вопросов для игры "Квиллионер" на тему "${topic}".
        Базовая сложность: ${diffDesc}.
        
        ТРЕБОВАНИЯ:
        1. Сложность должна прогрессировать от 1 (очень легко) до 15 (невероятно сложно).
        2. Каждый вопрос должен быть основан на интересном факте по теме "${topic}".
        3. Вопрос должен представлять собой логическую цепочку или загадку, требующую эрудиции и смекалки.
        4. В тексте вопроса КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать однокоренные слова к правильному ответу.
        5. Обязательно добавляй в текст вопроса косвенные намеки и ключевые фразы.
        6. Для каждого вопроса предложи 4 варианта ответа (А, Б, В, Г).
        7. Для каждого вопроса напиши подробный комментарий (explanation), который будет показан после ответа.
        
        Верни массив из 15 объектов в формате JSON с полями: text, options (массив из 4 строк с префиксами А. Б. В. Г.), correctAnswer (строка, в точности совпадающая с одним из options), hint, explanation.`;
      } else if (type === 'whatwherewhen') {
        prompt = `Сгенерируй ПАКЕТ из 11 вопросов для игры "Что? Где? Квада?" на тему "${topic}".
        Сложность: ${diffDesc}.
        
        ТРЕБОВАНИЯ:
        1. Вопросы должны быть в стиле элитарного клуба: на логику, догадку, "красивое" решение, а не на сухие факты. Основывайся на интересных фактах по теме "${topic}".
        2. Вопросы должны быть развернутыми, в форме истории или загадки.
        3. В тексте вопроса КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать однокоренные слова к правильному ответу.
        4. Обязательно добавляй в текст вопроса косвенные намеки и ключевые фразы.
        5. Каждый вопрос должен иметь подробное объяснение (explanation) логики ответа.
        
        Верни массив из 11 объектов в формате JSON с полями: text, correctAnswer, hint, explanation.`;
      } else if (type === '100to1') {
        prompt = `Сгенерируй ОДИН уникальный и малопопулярный вопрос для игры "Сто Квадному" на тему "${topic}".
        Сложность: ${diffDesc}.
        
        ТРЕБОВАНИЯ:
        1. Вопрос должен быть необычным, основанным на интересном факте или социальном явлении по теме "${topic}".
        2. Вопрос должен быть сформулирован как загадка или логическая задача.
        3. В тексте вопроса КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать однокоренные слова к самым популярным ответам.
        4. Нужно 6 вариантов ответов с баллами (от самого популярного к самому редкому).
        5. Добавь подробный комментарий (explanation) о том, почему такие ответы могли быть даны.
        
        Верни объект JSON с полями: question, answers (массив из 6 объектов {text, points}), hint, explanation.`;
      } else if (type === 'jeopardy') {
        prompt = `Сгенерируй ОДИН уникальный и малопопулярный вопрос для "Своей Игры" на тему "${topic}".
        Сложность: ${diffDesc}.
        
        ТРЕБОВАНИЯ:
        1. Вопрос должен быть развернутым, интересным и основанным на глубоком факте по теме "${topic}".
        2. Вопрос должен представлять собой логическую цепочку или загадку.
        3. В тексте вопроса КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать однокоренные слова к правильному ответу.
        4. Обязательно добавляй в текст вопроса косвенные намеки и ключевые фразы.
        5. Добавь подробный комментарий (explanation) к ответу.
        
        Верни объект JSON with полями: text, answer, hint, explanation.`;
      } else {
        prompt = `Сгенерируй ${count} вопросов на тему "${topic}". Сложность: ${diffDesc}.
        ТРЕБОВАНИЯ:
        1. Основывайся на интересных фактах.
        2. Используй логические цепочки и загадки.
        3. ЗАПРЕЩЕНО использовать однокоренные слова к ответу.
        4. Добавляй намеки и ключевые фразы.
        Верни массив объектов JSON: text, options (4 шт), correctAnswer, hint, explanation.`;
      }
    }

    const ai = getAI();
    const response = await callAIWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    }));
    
    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse AI response:", response.text);
      throw new Error("Ошибка парсинга ответа ИИ");
    }
  },

  async generateSingleQuestion(topic: string, difficulty: string, type: string = 'normal', level: number = 1) {
    const prompt = `Сгенерируй 1 вопрос для игры "${type}" на тему "${topic}". 
    Уровень сложности: ${level} из 15 (где 1 - самый простой, 15 - самый сложный).
    Сложность по классификации: "${difficulty}".
    
    Верни объект JSON со следующей структурой:
    {
      "text": "Текст вопроса",
      "options": ["А. Вариант", "Б. Вариант", "В. Вариант", "Г. Вариант"],
      "correctAnswer": "Точный текст правильного варианта из массива options (вместе с буквой)",
      "hint": "Небольшая подсказка"
    }
    
    ВАЖНО: 
    1. Ответ должен быть СТРОГО в формате JSON.
    2. Поле correctAnswer должно в точности совпадать с одним из элементов массива options.
    3. Вопрос должен соответствовать уровню сложности ${level}.
    4. Обязательно используй буквы А. Б. В. Г. для вариантов ответов.`;

    const ai = getAI();
    const response = await callAIWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
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
    }));
    return JSON.parse(response.text);
  },

  async checkAnswer(question: string, userAnswer: string, correctAnswer: string) {
    const ai = getAI();
    const response = await callAIWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Вопрос: "${question}". Правильный ответ: "${correctAnswer}". Ответ пользователя: "${userAnswer}". 
      Проверь, является ли ответ пользователя правильным по смыслу. 
      Верни JSON: { "isCorrect": boolean, "explanation": string }
      В поле explanation напиши краткий и емкий ответ (максимум 500 символов): почему ответ пользователя правильный или почему он неправильный, 
      раскрой логику вопроса и правильного ответа.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            explanation: { type: Type.STRING }
          },
          required: ["isCorrect", "explanation"]
        }
      }
    }));
    return JSON.parse(response.text);
  }
};

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
      const isRateLimit = error?.message?.includes('429') || 
                          error?.status === 'RESOURCE_EXHAUSTED' ||
                          JSON.stringify(error).includes('429');
      
      if (isRateLimit && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Gemini API rate limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

const DEFAULT_PROMPTS: Record<string, string> = {
  jeopardy_categories: `Сгенерируй 5 уникальных и интересных категорий для игры "Своя Икра" на тему "{topic}". 
    Для каждой категории придумай название и краткое описание (1 предложение).
    Названия должны быть краткими (1-3 слова).
    Верни JSON массив объектов с полями: name, description.`,
  blitz_questions: `Сгенерируй ПАКЕТ из {count} вопросов для КвИИЗа на тему "{topic}". 
    Сложность: {diffDesc}.
    
    ТРЕБОВАНИЯ К ВОПРОСАМ:
    1. Каждый вопрос должен быть основан на интересном факте по теме "{topic}" с учетом уровня сложности.
    2. Вопрос должен представлять собой логическую цепочку или загадку, требующую эрудиции и смекалки, а не простого знания фактов.
    3. В тексте вопроса КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать однокоренные слова к правильному ответу.
    4. Обязательно добавляй в текст вопроса косвенные намеки и ключевые фразы, помогающие прийти к ответу.
    5. Ответ должен быть коротким (1-3 слова).
    6. Каждый вопрос должен сопровождаться подробным комментарием (explanation), который объясняет ответ и добавляет интересный факт.
    
    Верни массив объектов в формате JSON с полями: text, correctAnswer, hint, explanation.`,
  millionaire_questions: `Сгенерируй ПОЛНЫЙ ПАКЕТ из 15 вопросов для игры "Квиллионер" на тему "{topic}".
    Базовая сложность: {diffDesc}.
    
    ТРЕБОВАНИЯ:
    1. Сложность должна прогрессировать от 1 (очень легко) до 15 (невероятно сложно).
    2. Каждый вопрос должен быть основан на интересном факте по теме "{topic}".
    3. Вопрос должен представлять собой логическую цепочку или загадку, требующую эрудиции и смекалки.
    4. В тексте вопроса КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать однокоренные слова к правильному ответу.
    5. Обязательно добавляй в текст вопроса косвенные намеки и ключевые фразы.
    6. Для каждого вопроса предложи 4 варианта ответа (А, Б, В, Г).
    7. Для каждого вопроса напиши подробный комментарий (explanation), который будет показан после ответа.
    
    Верни массив из 15 объектов в формате JSON с полями: text, options (массив из 4 строк с префиксами А. Б. В. Г.), correctAnswer (строка, в точности совпадающая с одним из options), hint, explanation.`,
  whatwherewhen_questions: `Сгенерируй ПАКЕТ из 11 вопросов для игры "Что? Где? Квада?" на тему "{topic}".
    Сложность: {diffDesc}.
    
    ТРЕБОВАНИЯ:
    1. Вопросы должны быть в стиле элитарного клуба: на логику, догадку, "красивое" решение, а не на сухие факты. Основывайся на интересных фактах по теме "{topic}".
    2. Каждый вопрос должен начинаться с представления телезрителя в формате: "Вопрос от телезрителя [Имя Фамилия Отчество] из [Населенный пункт, Область] интересуется у знатоков:".
    3. Имена должны быть русскими, забавными, редкими и колоритными (например: Акакий Пантелеймонович Свинорылов).
    4. Населенные пункты должны иметь необычные названия и реально существующие области России (например: деревня Выдропужск, Тверская область).
    5. Сам вопрос должен строиться так: берется энциклопедичный факт и из него логичным намеком строится вопрос, чтобы даже не зная факта можно было прийти к нему смекалкой и небольшой эрудицией.
    6. В тексте вопроса КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать однокоренные слова к правильному ответу.
    7. Обязательно добавляй в текст вопроса косвенные намеки и ключевые фразы.
    8. Каждый вопрос должен иметь подробное объяснение (explanation) логики ответа.
    
    Верни массив из 11 объектов в формате JSON с полями: text, correctAnswer, hint, explanation.`,
  '100to1_questions': `Сгенерируй ОДИН уникальный и малопопулярный вопрос для игры "Сто Квадному" на тему "{topic}".
    Сложность: {diffDesc}.
    
    ТРЕБОВАНИЯ:
    1. Вопрос должен быть необычным, основанным на интересном факте или социальном явлении по теме "{topic}".
    2. Вопрос должен быть сформулирован как загадка или логическая задача.
    3. В тексте вопроса КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать однокоренные слова к самым популярным ответам.
    4. Нужно 6 вариантов ответов с баллами (от самого популярного к самому редкому).
    5. Добавь подробный комментарий (explanation) о том, почему такие ответы могли быть даны.
    
    Верни объект JSON с полями: question, answers (массив из 6 объектов {text, points, hint, mediaUrl, mediaType}), hint, explanation.`,
  jeopardy_questions: `Сгенерируй 5 вопросов для категории "{categoryName}" (Описание: {categoryDescription}) в игре "Своя Икра".
    
    ТРЕБОВАНИЯ:
    1. Сгенерируй ровно 5 вопросов с номиналами: {values}.
    2. Сложность должна СТРОГО соответствовать номиналу: {values[0]} - самый простой, {values[4]} - самый сложный.
    3. Каждый вопрос должен быть интересным и основанным на глубоком факте.
    4. Вопрос должен представлять собой логическую цепочку или загадку.
    5. В тексте вопроса КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать однокоренные слова к правильному ответу.
    6. Обязательно добавляй в текст вопроса косвенные намеки и ключевые фразы.
    7. Добавь подробный комментарий (explanation) к ответу.
    
    Верни массив из 5 объектов JSON с полями: value (число), text, answer, hint, explanation.`,
  normal_questions: `Сгенерируй {count} вопросов на тему "{topic}". Сложность: {diffDesc}.
    ТРЕБОВАНИЯ:
    1. Основывайся на интересных фактах.
    2. Используй логические цепочки и загадки.
    3. ЗАПРЕЩЕНО использовать однокоренные слова к ответу.
    4. Добавляй намеки и ключевые фразы.
    Верни массив объектов JSON: text, options (4 шт), correctAnswer, hint, explanation.`,
  single_question: `Сгенерируй 1 вопрос для игры "{type}" на тему "{topic}". 
    Уровень сложности: {level} из 15 (где 1 - самый простой, 15 - самый сложный).
    Сложность по классификации: "{difficulty}".
    
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
    3. Вопрос должен соответствовать уровню сложности {level}.
    4. Обязательно используй буквы А. Б. В. Г. для вариантов ответов.`,
  check_answer: `Вопрос: "{question}". Правильный ответ: "{correctAnswer}". Ответ пользователя: "{userAnswer}". 
    Проверь, является ли ответ пользователя правильным по смыслу. 
    Верни JSON: { "isCorrect": boolean, "explanation": string }
    В поле explanation напиши краткий и емкий ответ (максимум 500 символов): почему ответ пользователя правильный или почему он неправильный, 
    раскрой логику вопроса и правильного ответа.`,
  ai_comment: `Ты - ИИ-персонаж в игре-викторине. Твой характер: {personality}.
    Произошло событие: {event}. 
    Вопрос был: "{question}". 
    Правильный ответ: "{answer}".
    Был ли ответ правильным: {isCorrect}.
    Напиши короткий (1-2 предложения) комментарий в игровой чат от своего лица. 
    Комментарий должен соответствовать твоему характеру.
    Верни просто текст комментария.`
};

export const geminiService = {
  async getAIPrompt(gameId: string, replacements: Record<string, string | number | boolean>) {
    const supabase = getSupabase();
    let content = DEFAULT_PROMPTS[gameId] || '';

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('prompts')
          .select('content')
          .eq('game_id', gameId)
          .single();

        if (!error && data) {
          content = data.content;
        }
      } catch (e) {
        console.warn('Supabase prompts fetch failed, using default');
      }
    }

    Object.entries(replacements).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{${key}}`, 'g'), String(value));
    });

    return content;
  },

  async generateJeopardyCategories(topic: string, difficulty: string): Promise<{name: string, description: string}[]> {
    const prompt = await this.getAIPrompt('jeopardy_categories', { topic });

    const ai = getAI();
    const response = await callAIWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { 
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["name", "description"]
          }
        }
      }
    }));

    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error('Error parsing categories:', e);
      return [
        { name: 'Тема 1', description: 'Описание темы 1' },
        { name: 'Тема 2', description: 'Описание темы 2' },
        { name: 'Тема 3', description: 'Описание темы 3' },
        { name: 'Тема 4', description: 'Описание темы 4' },
        { name: 'Тема 5', description: 'Описание темы 5' }
      ];
    }
  },

  async generateJeopardyQuestions(categoryName: string, categoryDescription: string, values: number[]) {
    const prompt = await this.getAIPrompt('jeopardy_questions', { 
      categoryName, 
      categoryDescription, 
      values: values.join(', ') 
    });

    const ai = getAI();
    const response = await callAIWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.NUMBER },
              text: { type: Type.STRING },
              answer: { type: Type.STRING },
              hint: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["value", "text", "answer"]
          }
        }
      }
    }));
    
    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse Jeopardy questions:", response.text);
      throw new Error("Ошибка генерации вопросов");
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
        prompt = await this.getAIPrompt('blitz_questions', { count, topic, diffDesc });
      } else if (type === 'millionaire') {
        prompt = await this.getAIPrompt('millionaire_questions', { topic, diffDesc });
      } else if (type === 'whatwherewhen') {
        prompt = await this.getAIPrompt('whatwherewhen_questions', { topic, diffDesc });
      } else if (type === '100to1') {
        prompt = await this.getAIPrompt('100to1_questions', { topic, diffDesc });
      } else if (type === 'jeopardy') {
        prompt = await this.getAIPrompt('jeopardy_questions', { topic, diffDesc });
      } else {
        prompt = await this.getAIPrompt('normal_questions', { count, topic, diffDesc });
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
    const prompt = await this.getAIPrompt('single_question', { topic, type, level, difficulty });

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
    const prompt = await this.getAIPrompt('check_answer', { question, correctAnswer, userAnswer });
    const ai = getAI();
    const response = await callAIWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
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
  },

  async generateAIComment(personality: string, event: string, question: string, answer: string, isCorrect: boolean) {
    const prompt = await this.getAIPrompt('ai_comment', { personality, event, question, answer, isCorrect });

    const ai = getAI();
    const response = await callAIWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    }));
    return response.text.trim();
  },

  async generateContent(params: { model: string; contents: string | any; config?: any }) {
    const ai = getAI();
    return await callAIWithRetry(() => ai.models.generateContent(params));
  }
};

export const generateContent = geminiService.generateContent;

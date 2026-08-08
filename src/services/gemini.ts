import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vqcxhdcsmkvleadrsrki.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxY3hoZGNzbWt2bGVhZHJzcmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDUyNzcsImV4cCI6MjA4OTYyMTI3N30.g3JpC1LhgzQPzDXnk9p7aT7gV-qPEmZ44vRvvlGgzzY';
const AI_TIMEOUT_MS = 100000;

async function callAI(prompt: string, mode: string = 'generate'): Promise<any> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ prompt, mode }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('ИИ не ответил за 100 секунд. Попробуйте повторить запрос.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(errData.error || `AI request failed: ${res.status}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  
  if (data.raw) {
    return data.response;
  }
  return data.response;
}

const DEFAULT_PROMPTS: Record<string, string> = {
  jeopardy_categories: `Сгенерируй 15 уникальных и интересных категорий для игры "Своя Икра" на тему "{topic}". 
    Для каждой категории придумай название и краткое описание (1 предложение).
    Названия должны быть краткими (1-3 слова). Все 15 тем должны быть РАЗНЫМИ и охватывать разные аспекты темы.
    Верни JSON массив из 15 объектов с полями: name, description.`,
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
    5. Баллы представляют процент людей из 100 опрошенных, которые дали такой ответ. Сумма всех 6 баллов должна быть РОВНО 100.
    6. Баллы должны быть распределены реалистично: самый популярный ответ ~30-40, далее по убыванию.
    7. Добавь подробный комментарий (explanation) о том, почему такие ответы могли быть даны.
    
    Верни объект JSON с полями: question, answers (массив из 6 объектов {text, points, hint, mediaUrl, mediaType}), hint, explanation.
    
    ВАЖНО: Подсказка (hint) должна содержать ТОЛЬКО косвенный намёк, без прямого указания на ответ. Hint не должен содержать сам ответ или его синонимы.`,
  jeopardy_all_questions: `Сгенерируй ВСЕ 25 вопросов для 5 категорий игры "Своя Икра" на тему "{topic}".

    Категории и их описания:
    {categoriesJson}

    Номиналы в этом раунде (раунд {roundNum}): {values}.
    
    ТРЕБОВАНИЯ К ВОПРОСАМ:
    1. Для КАЖДОЙ из 5 категорий сгенерируй ровно 5 вопросов с номиналами {values}.
    2. Сложность СТРОГО привязана к номиналу: 
       - Самый маленький номинал ({minValue}) = самый простой вопрос, базовые знания.
       - Средний номинал = средняя сложность, нужна эрудиция.
       - Самый большой номинал ({maxValue}) = очень сложный вопрос, глубокие экспертные знания.
    3. Каждый вопрос должен быть основан на интересном факте по сгенерированной теме с учетом уровня сложности.
    4. Вопрос должен представлять собой логическую цепочку или загадку, требующую эрудиции и смекалки, а не простого знания фактов.
    5. В тексте вопроса КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать однокоренные слова к правильному ответу.
    6. Обязательно добавляй в текст вопроса косвенные намеки и ключевые фразы, помогающие прийти к ответу через смекалку.
    7. Текст каждого вопроса должен быть развёрнутым (3-5 предложений), содержать контекст, историю или описание ситуации.
    8. Ответ должен быть коротким (1-3 слова).
    9. Правильные ответы должны быть УНИКАЛЬНЫМИ — ни один ответ не должен повторяться во всей игре (все 25 ответов разные).
    10. Каждый вопрос должен сопровождаться подробным комментарием (explanation), который объясняет ответ и добавляет интересный факт.
    
    Верни JSON массив из 5 объектов, каждый с полями:
    - categoryName (string) — название категории
    - questions (массив из 5 объектов с полями: value (число), text, answer, hint, explanation)
    
    ВАЖНО: Верни РОВНО 25 вопросов (5 категорий × 5 вопросов). Все ответы уникальны. Ответы НЕ повторяются.`,
  jeopardy_questions: `Сгенерируй 5 вопросов для категории "{categoryName}" (Описание: {categoryDescription}) в игре "Своя Икра".
    
    ТРЕБОВАНИЯ:
    1. Сгенерируй ровно 5 вопросов с номиналами: {values}.
    2. Сложность должна СТРОГО соответствовать номиналу: самый маленький номинал - самый простой вопрос, самый большой - самый сложный.
    3. Каждый вопрос должен быть интересным и основанным на глубоком факте.
    4. Текст вопроса должен быть развёрнутым (3-5 предложений).
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
    Верни просто текст комментария, без JSON.`
};

export const geminiService = {
  async getAIPrompt(gameId: string, replacements: Record<string, string | number | boolean>) {
    let content = DEFAULT_PROMPTS[gameId] || '';

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

    Object.entries(replacements).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{${key}}`, 'g'), String(value));
    });

    return content;
  },

  async generateJeopardyCategories(topic: string, _difficulty: string): Promise<{name: string, description: string}[]> {
    const prompt = await this.getAIPrompt('jeopardy_categories', { topic });
    const result = await callAI(prompt, 'jeopardy_categories');
    
    if (Array.isArray(result)) return result;
    
    return Array.from({ length: 15 }, (_, i) => ({
      name: `Тема ${i + 1}`,
      description: `Описание темы ${i + 1}`
    }));
  },

  async generateAllJeopardyQuestions(
    categories: { name: string; description: string }[],
    roundNum: number,
    values: number[]
  ): Promise<{ categoryName: string; questions: { value: number; text: string; answer: string; hint: string; explanation: string }[] }[]> {
    const categoriesJson = JSON.stringify(categories.map(c => ({ name: c.name, description: c.description })));
    const prompt = await this.getAIPrompt('jeopardy_all_questions', {
      topic: categories.map(c => c.name).join(', '),
      categoriesJson,
      roundNum,
      values: values.join(', '),
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
    });
    const result = await callAI(prompt, 'jeopardy_all_questions');
    if (Array.isArray(result)) return result;
    throw new Error("Ошибка генерации вопросов Своей Икры");
  },

  async generateJeopardyQuestions(categoryName: string, categoryDescription: string, values: number[]) {
    const prompt = await this.getAIPrompt('jeopardy_questions', { 
      categoryName, 
      categoryDescription, 
      values: values.join(', ') 
    });
    const result = await callAI(prompt, 'jeopardy_questions');
    if (!Array.isArray(result)) throw new Error("Ошибка генерации вопросов");
    return result;
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

    return await callAI(prompt, type);
  },

  async generateSingleQuestion(topic: string, difficulty: string, type: string = 'normal', level: number = 1) {
    const prompt = await this.getAIPrompt('single_question', { topic, type, level, difficulty });
    return await callAI(prompt, 'single_question');
  },

  async checkAnswer(question: string, userAnswer: string, correctAnswer: string) {
    const prompt = await this.getAIPrompt('check_answer', { question, correctAnswer, userAnswer });
    const result = await callAI(prompt, 'check_answer');
    
    if (typeof result === 'object' && 'isCorrect' in result) {
      return result;
    }
    const isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    return { isCorrect, explanation: isCorrect ? 'Правильный ответ!' : `Правильный ответ: ${correctAnswer}` };
  },

  async generateAIComment(personality: string, event: string, question: string, answer: string, isCorrect: boolean) {
    const prompt = await this.getAIPrompt('ai_comment', { personality, event, question, answer, isCorrect });
    const result = await callAI(prompt, 'ai_comment');
    
    if (typeof result === 'string') return result.trim();
    return 'Интересный ход!';
  },
};

export const generateContent = async (params: { model: string; contents: string | any; config?: any }) => {
  const prompt = typeof params.contents === 'string' ? params.contents : JSON.stringify(params.contents);
  return { text: JSON.stringify(await callAI(prompt, 'generate')) };
};

import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

let dbInstance: Database | null = null;
const dbPath = path.join(process.cwd(), 'database.sqlite');

export const generateId = (prefix: string = 'id') => `${prefix}_${crypto.randomBytes(8).toString('hex')}`;

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    const SQL = await initSqlJs();
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      dbInstance = new SQL.Database(fileBuffer);
    } else {
      dbInstance = new SQL.Database();
    }
    initDbSchema(dbInstance);
    saveDb(dbInstance);
  }
  return dbInstance;
}

export function saveDb(db?: Database) {
  const targetDb = db || dbInstance;
  if (targetDb) {
    const data = targetDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export async function getAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export async function getOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const results = await getAll<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

export async function runSql(sql: string, params: any[] = []): Promise<void> {
  const db = await getDb();
  if (params.length === 0) {
    db.run(sql);
  } else {
    const stmt = db.prepare(sql);
    stmt.run(params);
    stmt.free();
  }
  saveDb(db);
}

function initDbSchema(db: Database) {
  db.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      uid TEXT UNIQUE NOT NULL,
      telegram_id TEXT,
      display_name TEXT,
      username TEXT,
      photo_url TEXT,
      avatar_url TEXT,
      balance_rub REAL DEFAULT 0,
      coins INTEGER DEFAULT 0,
      referral_code TEXT,
      referred_by TEXT,
      referred_code TEXT,
      role TEXT DEFAULT 'player',
      author_status TEXT,
      email TEXT,
      password TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      game_id TEXT,
      game_title TEXT,
      score INTEGER DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      mode TEXT,
      difficulty TEXT,
      topic TEXT,
      price_paid REAL DEFAULT 0,
      is_win INTEGER DEFAULT 0,
      completed_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS game_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      pack_id TEXT NOT NULL,
      game_type TEXT NOT NULL,
      current_step INTEGER DEFAULT 0,
      total_steps INTEGER DEFAULT 0,
      state TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, pack_id, game_type)
    );

    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      platforms TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS offline_registrations (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      full_name TEXT NOT NULL,
      phone TEXT,
      team_name TEXT,
      city TEXT,
      game_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      price REAL DEFAULT 0,
      item_type TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shop_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      price REAL DEFAULT 0,
      image_url TEXT,
      category TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS friends (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      status TEXT DEFAULT 'accepted',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'RUB',
      type TEXT NOT NULL,
      description TEXT,
      reference_id TEXT,
      timestamp INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mailing_logs (
      id TEXT PRIMARY KEY,
      recipient_id TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      config_json TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT,
      user_social_id TEXT,
      user_message TEXT,
      bot_reply TEXT,
      channel_name TEXT,
      bot_id TEXT,
      llm TEXT,
      api_key TEXT,
      tokens_total NUMERIC,
      tokens_in_source NUMERIC,
      tokens_out_source NUMERIC,
      function_error TEXT,
      function_call_params TEXT,
      server_name TEXT,
      tokens_user NUMERIC,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS protalk_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id TEXT NOT NULL,
      bot_token TEXT NOT NULL,
      channel_name TEXT DEFAULT 'miniapp_ru',
      is_active INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS telegram_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_token TEXT,
      bot_name TEXT DEFAULT 'Квайз Бот',
      bot_username TEXT DEFAULT 'qaiz_bot',
      bot_link TEXT DEFAULT 'https://t.me/qaiz_bot',
      channel_username TEXT DEFAULT 'qaiz_ru',
      channel_link TEXT DEFAULT 'https://t.me/qaiz_ru',
      web_app_url TEXT DEFAULT 'https://qaiz.ru',
      is_active INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prompts (
      game_id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      description TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Triggers
    CREATE TRIGGER IF NOT EXISTS trg_profiles_updated_at 
    AFTER UPDATE ON profiles 
    BEGIN 
      UPDATE profiles SET updated_at = datetime('now') WHERE id = NEW.id; 
    END;

    CREATE TRIGGER IF NOT EXISTS trg_game_progress_updated_at 
    AFTER UPDATE ON game_progress 
    BEGIN 
      UPDATE game_progress SET updated_at = datetime('now') WHERE id = NEW.id; 
    END;

    CREATE TRIGGER IF NOT EXISTS trg_news_updated_at 
    AFTER UPDATE ON news 
    BEGIN 
      UPDATE news SET updated_at = datetime('now') WHERE id = NEW.id; 
    END;
  `);

  try { db.run("ALTER TABLE profiles ADD COLUMN password TEXT;"); } catch (_) {}
  try { db.run("ALTER TABLE profiles ADD COLUMN avatar_url TEXT;"); } catch (_) {}

  // Helper function to check if a table is empty
  const countTable = (tableName: string): number => {
    try {
      const s = db.prepare(`SELECT COUNT(*) as c FROM ${tableName}`);
      let cnt = 0;
      if (s.step()) cnt = (s.getAsObject() as any).c || 0;
      s.free();
      return cnt;
    } catch (_) {
      return 0;
    }
  };

  // 1. Check default admin user in profiles
  const stmt = db.prepare('SELECT * FROM profiles WHERE uid = ?');
  stmt.bind(['00000000-0000-0000-0000-000000000001']);
  const hasUser = stmt.step();
  stmt.free();

  if (!hasUser) {
    const usrStmt = db.prepare(
      `INSERT INTO profiles (id, uid, telegram_id, display_name, username, role, balance_rub, coins, email, password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    usrStmt.run([
      generateId('usr'),
      '00000000-0000-0000-0000-000000000001',
      '169262991',
      'Создатель (Dev)',
      'roborecrut',
      'admin',
      1000,
      500,
      'admin@qaiz.ru',
      'admin123'
    ]);
    usrStmt.free();
  }

  // 2. game_sessions default
  if (countTable('game_sessions') === 0) {
    db.run(
      `INSERT INTO game_sessions (id, user_id, game_id, game_title, score, total_questions, correct_answers, mode, difficulty, topic, price_paid, is_win)
       VALUES ('gs_demo_1', '00000000-0000-0000-0000-000000000001', 'pack1', 'Пак: Кино и Музыка', 100, 10, 10, 'single', 'people', 'Кино и Музыка', 20, 1)`
    );
  }

  // 3. game_progress default
  if (countTable('game_progress') === 0) {
    db.run(
      `INSERT INTO game_progress (id, user_id, pack_id, game_type, current_step, total_steps, state)
       VALUES ('gp_demo_1', '00000000-0000-0000-0000-000000000001', 'pack1', 'millionaire', 5, 15, '{"score":50}')`
    );
  }

  // 4. news default
  if (countTable('news') === 0) {
    db.run(
      `INSERT INTO news (id, title, content, image_url, platforms)
       VALUES ('news_demo_1', 'Добро пожаловать в Квайз!', 'Запускаем обновленные игры, блиц-турниры и викторины. Играйте в браузерной и Telegram версиях!', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80', 'Web, Telegram')`
    );
  }

  // 5. offline_registrations default
  if (countTable('offline_registrations') === 0) {
    db.run(
      `INSERT INTO offline_registrations (id, user_id, full_name, phone, team_name, city, game_date)
       VALUES ('reg_demo_1', '00000000-0000-0000-0000-000000000001', 'Иван Иванов', '+7 (999) 000-00-00', 'Жабки Удачи', 'Москва', '2026-08-15')`
    );
  }

  // 6. shop_items default (seed from SHOP_ITEMS constants)
  if (countTable('shop_items') === 0) {
    const shopPacks = [
      { id: 'pack1', title: 'Пак: Кино и Музыка', description: 'Лучшие вопросы про кино и музыку от нашего топового автора.', price: 20, category: 'Уквакай Мелодию', image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80' },
      { id: 'pack2', title: 'Хардкор Интеллект', description: 'Для тех, кто не боится сложных вопросов. Логика, интуиция и глубокие знания.', price: 60, category: 'Своя Икра', image_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80' },
      { id: 'pack3', title: 'Вечеринка', description: 'Бесплатный пак для веселой компании. Простые и забавные вопросы.', price: 0, category: '100 квадному', image_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80' },
      { id: 'pack4', title: 'Квиллионер Плюс', description: 'Расширенная версия классики с новыми каверзными вопросами.', price: 15, category: 'Квиллионер', image_url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80' },
      { id: 'pack5', title: 'Блиц-Опрос: Наука', description: 'Быстрые вопросы о науке и технологиях.', price: 10, category: 'КвИИз', image_url: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80' },
      { id: 'pack6', title: 'Что? Где? Квада? - Классика', description: 'Классические вопросы элитарного клуба.', price: 36, category: 'Что Где Квада', image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80' }
    ];
    for (const p of shopPacks) {
      db.run(
        `INSERT INTO shop_items (id, title, description, price, category, image_url) VALUES (?, ?, ?, ?, ?, ?)`,
        [p.id, p.title, p.description, p.price, p.category, p.image_url]
      );
    }
  }

  // 7. purchases default
  if (countTable('purchases') === 0) {
    db.run(
      `INSERT INTO purchases (id, user_id, item_id, price, item_type)
       VALUES ('pur_demo_1', '00000000-0000-0000-0000-000000000001', 'pack1', 20, 'pack')`
    );
  }

  // 8. friends default
  if (countTable('friends') === 0) {
    db.run(
      `INSERT INTO friends (id, user_id, friend_id, status)
       VALUES ('fr_demo_1', '00000000-0000-0000-0000-000000000001', 'usr_bot_friend', 'accepted')`
    );
  }

  // 9. transactions default
  if (countTable('transactions') === 0) {
    db.run(
      `INSERT INTO transactions (id, user_id, amount, currency, type, description, reference_id, timestamp)
       VALUES ('tx_demo_1', '00000000-0000-0000-0000-000000000001', 100, 'RUB', 'deposit', 'Приветственный бонус при регистрации', 'ref_welcome', ${Date.now()})`
    );
  }

  // 10. mailing_logs default
  if (countTable('mailing_logs') === 0) {
    db.run(
      `INSERT INTO mailing_logs (id, recipient_id, type, status, timestamp)
       VALUES ('ml_demo_1', '00000000-0000-0000-0000-000000000001', 'welcome_email', 'delivered', ${Date.now()})`
    );
  }

  // 11. system_config default (including constants)
  if (countTable('system_config') === 0) {
    const defaultConfig = {
      appName: 'Квайз (qaiz.ru)',
      maintenanceMode: false,
      topics: [
        'Общие знания', 'Кино и сериалы', 'Музыка', 'История', 'География',
        'Наука и природа', 'Спорт', 'Литература', 'Технологии', 'Еда и напитки',
        'Животные', 'Мифология', 'Языки', 'Видеоигры', 'Мультфильмы',
        'Комиксы', 'Медицина', 'Автомобили', 'Знаменитости', 'Бренды',
        'Кинематограф СССР', 'История России', 'Рок-музыка', 'Поп-музыка', 'Аниме',
        'Настольные игры', 'Интернет-мемы', 'Криптовалюты', 'Загадки и логика', 'Математика',
        'Физика', 'Химия', 'Биология', 'Гарри Поттер', 'Матрица',
        'Властелин Колец', 'Игра престолов', 'Ситкомы', 'Российские сериалы', 'Русское ТВ',
        'Реклама и маркетинг', 'Бизнес и финансы', '80-е', '90-е', '2000-е',
        'Звездные Войны', 'Терминатор', 'Канал ТНТ', 'Нейросети', 'YouTube и TikTok'
      ],
      difficulties: [
        { id: 'dummy', name: 'ИИкра', multiplier: 1, color: 'text-emerald-500', level: '1/4', description: 'Самый простой уровень. Идеально для начала.' },
        { id: 'people', name: 'Головастик', multiplier: 1.5, color: 'text-yellow-500', level: '2/4', description: 'Средний уровень. Требует базовых знаний.' },
        { id: 'genius', name: 'Квант', multiplier: 2, color: 'text-rose-500', level: '3/4', description: 'Высокий уровень. Для опытных игроков.' },
        { id: 'god', name: 'Ляга-омега', multiplier: 3, color: 'text-purple-500', level: '4/4', description: 'Экспертный уровень. Только для истинных знатоков.' }
      ],
      aiTemplates: [
        { id: 'toad_professor', name: 'Профессор Жаба', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=professor', personality: 'Умный, вежливый, любит научные факты. Иногда занудствует.', difficulty: 'god', description: 'Знает всё обо всём. Почти не ошибается.' },
        { id: 'toad_rebel', name: 'Жаба-Бунтарь', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=rebel', personality: 'Дерзкий, самоуверенный, использует сленг. Любит рисковать.', difficulty: 'genius', description: 'Очень умный, но иногда слишком самоуверен.' },
        { id: 'toad_lucky', name: 'Везучая Жаба', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=lucky', personality: 'Оптимистичный, весёлый. Часто полагается на интуицию.', difficulty: 'people', description: 'Средний уровень. Ошибается как обычный человек.' },
        { id: 'toad_newbie', name: 'Жаба-Новичок', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=newbie', personality: 'Скромный, немного пугливый. Часто сомневается в ответах.', difficulty: 'dummy', description: 'Часто ошибается, идеально для тренировки.' }
      ]
    };
    db.run(
      `INSERT INTO system_config (id, config_json) VALUES ('default', ?)`,
      [JSON.stringify(defaultConfig)]
    );
  }

  // 12. logs default
  if (countTable('logs') === 0) {
    db.run(
      `INSERT INTO logs (channel_id, user_social_id, user_message, bot_reply, channel_name, bot_id, llm, server_name)
       VALUES ('ask_init', 'from_user_id:init message_id:1', 'Привет, ПроТолк!', 'Привет! Я готов помоч с ответами и викторинами!', 'miniapp_ru', '60381', 'protalk', 'ai-chat-miniapp')`
    );
  }

  // 13. protalk_config default
  if (countTable('protalk_config') === 0) {
    db.run(
      `INSERT INTO protalk_config (bot_id, bot_token, channel_name, is_active)
       VALUES ('60381', '60381_FONb1dD2SQdv7FwG0ui2PZ9ODxXMKkz7', 'miniapp_ru', 1)`
    );
  }

  // 14. telegram_config default
  if (countTable('telegram_config') === 0) {
    db.run(
      `INSERT INTO telegram_config (bot_token, bot_name, bot_username, bot_link, channel_username, channel_link, web_app_url, is_active)
       VALUES ('7890123456:AA_EXAMPLE_TOKEN', 'Квайз Бот', 'qaiz_bot', 'https://t.me/qaiz_bot', 'qaiz_ru', 'https://t.me/qaiz_ru', 'https://qaiz.ru', 1)`
    );
  }

  // 15. prompts default (seed from DEFAULT_PROMPTS in protalk.ts)
  if (countTable('prompts') === 0) {
    const initialPrompts: Record<string, string> = {
      jeopardy_categories: `Сгенерируй 15 уникальных и интересных категорий для игры "Своя Икра" на тему "{topic}". Верни JSON массив из 15 объектов с полями: name, description.`,
      blitz_questions: `Сгенерируй ПАКЕТ из {count} вопросов для КвИИЗа на тему "{topic}". Сложность: {diffDesc}. Верни массив объектов в формате JSON с полями: text, correctAnswer, hint, explanation.`,
      millionaire_questions: `Сгенерируй ПОЛНЫЙ ПАКЕТ из 15 вопросов для игры "Квиллионер" на тему "{topic}". Базовая сложность: {diffDesc}. Верни массив из 15 объектов в формате JSON с полями: text, options, correctAnswer, hint, explanation.`,
      whatwherewhen_questions: `Сгенерируй ПАКЕТ из 11 вопросов для игры "Что? Где? Квада?" на тему "{topic}". Сложность: {diffDesc}. Верни массив из 11 объектов в формате JSON с полями: text, correctAnswer, hint, explanation.`,
      '100to1_questions': `Сгенерируй ОДИН уникальный вопрос для игры "Сто Квадному" на тему "{topic}". Сложность: {diffDesc}. Верни объект JSON с полями: question, answers, hint, explanation.`,
      jeopardy_all_questions: `Сгенерируй ВСЕ 25 вопросов для 5 категорий игры "Своя Икра" на тему "{topic}". Категории: {categoriesJson}. Номиналы: {values}. Верни JSON массив из 5 объектов.`,
      jeopardy_questions: `Сгенерируй 5 вопросов для категории "{categoryName}" в игре "Своя Икра". Верни массив из 5 объектов JSON.`,
      normal_questions: `Сгенерируй {count} вопросов на тему "{topic}". Сложность: {diffDesc}. Верни массив объектов JSON: text, options, correctAnswer, hint, explanation.`,
      single_question: `Сгенерируй 1 вопрос для игры "{type}" на тему "{topic}". Сложность: {difficulty}. Верни объект JSON со структурой text, options, correctAnswer, hint.`,
      check_answer: `Вопрос: "{question}". Правильный ответ: "{correctAnswer}". Ответ пользователя: "{userAnswer}". Проверь правильность. Верни JSON: { "isCorrect": boolean, "explanation": string }`,
      ai_comment: `Ты - ИИ-персонаж. Твой характер: {personality}. Произошло событие: {event}. Напиши короткий комментарий (1-2 предложения).`
    };

    for (const [gameId, content] of Object.entries(initialPrompts)) {
      db.run(
        `INSERT INTO prompts (game_id, content, description) VALUES (?, ?, ?)`,
        [gameId, content, `Промпт генератора для ${gameId}`]
      );
    }
  }
}

export async function recalculateUserBalancesFromTransactions(userId: string) {
  const row = await getOne<{ total_rub: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total_rub FROM transactions WHERE user_id = ? AND currency = 'RUB'`,
    [userId]
  );
  const correctBalance = row?.total_rub || 0;
  await runSql(`UPDATE profiles SET balance_rub = ? WHERE uid = ? OR id = ?`, [correctBalance, userId, userId]);
  return correctBalance;
}

export async function performDailyDatabaseBackup() {
  const db = await getDb();
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const dateStr = new Date().toISOString().split('T')[0];
  const backupPath = path.join(backupDir, `database_backup_${dateStr}.sqlite`);

  const data = db.export();
  fs.writeFileSync(backupPath, Buffer.from(data));
  console.log(`[Backup Engine] Бэкап базы данных успешно сохранен: ${backupPath}`);
}

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
      try {
        const fileBuffer = fs.readFileSync(dbPath);
        const tempDb = new SQL.Database(fileBuffer);
        // Verify database integrity and run schema init within try block
        tempDb.exec("PRAGMA quick_check;");
        initDbSchema(tempDb);
        dbInstance = tempDb;
      } catch (err) {
        console.error("Corrupted database.sqlite detected, wiping and creating fresh database:", err);
        try {
          if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
          if (fs.existsSync(`${dbPath}.tmp`)) fs.unlinkSync(`${dbPath}.tmp`);
        } catch (_) {}
        dbInstance = new SQL.Database();
        initDbSchema(dbInstance);
      }
    } else {
      dbInstance = new SQL.Database();
      initDbSchema(dbInstance);
    }
    saveDb(dbInstance);
  }
  return dbInstance;
}

export function saveDb(db?: Database) {
  const targetDb = db || dbInstance;
  if (targetDb) {
    try {
      const data = targetDb.export();
      const buffer = Buffer.from(data);
      const tmpPath = `${dbPath}.tmp`;
      fs.writeFileSync(tmpPath, buffer);
      fs.renameSync(tmpPath, dbPath);
    } catch (err) {
      console.error("Error saving database to disk:", err);
    }
  }
}

export async function getAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const db = await getDb();
    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  } catch (err: any) {
    if (err && String(err).includes('malformed')) {
      console.error("Query encountered malformed DB error. Wiping corrupted DB and retrying...", err);
      dbInstance = null;
      try {
        if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
        if (fs.existsSync(`${dbPath}.tmp`)) fs.unlinkSync(`${dbPath}.tmp`);
      } catch (_) {}
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
    throw err;
  }
}

export async function getOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const results = await getAll<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

export async function runSql(sql: string, params: any[] = []): Promise<void> {
  try {
    const db = await getDb();
    if (params.length === 0) {
      db.run(sql);
    } else {
      const stmt = db.prepare(sql);
      stmt.run(params);
      stmt.free();
    }
    saveDb(db);
  } catch (err: any) {
    if (err && String(err).includes('malformed')) {
      console.error("runSql encountered malformed DB error. Wiping corrupted DB and retrying...", err);
      dbInstance = null;
      try {
        if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
        if (fs.existsSync(`${dbPath}.tmp`)) fs.unlinkSync(`${dbPath}.tmp`);
      } catch (_) {}
      const db = await getDb();
      if (params.length === 0) {
        db.run(sql);
      } else {
        const stmt = db.prepare(sql);
        stmt.run(params);
        stmt.free();
      }
      saveDb(db);
      return;
    }
    throw err;
  }
}

function initDbSchema(db: Database) {
  db.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      uid TEXT UNIQUE NOT NULL,
      telegram_id TEXT,
      display_name TEXT,
      username TEXT,
      photo_url TEXT,
      avatar_url TEXT,
      phone TEXT,
      balance_rr REAL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      platforms TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      category TEXT DEFAULT 'general',
      description TEXT,
      use_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      description TEXT,
      image_url TEXT,
      question_count INTEGER DEFAULT 10,
      time_limit INTEGER DEFAULT 60,
      path TEXT,
      tag TEXT,
      price_per_question REAL DEFAULT 1,
      price_text TEXT,
      rules TEXT,
      coming_soon INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'RR',
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
      rub REAL,
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
      channel_name TEXT DEFAULT 'qaiz',
      is_active INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS telegram_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_token TEXT,
      bot_name TEXT DEFAULT 'Qaiz - ИИ Квиз онлайн мультиплеер',
      bot_username TEXT DEFAULT '@qaiz_aibot',
      bot_link TEXT DEFAULT 'https://t.me/qaiz_aibot',
      channel_username TEXT DEFAULT 'qaiz_ru',
      channel_link TEXT DEFAULT 'https://t.me/qaiz_ru',
      web_app_url TEXT DEFAULT 'https://t.me/qaiz_aibot/app',
      direct_site_url TEXT DEFAULT 'https://qaiz.ru/',
      ref_link_template TEXT DEFAULT 'https://t.me/SAV_AIbot/app?startapp={telegram_id}',
      is_active INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prompts (
      game_id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      description TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS difficulties (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      multiplier REAL DEFAULT 1.0,
      level TEXT,
      description TEXT,
      prompt_instructions TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS game_modes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS game_mode_relations (
      game_id TEXT NOT NULL,
      mode_id TEXT NOT NULL,
      PRIMARY KEY (game_id, mode_id)
    );

    CREATE TABLE IF NOT EXISTS file_folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS file_storage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      folder_id TEXT DEFAULT NULL,
      original_url TEXT NOT NULL,
      mime_type TEXT DEFAULT 'application/octet-stream',
      file_type TEXT NOT NULL DEFAULT 'other',
      size INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cron_jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      schedule TEXT NOT NULL,
      last_run TEXT,
      next_run TEXT,
      status TEXT DEFAULT 'active',
      action_type TEXT DEFAULT 'system',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS triggers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      event_type TEXT NOT NULL,
      action_type TEXT NOT NULL,
      target TEXT,
      payload TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Triggers
    CREATE TRIGGER IF NOT EXISTS trg_users_updated_at 
    AFTER UPDATE ON users 
    BEGIN 
      UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id; 
    END;

    CREATE TRIGGER IF NOT EXISTS trg_game_progress_updated_at 
    AFTER UPDATE ON game_progress 
    BEGIN 
      UPDATE game_progress SET updated_at = datetime('now') WHERE id = NEW.id; 
    END;

    CREATE TRIGGER IF NOT EXISTS trg_posts_updated_at 
    AFTER UPDATE ON posts 
    BEGIN 
      UPDATE posts SET updated_at = datetime('now') WHERE id = NEW.id; 
    END;

    CREATE TRIGGER IF NOT EXISTS trg_games_updated_at
    AFTER UPDATE ON games
    BEGIN
      UPDATE games SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

    -- Automatic calculation of rubles in logs table:
    -- formula: tokens_total / 10 000 000 * 300 (not rounded)
    CREATE TRIGGER IF NOT EXISTS trg_logs_rub_insert
    AFTER INSERT ON logs
    BEGIN
      UPDATE logs 
      SET rub = (CAST(NEW.tokens_total AS REAL) / 10000000.0) * 300.0 
      WHERE id = NEW.id AND NEW.tokens_total IS NOT NULL;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_logs_rub_update
    AFTER UPDATE OF tokens_total ON logs
    BEGIN
      UPDATE logs 
      SET rub = (CAST(NEW.tokens_total AS REAL) / 10000000.0) * 300.0 
      WHERE id = NEW.id AND NEW.tokens_total IS NOT NULL;
    END;
  `);

  // Migrations for existing databases
  try {
    // Migration: profiles -> users
    const checkProfiles = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='profiles'");
    const hasProfilesTable = checkProfiles.step();
    checkProfiles.free();
    if (hasProfilesTable) {
      db.run(`INSERT OR IGNORE INTO users SELECT * FROM profiles;`);
      db.run(`DROP TABLE IF EXISTS profiles;`);
    }
  } catch (_) {}

  try {
    // Migration: news -> posts
    const checkNews = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='news'");
    const hasNewsTable = checkNews.step();
    checkNews.free();
    if (hasNewsTable) {
      db.run(`INSERT OR IGNORE INTO posts SELECT * FROM news;`);
      db.run(`DROP TABLE IF EXISTS news;`);
    }
  } catch (_) {}

  // Drop deprecated tables
  try { db.run("DROP TABLE IF EXISTS offline_registrations;"); } catch (_) {}
  try { db.run("DROP TABLE IF EXISTS purchases;"); } catch (_) {}
  try { db.run("DROP TABLE IF EXISTS shop_items;"); } catch (_) {}
  try { db.run("DROP TABLE IF EXISTS friends;"); } catch (_) {}

  try { db.run("ALTER TABLE users ADD COLUMN password TEXT;"); } catch (_) {}
  try { db.run("ALTER TABLE users ADD COLUMN avatar_url TEXT;"); } catch (_) {}
  try { db.run("ALTER TABLE users ADD COLUMN phone TEXT;"); } catch (_) {}
  try { db.run("ALTER TABLE users ADD COLUMN balance_rr REAL DEFAULT 0;"); } catch (_) {}
  try { db.run("ALTER TABLE logs ADD COLUMN rub REAL;"); } catch (_) {}
  try { db.run("ALTER TABLE telegram_config ADD COLUMN direct_site_url TEXT DEFAULT 'https://qaiz.ru/';"); } catch (_) {}
  try { db.run("ALTER TABLE telegram_config ADD COLUMN ref_link_template TEXT DEFAULT 'https://t.me/SAV_AIbot/app?startapp={telegram_id}';"); } catch (_) {}

  // Backfill logs rub if null
  try {
    db.run("UPDATE logs SET rub = (CAST(tokens_total AS REAL) / 10000000.0) * 300.0 WHERE tokens_total IS NOT NULL AND rub IS NULL;");
  } catch (_) {}
  try { db.run("ALTER TABLE telegram_config ADD COLUMN direct_site_url TEXT DEFAULT 'https://qaiz.ru/';"); } catch (_) {}
  try { db.run("ALTER TABLE telegram_config ADD COLUMN ref_link_template TEXT DEFAULT 'https://t.me/SAV_AIbot/app?startapp={telegram_id}';"); } catch (_) {}

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

  // 1. Admin user setup in `users`
  // ID: 11-digit number string '10016926299'
  // telegram_id: '169262990'
  // email: 'shishkarnem@gmail.com'
  // password: 'wkL35eTm'
  // display_name: 'Тимошенко Денис'
  // Phone: '+79899920885'
  // balance_rr: 50000
  const adminEmail = 'shishkarnem@gmail.com';
  const stmt = db.prepare('SELECT * FROM users WHERE email = ? OR telegram_id = ? OR id = ?');
  stmt.bind([adminEmail, '169262990', '10016926299']);
  const hasAdmin = stmt.step();
  stmt.free();

  if (!hasAdmin) {
    const usrStmt = db.prepare(
      `INSERT INTO users (id, uid, telegram_id, display_name, username, role, phone, balance_rr, coins, email, password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    usrStmt.run([
      '10016926299',
      'usr_169262990',
      '169262990',
      'Тимошенко Денис',
      'shishkarnem',
      'admin',
      '+79899920885',
      50000,
      10000,
      adminEmail,
      'wkL35eTm'
    ]);
    usrStmt.free();
  } else {
    // Update admin defaults
    db.run(
      `UPDATE users SET 
        id = '10016926299',
        telegram_id = '169262990',
        display_name = 'Тимошенко Денис',
        email = 'shishkarnem@gmail.com',
        password = 'wkL35eTm',
        phone = '+79899920885',
        role = 'admin',
        balance_rr = 50000
       WHERE email = 'shishkarnem@gmail.com' OR telegram_id = '169262990' OR id = '10016926299'`
    );
  }

  // 2. game_sessions default
  if (countTable('game_sessions') === 0) {
    db.run(
      `INSERT INTO game_sessions (id, user_id, game_id, game_title, score, total_questions, correct_answers, mode, difficulty, topic, price_paid, is_win)
       VALUES ('gs_demo_1', 'usr_169262990', 'blitz', 'КвИИЗ', 100, 10, 10, 'single', 'people', 'Кино и Музыка', 20, 1)`
    );
  }

  // 3. game_progress default
  if (countTable('game_progress') === 0) {
    db.run(
      `INSERT INTO game_progress (id, user_id, pack_id, game_type, current_step, total_steps, state)
       VALUES ('gp_demo_1', 'usr_169262990', 'pack1', 'millionaire', 5, 15, '{"score":50}')`
    );
  }

  // 4. posts default
  if (countTable('posts') === 0) {
    db.run(
      `INSERT INTO posts (id, title, content, image_url, platforms)
       VALUES ('post_demo_1', 'Добро пожаловать в блог Квайз!', 'Запускаем обновленные игры, блиц-турниры и викторины. Играйте в браузерной и Telegram версиях!', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80', 'Web, Telegram')`
    );
  }

  // 6b. games default seeding
  const defaultGames = [
    {
      id: 'blitz',
      title: 'КвИИЗ',
      subtitle: 'Скоростной ИИ-спринт',
      description: 'Быстрые вопросы на время от нейросети.',
      image_url: '/file/18/blitz.png',
      category: 'single',
      question_count: 10,
      path: '/game/blitz',
      tag: '🔥 Популярное',
      price_per_question: 1,
      price_text: '1 ИИкра / вопр.',
      rules: 'Текстовый ввод ответов. 60 секунд на каждый вопрос, генерируемый нейросетью.',
      coming_soon: 0
    },
    {
      id: 'millionaire',
      title: 'Квиллионер',
      subtitle: '15 шагов к вершине',
      description: 'Классическая интеллектуальная лестница.',
      image_url: '/file/19/millionaire.png',
      category: 'single',
      question_count: 15,
      path: '/game/millionaire',
      tag: '💎 Топ Режим',
      price_per_question: 1,
      price_text: '1 ИИкра / вопр.',
      rules: 'Ответьте на 15 вопросов. Используйте подсказки: 50/50 и Помощь Нейросети.',
      coming_soon: 0
    },
    {
      id: '100to1',
      title: 'Сто Квадному',
      subtitle: 'Народная мудрость',
      description: 'Угадайте самые частые ответы участников на улице и в опросах.',
      image_url: '/file/16/100to1.png',
      category: 'single',
      question_count: 24,
      path: '/game/100to1',
      tag: '🎯 Логика',
      price_per_question: 1,
      price_text: '1 ИИкра / вопр.',
      rules: 'Угадывайте варианты ответов большинства людей за минимум времени.',
      coming_soon: 0
    },
    {
      id: 'whatwherewhen',
      title: 'Что? Где? Квада?',
      subtitle: 'Элитарный Клуб',
      description: 'Интеллектуальный вызов для знатоков.',
      image_url: '/file/20/whatwherewhen.png',
      category: 'single',
      question_count: 11,
      path: '/game/whatwherewhen',
      tag: '🧠 Хардкор',
      price_per_question: 2,
      price_text: '2 ИИкры / вопр.',
      rules: 'Глубокие вопросы на логику, ассоциации и нестандартное мышление.',
      coming_soon: 0
    },
    {
      id: 'jeopardy',
      title: 'Своя Икра',
      subtitle: 'Квазино Викторина',
      description: 'Выбирайте темы и стоимость вопросов.',
      image_url: '/file/17/jeopardy.png',
      category: 'single',
      question_count: 76,
      path: '/game/jeopardy',
      tag: '⚔️ Мультиплеер',
      price_per_question: 1,
      price_text: '1 ИИкра / вопр.',
      rules: 'Сражение с соперниками за зачетные очки в произвольных категориях.',
      coming_soon: 0
    },
    {
      id: 'melody',
      title: 'Уквакай Мелодию',
      subtitle: 'Музыкальный Ринг',
      description: 'Угадайте трек или исполнителя по нескольким аккордам.',
      image_url: '/file/15/melody.png',
      category: 'single',
      question_count: 25,
      path: '/game/melody',
      tag: '🎵 Музыкальный Квиз',
      price_per_question: 10,
      price_text: 'Скоро',
      rules: 'Слушайте фрагмент мелодии и выбирайте правильный вариант ответа.',
      coming_soon: 1
    }
  ];

  for (const g of defaultGames) {
    db.run(
      `INSERT INTO games (id, title, subtitle, description, image_url, question_count, path, tag, price_per_question, price_text, rules, coming_soon)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         subtitle = excluded.subtitle,
         description = excluded.description,
         image_url = excluded.image_url,
         question_count = excluded.question_count,
         path = excluded.path,
         tag = excluded.tag,
         price_per_question = excluded.price_per_question,
         price_text = excluded.price_text,
         rules = excluded.rules,
         coming_soon = excluded.coming_soon`,
      [g.id, g.title, g.subtitle, g.description, g.image_url, g.question_count, g.path, g.tag, g.price_per_question, g.price_text, g.rules, g.coming_soon]
    );
  }

  // 9. transactions default (in RR)
  if (countTable('transactions') === 0) {
    db.run(
      `INSERT INTO transactions (id, user_id, amount, currency, type, description, reference_id, timestamp)
       VALUES ('tx_demo_1', 'usr_169262990', 50000, 'RR', 'deposit', 'Приветственный баланс администратора', 'ref_admin_init', ${Date.now()})`
    );
  }

  // 10. mailing_logs default
  if (countTable('mailing_logs') === 0) {
    db.run(
      `INSERT INTO mailing_logs (id, recipient_id, type, status, timestamp)
       VALUES ('ml_demo_1', 'usr_169262990', 'welcome_email', 'delivered', ${Date.now()})`
    );
  }

  // 11. system_config default
  if (countTable('system_config') === 0) {
    const defaultConfig = {
      appName: 'Квайз (qaiz.ru)',
      maintenanceMode: false,
      exchangeRate: 0.99, // 1 RR = 0.99 RUB
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
        { id: 'god', name: 'Ляга', multiplier: 3, color: 'text-purple-500', level: '4/4', description: 'Экспертный уровень. Только для истинных знатоков.' }
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
       VALUES ('ask_init', 'from_user_id:init message_id:1', 'Привет, ПроТолк!', 'Привет! Я готов помочь с ответами и викторинами!', 'qaiz', '60381', 'protalk', 'ai-chat-miniapp')`
    );
  }

  // 13. protalk_config default (channel_name = 'qaiz', bot_id = '60381')
  const protalkCount = countTable('protalk_config');
  if (protalkCount === 0) {
    db.run(
      `INSERT INTO protalk_config (bot_id, bot_token, channel_name, is_active)
       VALUES ('60381', '60381_FONb1dD2SQdv7FwG0ui2PZ9ODxXMKkz7', 'qaiz', 1)`
    );
  } else {
    // Ensure bot_id 60381 has channel_name = 'qaiz'
    db.run(`UPDATE protalk_config SET channel_name = 'qaiz' WHERE bot_id = '60381'`);
  }

  // 14. telegram_config default
  const tgCount = countTable('telegram_config');
  if (tgCount === 0) {
    db.run(
      `INSERT INTO telegram_config (
        bot_token, bot_name, bot_username, bot_link, channel_username, channel_link, web_app_url, direct_site_url, ref_link_template, is_active
      ) VALUES (
        '8663485854:AAFRdzmRhCQzLsMi9-jaINWwsK_wO-_xmyw',
        'Qaiz - ИИ Квиз онлайн мультиплеер',
        '@qaiz_aibot',
        'https://t.me/qaiz_aibot',
        'qaiz_ru',
        'https://t.me/qaiz_ru',
        'https://t.me/qaiz_aibot/app',
        'https://qaiz.ru/',
        'https://t.me/SAV_AIbot/app?startapp={telegram_id}',
        1
      )`
    );
  } else {
    db.run(
      `UPDATE telegram_config SET
        bot_token = '8663485854:AAFRdzmRhCQzLsMi9-jaINWwsK_wO-_xmyw',
        bot_name = 'Qaiz - ИИ Квиз онлайн мультиплеер',
        bot_username = '@qaiz_aibot',
        bot_link = 'https://t.me/qaiz_aibot',
        web_app_url = 'https://t.me/qaiz_aibot/app',
        direct_site_url = 'https://qaiz.ru/',
        ref_link_template = 'https://t.me/SAV_AIbot/app?startapp={telegram_id}'
       WHERE id = 1 OR is_active = 1`
    );
  }

  // 15. prompts default
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

  // 15b. difficulties default seeding
  if (countTable('difficulties') === 0) {
    const defaultDiffs = [
      { id: 'dummy', name: 'ИИкра', multiplier: 1.0, level: '1/4', description: 'Самый простой уровень. Идеально для начала.', prompt_instructions: 'Составляй максимально простые вопросы на хорошо известные базовые факты. Избегай сложных формулировок, абстракций и редких терминов.' },
      { id: 'people', name: 'Головастик', multiplier: 1.5, level: '2/4', description: 'Средний уровень. Требует базовых знаний.', prompt_instructions: 'Составляй вопросы средней сложности для широкой аудитории. Требуется общая эрудиция, базовые школьные знания по теме и элементарная логика.' },
      { id: 'genius', name: 'Квант', multiplier: 2.0, level: '3/4', description: 'Высокий уровень. Для опытных игроков.', prompt_instructions: 'Составляй продвинутые вопросы высокого уровня сложности. Требуется глубокое понимание темы, умение выстраивать непрямые ассоциации и находить нестандартные ответы.' },
      { id: 'god', name: 'Ляга', multiplier: 3.0, level: '4/4', description: 'Экспертный уровень. Только для истинных знатоков.', prompt_instructions: 'Составляй вопросы экспертного уровня высшей категории. Используй малоизвестные, утонченные факты, хитроумные логические уловки и сложные ассоциативные ряды.' }
    ];
    for (const d of defaultDiffs) {
      db.run(
        `INSERT INTO difficulties (id, name, multiplier, level, description, prompt_instructions) VALUES (?, ?, ?, ?, ?, ?)`,
        [d.id, d.name, d.multiplier, d.level, d.description, d.prompt_instructions]
      );
    }
  }

  // 15c. game_modes default seeding
  if (countTable('game_modes') === 0) {
    const defaultModes = [
      { id: 'single', code: 'single', name: 'Одиночная', description: 'Режим игры один на один с викториной.' },
      { id: 'ai', code: 'ai', name: 'Против ИИ', description: 'Соревнование с нейросетевым ботом в реальном времени.' },
      { id: 'multi_offline', code: 'multi_offline', name: 'Мультиплеер (Оффлайн)', description: 'Игра с друзьями на одном устройстве.' },
      { id: 'multi_online', code: 'multi_online', name: 'Мультиплеер (Онлайн)', description: 'Сетевая коллективная игра через интернет.' },
      { id: 'coming_soon', code: 'coming_soon', name: 'Скоро', description: 'Режим находится в процессе разработки.' }
    ];
    for (const m of defaultModes) {
      db.run(
        `INSERT INTO game_modes (id, code, name, description) VALUES (?, ?, ?, ?)`,
        [m.id, m.code, m.name, m.description]
      );
    }
  }

  // 15d. game_mode_relations default seeding
  if (countTable('game_mode_relations') === 0) {
    const relations = [
      { game_id: 'blitz', mode_id: 'single' },
      { game_id: 'blitz', mode_id: 'ai' },
      { game_id: 'blitz', mode_id: 'multi_offline' },
      { game_id: 'blitz', mode_id: 'multi_online' },
      { game_id: 'millionaire', mode_id: 'single' },
      { game_id: '100to1', mode_id: 'single' },
      { game_id: '100to1', mode_id: 'ai' },
      { game_id: '100to1', mode_id: 'multi_offline' },
      { game_id: '100to1', mode_id: 'multi_online' },
      { game_id: 'whatwherewhen', mode_id: 'single' },
      { game_id: 'whatwherewhen', mode_id: 'ai' },
      { game_id: 'jeopardy', mode_id: 'single' },
      { game_id: 'jeopardy', mode_id: 'ai' },
      { game_id: 'jeopardy', mode_id: 'multi_offline' },
      { game_id: 'jeopardy', mode_id: 'multi_online' },
      { game_id: 'melody', mode_id: 'single' },
      { game_id: 'melody', mode_id: 'coming_soon' }
    ];
    for (const r of relations) {
      db.run(
        `INSERT INTO game_mode_relations (game_id, mode_id) VALUES (?, ?)`,
        [r.game_id, r.mode_id]
      );
    }
  }

  // 16. file_folders & file_storage default seeding
  db.run(`INSERT OR IGNORE INTO file_folders (id, name) VALUES ('fld_images', 'Изображения')`);
  db.run(`INSERT OR IGNORE INTO file_folders (id, name) VALUES ('fld_audio', 'Аудиозаписи')`);
  db.run(`INSERT OR IGNORE INTO file_folders (id, name) VALUES ('fld_video', 'Видеоролики')`);
  db.run(`INSERT OR IGNORE INTO file_folders (id, name) VALUES ('fld_docs', 'Документы')`);
  db.run(`INSERT OR IGNORE INTO file_folders (id, name) VALUES ('fld_a8c4bb4cd0fbe665', 'Для Сайта')`);

  const defaultFiles = [
    { id: 13, file_key: 'cUCSPqxw', name: 'miniqaiz.png', folder_id: 'fld_a8c4bb4cd0fbe665', original_url: 'https://file.pro-talk.ru/tgf/GgMpJwQ9JCkYKglyGHQMI20GO08nADcYXjIPYx4bFAtRRwlUNgleZxg4CCAZEyIWNT0sKwoBGG8KA3MpdxA9AAweFgo4NRQmEV9uZlUAaA11VQJrCjgDAzkkAVczLRouDiMXfQxTNBdFGT8aIyw2ZyIcIQsIKjIuHhtsBXZSBGZ5T3FP.png', mime_type: 'image/png', file_type: 'image', size: 75562 },
    { id: 14, file_key: '2SDfMDRk', name: 'qaizlogo.png', folder_id: 'fld_a8c4bb4cd0fbe665', original_url: 'https://file.pro-talk.ru/tgf/GgMpJwQ9JCkYKglyGHQMI208O08nAGo0UCozHAJbAxwBQRh3B1dVFzkacTY1NSknJxE0KRg5CUVrcDUXaGEfGgcULx4YIHUfERRuZVYBbwR-UgZhcTgEPCEzHg12LBofHwUTQxJgIBNEJgMNJhwOPF0uPT48DRs5Hkp0AHZRAWd8S3NObQ.png', mime_type: 'image/png', file_type: 'image', size: 137748 },
    { id: 15, file_key: 'LbKiTZ1O', name: 'ukvakai.jpg', folder_id: 'fld_a8c4bb4cd0fbe665', original_url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKglyGHQMIwtjO08kTx82Ji4qPAo7MyEsTGh0FSpfOiwmECkZEyNRAg0eCgoBGG8KGHICABUMMDICAgcpNQQeLA8YFgdnGHEWMGMtN05yTm9kWVx2bl1SGBMkTzhDL1JEJjw_EgstGT0CNywaIC0xBGA3AAwZVgAuOy4GJH9dVHVpW19rZFYD.jpg', mime_type: 'image/jpeg', file_type: 'image', size: 167487 },
    { id: 16, file_key: 'FWfJX2b8', name: '100kva.jpg', folder_id: 'fld_a8c4bb4cd0fbe665', original_url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKglyGHQMIx8GO08kTzoRGCVyOCUOCzsuTGxZNDV7ZXw6DzcZEyNTAg0eCgoBGG8KBTY4VgM4DCMTFAUpNQQeLA8YFgdnGHEWMGMtN05yTm9kWVx2bl1SGBMkTzhDL1JEJjw_EgstGT0CNywaIC0xBGA3AAwZVgAuOy4GJH9dVHVpW19rZFYD.jpg', mime_type: 'image/jpeg', file_type: 'image', size: 165587 },
    { id: 17, file_key: 'xt7UCmXv', name: 'ikra.jpg', folder_id: 'fld_a8c4bb4cd0fbe665', original_url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKglyGHQMIx88O08kTz8GMigIIxc-CgEhRjhmDioANAlILTIZEyNcAg0eCgoBGG8KBHFMYSEeSic_PxUpNQQeLA8YFgdnGHEWMGMtN05yTm9kWVx2bl1SGBMkTzhDL1JEJjw_EgstGT0CNywaIC0xBGA3AAwZVgAuOy4GJH9dVHVpW19rZFYD.jpg', mime_type: 'image/jpeg', file_type: 'image', size: 159872 },
    { id: 18, file_key: 'hqnS4xO1', name: 'kviiz.jpg', folder_id: 'fld_a8c4bb4cd0fbe665', original_url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKglyGHQMIx9jO08kTyobXgJzOAgqaR8NX2F_cwl3AQohaAMZEyNdAg0eCgoBGG8KanInUwN7PSoiHmUpNQQeLA8YFgdnGHEWMGMtN05yTm9kWVx2bl1SGBMkTzhDL1JEJjw_EgstGT0CNywaIC0xBGA3AAwZVgAuOy4GJH9dVHVpW19rZFYD.jpg', mime_type: 'image/jpeg', file_type: 'image', size: 124105 },
    { id: 19, file_key: 'HUQJuXSj', name: 'kvillioner.jpg', folder_id: 'fld_a8c4bb4cd0fbe665', original_url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKglyGHQMI20WO08kTyIDIgAGBRUNIz8KXDoAGTthEwk4MhUZEyNJAg0eCgoBGG8KBj4-YBR9AS0QFjspNQQeLA8YFgdnGHEWMGMtN05yTm9kWVx2bl1SGBMkTzhDL1JEJjw_EgstGT0CNywaIC0xBGA3AAwZVgAuOy4GJH9dVHVpW19rZFYD.jpg', mime_type: 'image/jpeg', file_type: 'image', size: 175231 },
    { id: 20, file_key: 'rNHCav9g', name: 'wwk.jpg', folder_id: 'fld_a8c4bb4cd0fbe665', original_url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKglyGHQMIx8WO08kTwgXJxUnADcMNzwBRClmHzdgFSEYNz0ZEyNSAg0eCgoBGG8KADIqZA4TOwA2DyQpNQQeLA8YFgdnGHEWMGMtN05yTm9kWVx2bl1SGBMkTzhDL1JEJjw_EgstGT0CNywaIC0xBGA3AAwZVgAuOy4GJH9dVHVpW19rZFYD.jpg', mime_type: 'image/jpeg', file_type: 'image', size: 164902 }
  ];

  for (const f of defaultFiles) {
    db.run(
      `INSERT OR REPLACE INTO file_storage (id, file_key, name, folder_id, original_url, mime_type, file_type, size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [f.id, f.file_key, f.name, f.folder_id, f.original_url, f.mime_type, f.file_type, f.size]
    );
  }

  // 17. topics default seeding (100+ topics)
  if (countTable('topics') === 0) {
    const seedTopics = [
      'Общие знания', 'История Древнего Рима', 'Советское Кино', 'Вселенная Гарри Поттера',
      'Космические Исследования', 'Мифология народов мира', 'Мировая Живопись', 'География и Флаги',
      'Видеоигры 2000-х', 'Органическая Химия', 'Великие Открытия', 'Рок-Музыка 80-х',
      'Классическая Литература', 'Футбол и Чемпионаты Мира', 'Киновселенная Marvel', 'Японская Анимация (Аниме)',
      'Анатомия Человека', 'Кулинария Народов Мира', 'Архитектура Городов', 'Квантовая Физика',
      'Кинематограф XXI Века', 'Автомобили и Гонки', 'Фантастика и Наука', 'Киберспорт и Стратегии',
      'Морская Биология', 'Языки и Лингвистика', 'Олимпийские Игры', 'Психология Человека',
      'Экономика и Бизнес', 'Мультипликация Disney', 'Информатика и ИИ', 'Французская Революция',
      'Джаз и Блюз', 'Астрономия и Черные Дыры', 'Древняя Греция и Олимп', 'Современная Поп-Культура',
      'Криптография и Загадки', 'Экология и Заповедники', 'Театр и Опера', 'Мода и Стиль',
      'Великая Отечественная Война', 'Комиксы и Супергерои', 'Борьба и Единоборства', 'Всемирная Литература',
      'Замки и Дворцы', 'Физиология и Медицина', 'Хип-Хоп и Рэп', 'Философия и Мыслители',
      'Динозавры и Палеонтология', 'Баскетбол и НБА', 'Хоккей и КХЛ', 'Шахматы и Настолки',
      'Скандинавская Мифология', 'Океанология', 'Российские Сериалы', 'Британский Рок',
      'Классическая Музыка', 'Наскальная Живопись', 'Сверхъестественное', 'Технологии Будущего',
      'Робототехника', 'Авиация и Самолеты', 'Парусный Флот', 'Русские Сказки',
      'Забытые Цивилизации', 'Пираты Карибского Моря', 'Сериал Друзья', 'Звездные Войны',
      'Властелин Колец', 'Игра Престолов', 'Офис и Ситкомы', 'Формула 1',
      'Компьютерное Железо', 'Русский Рок', 'Импрессионизм', 'Японская Культура',
      'Египетские Пирамиды', 'Индийская Философия', 'Вторая Мировая Война', 'Эпоха Просвещения',
      'Детективы Артура Конан Дойла', 'Вселенная DC', 'Киберпанк', 'Постапокалипсис',
      'Генетика и ДНК', 'Метеорология и Погода', 'Экстремальный Спорт', 'Современное Искусство',
      'Астрофизика', 'Ботаника и Растения', 'Отечественные Мультфильмы', 'Азиатская Кухня',
      'Итальянская Кухня', 'Напитки и Кофе', 'Стриминговые Сервисы', 'Социальные Сети',
      'Английская Литература', 'Золотой Век Русской Поэзии', 'Советский Спорт', 'Электроника'
    ];
    for (const t of seedTopics) {
      const id = `tp_${Math.random().toString(36).substring(2, 9)}`;
      db.run(
        `INSERT OR IGNORE INTO topics (id, name, category, description, use_count) VALUES (?, ?, 'general', 'Викторина по теме', 1)`,
        [id, t]
      );
    }
  }

  // 18. cron_jobs default seeding
  if (countTable('cron_jobs') === 0) {
    const defaultCrons = [
      { id: 'cron_backup', name: 'Ежедневный бэкап базы данных', schedule: '0 0 * * *', status: 'active', action_type: 'backup' },
      { id: 'cron_leaderboard', name: 'Агрегация рейтинга игроков', schedule: '0 * * * *', status: 'active', action_type: 'leaderboard' },
      { id: 'cron_balance_audit', name: 'Аудит балансов пользователей', schedule: '*/30 * * * *', status: 'active', action_type: 'balance_check' },
      { id: 'cron_cleanup', name: 'Очистка временных токенов и файлов', schedule: '0 3 * * *', status: 'active', action_type: 'cleanup' }
    ];

    for (const c of defaultCrons) {
      db.run(
        `INSERT INTO cron_jobs (id, name, schedule, last_run, next_run, status, action_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.name, c.schedule, new Date().toISOString(), new Date(Date.now() + 86400000).toISOString(), c.status, c.action_type]
      );
    }
  }

  // 19. triggers default seeding
  if (countTable('triggers') === 0) {
    const defaultTriggers = [
      { id: 'trg_welcome', name: 'Приветствие при регистрации', event_type: 'user_register', action_type: 'bonus_rr', target: 'user', payload: '{"bonus": 100}', is_active: 1 },
      { id: 'trg_win_quiz', name: 'Бонус за победу в Квизе', event_type: 'game_win', action_type: 'coins', target: 'user', payload: '{"coins": 50}', is_active: 1 },
      { id: 'trg_daily_login', name: 'Ежедневный вход', event_type: 'daily_login', action_type: 'streak_increment', target: 'user', payload: '{"streak_bonus": 10}', is_active: 1 }
    ];

    for (const t of defaultTriggers) {
      db.run(
        `INSERT INTO triggers (id, name, event_type, action_type, target, payload, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.name, t.event_type, t.action_type, t.target, t.payload, t.is_active]
      );
    }
  }

  // 20. prompts default seeding
  if (countTable('prompts') === 0) {
    const defaultPrompts = [
      {
        game_id: 'blitz_questions',
        description: 'Промпт генерации вопросов для КвИИЗ (Блиц)',
        content: `Сгенерируй {count} вопросов для викторины "КвИИЗ" на тему "{topic}".
Уровень сложности: {level} из 15.
Классификация сложности: "{difficulty}".
Описание уровня: {diffDesc}.

ТРЕБОВАНИЯ К ВОПРОСАМ:
1. Вопрос должен быть глубоким, основанным на логической цепочке или факте, требующем эрудиции и сообразительности.
2. Категорически ЗАПРЕЩЕНО использовать однокоренные слова или прямые подсказки на правильный ответ в тексте вопроса.
3. Добавляй в текст вопроса косвенные намеки и ключевые фразы, помогающие найти решение.
4. Каждый вопрос должен состоять из 2-4 предложений и содержать контекст.
5. Правильные ответы должны быть УНИКАЛЬНЫМИ.
6. Для каждого вопроса обязательно сгенерируй:
   - hint: Косвенный намек, НЕ содержащий сам ответ.
   - explanation: Подробный интересный факт и комментарий к ответу.

Верни JSON массив объектов с полями:
- text (текст вопроса)
- options (массив из 4 вариантов ответов А, Б, В, Г)
- correctAnswer (точный текст правильного варианта)
- hint (подсказка)
- explanation (комментарий с фактом)`
      },
      {
        game_id: 'millionaire_questions',
        description: 'Промпт для игры Квиллионер (15 вопросов с возрастающей сложностью)',
        content: `Сгенерируй 15 вопросов с нарастающей сложностью для игры "Квиллионер" на тему "{topic}".
Вопрос 1 = самый простой, Вопрос 15 = самый сложный (экспертный).

ТРЕБОВАНИЯ:
1. Для каждого вопроса сгенерируй 4 варианта ответа (А, Б, В, Г).
2. Один из вариантов должен быть строгим и точным правильным ответом.
3. В тексте вопроса НЕ ДОЛЖНО быть однокоренных слов к ответу.
4. Добавь поле hint (подсказка для игрока) и explanation (подробный факт).

Верни JSON массив из 15 объектов с полями:
- number (1..15)
- text (текст вопроса)
- options (массив 4 строк: ["А. ...", "Б. ...", "В. ...", "Г. ..."])
- correctAnswer (строка, точный ответ с буквой)
- hint (подсказка)
- explanation (подробное объяснение)`
      },
      {
        game_id: 'whatwherewhen_questions',
        description: 'Промпт для игры Что? Где? Квада? (11 глубоких логических вопросов)',
        content: `Сгенерируй 11 глубоких логических вопросов для игры "Что? Где? Квада?" на тему "{topic}".
Сложность: {diffDesc}.

ТРЕБОВАНИЯ:
1. Вопрос должен требовать минутного размышления, логического кругозора и сообразительности.
2. В тексте вопроса КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО давать однокоренные слова к ответу.
3. Добавляй косвенные подсказки и контекст в 3-5 предложениях.
4. Добавь время на размышление (60 секунд).
5. Сгенерируй подробный авторский комментарий (explanation), который объяснит логический ход мысли к ответу.

Верни JSON массив из 11 объектов с полями:
- text (текст вопроса)
- answer (краткий правильный ответ)
- hint (подсказка)
- explanation (подробный комментарий для знатоков)`
      },
      {
        game_id: '100to1_questions',
        description: 'Промпт для игры Сто Квадному (6 вариантов ответов с баллами)',
        content: `Сгенерируй один популярный опрос для игры "Сто Квадному" на тему "{topic}".

ТРЕБОВАНИЯ:
1. Вопрос типа "Мы спросили 100 человек: ...".
2. Нужно 6 вариантов ответов с баллами (от самого популярного к самому редкому).
3. Сумма всех 6 баллов должна быть РОВНО 100.
4. Баллы распределены реалистично: самый популярный ~30-40, далее по убыванию.
5. Добавь подробный комментарий (explanation).

Верни JSON объект с полями:
- question (текст вопроса)
- answers (массив из 6 объектов {text, points, hint})
- hint (общая подсказка)
- explanation (почему такие ответы могли быть даны)`
      },
      {
        game_id: 'jeopardy_categories',
        description: 'Промпт категорий Своя Икра',
        content: `Сгенерируй 5 уникальных, ярких и оригинальных категорий для игры "Своя Икра" на тему "{topic}".
Каждая категория должна иметь интригующее название и краткое описание.

Верни JSON массив из 5 объектов с полями:
- name (название категории)
- description (описание темы категории)`
      },
      {
        game_id: 'jeopardy_all_questions',
        description: 'Промпт пакета вопросов Своя Икра (25 вопросов)',
        content: `Сгенерируй ВСЕ 25 вопросов для 5 категорий игры "Своя Икра" на тему "{topic}".
Категории и их описания: {categoriesJson}
Номиналы в раунде {roundNum}: {values}.

ТРЕБОВАНИЯ:
1. Для каждой из 5 категорий сгенерируй 5 вопросов с номиналами {values}.
2. Сложность строго от простого (мин. номинал) к глубокому экспертному (макс. номинал).
3. Вопросы на логику и эрудицию, развернутые (3-5 предложений).
4. Все 25 ответов УНИКАЛЬНЫ во всей игре.
5. Для каждого вопроса сгенерируй explanation и hint.

Верни JSON массив из 5 объектов категорий:`
      },
      {
        game_id: 'jeopardy_questions',
        description: 'Промпт одиночной категории Своя Икра',
        content: `Сгенерируй 5 вопросов для категории "{categoryName}" (Описание: {categoryDescription}) в игре "Своя Икра".
Номиналы: {values}.
Сложность от простого к сложному по номиналам.
Запрещены однокоренные слова к ответу.
Верни JSON массив из 5 объектов (value, text, answer, hint, explanation).`
      },
      {
        game_id: 'normal_questions',
        description: 'Общий промпт вопросов',
        content: `Сгенерируй {count} вопросов на тему "{topic}". Сложность: {diffDesc}.
ТРЕБОВАНИЯ:
1. Основывайся на интересных фактах.
2. Используй логические цепочки и загадки.
3. ЗАПРЕЩЕНО использовать однокоренные слова к ответу.
4. Добавляй намеки и ключевые фразы.
Верни массив объектов JSON: text, options (4 шт), correctAnswer, hint, explanation.`
      },
      {
        game_id: 'single_question',
        description: 'Промпт одного вопроса',
        content: `Сгенерируй 1 вопрос для игры "{type}" на тему "{topic}". 
Уровень сложности: {level} из 15 (где 1 - самый простой, 15 - самый сложный).
Сложность по классификации: "{difficulty}".

Верни объект JSON со структурой:
{
  "text": "Текст вопроса",
  "options": ["А. Вариант", "Б. Вариант", "В. Вариант", "Г. Вариант"],
  "correctAnswer": "Точный текст правильного варианта из массива options",
  "hint": "Небольшая подсказка"
}`
      },
      {
        game_id: 'check_answer',
        description: 'Промпт проверки ответа игрока',
        content: `Вопрос: "{question}". Правильный ответ: "{correctAnswer}". Ответ пользователя: "{userAnswer}". 
Проверь, является ли ответ пользователя правильным по смыслу. 
Верни JSON: { "isCorrect": boolean, "explanation": string }`
      },
      {
        game_id: 'ai_comment',
        description: 'Промпт комментариев ИИ-персонажа',
        content: `Ты - ИИ-персонаж в игре-викторине ProTalk. Твой характер: {personality}.
Произошло событие: {event}. 
Вопрос был: "{question}". 
Правильный ответ: "{answer}".
Был ли ответ правильным: {isCorrect}.
Напиши короткий (1-2 предложения) комментарий в игровой чат от своего лица. 
Верни просто текст комментария, без JSON.`
      }
    ];

    for (const p of defaultPrompts) {
      db.run(
        `INSERT INTO prompts (game_id, content, description) VALUES (?, ?, ?)`,
        [p.game_id, p.content, p.description]
      );
    }
  }
}

export async function recalculateUserBalancesFromTransactions(userId: string) {
  const row = await getOne<{ total_rr: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total_rr FROM transactions WHERE user_id = ? AND currency = 'RR'`,
    [userId]
  );
  const correctBalance = row?.total_rr || 0;
  await runSql(`UPDATE users SET balance_rr = ? WHERE uid = ? OR id = ? OR telegram_id = ?`, [correctBalance, userId, userId, userId]);
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

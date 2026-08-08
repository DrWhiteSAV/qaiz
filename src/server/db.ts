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
      balance_rub REAL DEFAULT 0,
      coins INTEGER DEFAULT 0,
      referral_code TEXT,
      referred_by TEXT,
      referred_code TEXT,
      role TEXT DEFAULT 'player',
      author_status TEXT,
      email TEXT,
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

  // Check default admin user
  const stmt = db.prepare('SELECT * FROM profiles WHERE uid = ?');
  stmt.bind(['00000000-0000-0000-0000-000000000001']);
  const hasUser = stmt.step();
  stmt.free();

  if (!hasUser) {
    const usrStmt = db.prepare(
      `INSERT INTO profiles (id, uid, telegram_id, display_name, username, role, balance_rub, coins)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    usrStmt.run([
      generateId('usr'),
      '00000000-0000-0000-0000-000000000001',
      '169262991',
      'Создатель (Dev)',
      'roborecrut',
      'admin',
      1000,
      500
    ]);
    usrStmt.free();
  }

  // Check default news
  const newsStmt = db.prepare('SELECT COUNT(*) as count FROM news');
  let newsCount = 0;
  if (newsStmt.step()) {
    newsCount = (newsStmt.getAsObject() as any).count || 0;
  }
  newsStmt.free();

  if (newsCount === 0) {
    const insertNews = db.prepare(
      `INSERT INTO news (id, title, content, image_url, platforms) VALUES (?, ?, ?, ?, ?)`
    );
    insertNews.run([
      generateId('news'),
      'Добро пожаловать в Квайз!',
      'Запускаем обновленные игры, блиц-турниры и викторины. Играйте в браузерной и Telegram версиях!',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
      'Web, Telegram'
    ]);
    insertNews.free();
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

import { Express } from 'express';
import { getDb, generateId, recalculateUserBalancesFromTransactions, performDailyDatabaseBackup, getOne, getAll, runSql, saveDb } from './db';

export function setupApiRoutes(app: Express) {
  // ----------------------------------------------------
  // PROFILES API
  // ----------------------------------------------------
  app.get('/api/profiles/by-uid/:uid', async (req, res) => {
    try {
      const profile = await getOne('SELECT * FROM profiles WHERE uid = ? OR id = ?', [req.params.uid, req.params.uid]);
      res.json({ data: profile || null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/profiles/by-telegram/:telegramId', async (req, res) => {
    try {
      const profile = await getOne('SELECT * FROM profiles WHERE telegram_id = ?', [req.params.telegramId]);
      res.json({ data: profile || null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/profiles', async (req, res) => {
    try {
      const profiles = await getAll('SELECT * FROM profiles ORDER BY created_at DESC');
      res.json({ data: profiles });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/profiles/upsert', async (req, res) => {
    try {
      const data = req.body;
      const uid = data.uid || data.id || generateId('usr');

      const existing = await getOne('SELECT * FROM profiles WHERE uid = ? OR id = ?', [uid, uid]);
      if (existing) {
        const fields = Object.keys(data).filter(k => k !== 'id');
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => typeof data[f] === 'object' ? JSON.stringify(data[f]) : data[f]);
        await runSql(`UPDATE profiles SET ${setClause} WHERE uid = ? OR id = ?`, [...values, uid, uid]);
        const updated = await getOne('SELECT * FROM profiles WHERE uid = ? OR id = ?', [uid, uid]);
        res.json({ data: updated });
      } else {
        const id = generateId('usr');
        const fields = ['id', ...Object.keys(data)];
        const placeholders = fields.map(() => '?').join(', ');
        const values = [id, ...Object.values(data).map(v => typeof v === 'object' ? JSON.stringify(v) : v)];
        await runSql(`INSERT INTO profiles (${fields.join(', ')}) VALUES (${placeholders})`, values);
        const created = await getOne('SELECT * FROM profiles WHERE id = ?', [id]);
        res.json({ data: created });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/profiles/:uid', async (req, res) => {
    try {
      const uid = req.params.uid;
      const data = req.body;
      const fields = Object.keys(data);
      if (fields.length === 0) return res.json({ data: null });

      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => typeof data[f] === 'object' ? JSON.stringify(data[f]) : data[f]);
      await runSql(`UPDATE profiles SET ${setClause} WHERE uid = ? OR id = ?`, [...values, uid, uid]);
      const updated = await getOne('SELECT * FROM profiles WHERE uid = ? OR id = ?', [uid, uid]);
      res.json({ data: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // GAME SESSIONS API
  // ----------------------------------------------------
  app.get('/api/game_sessions', async (req, res) => {
    try {
      const { user_id, game_id } = req.query;
      let query = 'SELECT * FROM game_sessions WHERE 1=1';
      const params: any[] = [];

      if (user_id) {
        query += ' AND user_id = ?';
        params.push(user_id);
      }
      if (game_id) {
        query += ' AND game_id = ?';
        params.push(game_id);
      }

      query += ' ORDER BY created_at DESC';
      const sessions = await getAll(query, params);
      res.json({ data: sessions });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/game_sessions', async (req, res) => {
    try {
      const body = Array.isArray(req.body) ? req.body[0] : req.body;
      const id = generateId('gs');
      const session = {
        id,
        user_id: body.user_id || body.userId,
        game_id: body.game_id || body.gameId,
        game_title: body.game_title || body.gameTitle || body.topic || 'Квиз',
        score: body.score || 0,
        total_questions: body.total_questions || body.totalQuestions || 0,
        correct_answers: body.correct_answers || body.correctAnswers || 0,
        mode: body.mode || 'standard',
        difficulty: body.difficulty || 'normal',
        topic: body.topic || '',
        price_paid: body.price_paid || body.pricePaid || 0,
        is_win: body.is_win ? 1 : 0,
        completed_at: body.completed_at || new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      await runSql(
        `INSERT INTO game_sessions (id, user_id, game_id, game_title, score, total_questions, correct_answers, mode, difficulty, topic, price_paid, is_win, completed_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id, session.user_id, session.game_id, session.game_title,
          session.score, session.total_questions, session.correct_answers,
          session.mode, session.difficulty, session.topic, session.price_paid,
          session.is_win, session.completed_at, session.created_at
        ]
      );

      const created = await getOne('SELECT * FROM game_sessions WHERE id = ?', [id]);
      res.json({ data: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // GAME PROGRESS API
  // ----------------------------------------------------
  app.get('/api/game_progress', async (req, res) => {
    try {
      const { user_id, pack_id, game_type } = req.query;
      const row = await getOne(
        'SELECT * FROM game_progress WHERE user_id = ? AND pack_id = ? AND game_type = ?',
        [user_id, pack_id, game_type]
      );
      if (row && row.state) {
        try { row.state = JSON.parse(row.state); } catch (_) {}
      }
      res.json({ data: row || null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/game_progress', async (req, res) => {
    try {
      const { user_id, pack_id, game_type, current_step, total_steps, state } = req.body;
      const stateStr = typeof state === 'object' ? JSON.stringify(state) : state;

      const existing = await getOne(
        'SELECT * FROM game_progress WHERE user_id = ? AND pack_id = ? AND game_type = ?',
        [user_id, pack_id, game_type]
      );

      if (existing) {
        await runSql(
          `UPDATE game_progress SET current_step = ?, total_steps = ?, state = ?, updated_at = datetime('now')
           WHERE id = ?`,
          [current_step, total_steps, stateStr, existing.id]
        );
        const updated = await getOne('SELECT * FROM game_progress WHERE id = ?', [existing.id]);
        if (updated && updated.state) updated.state = JSON.parse(updated.state);
        res.json({ data: updated });
      } else {
        const id = generateId('gp');
        await runSql(
          `INSERT INTO game_progress (id, user_id, pack_id, game_type, current_step, total_steps, state)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, user_id, pack_id, game_type, current_step, total_steps, stateStr]
        );
        const created = await getOne('SELECT * FROM game_progress WHERE id = ?', [id]);
        if (created && created.state) created.state = JSON.parse(created.state);
        res.json({ data: created });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/game_progress', async (req, res) => {
    try {
      const { user_id, pack_id, game_type } = req.query;
      await runSql(
        'DELETE FROM game_progress WHERE user_id = ? AND pack_id = ? AND game_type = ?',
        [user_id, pack_id, game_type]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // NEWS API
  // ----------------------------------------------------
  app.get('/api/news', async (req, res) => {
    try {
      const rows = await getAll('SELECT * FROM news ORDER BY created_at DESC');
      const formatted = rows.map(r => ({
        ...r,
        platforms: r.platforms ? r.platforms.split(', ') : []
      }));
      res.json({ data: formatted });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/news', async (req, res) => {
    try {
      const body = Array.isArray(req.body) ? req.body[0] : req.body;
      const id = generateId('news');
      const platformsStr = Array.isArray(body.platforms) ? body.platforms.join(', ') : body.platforms || '';

      await runSql(
        `INSERT INTO news (id, title, content, image_url, platforms) VALUES (?, ?, ?, ?, ?)`,
        [id, body.title, body.content, body.image_url, platformsStr]
      );
      const created = await getOne('SELECT * FROM news WHERE id = ?', [id]);
      res.json({ data: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/news/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const body = req.body;
      const platformsStr = Array.isArray(body.platforms) ? body.platforms.join(', ') : body.platforms;

      await runSql(
        `UPDATE news SET title = COALESCE(?, title), content = COALESCE(?, content), image_url = COALESCE(?, image_url), platforms = COALESCE(?, platforms) WHERE id = ?`,
        [body.title, body.content, body.image_url, platformsStr, id]
      );
      const updated = await getOne('SELECT * FROM news WHERE id = ?', [id]);
      res.json({ data: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/news/:id', async (req, res) => {
    try {
      await runSql('DELETE FROM news WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // OFFLINE REGISTRATIONS API
  // ----------------------------------------------------
  app.get('/api/offline_registrations', async (req, res) => {
    try {
      const rows = await getAll('SELECT * FROM offline_registrations ORDER BY created_at DESC');
      res.json({ data: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/offline_registrations', async (req, res) => {
    try {
      const body = Array.isArray(req.body) ? req.body[0] : req.body;
      const id = generateId('reg');
      await runSql(
        `INSERT INTO offline_registrations (id, user_id, full_name, phone, team_name, city, game_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, body.user_id, body.full_name, body.phone, body.team_name, body.city, body.game_date]
      );
      const created = await getOne('SELECT * FROM offline_registrations WHERE id = ?', [id]);
      res.json({ data: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/offline_registrations/:id', async (req, res) => {
    try {
      await runSql('DELETE FROM offline_registrations WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // PURCHASES API
  // ----------------------------------------------------
  app.get('/api/purchases', async (req, res) => {
    try {
      const { user_id } = req.query;
      let query = 'SELECT * FROM purchases WHERE 1=1';
      const params: any[] = [];
      if (user_id) {
        query += ' AND user_id = ?';
        params.push(user_id);
      }
      query += ' ORDER BY created_at DESC';
      const rows = await getAll(query, params);
      res.json({ data: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/purchases', async (req, res) => {
    try {
      const body = Array.isArray(req.body) ? req.body[0] : req.body;
      const id = generateId('prc');
      await runSql(
        `INSERT INTO purchases (id, user_id, item_id, price, item_type) VALUES (?, ?, ?, ?, ?)`,
        [id, body.user_id, body.item_id, body.price || 0, body.item_type || 'pack']
      );
      const created = await getOne('SELECT * FROM purchases WHERE id = ?', [id]);
      res.json({ data: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // TRANSACTIONS & BALANCES API
  // ----------------------------------------------------
  app.get('/api/transactions', async (req, res) => {
    try {
      const { user_id } = req.query;
      const rows = await getAll(
        'SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC',
        [user_id]
      );
      res.json({ data: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/transactions', async (req, res) => {
    try {
      const { user_id, amount, currency, type, description, reference_id } = req.body;
      const id = generateId('tx');
      const timestamp = Date.now();

      await runSql(
        `INSERT INTO transactions (id, user_id, amount, currency, type, description, reference_id, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, user_id, amount, currency || 'RUB', type || 'general', description, reference_id, timestamp]
      );

      const newBalance = await recalculateUserBalancesFromTransactions(user_id);
      res.json({ data: { id, balance: newBalance } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // SYSTEM ADMIN & DATABASE INSPECTION API (/api/admin/system)
  // ----------------------------------------------------
  app.get('/api/admin/system/tables', async (req, res) => {
    try {
      const tables = await getAll<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      const result = [];
      for (const t of tables) {
        const countRes = await getOne<{ count: number }>(`SELECT COUNT(*) as count FROM "${t.name}"`);
        result.push({
          name: t.name,
          rowCount: countRes?.count || 0
        });
      }
      res.json({ tables: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/system/table/:tableName', async (req, res) => {
    try {
      const tableName = req.params.tableName;
      const limit = Number(req.query.limit) || 100;
      const offset = Number(req.query.offset) || 0;

      const rows = await getAll(`SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`, [limit, offset]);
      const columns = await getAll(`PRAGMA table_info("${tableName}")`);
      res.json({ tableName, columns, rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/system/table/:tableName/:id', async (req, res) => {
    try {
      const { tableName, id } = req.params;
      const data = req.body;
      const fields = Object.keys(data).filter(k => k !== 'id');

      if (fields.length === 0) return res.json({ success: true });

      const setClause = fields.map(f => `"${f}" = ?`).join(', ');
      const values = fields.map(f => typeof data[f] === 'object' ? JSON.stringify(data[f]) : data[f]);

      await runSql(`UPDATE "${tableName}" SET ${setClause} WHERE id = ? OR uid = ?`, [...values, id, id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/system/table/:tableName/:id', async (req, res) => {
    try {
      const { tableName, id } = req.params;
      await runSql(`DELETE FROM "${tableName}" WHERE id = ? OR uid = ?`, [id, id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/system/triggers', async (req, res) => {
    try {
      const triggers = await getAll("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger'");
      res.json({ triggers });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/system/cron', async (req, res) => {
    try {
      const logs = await getAll('SELECT * FROM mailing_logs ORDER BY timestamp DESC LIMIT 50');
      res.json({
        jobs: [
          { name: 'Daily Backup Cron', schedule: '0 0 * * *', lastRun: new Date().toISOString(), status: 'active' },
          { name: 'Leaderboard Aggregator', schedule: '0 * * * *', lastRun: new Date().toISOString(), status: 'active' }
        ],
        logs
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/system/cron/backup', async (req, res) => {
    try {
      await performDailyDatabaseBackup();
      res.json({ success: true, message: 'Бэкап базы данных успешно создан' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // UNIFIED DATABASE QUERY ADAPTER ENDPOINT (/api/db/query)
  // ----------------------------------------------------
  app.post('/api/db/query', async (req, res) => {
    try {
      const { table, action, data, eq, order, limit } = req.body;

      if (!table) return res.status(400).json({ error: 'Table required' });

      let sql = '';
      const params: any[] = [];

      if (action === 'select') {
        sql = `SELECT * FROM "${table}" WHERE 1=1`;
        if (eq) {
          for (const key of Object.keys(eq)) {
            sql += ` AND "${key}" = ?`;
            params.push(eq[key]);
          }
        }
        if (order) {
          sql += ` ORDER BY "${order.column}" ${order.ascending ? 'ASC' : 'DESC'}`;
        }
        if (limit) {
          sql += ` LIMIT ?`;
          params.push(limit);
        }

        const rows = await getAll(sql, params);
        return res.json({ data: rows, error: null });
      }

      if (action === 'insert') {
        const item = Array.isArray(data) ? data[0] : data;
        if (!item.id && table !== 'profiles') item.id = generateId(table.substring(0, 3));
        if (table === 'profiles' && !item.id) item.id = generateId('usr');

        const keys = Object.keys(item);
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(k => typeof item[k] === 'object' ? JSON.stringify(item[k]) : item[k]);

        sql = `INSERT INTO "${table}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders})`;
        await runSql(sql, values);
        return res.json({ data: [item], error: null });
      }

      if (action === 'update') {
        const keys = Object.keys(data);
        const setClause = keys.map(k => `"${k}" = ?`).join(', ');
        const values = keys.map(k => typeof data[k] === 'object' ? JSON.stringify(data[k]) : data[k]);

        sql = `UPDATE "${table}" SET ${setClause} WHERE 1=1`;
        if (eq) {
          for (const key of Object.keys(eq)) {
            sql += ` AND "${key}" = ?`;
            values.push(eq[key]);
          }
        }
        await runSql(sql, values);
        return res.json({ data: [data], error: null });
      }

      if (action === 'delete') {
        sql = `DELETE FROM "${table}" WHERE 1=1`;
        if (eq) {
          for (const key of Object.keys(eq)) {
            sql += ` AND "${key}" = ?`;
            params.push(eq[key]);
          }
        }
        await runSql(sql, params);
        return res.json({ data: null, error: null });
      }

      res.status(400).json({ error: 'Invalid action' });
    } catch (err: any) {
      console.error('API query error:', err);
      res.json({ data: null, error: err.message });
    }
  });
}

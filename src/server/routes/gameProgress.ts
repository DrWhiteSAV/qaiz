import { Router } from 'express';
import { getOne, runSql, generateId } from '../db';

export const gameProgressRouter = Router();

gameProgressRouter.get('/', async (req, res) => {
  try {
    const { user_id, pack_id, game_type } = req.query;
    if (!user_id || !pack_id || !game_type) {
      return res.status(400).json({ error: 'user_id, pack_id и game_type обязательны' });
    }

    const row = await getOne(
      'SELECT * FROM game_progress WHERE user_id = ? AND pack_id = ? AND game_type = ?',
      [user_id, pack_id, game_type]
    );

    if (row && typeof row.state === 'string') {
      try { row.state = JSON.parse(row.state); } catch (_) {}
    }

    res.json({ data: row || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

gameProgressRouter.post('/', async (req, res) => {
  try {
    const { user_id, pack_id, game_type, current_step, total_steps, state } = req.body;
    if (!user_id || !pack_id || !game_type) {
      return res.status(400).json({ error: 'user_id, pack_id и game_type обязательны' });
    }

    const stateStr = typeof state === 'object' ? JSON.stringify(state) : state || '{}';

    const existing = await getOne(
      'SELECT id FROM game_progress WHERE user_id = ? AND pack_id = ? AND game_type = ?',
      [user_id, pack_id, game_type]
    );

    if (existing) {
      await runSql(
        `UPDATE game_progress SET current_step = ?, total_steps = ?, state = ? WHERE id = ?`,
        [current_step || 0, total_steps || 0, stateStr, existing.id]
      );
    } else {
      const id = generateId('gp');
      await runSql(
        `INSERT INTO game_progress (id, user_id, pack_id, game_type, current_step, total_steps, state)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, user_id, pack_id, game_type, current_step || 0, total_steps || 0, stateStr]
      );
    }

    const updated = await getOne(
      'SELECT * FROM game_progress WHERE user_id = ? AND pack_id = ? AND game_type = ?',
      [user_id, pack_id, game_type]
    );

    if (updated && typeof updated.state === 'string') {
      try { updated.state = JSON.parse(updated.state); } catch (_) {}
    }

    res.json({ data: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

gameProgressRouter.delete('/', async (req, res) => {
  try {
    const { user_id, pack_id, game_type } = req.query;
    if (!user_id || !pack_id || !game_type) {
      return res.status(400).json({ error: 'user_id, pack_id и game_type обязательны' });
    }

    await runSql(
      'DELETE FROM game_progress WHERE user_id = ? AND pack_id = ? AND game_type = ?',
      [user_id, pack_id, game_type]
    );

    res.json({ message: 'Прогресс сброшен' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

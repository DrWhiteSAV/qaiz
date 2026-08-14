import { Router } from 'express';
import { getAll, getOne, runSql, generateId } from '../db';

export const triggersRouter = Router();

triggersRouter.get('/', async (_req, res) => {
  try {
    const triggers = await getAll('SELECT * FROM triggers ORDER BY created_at DESC');
    res.json({ data: triggers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

triggersRouter.post('/', async (req, res) => {
  try {
    const { id, name, event_type, action_type, target, payload, is_active } = req.body;
    if (!name || !event_type || !action_type) {
      return res.status(400).json({ error: 'Поля name, event_type и action_type обязательны' });
    }

    const triggerId = id || generateId('trg');
    await runSql(
      `INSERT INTO triggers (id, name, event_type, action_type, target, payload, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         event_type = excluded.event_type,
         action_type = excluded.action_type,
         target = excluded.target,
         payload = excluded.payload,
         is_active = excluded.is_active`,
      [triggerId, name, event_type, action_type, target || 'user', payload || '{}', is_active ?? 1]
    );

    const created = await getOne('SELECT * FROM triggers WHERE id = ?', [triggerId]);
    res.json({ data: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

triggersRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runSql('DELETE FROM triggers WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

import { Router } from 'express';
import { getAll, getOne, runSql, generateId } from '../db';

export const mailingRouter = Router();

mailingRouter.get('/', async (_req, res) => {
  try {
    const logs = await getAll('SELECT * FROM mailing_logs ORDER BY timestamp DESC');
    res.json({ data: logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

mailingRouter.post('/', async (req, res) => {
  try {
    const { recipient_id, type, status } = req.body;
    if (!recipient_id) {
      return res.status(400).json({ error: 'recipient_id обязателен' });
    }

    const id = generateId('ml');
    const ts = Date.now();
    await runSql(
      `INSERT INTO mailing_logs (id, recipient_id, type, status, timestamp) VALUES (?, ?, ?, ?, ?)`,
      [id, recipient_id, type || 'notification', status || 'sent', ts]
    );

    const created = await getOne('SELECT * FROM mailing_logs WHERE id = ?', [id]);
    res.json({ data: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

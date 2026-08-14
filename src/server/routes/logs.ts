import { Router } from 'express';
import { getAll, runSql } from '../db';

export const logsRouter = Router();

logsRouter.get('/', async (_req, res) => {
  try {
    const logs = await getAll('SELECT * FROM logs ORDER BY created_at DESC LIMIT 200');
    res.json({ data: logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

logsRouter.post('/', async (req, res) => {
  try {
    const {
      channel_id, user_social_id, user_message, bot_reply,
      channel_name, bot_id, llm, tokens_total, server_name
    } = req.body;

    await runSql(
      `INSERT INTO logs (
        channel_id, user_social_id, user_message, bot_reply,
        channel_name, bot_id, llm, tokens_total, server_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        channel_id || null,
        user_social_id || null,
        user_message || null,
        bot_reply || null,
        channel_name || 'qaiz',
        bot_id || '60381',
        llm || 'protalk',
        tokens_total || 0,
        server_name || 'miniapp'
      ]
    );

    res.json({ message: 'Лог сохранен' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

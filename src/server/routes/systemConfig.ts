import { Router } from 'express';
import { getOne, runSql } from '../db';

export const systemConfigRouter = Router();

systemConfigRouter.get('/', async (_req, res) => {
  try {
    const row = await getOne('SELECT * FROM system_config WHERE id = ?', ['default']);
    if (row && typeof row.config_json === 'string') {
      try {
        row.config = JSON.parse(row.config_json);
      } catch (_) {}
    }
    res.json({ data: row ? (row.config || row.config_json) : null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

systemConfigRouter.put('/', async (req, res) => {
  try {
    const configData = req.body;
    const configJson = typeof configData === 'string' ? configData : JSON.stringify(configData);

    const existing = await getOne('SELECT id FROM system_config WHERE id = ?', ['default']);
    if (existing) {
      await runSql('UPDATE system_config SET config_json = ?, updated_at = datetime("now") WHERE id = ?', [configJson, 'default']);
    } else {
      await runSql('INSERT INTO system_config (id, config_json) VALUES (?, ?)', ['default', configJson]);
    }

    res.json({ message: 'Системная конфигурация успешно обновлена' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

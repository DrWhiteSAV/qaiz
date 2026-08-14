import { Router } from 'express';
import { getAll, getOne, runSql } from '../db';

export const promptsRouter = Router();

promptsRouter.get('/', async (_req, res) => {
  try {
    const promptsList = await getAll('SELECT * FROM prompts ORDER BY game_id ASC');
    const promptsMap: Record<string, string> = {};
    promptsList.forEach(p => {
      promptsMap[p.game_id] = p.content;
    });
    res.json({ data: promptsMap, list: promptsList });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

promptsRouter.put('/:game_id', async (req, res) => {
  try {
    const { game_id } = req.params;
    const { content, description } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Промпт не может быть пустым' });
    }

    const existing = await getOne('SELECT game_id FROM prompts WHERE game_id = ?', [game_id]);
    if (existing) {
      await runSql(
        `UPDATE prompts SET content = ?, description = COALESCE(?, description), updated_at = datetime('now') WHERE game_id = ?`,
        [content, description, game_id]
      );
    } else {
      await runSql(
        `INSERT INTO prompts (game_id, content, description) VALUES (?, ?, ?)`,
        [game_id, content, description || `Промпт для ${game_id}`]
      );
    }

    res.json({ message: `Промпт для ${game_id} сохранен` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

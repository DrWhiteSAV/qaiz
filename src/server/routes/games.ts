import { Router } from 'express';
import { getAll, getOne, runSql } from '../db';

export const gamesRouter = Router();

// GET all games
gamesRouter.get('/', async (_req, res) => {
  try {
    const games = await getAll('SELECT * FROM games ORDER BY created_at ASC');
    res.json({ data: games });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET game by id
gamesRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const game = await getOne('SELECT * FROM games WHERE id = ?', [id]);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json({ data: game });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update game
gamesRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      description,
      image_url,
      category,
      question_count,
      path,
      tag,
      price_per_question,
      price_text,
      rules,
      coming_soon
    } = req.body;

    const existing = await getOne('SELECT * FROM games WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Game not found' });
    }

    await runSql(
      `UPDATE games SET 
        title = COALESCE(?, title),
        subtitle = COALESCE(?, subtitle),
        description = COALESCE(?, description),
        image_url = COALESCE(?, image_url),
        category = COALESCE(?, category),
        question_count = COALESCE(?, question_count),
        path = COALESCE(?, path),
        tag = COALESCE(?, tag),
        price_per_question = COALESCE(?, price_per_question),
        price_text = COALESCE(?, price_text),
        rules = COALESCE(?, rules),
        coming_soon = COALESCE(?, coming_soon),
        updated_at = datetime('now')
      WHERE id = ?`,
      [
        title,
        subtitle,
        description,
        image_url,
        category,
        question_count,
        path,
        tag,
        price_per_question,
        price_text,
        rules,
        coming_soon,
        id
      ]
    );

    const updated = await getOne('SELECT * FROM games WHERE id = ?', [id]);
    res.json({ data: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

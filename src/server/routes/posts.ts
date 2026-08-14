import { Router } from 'express';
import { getAll, getOne, runSql, generateId } from '../db';

export const postsRouter = Router();

postsRouter.get('/', async (_req, res) => {
  try {
    const posts = await getAll('SELECT * FROM posts ORDER BY created_at DESC');
    res.json({ data: posts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

postsRouter.post('/', async (req, res) => {
  try {
    const { title, content, image_url, platforms } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Заголовок и текст обязательны' });
    }

    const id = generateId('post');
    const platformsStr = Array.isArray(platforms) ? platforms.join(', ') : (platforms || 'Web, Telegram');

    await runSql(
      `INSERT INTO posts (id, title, content, image_url, platforms) VALUES (?, ?, ?, ?, ?)`,
      [id, title, content, image_url || null, platformsStr]
    );

    const created = await getOne('SELECT * FROM posts WHERE id = ?', [id]);
    res.json({ data: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

postsRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, image_url, platforms } = req.body;

    const platformsStr = Array.isArray(platforms) ? platforms.join(', ') : platforms;

    await runSql(
      `UPDATE posts SET title = COALESCE(?, title), content = COALESCE(?, content), image_url = COALESCE(?, image_url), platforms = COALESCE(?, platforms) WHERE id = ?`,
      [title, content, image_url, platformsStr, id]
    );

    const updated = await getOne('SELECT * FROM posts WHERE id = ?', [id]);
    res.json({ data: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

postsRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runSql('DELETE FROM posts WHERE id = ?', [id]);
    res.json({ message: 'Пост удален' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

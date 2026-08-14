import { Router } from 'express';
import { getAll, getOne, runSql, generateId } from '../db';

export const topicsRouter = Router();

// GET all topics (alphabetical, search query support, total count)
topicsRouter.get('/', async (req, res) => {
  try {
    const q = req.query.q ? String(req.query.q).trim().toLowerCase() : '';
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 1000;

    const totalRow = await getOne<{ total: number }>('SELECT COUNT(*) as total FROM topics');
    const totalCount = totalRow?.total || 0;

    let sql = 'SELECT * FROM topics';
    const params: any[] = [];

    if (q) {
      sql += ' WHERE LOWER(name) LIKE ?';
      params.push(`%${q}%`);
    }

    sql += ' ORDER BY LOWER(name) ASC';

    if (limit > 0) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    const topics = await getAll(sql, params);

    res.json({
      data: topics,
      totalCount,
      filteredCount: topics.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create or retrieve existing topic (case-insensitive deduplication)
topicsRouter.post('/', async (req, res) => {
  try {
    const { name, category, description } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Название темы обязательно' });
    }

    const trimmedName = name.trim();

    // Case-insensitive search for exact duplicate
    const existing = await getOne<any>(
      'SELECT * FROM topics WHERE LOWER(name) = LOWER(?)',
      [trimmedName]
    );

    if (existing) {
      // Increment usage count and return existing topic
      await runSql('UPDATE topics SET use_count = use_count + 1 WHERE id = ?', [existing.id]);
      const updated = await getOne('SELECT * FROM topics WHERE id = ?', [existing.id]);
      return res.json({ data: updated, created: false });
    }

    // Create new topic for all users
    const id = generateId('tp');
    await runSql(
      'INSERT INTO topics (id, name, category, description, use_count) VALUES (?, ?, ?, ?, ?)',
      [id, trimmedName, category || 'Пользовательские', description || 'Пользовательская тема', 1]
    );

    const created = await getOne('SELECT * FROM topics WHERE id = ?', [id]);
    res.json({ data: created, created: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

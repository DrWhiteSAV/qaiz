import { Router } from 'express';
import { getAll, getOne, runSql } from '../db';

export const dbQueryRouter = Router();

dbQueryRouter.post('/', async (req, res) => {
  try {
    const { table, action, data, eq, order, limit } = req.body;
    if (!table) {
      return res.status(400).json({ error: 'Таблица обязательна' });
    }

    if (action === 'select' || !action) {
      let query = `SELECT * FROM "${table}" WHERE 1=1`;
      const params: any[] = [];

      if (eq && typeof eq === 'object') {
        for (const [col, val] of Object.entries(eq)) {
          if (val !== undefined && val !== null) {
            query += ` AND "${col}" = ?`;
            params.push(val);
          }
        }
      }

      if (order && order.column) {
        query += ` ORDER BY "${order.column}" ${order.ascending === false ? 'DESC' : 'ASC'}`;
      }

      if (limit && typeof limit === 'number') {
        query += ` LIMIT ${limit}`;
      }

      const rows = await getAll(query, params);
      return res.json({ data: rows });
    }

    if (action === 'insert') {
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Данные обязательны' });
      }
      const cols = Object.keys(data);
      const vals = Object.values(data);
      const placeholders = cols.map(() => '?').join(', ');
      const sql = `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

      await runSql(sql, vals);
      return res.json({ data, success: true });
    }

    if (action === 'update') {
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Данные обязательны' });
      }
      const setClauses: string[] = [];
      const params: any[] = [];

      for (const [col, val] of Object.entries(data)) {
        setClauses.push(`"${col}" = ?`);
        params.push(val);
      }

      let whereClause = 'WHERE 1=1';
      if (eq && typeof eq === 'object') {
        for (const [col, val] of Object.entries(eq)) {
          whereClause += ` AND "${col}" = ?`;
          params.push(val);
        }
      }

      const sql = `UPDATE "${table}" SET ${setClauses.join(', ')} ${whereClause}`;
      await runSql(sql, params);
      return res.json({ data, success: true });
    }

    if (action === 'delete') {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      if (eq && typeof eq === 'object') {
        for (const [col, val] of Object.entries(eq)) {
          whereClause += ` AND "${col}" = ?`;
          params.push(val);
        }
      }
      const sql = `DELETE FROM "${table}" ${whereClause}`;
      await runSql(sql, params);
      return res.json({ success: true });
    }

    res.status(400).json({ error: 'Неизвестное действие' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

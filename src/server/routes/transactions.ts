import { Router } from 'express';
import { getAll, getOne, runSql, generateId, recalculateUserBalancesFromTransactions } from '../db';

export const transactionsRouter = Router();

transactionsRouter.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    let sql = 'SELECT * FROM transactions';
    const params: any[] = [];
    if (user_id) {
      sql += ' WHERE user_id = ?';
      params.push(user_id);
    }
    sql += ' ORDER BY timestamp DESC';
    const txs = await getAll(sql, params);
    res.json({ data: txs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transactionsRouter.post('/', async (req, res) => {
  try {
    const { user_id, amount, currency, type, description, reference_id } = req.body;
    if (!user_id || amount === undefined) {
      return res.status(400).json({ error: 'user_id и amount обязательны' });
    }

    const id = generateId('tx');
    const curr = currency || 'RR';
    const txType = type || (amount >= 0 ? 'deposit' : 'withdrawal');
    const ts = Date.now();

    await runSql(
      `INSERT INTO transactions (id, user_id, amount, currency, type, description, reference_id, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user_id, amount, curr, txType, description || null, reference_id || null, ts]
    );

    await recalculateUserBalancesFromTransactions(user_id);

    const created = await getOne('SELECT * FROM transactions WHERE id = ?', [id]);
    res.json({ data: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

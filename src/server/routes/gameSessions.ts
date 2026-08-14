import { Router } from 'express';
import { getAll, getOne, runSql, generateId } from '../db';

export const gameSessionsRouter = Router();

gameSessionsRouter.get('/', async (req, res) => {
  try {
    const { user_id, game_id } = req.query;
    let sql = 'SELECT * FROM game_sessions WHERE 1=1';
    const params: any[] = [];

    if (user_id) {
      sql += ' AND user_id = ?';
      params.push(user_id);
    }
    if (game_id) {
      sql += ' AND game_id = ?';
      params.push(game_id);
    }

    sql += ' ORDER BY created_at DESC LIMIT 100';
    const sessions = await getAll(sql, params);
    res.json({ data: sessions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

gameSessionsRouter.post('/', async (req, res) => {
  try {
    const {
      user_id, game_id, game_title, score, total_questions,
      correct_answers, mode, difficulty, topic, price_paid, is_win
    } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id обязателен' });
    }

    const id = generateId('gs');
    await runSql(
      `INSERT INTO game_sessions (
        id, user_id, game_id, game_title, score, total_questions,
        correct_answers, mode, difficulty, topic, price_paid, is_win
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user_id,
        game_id || 'unknown',
        game_title || 'Игра Квайз',
        score || 0,
        total_questions || 0,
        correct_answers || 0,
        mode || 'single',
        difficulty || 'people',
        topic || 'Общие знания',
        price_paid || 0,
        is_win ? 1 : 0
      ]
    );

    const created = await getOne('SELECT * FROM game_sessions WHERE id = ?', [id]);
    res.json({ data: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Deduct ИИкра at answer attempt
gameSessionsRouter.post('/deduct_attempt', async (req, res) => {
  try {
    const { user_id, game_id } = req.body;
    if (!user_id || !game_id) {
      return res.status(400).json({ error: 'user_id и game_id обязательны' });
    }

    // Get game price from DB
    const game = await getOne('SELECT * FROM games WHERE id = ?', [game_id]);
    const pricePerQuestion = game ? Number(game.price_per_question || 1) : 1;

    // Get profile
    const profile = await getOne(
      'SELECT * FROM profiles WHERE id = ? OR uid = ? OR telegram_id = ?',
      [user_id, user_id, user_id]
    );

    if (!profile) {
      return res.status(404).json({ error: 'Профиль пользователя не найден' });
    }

    const currentBalance = Number(profile.balance_rr ?? profile.coins ?? 0);

    if (currentBalance < pricePerQuestion) {
      return res.status(402).json({
        error: 'Недостаточно ИИкр для ответа на вопрос',
        required: pricePerQuestion,
        balance: currentBalance
      });
    }

    const newBalance = Math.max(0, currentBalance - pricePerQuestion);

    await runSql(
      `UPDATE profiles SET balance_rr = ?, coins = ?, updated_at = datetime('now') WHERE id = ?`,
      [newBalance, newBalance, profile.id]
    );

    // Record transaction
    const txId = generateId('tx');
    await runSql(
      `INSERT INTO transactions (id, user_id, amount, currency, type, description)
       VALUES (?, ?, ?, 'ИИкра', 'attempt_deduction', ?)`,
      [txId, profile.id, -pricePerQuestion, `Попытка ответа в игре ${game?.title || game_id}`]
    );

    res.json({
      success: true,
      deducted: pricePerQuestion,
      new_balance: newBalance
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

import { Router } from 'express';
import { getOne, runSql, generateId } from '../db';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, display_name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await getOne('SELECT * FROM profiles WHERE LOWER(email) = ?', [normalizedEmail]);
    if (existing) {
      return res.status(400).json({ error: 'Пользователь с таким email уже зарегистрирован' });
    }

    const uid = generateId('usr');
    const displayName = display_name || normalizedEmail.split('@')[0] || 'Игрок';

    await runSql(
      `INSERT INTO profiles (id, uid, email, password, display_name, role, balance_rub, coins)
       VALUES (?, ?, ?, ?, ?, 'player', 100, 50)`,
      [uid, uid, normalizedEmail, password, displayName]
    );

    const created = await getOne('SELECT * FROM profiles WHERE uid = ?', [uid]);
    if (created) delete created.password;

    res.json({ data: created, message: 'Успешная регистрация' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await getOne('SELECT * FROM profiles WHERE LOWER(email) = ?', [normalizedEmail]);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь с таким email не найден' });
    }

    if (user.password && user.password !== password) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    delete user.password;
    res.json({ data: user, message: 'Успешный вход' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

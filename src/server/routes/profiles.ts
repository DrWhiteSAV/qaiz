import { Router } from 'express';
import { getAll, getOne, runSql } from '../db';

export const profilesRouter = Router();

profilesRouter.get('/', async (_req, res) => {
  try {
    const profiles = await getAll('SELECT * FROM users ORDER BY created_at DESC');
    profiles.forEach(p => delete p.password);
    res.json({ data: profiles });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

profilesRouter.get('/by-uid/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const profile = await getOne(
      'SELECT * FROM users WHERE uid = ? OR id = ? OR telegram_id = ?',
      [uid, uid, uid]
    );
    if (!profile) {
      return res.status(404).json({ error: 'Профиль не найден' });
    }
    delete profile.password;
    res.json({ data: profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

profilesRouter.put('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const body = req.body || {};

    const updates: string[] = [];
    const params: any[] = [];

    const allowedFields = [
      'display_name', 'username', 'avatar_url', 'photo_url', 'phone',
      'balance_rr', 'coins', 'role', 'author_status', 'referral_code', 'referred_by'
    ];

    // support legacy balance key
    if (body.balance !== undefined && body.balance_rr === undefined) {
      body.balance_rr = body.balance;
    }

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates.push(`${key} = ?`);
        params.push(body[key]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    params.push(uid, uid, uid);
    await runSql(
      `UPDATE users SET ${updates.join(', ')} WHERE uid = ? OR id = ? OR telegram_id = ?`,
      params
    );

    const updated = await getOne('SELECT * FROM users WHERE uid = ? OR id = ? OR telegram_id = ?', [uid, uid, uid]);
    if (updated) delete updated.password;

    res.json({ data: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

import { Router } from 'express';
import { getOne, runSql } from '../db';

export const telegramRouter = Router();

telegramRouter.get('/admin/telegram-config', async (_req, res) => {
  try {
    const config = await getOne(
      'SELECT * FROM telegram_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    );
    res.json({
      bot_token: config?.bot_token || '8663485854:AAFRdzmRhCQzLsMi9-jaINWwsK_wO-_xmyw',
      bot_name: config?.bot_name || 'Qaiz - ИИ Квиз онлайн мультиплеер',
      bot_username: config?.bot_username || '@qaiz_aibot',
      bot_link: config?.bot_link || 'https://t.me/qaiz_aibot',
      channel_username: config?.channel_username || 'qaiz_ru',
      channel_link: config?.channel_link || 'https://t.me/qaiz_ru',
      web_app_url: config?.web_app_url || 'https://t.me/qaiz_aibot/app',
      direct_site_url: config?.direct_site_url || 'https://qaiz.ru/',
      ref_link_template: config?.ref_link_template || 'https://t.me/SAV_AIbot/app?startapp={telegram_id}',
      is_active: config?.is_active ?? 1
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

telegramRouter.put('/admin/telegram-config', async (req, res) => {
  try {
    const {
      bot_token, bot_name, bot_username, bot_link,
      channel_username, channel_link, web_app_url, direct_site_url,
      ref_link_template, is_active
    } = req.body;

    const existing = await getOne('SELECT id FROM telegram_config ORDER BY id DESC LIMIT 1');
    if (existing) {
      await runSql(
        `UPDATE telegram_config SET
          bot_token = ?, bot_name = ?, bot_username = ?, bot_link = ?,
          channel_username = ?, channel_link = ?, web_app_url = ?, direct_site_url = ?,
          ref_link_template = ?, is_active = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [
          bot_token || '8663485854:AAFRdzmRhCQzLsMi9-jaINWwsK_wO-_xmyw',
          bot_name || 'Qaiz - ИИ Квиз онлайн мультиплеер',
          bot_username || '@qaiz_aibot',
          bot_link || 'https://t.me/qaiz_aibot',
          channel_username || 'qaiz_ru',
          channel_link || 'https://t.me/qaiz_ru',
          web_app_url || 'https://t.me/qaiz_aibot/app',
          direct_site_url || 'https://qaiz.ru/',
          ref_link_template || 'https://t.me/SAV_AIbot/app?startapp={telegram_id}',
          is_active ?? 1,
          existing.id
        ]
      );
    } else {
      await runSql(
        `INSERT INTO telegram_config (
          bot_token, bot_name, bot_username, bot_link,
          channel_username, channel_link, web_app_url, direct_site_url, ref_link_template, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bot_token || '8663485854:AAFRdzmRhCQzLsMi9-jaINWwsK_wO-_xmyw',
          bot_name || 'Qaiz - ИИ Квиз онлайн мультиплеер',
          bot_username || '@qaiz_aibot',
          bot_link || 'https://t.me/qaiz_aibot',
          channel_username || 'qaiz_ru',
          channel_link || 'https://t.me/qaiz_ru',
          web_app_url || 'https://t.me/qaiz_aibot/app',
          direct_site_url || 'https://qaiz.ru/',
          ref_link_template || 'https://t.me/SAV_AIbot/app?startapp={telegram_id}',
          is_active ?? 1
        ]
      );
    }

    res.json({ message: 'Настройки Telegram сохранены' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

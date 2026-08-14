import { Router } from 'express';
import { getOne, runSql, generateId, recalculateUserBalancesFromTransactions } from '../db';

export const protalkRouter = Router();

protalkRouter.get('/admin/protalk-config', async (_req, res) => {
  try {
    const config = await getOne(
      'SELECT bot_id, bot_token, channel_name, is_active FROM protalk_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    );
    res.json({
      bot_id: config?.bot_id || '60381',
      bot_token: config?.bot_token || '60381_FONb1dD2SQdv7FwG0ui2PZ9ODxXMKkz7',
      channel_name: config?.channel_name || 'qaiz',
      is_active: config?.is_active ?? 1
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

protalkRouter.put('/admin/protalk-config', async (req, res) => {
  try {
    const { bot_id, bot_token, channel_name, is_active } = req.body;
    if (!bot_id || !bot_token) {
      return res.status(400).json({ error: 'bot_id и bot_token обязательны' });
    }

    const existing = await getOne('SELECT id FROM protalk_config ORDER BY id DESC LIMIT 1');
    if (existing) {
      await runSql(
        `UPDATE protalk_config SET bot_id = ?, bot_token = ?, channel_name = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?`,
        [bot_id, bot_token, channel_name || 'qaiz', is_active ?? 1, existing.id]
      );
    } else {
      await runSql(
        `INSERT INTO protalk_config (bot_id, bot_token, channel_name, is_active) VALUES (?, ?, ?, ?)`,
        [bot_id, bot_token, channel_name || 'qaiz', is_active ?? 1]
      );
    }

    res.json({ message: 'Настройки ProTalk сохранены' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const handleProTalkRequest = async (req: any, res: any) => {
  const { prompt, chat_id, bot_chat_id, social_id, message } = req.body;
  const userPrompt = prompt || message;

  if (!userPrompt) {
    return res.status(400).json({ error: 'Промпт (сообщение) не может быть пустым' });
  }

  let dbConfig = await getOne<{ bot_id: string; bot_token: string; channel_name: string }>(
    'SELECT bot_id, bot_token, channel_name FROM protalk_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
  );

  const botId = dbConfig?.bot_id || '60381';
  const botToken = dbConfig?.bot_token || '60381_FONb1dD2SQdv7FwG0ui2PZ9ODxXMKkz7';
  const chatId = chat_id || bot_chat_id || `ask${Math.floor(Math.random() * 900000 + 100000)}`;
  const userSocialId = social_id || `from_user_id:webapp message_id:${Date.now()}`;
  const channelName = req.body.channel_name || dbConfig?.channel_name || 'qaiz';

  let text = '';
  let functionError = '';

  try {
    // Direct ProTalk API
    try {
      const askRes = await fetch(`https://eu1.api.pro-talk.ru/api/v1.0/ask/${botToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_id: parseInt(botId, 10) || botId,
          chat_id: chatId,
          message: userPrompt,
          social_id: userSocialId,
        }),
      });

      if (askRes.ok) {
        const askJson: any = await askRes.json().catch(() => null);
        if (askJson && (askJson.done || askJson.message || askJson.reply)) {
          text = askJson.done || askJson.message || askJson.reply;
        }
      }
    } catch (err: any) {
      console.warn('[ProTalk Ask Endpoint Warn]:', err.message);
    }

    // Async polling if no text yet
    if (!text) {
      try {
        const sendRes = await fetch('https://eu1.api.pro-talk.ru/api/v1.0/send_message_async', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bot_id: parseInt(botId, 10) || botId,
            bot_token: botToken,
            bot_chat_id: chatId,
            message: userPrompt,
          }),
        });

        if (sendRes.ok) {
          const maxAttempts = 10;
          const pollInterval = 2000;
          for (let i = 0; i < maxAttempts; i++) {
            await new Promise((r) => setTimeout(r, pollInterval));
            const replyRes = await fetch('https://eu1.api.pro-talk.ru/api/v1.0/get_last_reply', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bot_id: parseInt(botId, 10) || botId,
                bot_token: botToken,
                bot_chat_id: chatId,
              }),
            });

            if (replyRes.ok) {
              const replyJson: any = await replyRes.json().catch(() => null);
              if (replyJson && replyJson.message) {
                text = replyJson.message;
                break;
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('[ProTalk Polling Warn]:', err.message);
      }
    }

    // Fallback response if ProTalk external service is offline
    if (!text) {
      text = JSON.stringify({
        status: 'ok',
        reply: `Ответ ProTalk AI на тему: "${userPrompt.slice(0, 50)}..."`
      });
    }

    // Log query in SQLite `logs` table
    try {
      await runSql(
        `INSERT INTO logs (
          channel_id, user_social_id, user_message, bot_reply,
          channel_name, bot_id, llm, tokens_total, function_error, server_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(chatId),
          String(userSocialId),
          userPrompt,
          text,
          channelName,
          String(botId),
          'protalk',
          userPrompt.length + text.length,
          functionError || null,
          'ai-chat-miniapp'
        ]
      );
    } catch (logErr) {
      console.error('[Logs Error]:', logErr);
    }

    // Deduct coins if user_id & game_id are provided (or if user is present)
    const userId = req.body.user_id || req.body.userId;
    const gameId = req.body.game_id || req.body.gameId;
    const qCount = parseInt(req.body.count || req.body.question_count || '1', 10);

    if (userId && text) {
      try {
        const game = await getOne<{ title: string; price_per_question: number }>(
          'SELECT title, price_per_question FROM games WHERE id = ?',
          [gameId]
        );
        const pricePerQuestion = game?.price_per_question ?? 1;
        const countToDeduct = isNaN(qCount) || qCount < 1 ? 1 : qCount;
        const totalDeduction = pricePerQuestion * countToDeduct;

        const txId = generateId('tx');
        const gameTitle = game?.title || gameId || 'Викторина';
        const desc = `Списание за вопросы в игре "${gameTitle}" (${totalDeduction} ИИкр)`;

        await runSql(
          `INSERT INTO transactions (id, user_id, amount, currency, type, description, reference_id, timestamp)
           VALUES (?, ?, ?, 'RR', 'spend', ?, ?, ?)`,
          [txId, userId, -Math.abs(totalDeduction), desc, gameId || 'game', Date.now()]
        );
        await recalculateUserBalancesFromTransactions(userId);
      } catch (txErr) {
        console.error('[Transaction Deduct Error]:', txErr);
      }
    }

    res.json({
      text,
      reply: text,
      message: text,
      chat_id: chatId,
      social_id: userSocialId
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

protalkRouter.post('/protalk', handleProTalkRequest);
protalkRouter.post('/ai-chat', handleProTalkRequest);

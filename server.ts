import dns from 'dns';
if (dns.setDefaultResultOrder) {
  try {
    dns.setDefaultResultOrder('ipv4first');
  } catch (e) {
    console.warn('DNS result order setup warning:', e);
  }
}

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { getDb, performDailyDatabaseBackup } from './src/server/db';
import { setupApiRoutes } from './src/server/routes';

dotenv.config();

const BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN;
const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize SQLite Database
  await getDb();
  console.log('[SQLite Engine] Database initialized successfully.');

  // Initialize API routes
  setupApiRoutes(app);

  // Daily DB Backup Cron Job (every 24h)
  setInterval(() => {
    performDailyDatabaseBackup().catch(err => console.error('[Backup Error]:', err));
  }, 24 * 60 * 60 * 1000);

  // Initialize Telegram Bot
  if (BOT_TOKEN) {
    const bot = new TelegramBot(BOT_TOKEN);
    
    // Use webhook instead of polling to avoid 409 Conflict errors in serverless environments
    const APP_URL = process.env.APP_URL || `https://${process.env.VITE_VERCEL_URL}`;
    if (APP_URL) {
      const webhookUrl = `${APP_URL}/api/telegram-webhook`;
      bot.setWebHook(webhookUrl);
      console.log(`Telegram Webhook set to: ${webhookUrl}`);
      
      app.post('/api/telegram-webhook', (req, res) => {
        bot.processUpdate(req.body);
        res.sendStatus(200);
      });
    } else {
      // Fallback to polling if no APP_URL is found (local dev)
      console.warn('APP_URL not found. Falling back to polling for Telegram Bot.');
      bot.startPolling();
    }

    bot.onText(/\/start (.+)/, (msg, match) => {
      const chatId = msg.chat.id;
      const startParam = match ? match[1] : '';

      if (startParam === 'link') {
        const code = `sdf${chatId}gh`;
        bot.sendMessage(chatId, `Ваш код для привязки аккаунта в Квайз:\n\n<code>${code}</code>\n\nСкопируйте этот код и вставьте его в приложении.`, {
          parse_mode: 'HTML'
        });
        console.log(`Generated linking code ${code} for chat ${chatId}`);
      }
    });

    bot.on('message', (msg) => {
      if (msg.text === '/start') {
        bot.sendMessage(msg.chat.id, 'Добро пожаловать в Квайз! Чтобы привязать аккаунт, используйте кнопку в приложении.');
      }
    });

    console.log('Telegram Bot is running...');
  } else {
    console.warn('VITE_TELEGRAM_BOT_TOKEN not found. Bot disabled.');
  }

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Serve Robots.txt and Sitemap.xml
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.sendFile(path.join(process.cwd(), 'public', 'robots.txt'));
  });

  app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.sendFile(path.join(process.cwd(), 'public', 'sitemap.xml'));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

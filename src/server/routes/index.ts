import { Express } from 'express';
import { authRouter } from './auth';
import { usersRouter } from './users';
import { profilesRouter } from './profiles';
import { gameSessionsRouter } from './gameSessions';
import { gameProgressRouter } from './gameProgress';
import { postsRouter } from './posts';
import { newsRouter } from './news';
import { transactionsRouter } from './transactions';
import { mailingRouter } from './mailing';
import { systemConfigRouter } from './systemConfig';
import { logsRouter } from './logs';
import { protalkRouter } from './protalk';
import { telegramRouter } from './telegram';
import { promptsRouter } from './prompts';
import { adminSystemRouter } from './adminSystem';
import { gamesRouter } from './games';
import { topicsRouter } from './topics';
import { dbQueryRouter } from './dbQuery';
import { filesRouter, directFileHandler } from './files';
import { triggersRouter } from './triggers';

export function setupApiRoutes(app: Express) {
  // Direct file link routes
  app.get('/file/:file_id/:file_name', directFileHandler);
  app.get('/file/:file_id', directFileHandler);

  app.use('/api/triggers', triggersRouter);
  app.use('/api/games', gamesRouter);
  app.use('/api/topics', topicsRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/profiles', profilesRouter);
  app.use('/api/game_sessions', gameSessionsRouter);
  app.use('/api/game_progress', gameProgressRouter);
  app.use('/api/posts', postsRouter);
  app.use('/api/news', newsRouter);
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/mailing_logs', mailingRouter);
  app.use('/api/system_config', systemConfigRouter);
  app.use('/api/logs', logsRouter);
  app.use('/api', protalkRouter);
  app.use('/api', telegramRouter);
  app.use('/api/admin/prompts', promptsRouter);
  app.use('/api/admin/system', adminSystemRouter);
  app.use('/api/admin', filesRouter);
  app.use('/api/db/query', dbQueryRouter);
}

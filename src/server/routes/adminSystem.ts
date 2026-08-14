import { Router } from 'express';
import JSZip from 'jszip';
import { getAll, getOne, runSql, performDailyDatabaseBackup, saveDb, getDb } from '../db';

export const adminSystemRouter = Router();

// Helper to convert rows to CSV format
function arrayToCsv(rows: any[], columns?: string[]): string {
  if (!rows || rows.length === 0) {
    if (columns && columns.length > 0) {
      return columns.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',') + '\n';
    }
    return '';
  }

  const cols = columns && columns.length > 0 ? columns : Object.keys(rows[0]);
  const headerRow = cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');

  const dataRows = rows.map(row => {
    return cols.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'object') {
        const str = JSON.stringify(val);
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

// Helper to parse CSV format
function parseCsv(csvText: string): { columns: string[]; rows: any[] } {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { columns: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur);
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur);
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.trim());
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (vals.length === headers.length) {
      const obj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        let raw = vals[idx];
        if (raw.startsWith('{') || raw.startsWith('[')) {
          try { raw = JSON.parse(raw); } catch (_) {}
        }
        obj[h] = raw;
      });
      rows.push(obj);
    }
  }

  return { columns: headers, rows };
}

// GET all tables with row count
adminSystemRouter.get('/tables', async (_req, res) => {
  try {
    const rawTables = await getAll<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC"
    );

    const tables = [];
    for (const t of rawTables) {
      const countRes = await getOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM "${t.name}"`);
      tables.push({
        name: t.name,
        rowCount: countRes?.cnt || 0
      });
    }

    res.json({ tables });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET specific table columns & rows
adminSystemRouter.get('/table/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const limit = parseInt(req.query.limit as string, 10) || 500;
    const rows = await getAll(`SELECT * FROM "${tableName}" LIMIT ?`, [limit]);
    let columns: string[] = [];
    if (rows.length > 0) {
      columns = Object.keys(rows[0]);
    } else {
      const pragma = await getAll(`PRAGMA table_info("${tableName}")`);
      columns = pragma.map((col: any) => col.name);
    }
    res.json({ tableName, columns, rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper for update
const updateRowHandler = async (req: any, res: any) => {
  try {
    const { tableName, id } = req.params;
    const data = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Данные обязательны' });
    }

    const setClauses: string[] = [];
    const params: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'id' && key !== 'uid') {
        setClauses.push(`"${key}" = ?`);
        params.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
      }
    }

    if (setClauses.length > 0) {
      params.push(id, id);
      await runSql(`UPDATE "${tableName}" SET ${setClauses.join(', ')} WHERE id = ? OR uid = ?`, params);
      const db = await getDb();
      saveDb(db);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE table row (both paths)
adminSystemRouter.put('/table/:tableName/row/:id', updateRowHandler);
adminSystemRouter.put('/table/:tableName/:id', updateRowHandler);

// Helper for delete
const deleteRowHandler = async (req: any, res: any) => {
  try {
    const { tableName, id } = req.params;
    await runSql(`DELETE FROM "${tableName}" WHERE id = ? OR uid = ?`, [id, id]);
    const db = await getDb();
    saveDb(db);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE table row (both paths)
adminSystemRouter.delete('/table/:tableName/row/:id', deleteRowHandler);
adminSystemRouter.delete('/table/:tableName/:id', deleteRowHandler);

// Helper for insert
const insertRowHandler = async (req: any, res: any) => {
  try {
    const { tableName } = req.params;
    const data = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Данные обязательны' });
    }

    const keys = Object.keys(data);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'Пустой объект' });
    }

    const quotedKeys = keys.map(k => `"${k}"`).join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const params = keys.map(k => {
      const val = data[k];
      return typeof val === 'object' && val !== null ? JSON.stringify(val) : val;
    });

    await runSql(`INSERT INTO "${tableName}" (${quotedKeys}) VALUES (${placeholders})`, params);
    const db = await getDb();
    saveDb(db);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// INSERT new row into table (both paths)
adminSystemRouter.post('/table/:tableName/row', insertRowHandler);
adminSystemRouter.post('/table/:tableName', insertRowHandler);

// EXPORT CSV FOR SINGLE TABLE
adminSystemRouter.get('/export/csv/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const rows = await getAll(`SELECT * FROM "${tableName}"`);
    const pragma = await getAll(`PRAGMA table_info("${tableName}")`);
    const columns = pragma.map((c: any) => c.name);

    const csvData = arrayToCsv(rows, columns);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${tableName}.csv"`);
    res.send(csvData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// IMPORT CSV INTO SINGLE TABLE
adminSystemRouter.post('/import/csv/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const csvContent = req.body.csvContent || req.body.csv;
    const clearExisting = req.body.clearExisting ?? req.body.clearTable ?? false;

    if (!csvContent || typeof csvContent !== 'string') {
      return res.status(400).json({ error: 'Содержимое CSV обязательно' });
    }

    const { columns, rows } = parseCsv(csvContent);
    if (columns.length === 0) {
      return res.status(400).json({ error: 'Пустой или невалидный CSV файл' });
    }

    if (clearExisting) {
      await runSql(`DELETE FROM "${tableName}"`);
    }

    let inserted = 0;
    for (const row of rows) {
      const rowCols = Object.keys(row);
      const rowVals = Object.values(row).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
      const placeholders = rowCols.map(() => '?').join(', ');
      const sql = `INSERT OR REPLACE INTO "${tableName}" (${rowCols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
      await runSql(sql, rowVals);
      inserted++;
    }

    const db = await getDb();
    saveDb(db);

    res.json({ success: true, count: inserted, importedCount: inserted, message: `Успешно импортировано ${inserted} записей в таблицу ${tableName}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// EXPORT ALL TABLES AS ZIP ARCHIVE (CSVs)
adminSystemRouter.get('/export/zip', async (_req, res) => {
  try {
    const rawTables = await getAll<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC"
    );

    const zip = new JSZip();

    for (const t of rawTables) {
      const rows = await getAll(`SELECT * FROM "${t.name}"`);
      const pragma = await getAll(`PRAGMA table_info("${t.name}")`);
      const columns = pragma.map((c: any) => c.name);
      const csv = arrayToCsv(rows, columns);
      zip.file(`${t.name}.csv`, csv);
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    const dateStr = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="qaiz_all_tables_${dateStr}.zip"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// EXPORT FULL DATABASE BACKUP AS JSON (both paths)
const exportJsonBackupHandler = async (_req: any, res: any) => {
  try {
    const rawTables = await getAll<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC"
    );

    const backupTables: Record<string, any[]> = {};
    for (const t of rawTables) {
      backupTables[t.name] = await getAll(`SELECT * FROM "${t.name}"`);
    }

    const backupPayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      tablesCount: rawTables.length,
      tables: backupTables
    };

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="qaiz_db_backup_${dateStr}.json"`);
    res.send(JSON.stringify(backupPayload, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

adminSystemRouter.get('/backup/json/export', exportJsonBackupHandler);
adminSystemRouter.get('/backup/json', exportJsonBackupHandler);

// RESTORE FULL DATABASE BACKUP FROM JSON (both paths)
const restoreJsonBackupHandler = async (req: any, res: any) => {
  try {
    const backupData = req.body.backupData || req.body;
    if (!backupData || typeof backupData !== 'object' || !backupData.tables) {
      return res.status(400).json({ error: 'Невалидный формат файла бэкапа JSON (требуется объект tables)' });
    }

    const tables = backupData.tables;
    let totalRestored = 0;

    for (const [tableName, rows] of Object.entries(tables)) {
      if (!Array.isArray(rows)) continue;

      // Check if table exists in DB
      const exists = await getOne(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`, [tableName]);
      if (!exists) continue;

      // Clear current rows
      await runSql(`DELETE FROM "${tableName}"`);

      // Insert backup rows
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const rowCols = Object.keys(row);
        const rowVals = Object.values(row).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
        const placeholders = rowCols.map(() => '?').join(', ');
        const sql = `INSERT OR REPLACE INTO "${tableName}" (${rowCols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
        await runSql(sql, rowVals);
        totalRestored++;
      }
    }

    const db = await getDb();
    saveDb(db);

    res.json({
      success: true,
      message: `База данных успешно восстановлена! Загружено ${totalRestored} записей в ${Object.keys(tables).length} таблиц.`,
      restoredCount: totalRestored
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

adminSystemRouter.post('/backup/json/restore', restoreJsonBackupHandler);
adminSystemRouter.post('/backup/restore', restoreJsonBackupHandler);

// TRIGGERS MANAGEMENT
adminSystemRouter.get('/triggers', async (_req, res) => {
  try {
    const triggers = await getAll("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger'");
    res.json({ triggers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const createTriggerHandler = async (req: any, res: any) => {
  try {
    const { sql } = req.body;
    if (!sql) return res.status(400).json({ error: 'SQL триггера обязателен' });

    await runSql(sql);
    const db = await getDb();
    saveDb(db);

    res.json({ success: true, message: 'Триггер успешно создан и сохранен в БД' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

adminSystemRouter.post('/triggers', createTriggerHandler);
adminSystemRouter.post('/triggers/create', createTriggerHandler);

adminSystemRouter.delete('/triggers/:name', async (req, res) => {
  try {
    const { name } = req.params;
    await runSql(`DROP TRIGGER IF EXISTS "${name}"`);
    const db = await getDb();
    saveDb(db);

    res.json({ success: true, message: `Триггер ${name} удален` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CRON JOBS MANAGEMENT
adminSystemRouter.get('/cron', async (_req, res) => {
  try {
    const jobs = await getAll('SELECT * FROM cron_jobs ORDER BY created_at DESC');
    const logs = await getAll('SELECT * FROM mailing_logs ORDER BY timestamp DESC LIMIT 50');
    res.json({ jobs, logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminSystemRouter.post('/cron', async (req, res) => {
  try {
    const { name, schedule, action_type } = req.body;
    if (!name || !schedule) {
      return res.status(400).json({ error: 'Название и расписание крон-задачи обязательны' });
    }

    const id = `cron_${Date.now()}`;
    await runSql(
      `INSERT INTO cron_jobs (id, name, schedule, last_run, next_run, status, action_type)
       VALUES (?, ?, ?, ?, ?, 'active', ?)`,
      [id, name, schedule, new Date().toISOString(), new Date(Date.now() + 3600000).toISOString(), action_type || 'custom']
    );

    const db = await getDb();
    saveDb(db);

    res.json({ success: true, message: `Крон-задача "${name}" успешно создана` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const runCronHandler = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const nowStr = new Date().toISOString();

    if (id === 'cron_backup' || String(id).includes('backup')) {
      await performDailyDatabaseBackup();
    }

    await runSql(
      `UPDATE cron_jobs SET last_run = ?, next_run = ? WHERE id = ?`,
      [nowStr, new Date(Date.now() + 86400000).toISOString(), id]
    );

    await runSql(
      `INSERT INTO mailing_logs (id, recipient_id, type, status, timestamp)
       VALUES (?, 'system_cron', ?, 'executed_manual', ?)`,
      [`log_${Date.now()}`, `cron_exec_${id}`, Date.now()]
    );

    const db = await getDb();
    saveDb(db);

    res.json({ success: true, message: `Крон-задача выполнена успешно (${nowStr})` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

adminSystemRouter.post('/cron/run/:id', runCronHandler);
adminSystemRouter.post('/cron/:id/run', runCronHandler);

adminSystemRouter.delete('/cron/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runSql(`DELETE FROM cron_jobs WHERE id = ?`, [id]);
    const db = await getDb();
    saveDb(db);

    res.json({ success: true, message: 'Крон-задача удалена' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminSystemRouter.post('/cron/backup', async (_req, res) => {
  try {
    await performDailyDatabaseBackup();
    res.json({ success: true, message: 'Бэкап базы данных успешно создан и сохранен в хранилище сервера' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// LOGS MANAGEMENT (both /logs and /api/admin/system/logs)
adminSystemRouter.get('/logs', async (_req, res) => {
  try {
    const logs = await getAll('SELECT * FROM logs ORDER BY created_at DESC LIMIT 200');
    res.json({ logs, data: logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message, logs: [] });
  }
});

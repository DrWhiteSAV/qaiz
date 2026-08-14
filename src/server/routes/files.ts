import { Router } from 'express';
import { getAll, getOne, runSql, generateId } from '../db';

export const filesRouter = Router();

// ==========================================
// DIRECT FILE ACCESS: /file/:file_id/:file_name & /file/:file_id
// ==========================================
export const directFileHandler = async (req: any, res: any) => {
  const { file_id } = req.params;
  try {
    const file = await getOne<any>(
      `SELECT * FROM file_storage WHERE id = ? OR file_key = ?`,
      [file_id, file_id]
    );

    if (!file || !file.original_url) {
      return res.status(404).send('File not found');
    }

    const url = file.original_url;

    // Handle Data URLs (base64)
    if (url.startsWith('data:')) {
      const matches = url.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(buffer);
      }
    }

    // Proxy HTTP/HTTPS URLs to avoid CORS and hotlink blocking in browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const fetchRes = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/*,*/*'
          }
        });

        if (fetchRes.ok) {
          const contentType = fetchRes.headers.get('content-type') || file.mime_type || 'image/png';
          const arrayBuffer = await fetchRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          return res.send(buffer);
        }
      } catch (proxyErr) {
        console.error(`Proxy fetch error for file ${file_id}:`, proxyErr);
      }
    }

    // Fallback redirect if proxying fails
    return res.redirect(302, url);
  } catch (err: any) {
    console.error('Error fetching file:', err);
    return res.status(500).send('Server Error');
  }
};

// ==========================================
// API ROUTES: /api/admin/files & /api/admin/folders
// ==========================================

// Get all files (with optional filter by folder_id, file_type, search)
filesRouter.get('/files', async (req, res) => {
  try {
    const { folder_id, file_type, search } = req.query;
    let sql = `SELECT f.*, fold.name as folder_name FROM file_storage f LEFT JOIN file_folders fold ON f.folder_id = fold.id WHERE 1=1`;
    const params: any[] = [];

    if (folder_id !== undefined && folder_id !== 'all' && folder_id !== '') {
      if (folder_id === 'root') {
        sql += ` AND (f.folder_id IS NULL OR f.folder_id = '')`;
      } else {
        sql += ` AND f.folder_id = ?`;
        params.push(folder_id);
      }
    }

    if (file_type && file_type !== 'all') {
      sql += ` AND f.file_type = ?`;
      params.push(file_type);
    }

    if (search) {
      sql += ` AND (f.name LIKE ? OR f.file_key LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY f.id DESC`;

    const files = await getAll(sql, params);
    res.json({ files });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create/Store new file record in DB
filesRouter.post('/files', async (req, res) => {
  try {
    const { file_key, name, folder_id, original_url, mime_type, file_type, size } = req.body;

    if (!name || !original_url) {
      return res.status(400).json({ error: 'Name and original_url are required' });
    }

    // Determine file_type if not provided
    let detectedType = file_type || 'other';
    if (!file_type && mime_type) {
      if (mime_type.startsWith('image/')) detectedType = 'image';
      else if (mime_type.startsWith('video/')) detectedType = 'video';
      else if (mime_type.startsWith('audio/')) detectedType = 'audio';
      else if (mime_type.includes('pdf') || mime_type.includes('doc') || mime_type.includes('text')) detectedType = 'document';
    } else if (!file_type && name) {
      const ext = name.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '')) detectedType = 'image';
      else if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext || '')) detectedType = 'video';
      else if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext || '')) detectedType = 'audio';
      else if (['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx'].includes(ext || '')) detectedType = 'document';
    }

    const key = file_key || Math.random().toString(36).substring(2, 10);

    await runSql(
      `INSERT INTO file_storage (file_key, name, folder_id, original_url, mime_type, file_type, size)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [key, name, folder_id || null, original_url, mime_type || 'application/octet-stream', detectedType, size || 0]
    );

    const inserted = await getOne<any>(`SELECT * FROM file_storage WHERE file_key = ? ORDER BY id DESC LIMIT 1`, [key]);

    res.json({ success: true, file: inserted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update file (rename or move to folder)
filesRouter.put('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, folder_id } = req.body;

    const current = await getOne<any>(`SELECT * FROM file_storage WHERE id = ?`, [id]);
    if (!current) return res.status(404).json({ error: 'File not found' });

    const newName = name !== undefined ? name : current.name;
    const newFolderId = folder_id !== undefined ? folder_id : current.folder_id;

    await runSql(
      `UPDATE file_storage SET name = ?, folder_id = ? WHERE id = ?`,
      [newName, newFolderId, id]
    );

    const updated = await getOne<any>(`SELECT * FROM file_storage WHERE id = ?`, [id]);
    res.json({ success: true, file: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete file record
filesRouter.delete('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runSql(`DELETE FROM file_storage WHERE id = ?`, [id]);
    res.json({ success: true, message: `Файл ${id} удален` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// FOLDERS API
// ==========================================

// Get all folders
filesRouter.get('/folders', async (req, res) => {
  try {
    const folders = await getAll(`SELECT * FROM file_folders ORDER BY name ASC`);
    res.json({ folders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create folder
filesRouter.post('/folders', async (req, res) => {
  try {
    const { name, parent_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const id = generateId('fld');
    await runSql(`INSERT INTO file_folders (id, name, parent_id) VALUES (?, ?, ?)`, [id, name, parent_id || null]);

    const folder = await getOne(`SELECT * FROM file_folders WHERE id = ?`, [id]);
    res.json({ success: true, folder });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete folder
filesRouter.delete('/folders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Unset folder_id on files in this folder
    await runSql(`UPDATE file_storage SET folder_id = NULL WHERE folder_id = ?`, [id]);
    await runSql(`DELETE FROM file_folders WHERE id = ?`, [id]);
    res.json({ success: true, message: `Папка ${id} удалена` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

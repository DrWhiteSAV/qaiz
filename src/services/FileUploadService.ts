// FileUploadService.ts

export const UPLOAD_URL = "https://file.pro-talk.ru/tgf";
export const FILESTORE_URL = "https://filestore.pro-talk.ru/up";
export const STORAGE_KEY = "protalk_upload_token";
export const FILES_MAP_KEY = "protalk_files_map";

export interface FileMap {
  [key: string]: string; // key -> full URL or direct URL
}

export interface StoredFileRecord {
  id: number;
  file_key: string;
  name: string;
  folder_id: string | null;
  folder_name?: string;
  original_url: string;
  direct_url: string;
  mime_type: string;
  file_type: 'image' | 'video' | 'audio' | 'document' | 'other';
  size: number;
  created_at: string;
}

export class FileUploadService {
  private token: string;

  constructor(token?: string) {
    this.token = token || this.getToken();
  }

  // Получение токена из настроек
  public getToken(): string {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return saved;
    }
    // Токен по умолчанию
    return "b2VcU3NrVVttYlh3GHM_AEQ4eA8yDR4FGREODwsaLyUqQjpTEA8HGzMdFB8aORQYaG9dWGpkVQRvAXM";
  }

  // Установка токена
  public setToken(token: string): void {
    this.token = token;
    localStorage.setItem(STORAGE_KEY, token);
  }

  // Загрузка по URL
  async uploadFromUrl(url: string): Promise<string> {
    const response = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: {
        "X-Upload-Token": this.token
      },
      body: new URLSearchParams({ url })
    });

    const data = await response.json();
    if (data.url) return data.url;
    if (data.file) return data.file;
    throw new Error(data.message || data.error || "Ошибка загрузки файла по URL");
  }

  // Загрузка из File (с поддержкой PNG прозрачности)
  async uploadFromFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {
      "X-Upload-Token": this.token
    };

    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

    // PNG alpha preservation
    if (isPng) {
      headers["X-Preserve-Alpha"] = "true";
    }

    // Try primary filestore url if image with alpha, or fallback to upload_url
    let endpoint = isPng ? FILESTORE_URL : UPLOAD_URL;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: formData
      });

      const data = await response.json();
      if (data.url) return data.url;
      if (data.file) return data.file;
      if (typeof data === 'string') return data;
      throw new Error("Не удалось получить URL файла");
    } catch (e) {
      // Fallback to secondary upload url if first failed
      if (endpoint === FILESTORE_URL) {
        const response = await fetch(UPLOAD_URL, {
          method: "POST",
          headers: {
            "X-Upload-Token": this.token,
            ...(isPng ? { "X-Preserve-Alpha": "true" } : {})
          },
          body: formData
        });
        const data = await response.json();
        if (data.url) return data.url;
        if (data.file) return data.file;
      }
      throw e;
    }
  }

  // Загрузка из Blob
  async uploadFromBlob(blob: Blob, filename: string): Promise<string> {
    const file = new File([blob], filename, { type: blob.type });
    return this.uploadFromFile(file);
  }

  // Загрузка из base64
  async uploadFromBase64(base64: string, filename: string): Promise<string> {
    const response = await fetch(base64);
    const blob = await response.blob();
    return this.uploadFromBlob(blob, filename);
  }

  // Получение карты файлов
  public getFileMap(): FileMap {
    const saved = localStorage.getItem(FILES_MAP_KEY);
    return saved ? JSON.parse(saved) : {};
  }

  // Сохранение карты файлов
  public saveFileMap(map: FileMap): void {
    localStorage.setItem(FILES_MAP_KEY, JSON.stringify(map));
  }

  // Добавление файла в карту
  public addFile(key: string, url: string): void {
    const map = this.getFileMap();
    map[key] = url;
    this.saveFileMap(map);
  }

  // Получение URL по ключу
  public getFileUrl(key: string): string | null {
    const map = this.getFileMap();
    return map[key] || null;
  }

  // Удаление файла из карты
  public removeFile(key: string): void {
    const map = this.getFileMap();
    delete map[key];
    this.saveFileMap(map);
  }

  // Получение всех файлов
  public getAllFiles(): FileMap {
    return this.getFileMap();
  }

  // Очистка карты
  public clearFiles(): void {
    localStorage.removeItem(FILES_MAP_KEY);
  }

  // Генерация уникального ключа
  public generateKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Загрузка, сохранение в карту и регистрация в базе данных SQLite (/api/admin/files)
  async uploadAndStore(
    file: File | string,
    folderId?: string | null,
    customKey?: string
  ): Promise<{ key: string; url: string; fileRecord?: StoredFileRecord; directUrl: string }> {
    let url: string;
    let fileName = 'file';
    let mimeType = 'application/octet-stream';
    let size = 0;

    if (typeof file === 'string') {
      // Это URL
      url = await this.uploadFromUrl(file);
      fileName = file.split('/').pop()?.split('?')[0] || 'url_file';
    } else {
      // Это File
      fileName = file.name;
      mimeType = file.type;
      size = file.size;
      url = await this.uploadFromFile(file);
    }

    const key = customKey || this.generateKey();
    this.addFile(key, url);

    // Register in server database
    let fileRecord: StoredFileRecord | undefined;
    let directUrl = url;

    try {
      const res = await fetch('/api/admin/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_key: key,
          name: fileName,
          folder_id: folderId || null,
          original_url: url,
          mime_type: mimeType,
          size: size
        })
      });

      const data = await res.json();
      if (data.file) {
        fileRecord = data.file;
        const origin = window.location.origin;
        directUrl = `${origin}/file/${data.file.id}/${encodeURIComponent(fileName)}`;
        this.addFile(key, directUrl);
      }
    } catch (err) {
      console.warn('Could not register file in DB:', err);
    }

    return { key, url, directUrl, fileRecord };
  }

  // Замена ключей на URL в тексте {{key}} -> URL
  replaceKeysWithUrls(text: string): string {
    const map = this.getFileMap();
    let result = text;

    for (const [key, url] of Object.entries(map)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), url);
    }

    return result;
  }

  // Замена URL на ключи в тексте URL -> {{key}}
  replaceUrlsWithKeys(text: string): string {
    const map = this.getFileMap();
    let result = text;

    for (const [key, url] of Object.entries(map)) {
      result = result.replace(new RegExp(url, 'g'), `{{${key}}}`);
    }

    return result;
  }
}

// Синглтон
let uploadService: FileUploadService | null = null;

export function getUploadService(): FileUploadService {
  if (!uploadService) {
    uploadService = new FileUploadService();
  }
  return uploadService;
}

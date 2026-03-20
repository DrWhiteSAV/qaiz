/**
 * Service for interacting with a Telegram Bot to upload files and get direct links.
 * Requires a bot token and a chat ID where files will be uploaded.
 */

const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

export const telegramBotService = {
  /**
   * Uploads a file to Telegram and returns the direct link to it.
   * Note: Telegram doesn't provide direct links easily, so we usually 
   * use a proxy or a specific bot that returns the link.
   */
  uploadFile: async (file: File): Promise<string> => {
    if (!BOT_TOKEN || !CHAT_ID) {
      console.warn('Telegram Bot Token or Chat ID not configured. Using placeholder.');
      return URL.createObjectURL(file);
    }

    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('document', file);

    try {
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.ok) {
        // To get a direct link, we'd need to use getFile and then 
        // https://api.telegram.org/file/bot<token>/<file_path>
        const fileId = data.result.document.file_id;
        return await telegramBotService.getFileLink(fileId);
      } else {
        throw new Error(data.description);
      }
    } catch (error) {
      console.error('Telegram upload failed:', error);
      throw error;
    }
  },

  getFileLink: async (fileId: string): Promise<string> => {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const data = await response.json();
    if (data.ok) {
      return `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;
    }
    throw new Error('Failed to get file link');
  }
};

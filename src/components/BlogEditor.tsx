import React, { useState, useRef } from 'react';
import Markdown from 'react-markdown';
import { 
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, 
  Link2, Image, Eye, Edit3, Upload, Loader2, Sparkles, Check, 
  Copy, RefreshCw, Trash2, Calendar, Globe, Send, FileText, ArrowRight
} from 'lucide-react';
import { FileUploadService } from '../services/FileUploadService';

interface BlogEditorProps {
  postForm: {
    title: string;
    content: string;
    image_url: string;
    platforms: string;
    scheduled_at: string;
  };
  setPostForm: React.Dispatch<React.SetStateAction<{
    title: string;
    content: string;
    image_url: string;
    platforms: string;
    scheduled_at: string;
  }>>;
  onSave: () => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

export const BlogEditor: React.FC<BlogEditorProps> = ({
  postForm,
  setPostForm,
  onSave,
  onCancel,
  isEditing = false
}) => {
  const [activeMode, setActiveMode] = useState<'write' | 'preview' | 'split'>('split');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<string | null>(null);
  const [selectedFileForUpload, setSelectedFileForUpload] = useState<File | null>(null);
  const [directImageUrl, setDirectImageUrl] = useState('');
  const [showImageDialog, setShowImageDialog] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadService = new FileUploadService();

  // Helper to insert markdown format at cursor
  const insertMarkdown = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = postForm.content;
    const selected = currentText.substring(start, end) || defaultText;

    const replacement = `${before}${selected}${after}`;
    const newContent = currentText.substring(0, start) + replacement + currentText.substring(end);

    setPostForm(prev => ({ ...prev, content: newContent }));

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selected.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  // Upload image via ProTalk API
  const handleUploadImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setImageUploadProgress('Загрузка в ProTalk CDN...');
      const uploadedUrl = await uploadService.uploadFromFile(file);

      // If no cover image yet, set as main cover
      if (!postForm.image_url) {
        setPostForm(prev => ({ ...prev, image_url: uploadedUrl }));
      }

      // Also insert into markdown at cursor
      insertMarkdown(`\n![${file.name.replace(/\.[^/.]+$/, '')}](${uploadedUrl})\n`, '', '');
      setImageUploadProgress('Файл успешно загружен!');
      setTimeout(() => setImageUploadProgress(null), 3000);
    } catch (err: any) {
      alert(`Ошибка загрузки изображения через ProTalk: ${err.message}`);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Upload cover image separately
  const handleSetCoverFromUrl = (url: string) => {
    if (!url.trim()) return;
    setPostForm(prev => ({ ...prev, image_url: url.trim() }));
    setShowImageDialog(false);
    setDirectImageUrl('');
  };

  return (
    <div className="space-y-4">
      {/* Editor Container with Apple Liquid Glass styling */}
      <div className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {isEditing ? 'Редактирование статьи' : 'Новая публикация в блог'}
              </h3>
              <p className="text-xs text-foreground/60">Markdown редактор с поддержкой ProTalk CDN</p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setActiveMode('write')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeMode === 'write'
                  ? 'bg-primary text-background font-bold shadow'
                  : 'text-foreground/70 hover:text-foreground hover:bg-white/5'
              }`}
            >
              <Edit3 size={13} />
              <span>Редактор</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('split')}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeMode === 'split'
                  ? 'bg-primary text-background font-bold shadow'
                  : 'text-foreground/70 hover:text-foreground hover:bg-white/5'
              }`}
            >
              <FileText size={13} />
              <span>Сплит</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeMode === 'preview'
                  ? 'bg-primary text-background font-bold shadow'
                  : 'text-foreground/70 hover:text-foreground hover:bg-white/5'
              }`}
            >
              <Eye size={13} />
              <span>Превью</span>
            </button>
          </div>
        </div>

        {/* Title Input */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground/70">Заголовок публикации</label>
          <input
            type="text"
            value={postForm.title}
            onChange={(e) => setPostForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Введите заголовок статьи..."
            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-base font-bold text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary transition-all"
          />
        </div>

        {/* Cover Image & ProTalk Uploader */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground/70">Обложка статьи (ProTalk CDN)</label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadImageFile}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-xs font-bold transition-all disabled:opacity-50"
              >
                {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                <span>Загрузить через ProTalk</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={postForm.image_url}
              onChange={(e) => setPostForm(prev => ({ ...prev, image_url: e.target.value }))}
              placeholder="https://file.pro-talk.ru/tgf/... или прямая ссылка"
              className="flex-1 p-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-mono text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary"
            />
            {postForm.image_url && (
              <button
                type="button"
                onClick={() => setPostForm(prev => ({ ...prev, image_url: '' }))}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-rose-500/20 text-rose-400 transition-all"
                title="Очистить обложку"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {imageUploadProgress && (
            <div className="flex items-center gap-2 text-xs text-primary font-medium animate-pulse">
              <Check size={14} />
              <span>{imageUploadProgress}</span>
            </div>
          )}

          {postForm.image_url && (
            <div className="relative rounded-xl overflow-hidden border border-white/10 max-h-48 bg-black/40">
              <img
                src={postForm.image_url}
                alt="Предпросмотр обложки"
                className="w-full h-48 object-cover"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/70 text-white backdrop-blur-md">
                Превью обложки
              </span>
            </div>
          )}
        </div>

        {/* Markdown Toolbar */}
        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/5 border border-white/10 flex-wrap">
          <button
            type="button"
            onClick={() => insertMarkdown('**', '**', 'жирный текст')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-foreground/80 hover:text-primary transition-all"
            title="Жирный шрифт"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('*', '*', 'курсив')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-foreground/80 hover:text-primary transition-all"
            title="Курсив"
          >
            <Italic size={15} />
          </button>
          <div className="w-[1px] h-4 bg-white/10 mx-1" />
          <button
            type="button"
            onClick={() => insertMarkdown('# ', '', 'Заголовок 1')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-foreground/80 hover:text-primary transition-all"
            title="Заголовок 1"
          >
            <Heading1 size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('## ', '', 'Заголовок 2')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-foreground/80 hover:text-primary transition-all"
            title="Заголовок 2"
          >
            <Heading2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('### ', '', 'Заголовок 3')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-foreground/80 hover:text-primary transition-all"
            title="Заголовок 3"
          >
            <Heading3 size={15} />
          </button>
          <div className="w-[1px] h-4 bg-white/10 mx-1" />
          <button
            type="button"
            onClick={() => insertMarkdown('- ', '', 'Элемент списка')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-foreground/80 hover:text-primary transition-all"
            title="Маркированный список"
          >
            <List size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('1. ', '', 'Нумерованный элемент')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-foreground/80 hover:text-primary transition-all"
            title="Нумерованный список"
          >
            <ListOrdered size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('> ', '', 'Цитата')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-foreground/80 hover:text-primary transition-all"
            title="Цитата"
          >
            <span className="font-serif font-bold text-xs">“ ”</span>
          </button>
          <div className="w-[1px] h-4 bg-white/10 mx-1" />
          <button
            type="button"
            onClick={() => insertMarkdown('[', '](https://example.com)', 'текст ссылки')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-foreground/80 hover:text-primary transition-all"
            title="Вставить ссылку"
          >
            <Link2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg hover:bg-white/10 text-foreground/80 hover:text-primary transition-all"
            title="Вставить картинку из ProTalk"
          >
            <Image size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('`', '`', 'код')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-foreground/80 hover:text-primary transition-all"
            title="Код"
          >
            <span className="font-mono text-xs font-bold">&lt;/&gt;</span>
          </button>
        </div>

        {/* Content Body Editor & Preview */}
        <div className={`grid gap-4 ${activeMode === 'split' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Write Pane */}
          {(activeMode === 'write' || activeMode === 'split') && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/60 flex items-center justify-between">
                <span>Текст (Markdown)</span>
                <span>{postForm.content.length} символов</span>
              </label>
              <textarea
                ref={textareaRef}
                value={postForm.content}
                onChange={(e) => setPostForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Пишите статью используя Markdown разметку...&#10;&#10;## Подзаголовок&#10;Ваш текст здесь...&#10;&#10;- Пункт 1&#10;- Пункт 2"
                className="w-full min-h-[340px] max-h-[600px] p-4 rounded-xl bg-black/40 border border-white/10 text-sm font-mono text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary transition-all resize-y custom-scrollbar"
              />
            </div>
          )}

          {/* Preview Pane */}
          {(activeMode === 'preview' || activeMode === 'split') && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/60">Живое превью</label>
              <div className="min-h-[340px] max-h-[600px] p-5 rounded-xl bg-white/5 border border-white/10 overflow-y-auto custom-scrollbar prose prose-invert max-w-none">
                {postForm.title && (
                  <h1 className="text-2xl font-bold text-foreground pb-2 border-b border-white/10 mb-4">
                    {postForm.title}
                  </h1>
                )}
                {postForm.content ? (
                  <div className="space-y-3 text-base text-foreground/85 leading-relaxed">
                    <Markdown>{postForm.content}</Markdown>
                  </div>
                ) : (
                  <p className="text-sm text-foreground/30 italic">Здесь отобразится форматированный текст статьи...</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-white/10 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Платформа: {postForm.platforms || 'Приложение'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onCancel && isEditing && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold text-foreground/70"
              >
                Отмена
              </button>
            )}
            <button
              type="button"
              onClick={onSave}
              disabled={!postForm.title.trim() || !postForm.content.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-background font-bold text-sm shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send size={15} />
              <span>{isEditing ? 'Сохранить изменения' : 'Опубликовать статью'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

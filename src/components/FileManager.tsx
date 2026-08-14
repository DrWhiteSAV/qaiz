import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderPlus, Upload, Link as LinkIcon, Search, Grid, List, Trash2, 
  Copy, Check, FileText, Image as ImageIcon, Film, Music, File, 
  Eye, Folder, Key, RefreshCw, X, FolderOpen, ExternalLink, Settings,
  Play, Pause, ArrowRightLeft, ShieldCheck, Download, Edit
} from 'lucide-react';
import { useFileUpload } from '../hooks/useFileUpload';
import { getUploadService, StoredFileRecord } from '../services/FileUploadService';

interface FolderRecord {
  id: string;
  name: string;
  parent_id?: string | null;
  created_at?: string;
}

export const FileManager: React.FC = () => {
  const { upload, uploading, error: uploadError } = useFileUpload();
  const fileService = getUploadService();

  // State
  const [files, setFiles] = useState<StoredFileRecord[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & View
  const [selectedFolder, setSelectedFolder] = useState<string>('all'); // 'all', 'root', or folder_id
  const [activeFileType, setActiveFileType] = useState<'all' | 'image' | 'video' | 'audio' | 'document'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals & UI states
  const [showUrlUploadModal, setShowUrlUploadModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [targetFolderForUrl, setTargetFolderForUrl] = useState<string>('');

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenInput, setTokenInput] = useState(fileService.getToken());

  const [previewFile, setPreviewFile] = useState<StoredFileRecord | null>(null);
  const [moveFileTarget, setMoveFileTarget] = useState<StoredFileRecord | null>(null);
  const [newFolderForMove, setNewFolderForMove] = useState<string>('');

  // Rename File State
  const [renameFileTarget, setRenameFileTarget] = useState<StoredFileRecord | null>(null);
  const [renameFileName, setRenameFileName] = useState('');

  // Delete Confirmation Modal State
  const [deleteModalTarget, setDeleteModalTarget] = useState<{
    type: 'file' | 'folder';
    id: number | string;
    name: string;
  } | null>(null);

  // Audio playing state
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFolders();
    fetchFiles();
  }, [selectedFolder, activeFileType]);

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/admin/folders');
      const data = await res.json();
      if (data.folders) setFolders(data.folders);
    } catch (err) {
      console.error('Error fetching folders:', err);
    }
  };

  const fetchFiles = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/files?folder_id=${selectedFolder}&file_type=${activeFileType}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles();
  };

  // Upload files handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const targetFolder = selectedFolder !== 'all' && selectedFolder !== 'root' ? selectedFolder : null;

    let successCount = 0;
    for (const f of Array.from(selectedFiles)) {
      try {
        await upload(f, targetFolder);
        successCount++;
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: `Ошибка при загрузке файла ${f.name}: ${err.message}` });
      }
    }

    if (successCount > 0) {
      setStatusMessage({ type: 'success', text: `Успешно загружено файлов: ${successCount}` });
      fetchFiles();
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Upload by URL handler
  const handleUploadUrl = async () => {
    if (!urlInput.trim()) return;
    try {
      const targetFolder = targetFolderForUrl || (selectedFolder !== 'all' && selectedFolder !== 'root' ? selectedFolder : null);
      await upload(urlInput.trim(), targetFolder);
      setStatusMessage({ type: 'success', text: 'Файл успешно загружен по URL' });
      setShowUrlUploadModal(false);
      setUrlInput('');
      fetchFiles();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Ошибка загрузки по URL: ${err.message}` });
    }
  };

  // Create Folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch('/api/admin/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: `Папка "${newFolderName}" создана` });
        setNewFolderName('');
        setShowFolderModal(false);
        fetchFolders();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Ошибка создания папки' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  // Open Delete Modal for Folder
  const promptDeleteFolder = (folderId: string, folderName: string) => {
    setDeleteModalTarget({ type: 'folder', id: folderId, name: folderName });
  };

  // Open Delete Modal for File
  const promptDeleteFile = (fileId: number, fileName: string) => {
    setDeleteModalTarget({ type: 'file', id: fileId, name: fileName });
  };

  // Confirm Delete Handler (calls API)
  const confirmDelete = async () => {
    if (!deleteModalTarget) return;

    if (deleteModalTarget.type === 'file') {
      try {
        const res = await fetch(`/api/admin/files/${deleteModalTarget.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          setStatusMessage({ type: 'success', text: `Файл "${deleteModalTarget.name}" удален` });
          fetchFiles();
          if (previewFile?.id === Number(deleteModalTarget.id)) setPreviewFile(null);
        }
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: err.message });
      }
    } else if (deleteModalTarget.type === 'folder') {
      try {
        const res = await fetch(`/api/admin/folders/${deleteModalTarget.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          setStatusMessage({ type: 'success', text: `Папка "${deleteModalTarget.name}" удалена` });
          if (selectedFolder === String(deleteModalTarget.id)) setSelectedFolder('all');
          fetchFolders();
          fetchFiles();
        }
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: err.message });
      }
    }

    setDeleteModalTarget(null);
  };

  // Open Rename Modal for File
  const promptRenameFile = (file: StoredFileRecord) => {
    setRenameFileTarget(file);
    setRenameFileName(file.name);
  };

  // Handle Rename File
  const handleRenameFile = async () => {
    if (!renameFileTarget || !renameFileName.trim()) return;
    try {
      const res = await fetch(`/api/admin/files/${renameFileTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: renameFileName.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: `Файл переименован в "${renameFileName.trim()}"` });
        setRenameFileTarget(null);
        fetchFiles();
        if (previewFile?.id === renameFileTarget.id) {
          setPreviewFile(prev => prev ? { ...prev, name: renameFileName.trim() } : null);
        }
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Ошибка переименования' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  // Move File
  const handleMoveFile = async () => {
    if (!moveFileTarget) return;
    try {
      const res = await fetch(`/api/admin/files/${moveFileTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder_id: newFolderForMove === 'root' || newFolderForMove === '' ? null : newFolderForMove
        })
      });
      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Файл "${moveFileTarget.name}" перемещен` });
        setMoveFileTarget(null);
        fetchFiles();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  // Save Token
  const handleSaveToken = () => {
    if (!tokenInput.trim()) return;
    fileService.setToken(tokenInput.trim());
    setStatusMessage({ type: 'success', text: 'Токен ProTalk успешно сохранен' });
    setShowTokenModal(false);
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Get Direct URL
  const getDirectUrl = (file: StoredFileRecord) => {
    const origin = window.location.origin;
    return `${origin}/file/${file.id}/${encodeURIComponent(file.name)}`;
  };

  // Format Bytes
  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Audio Play toggle
  const togglePlayAudio = (file: StoredFileRecord) => {
    if (playingAudioId === file.id) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const url = getDirectUrl(file);
      const audio = new Audio(url);
      audio.play();
      audioRef.current = audio;
      setPlayingAudioId(file.id);
      audio.onended = () => setPlayingAudioId(null);
    }
  };

  // Helper file icon
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image': return <ImageIcon className="w-5 h-5 text-emerald-400" />;
      case 'video': return <Film className="w-5 h-5 text-purple-400" />;
      case 'audio': return <Music className="w-5 h-5 text-amber-400" />;
      case 'document': return <FileText className="w-5 h-5 text-blue-400" />;
      default: return <File className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER CONTROLS & ACTIONS */}
      <div className="bg-card/85 backdrop-blur-md p-6 rounded-2xl border border-primary/30 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl border border-primary/20">
              <FolderOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
                Облако файлов & Галерея ProTalk
              </h1>
              <p className="text-xs text-foreground/70">
                Прямые ссылки <code className="text-primary font-mono font-bold bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">/file/123456/filename.png</code> для контента, ИИ-промптов и медиа
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Upload File Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl transition hover:opacity-90 flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Загрузка...' : 'Загрузить файл'}
            </button>

            {/* Upload by URL */}
            <button
              onClick={() => setShowUrlUploadModal(true)}
              className="px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs uppercase tracking-wider rounded-xl border border-primary/30 transition flex items-center gap-2"
            >
              <LinkIcon className="w-4 h-4" />
              По URL
            </button>

            {/* Create Folder */}
            <button
              onClick={() => setShowFolderModal(true)}
              className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 border border-border/40"
            >
              <FolderPlus className="w-4 h-4" />
              Папка
            </button>

            {/* ProTalk Token Config */}
            <button
              onClick={() => setShowTokenModal(true)}
              className="p-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-xl transition border border-border/40"
              title="Настройки токена ProTalk"
            >
              <Key className="w-4 h-4" />
            </button>

            {/* Refresh */}
            <button
              onClick={() => { fetchFolders(); fetchFiles(); }}
              className="p-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-xl transition border border-border/40"
              title="Обновить список"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STATUS ALERT */}
        {statusMessage && (
          <div className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between ${
            statusMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
          }`}>
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)}>
              <X className="w-4 h-4 opacity-70 hover:opacity-100" />
            </button>
          </div>
        )}

        {/* SEARCH & FILTERS BAR */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-primary/20">
          
          {/* Search bar */}
          <form onSubmit={handleSearch} className="md:col-span-5 flex items-center gap-2">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
              <input
                type="text"
                placeholder="Поиск по названию или ключу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-background/80 border border-primary/30 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>
            <button type="submit" className="px-3 py-2 bg-primary/10 text-primary font-bold text-xs rounded-xl hover:bg-primary/20 border border-primary/20">
              Найти
            </button>
          </form>

          {/* Type Tabs */}
          <div className="md:col-span-5 flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'Все', icon: File },
              { id: 'image', label: 'Картинки', icon: ImageIcon },
              { id: 'video', label: 'Видео', icon: Film },
              { id: 'audio', label: 'Аудио', icon: Music },
              { id: 'document', label: 'Документы', icon: FileText },
            ].map((t) => {
              const IconComp = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveFileType(t.id as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                    activeFileType === t.id
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-background/60 hover:bg-muted text-foreground/70 border border-primary/15'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* View mode toggle */}
          <div className="md:col-span-2 flex items-center justify-end gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl border transition ${
                viewMode === 'grid' ? 'bg-primary/20 border-primary text-primary' : 'bg-background/60 border-primary/20 text-foreground/60 hover:text-foreground'
              }`}
              title="Сетка"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl border transition ${
                viewMode === 'list' ? 'bg-primary/20 border-primary text-primary' : 'bg-background/60 border-primary/20 text-foreground/60 hover:text-foreground'
              }`}
              title="Список"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER: FOLDERS SIDEBAR + FILE GALLERY */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* FOLDERS SIDEBAR */}
        <div className="lg:col-span-1 bg-card/85 backdrop-blur-md rounded-2xl border border-primary/30 p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-primary/20 pb-2">
            <h3 className="text-xs uppercase font-extrabold text-foreground/60 tracking-wider flex items-center gap-2">
              <Folder className="w-4 h-4 text-primary" />
              Папки хранилища
            </h3>
            <button
              onClick={() => setShowFolderModal(true)}
              className="p-1 hover:bg-primary/10 rounded text-primary transition"
              title="Создать папку"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setSelectedFolder('all')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                selectedFolder === 'all'
                  ? 'bg-primary/15 text-primary border border-primary/30 font-extrabold'
                  : 'hover:bg-muted text-foreground/80'
              }`}
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-400" />
                Все файлы
              </span>
            </button>

            <button
              onClick={() => setSelectedFolder('root')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                selectedFolder === 'root'
                  ? 'bg-primary/15 text-primary border border-primary/30 font-extrabold'
                  : 'hover:bg-muted text-foreground/80'
              }`}
            >
              <span className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-gray-400" />
                Без папки (Корень)
              </span>
            </button>

            {folders.map((f) => (
              <div key={f.id} className="group flex items-center justify-between">
                <button
                  onClick={() => setSelectedFolder(f.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                    selectedFolder === f.id
                      ? 'bg-primary/15 text-primary border border-primary/30 font-extrabold'
                      : 'hover:bg-muted text-foreground/80'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Folder className="w-4 h-4 text-primary" />
                    <span className="truncate">{f.name}</span>
                  </span>
                </button>
                <button
                  onClick={() => promptDeleteFolder(f.id, f.name)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-500 rounded transition ml-1"
                  title="Удалить папку"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* FILE GALLERY CONTENT */}
        <div className="lg:col-span-3 bg-card/85 backdrop-blur-md rounded-2xl border border-primary/30 p-5 space-y-4 shadow-xl">
          
          <div className="flex items-center justify-between border-b border-primary/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground/60 uppercase">Раздел:</span>
              <span className="text-sm font-black text-primary font-mono">
                {selectedFolder === 'all' ? 'Все файлы' : selectedFolder === 'root' ? 'Корень' : (folders.find(f => f.id === selectedFolder)?.name || selectedFolder)}
              </span>
              <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                {files.length} шт.
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-foreground/60 text-sm animate-pulse">
              Загрузка файлов из базы данных...
            </div>
          ) : files.length === 0 ? (
            <div className="p-12 text-center text-foreground/50 text-sm space-y-3">
              <p>В этом разделе пока нет файлов</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl border border-primary/20 transition"
              >
                Загрузить первый файл
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW GALLERY */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {files.map((file) => {
                const directUrl = getDirectUrl(file);
                const isPlaying = playingAudioId === file.id;

                return (
                  <div
                    key={file.id}
                    className="bg-background/70 border border-primary/25 rounded-2xl p-3 flex flex-col justify-between space-y-3 hover:border-primary transition group shadow-md backdrop-blur-md relative overflow-hidden"
                  >
                    {/* ID & Folder Badge */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-foreground/60">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20 font-extrabold">
                        ID: {file.id}
                      </span>
                      {file.folder_name && (
                        <span className="bg-muted px-2 py-0.5 rounded-md truncate max-w-[100px] text-foreground/80">
                          {file.folder_name}
                        </span>
                      )}
                    </div>

                    {/* PREVIEW CONTAINER */}
                    <div
                      onClick={() => setPreviewFile(file)}
                      className="aspect-video w-full rounded-xl bg-black/30 border border-primary/20 flex items-center justify-center overflow-hidden cursor-pointer relative group-hover:scale-[1.01] transition"
                      style={
                        file.file_type === 'image'
                          ? {
                              backgroundImage: 'repeating-conic-gradient(rgba(255, 255, 255, 0.12) 0% 25%, rgba(0, 0, 0, 0.25) 0% 50%)',
                              backgroundSize: '16px 16px'
                            }
                          : undefined
                      }
                    >
                      {file.file_type === 'image' ? (
                        <img
                          src={directUrl}
                          alt={file.name}
                          className="max-h-full max-w-full object-contain rounded-lg p-1 drop-shadow-md"
                          onError={(e) => {
                            // Fallback to original_url if direct fails
                            (e.target as HTMLImageElement).src = file.original_url;
                          }}
                        />
                      ) : file.file_type === 'video' ? (
                        <div className="flex flex-col items-center justify-center gap-1 text-purple-400">
                          <Film className="w-8 h-8" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">Видео</span>
                        </div>
                      ) : file.file_type === 'audio' ? (
                        <div className="flex flex-col items-center justify-center gap-2 text-amber-400">
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePlayAudio(file); }}
                            className="p-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-full transition"
                          >
                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                          </button>
                          <span className="text-[10px] uppercase font-bold tracking-wider">Аудио трек</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1 text-blue-400">
                          <FileText className="w-8 h-8" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">
                            {file.name.split('.').pop() || 'Документ'}
                          </span>
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <span className="px-3 py-1 bg-primary text-primary-foreground font-black text-[11px] uppercase rounded-lg shadow-lg">
                          Предпросмотр
                        </span>
                      </div>
                    </div>

                    {/* FILE DETAILS */}
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground truncate" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center justify-between text-[10px] font-mono text-foreground/50">
                        <span>{formatSize(file.size)}</span>
                        <span>{file.file_key}</span>
                      </div>
                    </div>

                    {/* ACTIONS BAR */}
                    <div className="pt-2 border-t border-primary/15 flex items-center justify-between gap-1">
                      {/* Copy Direct URL */}
                      <button
                        onClick={() => copyToClipboard(directUrl, `direct_${file.id}`)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                          copiedId === `direct_${file.id}` ? 'bg-emerald-500 text-white' : 'bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30'
                        }`}
                        title="Скопировать прямую ссылку /file/123456/name"
                      >
                        {copiedId === `direct_${file.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>Ссылка</span>
                      </button>

                      {/* Rename File */}
                      <button
                        onClick={() => promptRenameFile(file)}
                        className="p-1.5 bg-muted hover:bg-muted/80 text-foreground/80 rounded-lg transition"
                        title="Переименовать файл"
                      >
                        <Edit className="w-3.5 h-3.5 text-primary" />
                      </button>

                      {/* Move Folder */}
                      <button
                        onClick={() => { setMoveFileTarget(file); setNewFolderForMove(file.folder_id || 'root'); }}
                        className="p-1.5 bg-muted hover:bg-muted/80 text-foreground/80 rounded-lg transition"
                        title="Переместить в папку"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>

                      {/* Open Direct in new tab */}
                      <a
                        href={directUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-muted hover:bg-muted/80 text-foreground/80 rounded-lg transition"
                        title="Открыть файл"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {/* Delete */}
                      <button
                        onClick={() => promptDeleteFile(file.id, file.name)}
                        className="p-1.5 text-red-400 hover:bg-red-500/15 rounded-lg transition"
                        title="Удалить файл"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW GALLERY */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-primary/20 bg-background/50 font-bold text-primary uppercase text-[11px] tracking-wider">
                    <th className="p-3">ID</th>
                    <th className="p-3">Тип</th>
                    <th className="p-3">Название</th>
                    <th className="p-3">Папка</th>
                    <th className="p-3">Размер</th>
                    <th className="p-3">Ключ</th>
                    <th className="p-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/15">
                  {files.map((file) => {
                    const directUrl = getDirectUrl(file);
                    return (
                      <tr key={file.id} className="hover:bg-primary/10 transition font-mono">
                        <td className="p-3 font-bold text-primary">#{file.id}</td>
                        <td className="p-3">{getFileIcon(file.file_type)}</td>
                        <td className="p-3 font-sans font-semibold text-foreground max-w-[200px] truncate" title={file.name}>
                          {file.name}
                        </td>
                        <td className="p-3 text-foreground/70">{file.folder_name || '—'}</td>
                        <td className="p-3 text-foreground/60">{formatSize(file.size)}</td>
                        <td className="p-3 text-foreground/60">{file.file_key}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPreviewFile(file)}
                              className="p-1.5 text-blue-400 hover:bg-blue-500/15 rounded-lg transition"
                              title="Предпросмотр"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => copyToClipboard(directUrl, `direct_list_${file.id}`)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition flex items-center gap-1 ${
                                copiedId === `direct_list_${file.id}` ? 'bg-emerald-500 text-white' : 'bg-primary/15 text-primary border border-primary/30'
                              }`}
                              title="Скопировать ссылку /file/123456/name"
                            >
                              {copiedId === `direct_list_${file.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              <span>Копировать</span>
                            </button>
                            <button
                              onClick={() => promptRenameFile(file)}
                              className="p-1.5 text-primary hover:bg-primary/15 rounded-lg transition"
                              title="Переименовать"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setMoveFileTarget(file); setNewFolderForMove(file.folder_id || 'root'); }}
                              className="p-1.5 text-foreground/70 hover:bg-muted rounded-lg transition"
                              title="Переместить"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => promptDeleteFile(file.id, file.name)}
                              className="p-1.5 text-red-400 hover:bg-red-500/15 rounded-lg transition"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>

      {/* MODAL 1: UPLOAD BY URL */}
      {showUrlUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card/95 border border-primary/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-primary/20 pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-primary" />
                Загрузка файла по URL
              </h3>
              <button onClick={() => setShowUrlUploadModal(false)}>
                <X className="w-4 h-4 opacity-70 hover:opacity-100" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-foreground/70">URL файла</label>
                <input
                  type="url"
                  placeholder="https://example.com/image.png"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-background/80 border border-primary/30 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-foreground/70">Целевая папка</label>
                <select
                  value={targetFolderForUrl}
                  onChange={(e) => setTargetFolderForUrl(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-background/80 border border-primary/30 rounded-xl text-xs font-mono text-foreground focus:outline-none"
                >
                  <option value="">Без папки (Корень)</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowUrlUploadModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-primary/20 hover:bg-primary/10 text-foreground"
              >
                Отмена
              </button>
              <button
                onClick={handleUploadUrl}
                disabled={uploading || !urlInput.trim()}
                className="px-5 py-2 bg-primary text-primary-foreground font-black text-xs uppercase rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {uploading ? 'Загрузка...' : 'Загрузить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE FOLDER */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card/95 border border-primary/40 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-primary/20 pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-primary" />
                Новая папка
              </h3>
              <button onClick={() => setShowFolderModal(false)}>
                <X className="w-4 h-4 opacity-70 hover:opacity-100" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-foreground/70">Название папки</label>
              <input
                type="text"
                placeholder="например: Вопросы квиза"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-background/80 border border-primary/30 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowFolderModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-primary/20 hover:bg-primary/10 text-foreground"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-5 py-2 bg-primary text-primary-foreground font-black text-xs uppercase rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MOVE FILE TO FOLDER */}
      {moveFileTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card/95 border border-primary/40 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-primary/20 pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
                Перемещение файла
              </h3>
              <button onClick={() => setMoveFileTarget(null)}>
                <X className="w-4 h-4 opacity-70 hover:opacity-100" />
              </button>
            </div>

            <p className="text-xs text-foreground/80 truncate">
              Файл: <strong className="text-primary font-mono">{moveFileTarget.name}</strong>
            </p>

            <div>
              <label className="text-xs font-bold uppercase text-foreground/70">Выберите папку</label>
              <select
                value={newFolderForMove}
                onChange={(e) => setNewFolderForMove(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-background/80 border border-primary/30 rounded-xl text-xs font-mono text-foreground focus:outline-none"
              >
                <option value="root">Без папки (Корень)</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setMoveFileTarget(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-primary/20 hover:bg-primary/10 text-foreground"
              >
                Отмена
              </button>
              <button
                onClick={handleMoveFile}
                className="px-5 py-2 bg-primary text-primary-foreground font-black text-xs uppercase rounded-xl hover:opacity-90"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PROTALK TOKEN SETTINGS */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card/95 border border-primary/40 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-primary/20 pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                Токен авторизации ProTalk
              </h3>
              <button onClick={() => setShowTokenModal(false)}>
                <X className="w-4 h-4 opacity-70 hover:opacity-100" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-foreground/70">
                Задайте свой токен авторизации для сервиса <code className="font-mono text-primary bg-primary/10 px-1 rounded">file.pro-talk.ru</code>. Токен будет сохранен в localStorage вашего браузера.
              </p>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full px-3 py-2 bg-background/80 border border-primary/30 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowTokenModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-primary/20 hover:bg-primary/10 text-foreground"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveToken}
                className="px-5 py-2 bg-primary text-primary-foreground font-black text-xs uppercase rounded-xl hover:opacity-90"
              >
                Сохранить токен
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: FULL PREVIEW & DETAIL */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card/95 border border-primary/40 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-primary/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  ID: {previewFile.id}
                </span>
                <h3 className="font-bold text-base text-foreground truncate max-w-md">
                  {previewFile.name}
                </h3>
              </div>
              <button onClick={() => setPreviewFile(null)} className="p-1 rounded hover:bg-muted text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PREVIEW CONTENT */}
            <div
              className="bg-black/30 rounded-xl p-4 flex items-center justify-center border border-primary/20 min-h-[240px] relative overflow-hidden"
              style={
                previewFile.file_type === 'image'
                  ? {
                      backgroundImage: 'repeating-conic-gradient(rgba(255, 255, 255, 0.12) 0% 25%, rgba(0, 0, 0, 0.25) 0% 50%)',
                      backgroundSize: '20px 20px'
                    }
                  : undefined
              }
            >
              {previewFile.file_type === 'image' ? (
                <img
                  src={getDirectUrl(previewFile)}
                  alt={previewFile.name}
                  className="max-h-[420px] w-auto object-contain rounded-lg drop-shadow-xl"
                />
              ) : previewFile.file_type === 'video' ? (
                <video
                  src={getDirectUrl(previewFile)}
                  controls
                  className="max-h-[400px] w-full rounded-lg"
                />
              ) : previewFile.file_type === 'audio' ? (
                <div className="w-full space-y-3 text-center p-4">
                  <Music className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
                  <audio src={getDirectUrl(previewFile)} controls className="w-full" />
                </div>
              ) : (
                <div className="text-center space-y-2 p-6">
                  <FileText className="w-16 h-16 text-blue-400 mx-auto" />
                  <p className="text-xs text-foreground/70 font-mono">{previewFile.name}</p>
                </div>
              )}
            </div>

            {/* URLS & KEYS DISPLAY */}
            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-primary">Прямая ссылка (Квайз /file/ID/name)</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={getDirectUrl(previewFile)}
                    className="w-full px-3 py-2 bg-background/80 border border-primary/30 rounded-xl text-xs text-foreground"
                  />
                  <button
                    onClick={() => copyToClipboard(getDirectUrl(previewFile), 'preview_direct')}
                    className="px-3 py-2 bg-primary text-primary-foreground font-black rounded-xl"
                  >
                    {copiedId === 'preview_direct' ? 'Скопировано!' : 'Копировать'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-foreground/70">Оригинальный URL ProTalk</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={previewFile.original_url}
                    className="w-full px-3 py-2 bg-background/80 border border-border/40 rounded-xl text-xs text-foreground/80"
                  />
                  <button
                    onClick={() => copyToClipboard(previewFile.original_url, 'preview_orig')}
                    className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl"
                  >
                    {copiedId === 'preview_orig' ? 'Скопировано!' : 'Копировать'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-foreground/70">Короткий ключ для ИИ / Текста</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={`{{${previewFile.file_key}}}`}
                    className="w-full px-3 py-2 bg-background/80 border border-border/40 rounded-xl text-xs text-foreground/80"
                  />
                  <button
                    onClick={() => copyToClipboard(`{{${previewFile.file_key}}}`, 'preview_key')}
                    className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl"
                  >
                    {copiedId === 'preview_key' ? 'Скопировано!' : 'Копировать'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-primary/20">
              <button
                onClick={() => promptRenameFile(previewFile)}
                className="px-4 py-2 bg-primary/10 text-primary font-bold text-xs rounded-xl hover:bg-primary/20 border border-primary/20 flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Переименовать
              </button>
              <button
                onClick={() => promptDeleteFile(previewFile.id, previewFile.name)}
                className="px-4 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 font-bold text-xs rounded-xl border border-red-500/30 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Удалить
              </button>
              <a
                href={getDirectUrl(previewFile)}
                target="_blank"
                rel="noreferrer"
                download={previewFile.name}
                className="px-4 py-2 bg-primary/10 text-primary font-bold text-xs rounded-xl hover:bg-primary/20 border border-primary/20 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Скачать
              </a>
              <button
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 bg-muted text-foreground font-bold text-xs rounded-xl hover:bg-muted/80"
              >
                Закрыть
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 6: RENAME FILE */}
      {renameFileTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card/90 border border-primary/40 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-primary/20 pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Edit className="w-5 h-5 text-primary" />
                Переименование файла
              </h3>
              <button onClick={() => setRenameFileTarget(null)}>
                <X className="w-4 h-4 opacity-70 hover:opacity-100" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-foreground/70">Новое название файла</label>
              <input
                type="text"
                value={renameFileName}
                onChange={(e) => setRenameFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameFile();
                }}
                className="w-full px-3 py-2 bg-background/80 border border-primary/30 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-primary/15">
              <button
                onClick={() => setRenameFileTarget(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-primary/20 hover:bg-primary/10 text-foreground"
              >
                Отмена
              </button>
              <button
                onClick={handleRenameFile}
                disabled={!renameFileName.trim()}
                className="px-5 py-2 bg-primary text-primary-foreground font-black text-xs uppercase rounded-xl hover:opacity-90 disabled:opacity-50 transition"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: CONFIRM DELETE */}
      {deleteModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card/90 border border-red-500/40 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-red-500/20 pb-3">
              <h3 className="font-bold text-base text-red-400 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-400" />
                Подтверждение удаления
              </h3>
              <button onClick={() => setDeleteModalTarget(null)}>
                <X className="w-4 h-4 opacity-70 hover:opacity-100" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-foreground/90">
              <p>
                Вы уверены, что хотите удалить {deleteModalTarget.type === 'folder' ? 'папку' : 'файл'}:
              </p>
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl font-mono text-xs text-red-300 font-bold break-all">
                {deleteModalTarget.name}
              </div>
              <p className="text-[11px] text-foreground/60 italic">
                {deleteModalTarget.type === 'folder'
                  ? 'Файлы из этой папки перенесутся в корень (не будут удалены).'
                  : 'Запись о файле будет удалена из базы данных.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-red-500/15">
              <button
                onClick={() => setDeleteModalTarget(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-primary/20 hover:bg-primary/10 text-foreground"
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase rounded-xl transition shadow-lg shadow-red-500/20"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

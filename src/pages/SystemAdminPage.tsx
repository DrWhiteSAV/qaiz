import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Database, Table, Zap, Clock, Trash2, Edit2, RefreshCw, HardDrive, 
  CheckCircle2, AlertCircle, X, FolderOpen, Download, Upload, FileSpreadsheet, 
  Plus, Archive, Activity, Sparkles, BookOpen, FileText, Search, 
  ArrowUpDown, ArrowUp, ArrowDown, Code, Copy, ChevronRight, Save
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../context/AuthContext';
import { FileManager } from '../components/FileManager';
import { BlogEditor } from '../components/BlogEditor';
import { db } from '../db';

export const SystemAdminPage: React.FC = () => {
  const { 
    tables, 
    setTables, 
    activeTable, 
    setActiveTable, 
    selectedRowForDelete, 
    setSelectedRowForDelete, 
    selectedRowForEdit, 
    setSelectedRowForEdit 
  } = useAppStore();
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active view based on current URL path
  const currentPath = location.pathname.replace(/\/$/, '');
  const activeSection = (() => {
    if (currentPath === '/system-admin/triggers') return 'triggers';
    if (currentPath === '/system-admin/cron') return 'cron';
    if (currentPath === '/system-admin/files') return 'files';
    if (currentPath === '/system-admin/prompts') return 'prompts';
    if (currentPath === '/system-admin/blog' || currentPath === '/system-admin/posts') return 'blog';
    if (currentPath === '/system-admin/logs') return 'logs';
    return 'tables';
  })();

  // Database Tables State
  const [tableData, setTableData] = useState<{ columns: any[]; rows: any[] }>({ columns: [], rows: [] });
  const [triggers, setTriggers] = useState<any[]>([]);
  const [cronInfo, setCronInfo] = useState<{ jobs: any[]; logs: any[] }>({ jobs: [], logs: [] });
  const [loading, setLoading] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  
  // Real-time Live Sync State
  const [isLiveSync, setIsLiveSync] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Table Sorting State
  const [sortConfig, setSortConfig] = useState<{ column: string | null; direction: 'asc' | 'desc' | null }>({
    column: null,
    direction: null
  });

  // Resizable Columns State
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const resizingColRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  // Cell Inspector / Value Editor State
  const [inspectedCell, setInspectedCell] = useState<{
    tableName: string;
    rowId: string | number;
    column: string;
    value: any;
    isEditing: boolean;
  } | null>(null);
  const [editedCellValue, setEditedCellValue] = useState('');

  // Modals state
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreJsonFile, setRestoreJsonFile] = useState<File | null>(null);
  const [restoreJsonText, setRestoreJsonText] = useState('');

  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState('');
  const [clearTableOnImport, setClearTableOnImport] = useState(false);

  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [newRecordData, setNewRecordData] = useState<Record<string, any>>({});

  const [showAddTriggerModal, setShowAddTriggerModal] = useState(false);
  const [newTriggerSql, setNewTriggerSql] = useState('');

  const [showAddCronModal, setShowAddCronModal] = useState(false);
  const [newCronName, setNewCronName] = useState('');
  const [newCronSchedule, setNewCronSchedule] = useState('0 0 * * *');
  const [newCronType, setNewCronType] = useState('system');

  // Secondary Sections State (Posts, Logs, Prompts)
  const [postsList, setPostsList] = useState<any[]>([]);
  const [logsList, setLogsList] = useState<any[]>([]);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [postForm, setPostForm] = useState({
    title: '',
    content: '',
    image_url: '',
    platforms: 'app',
    scheduled_at: ''
  });

  const [prompts, setPrompts] = useState<Record<string, string>>({
    blitz_questions: `Сгенерируй пакет из {count} вопросов для квиза на тему "{topic}".\nСложность: {diffDesc}.\nТребования:\n1. Каждый вопрос основан на интересном факте.\n2. Не использовать однокоренные слова.\n3. Верни JSON массив: { text, correctAnswer, hint, explanation }`,
    millionaire_questions: `Сгенерируй полный пакет из 15 вопросов для игры "Квиллионер" на тему "{topic}".\nСложность: от 1 до 15.\nВерни JSON массив объектов: { text, options: [4], correctAnswer, hint, explanation }`,
    whatwherewhen_questions: `Сгенерируй пакет из 11 вопросов для игры "Что? Где? Квада?" на тему "{topic}".\nФормат: Вопрос от телезрителя с необычным именем из редкого города.\nВерни JSON массив: { text, correctAnswer, hint, explanation }`,
    '100to1_questions': `Сгенерируй вопрос для игры "Сто к одному" на тему "{topic}".\nВерни JSON: { question, answers: [{ text, points }], hint, explanation }`,
    jeopardy_questions: `Сгенерируй вопрос для "Своей игры" на тему "{topic}".\nВерни JSON: { text, answer, hint, explanation }`,
    check_answer: `Вопрос: "{question}". Правильный ответ: "{correctAnswer}". Ответ пользователя: "{userAnswer}".\nВерни JSON: { "isCorrect": boolean, "explanation": string }`,
    ai_comment: `Ты - персонаж викторины. Твой характер: {personality}. Произошло: {event}. Напиши короткий комментарий от своего лица.`
  });

  const fileInputRestoreRef = useRef<HTMLInputElement>(null);
  const fileInputCsvRef = useRef<HTMLInputElement>(null);

  // Initial Fetching
  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch active table when changed
  useEffect(() => {
    if (activeTable && activeSection === 'tables') {
      fetchTableRows(activeTable, false);
    }
  }, [activeTable, activeSection]);

  // Fetch section data on route change
  useEffect(() => {
    if (activeSection === 'blog') fetchPosts();
    if (activeSection === 'logs') fetchLogs();
    if (activeSection === 'cron') fetchCron(false);
    if (activeSection === 'triggers') fetchTriggers();
  }, [activeSection]);

  // Real-time polling
  useEffect(() => {
    if (!isLiveSync) return;
    const interval = setInterval(() => {
      if (activeSection === 'tables' && activeTable) {
        fetchTableRows(activeTable, true);
      } else if (activeSection === 'cron') {
        fetchCron(true);
      } else if (activeSection === 'logs') {
        fetchLogs();
      }
      setLastSyncTime(new Date().toLocaleTimeString());
    }, 5000);
    return () => clearInterval(interval);
  }, [isLiveSync, activeTable, activeSection]);

  // Fetch all main meta data
  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTables(),
        fetchTriggers(),
        fetchCron(false)
      ]);
    } catch (err: any) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tables list
  const fetchTables = async () => {
    try {
      const res = await fetch('/api/admin/system/tables');
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.tables)) {
        setTables(data.tables);
        if (!activeTable && data.tables.length > 0) {
          setActiveTable(data.tables[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching tables:', err);
    }
  };

  // Fetch triggers
  const fetchTriggers = async () => {
    try {
      const res = await fetch('/api/admin/system/triggers');
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.triggers)) setTriggers(data.triggers);
    } catch (err) {
      console.error('Error fetching triggers:', err);
    }
  };

  // Fetch cron
  const fetchCron = async (silent = false) => {
    try {
      const res = await fetch('/api/admin/system/cron');
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.jobs)) setCronInfo({ jobs: data.jobs, logs: data.logs || [] });
    } catch (err) {
      if (!silent) console.error('Error fetching cron:', err);
    }
  };

  // Fetch posts
  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/posts');
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.data)) setPostsList(data.data);
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  };

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/system/logs');
      if (!res.ok) return;
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return;
      const data = await res.json();
      const logs = data.logs || data.data;
      if (Array.isArray(logs)) setLogsList(logs);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  // Fetch rows for a table
  const fetchTableRows = async (tableName: string, isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch(`/api/admin/system/table/${tableName}?limit=500`);
      if (!res.ok) {
        if (!isSilent) setStatusMsg({ type: 'error', text: `Ошибка сервера: ${res.statusText}` });
        return;
      }
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!isSilent) setStatusMsg({ type: 'error', text: 'Сервер вернул некорректный формат ответа' });
        return;
      }
      const data = await res.json();
      if (data && data.columns && data.rows) {
        setTableData({ columns: data.columns, rows: data.rows });
      }
    } catch (err: any) {
      if (!isSilent) setStatusMsg({ type: 'error', text: `Ошибка загрузки таблицы: ${err.message}` });
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Column Resizing handlers
  const startColResize = (col: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidths[col] || 160;
    resizingColRef.current = { col, startX, startWidth };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingColRef.current) return;
      const deltaX = moveEvent.clientX - resizingColRef.current.startX;
      const newWidth = Math.max(80, resizingColRef.current.startWidth + deltaX);
      setColWidths(prev => ({ ...prev, [resizingColRef.current!.col]: newWidth }));
    };

    const handleMouseUp = () => {
      resizingColRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Save single cell edit
  const handleSaveInspectedCell = async () => {
    if (!inspectedCell) return;
    try {
      let parsedValue: any = editedCellValue;
      if (editedCellValue.trim().startsWith('{') || editedCellValue.trim().startsWith('[')) {
        try {
          parsedValue = JSON.parse(editedCellValue);
        } catch {
          parsedValue = editedCellValue;
        }
      }

      const res = await fetch(`/api/admin/system/table/${inspectedCell.tableName}/row/${inspectedCell.rowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [inspectedCell.column]: parsedValue })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: `Поле ${inspectedCell.column} успешно обновлено` });
        setInspectedCell(null);
        fetchTableRows(inspectedCell.tableName, true);
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Ошибка сохранения' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // Save full row edit
  const handleSaveEditRow = async () => {
    if (!selectedRowForEdit) return;
    try {
      const { tableName, rowData } = selectedRowForEdit;
      const rowId = rowData.id || rowData.uid;
      const res = await fetch(`/api/admin/system/table/${tableName}/row/${rowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rowData)
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: `Запись ${rowId} сохранена` });
        setSelectedRowForEdit(null);
        fetchTableRows(tableName, true);
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Ошибка сохранения записи' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // Delete row
  const handleDeleteRow = async () => {
    if (!selectedRowForDelete) return;
    try {
      const { tableName, rowId } = selectedRowForDelete;
      const res = await fetch(`/api/admin/system/table/${tableName}/row/${rowId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: `Запись ${rowId} удалена` });
        setSelectedRowForDelete(null);
        fetchTableRows(tableName, true);
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Ошибка удаления записи' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // Add Record to Table
  const handleAddRecord = async () => {
    if (!activeTable) return;
    try {
      const res = await fetch(`/api/admin/system/table/${activeTable}/row`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecordData)
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: 'Запись добавлена' });
        setShowAddRecordModal(false);
        setNewRecordData({});
        fetchTableRows(activeTable, true);
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Ошибка добавления записи' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // Import CSV
  const handleImportCsv = async () => {
    if (!activeTable) return;
    try {
      let content = csvText;
      if (csvFile) {
        content = await csvFile.text();
      }
      if (!content.trim()) {
        setStatusMsg({ type: 'error', text: 'Укажите текст или файл CSV' });
        return;
      }

      const res = await fetch(`/api/admin/system/import/csv/${activeTable}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: content, clearTable: clearTableOnImport })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: `Импортировано строк: ${data.importedCount}` });
        setShowCsvImportModal(false);
        setCsvFile(null);
        setCsvText('');
        fetchTableRows(activeTable, true);
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Ошибка импорта CSV' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // Restore JSON Backup
  const handleRestoreBackupJson = async () => {
    try {
      let content = restoreJsonText;
      if (restoreJsonFile) {
        content = await restoreJsonFile.text();
      }
      if (!content.trim()) {
        setStatusMsg({ type: 'error', text: 'Укажите JSON для восстановления' });
        return;
      }

      const parsed = JSON.parse(content);
      const res = await fetch('/api/admin/system/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: 'База данных успешно восстановлена' });
        setShowRestoreModal(false);
        setRestoreJsonFile(null);
        setRestoreJsonText('');
        fetchAllData();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Ошибка восстановления' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Ошибка: ${err.message}` });
    }
  };

  // Create Trigger
  const handleCreateTrigger = async () => {
    if (!newTriggerSql.trim()) return;
    try {
      const res = await fetch('/api/admin/system/triggers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: newTriggerSql.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: 'Триггер создан' });
        setShowAddTriggerModal(false);
        setNewTriggerSql('');
        fetchTriggers();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Ошибка создания триггера' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // Delete Trigger
  const handleDeleteTrigger = async (name: string) => {
    try {
      const res = await fetch(`/api/admin/system/triggers/${name}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: `Триггер ${name} удален` });
        fetchTriggers();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Ошибка удаления' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // Create Custom Cron Task
  const handleCreateCron = async () => {
    if (!newCronName.trim()) return;
    try {
      const res = await fetch('/api/admin/system/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCronName.trim(),
          schedule: newCronSchedule.trim(),
          action_type: newCronType
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: data.message });
        setShowAddCronModal(false);
        setNewCronName('');
        fetchCron(true);
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Ошибка создания крон-задачи' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // Delete Cron Task
  const handleDeleteCron = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/system/cron/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: data.message });
        fetchCron(true);
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Ошибка удаления задачи' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // Run Cron Task
  const handleRunCron = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/system/cron/${id}/run`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: `Задача выполнена: ${data.message}` });
        fetchCron(true);
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Ошибка выполнения задачи' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // Publish / Save Post
  const handleSavePost = async () => {
    try {
      if (editingPost) {
        const res = await fetch(`/api/posts/${editingPost.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postForm)
        });
        if (res.ok) {
          setStatusMsg({ type: 'success', text: 'Пост обновлен' });
          setEditingPost(null);
          setPostForm({ title: '', content: '', image_url: '', platforms: 'app', scheduled_at: '' });
          fetchPosts();
        }
      } else {
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postForm)
        });
        if (res.ok) {
          setStatusMsg({ type: 'success', text: 'Пост опубликован' });
          setPostForm({ title: '', content: '', image_url: '', platforms: 'app', scheduled_at: '' });
          fetchPosts();
        }
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message });
    }
  };

  // Delete Post
  const handleDeletePost = async (id: number) => {
    try {
      const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'Пост удален' });
        fetchPosts();
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message });
    }
  };

  // Filter & Sort Table Rows
  const sortedAndFilteredRows = React.useMemo(() => {
    let list = [...tableData.rows];
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      list = list.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(q)
        )
      );
    }
    if (sortConfig.column && sortConfig.direction) {
      const col = sortConfig.column;
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      list.sort((a, b) => {
        const valA = a[col];
        const valB = b[col];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * dir;
        }
        return String(valA).localeCompare(String(valB), undefined, { numeric: true }) * dir;
      });
    }
    return list;
  }, [tableData.rows, filterQuery, sortConfig]);

  const toggleSort = (colName: string) => {
    setSortConfig(prev => {
      if (prev.column !== colName) {
        return { column: colName, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column: colName, direction: 'desc' };
      }
      return { column: null, direction: null };
    });
  };

  // Sidebar navigation menu items
  const navItems = [
    { path: '/system-admin', id: 'tables', label: 'Таблицы БД', icon: <Database size={18} /> },
    { path: '/system-admin/triggers', id: 'triggers', label: 'Триггеры', icon: <Zap size={18} /> },
    { path: '/system-admin/cron', id: 'cron', label: 'Крон-задачи', icon: <Clock size={18} /> },
    { path: '/system-admin/files', id: 'files', label: 'Файловый менеджер', icon: <FolderOpen size={18} /> },
    { path: '/system-admin/blog', id: 'blog', label: 'Блог и статьи', icon: <BookOpen size={18} /> },
    { path: '/system-admin/prompts', id: 'prompts', label: 'Промпты ИИ', icon: <Sparkles size={18} /> },
    { path: '/system-admin/logs', id: 'logs', label: 'Логи и токены', icon: <FileText size={18} /> },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner with Liquid Glass Apple styling */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <HardDrive size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Панель управления системой</h1>
            <p className="text-sm text-foreground/60">
              База данных SQLite, триггеры, крон, промпты и управление блогом
            </p>
          </div>
        </div>

        {/* Global Live Sync & Status Indicator */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => setIsLiveSync(!isLiveSync)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isLiveSync 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-white/5 border-white/10 text-foreground/60'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLiveSync ? 'bg-emerald-400 animate-ping' : 'bg-foreground/40'}`} />
            <span>{isLiveSync ? 'Живая синхронизация' : 'Синхронизация на паузе'}</span>
          </button>

          <button
            onClick={() => {
              if (activeSection === 'tables' && activeTable) fetchTableRows(activeTable, false);
              if (activeSection === 'triggers') fetchTriggers();
              if (activeSection === 'cron') fetchCron(false);
              if (activeSection === 'blog') fetchPosts();
              if (activeSection === 'logs') fetchLogs();
              setLastSyncTime(new Date().toLocaleTimeString());
            }}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-foreground/70 hover:text-foreground transition-all"
            title="Обновить данные"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-primary' : ''} />
          </button>
        </div>
      </div>

      {/* Global Status Message Toast */}
      {statusMsg && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm backdrop-blur-xl ${
          statusMsg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="p-1 rounded-lg hover:bg-white/10">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Layout: Left Sidebar + Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar Navigation */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg space-y-1">
            <div className="px-3 py-2 text-xs font-bold text-foreground/50 uppercase tracking-wider">
              Разделы управления
            </div>
            {navItems.map(item => {
              const isActive = activeSection === item.id;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-primary text-background font-bold shadow-md'
                      : 'text-foreground/80 hover:bg-white/5 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-background' : 'text-primary'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight size={15} className={`opacity-40 ${isActive ? 'text-background' : ''}`} />
                </Link>
              );
            })}
          </div>

          {/* If on /system-admin (tables), show Table Selection List in the Sidebar */}
          {activeSection === 'tables' && (
            <div className="p-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg space-y-2">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-bold text-foreground/50 uppercase tracking-wider">
                  Таблицы SQLite ({tables.length})
                </span>
                <button
                  onClick={fetchTables}
                  className="p-1 rounded-lg hover:bg-white/10 text-foreground/60 hover:text-foreground"
                  title="Обновить список таблиц"
                >
                  <RefreshCw size={13} />
                </button>
              </div>

              <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                {tables.map(t => {
                  const isSelected = activeTable === t.name;
                  return (
                    <button
                      key={t.name}
                      onClick={() => {
                        setActiveTable(t.name);
                        setSortConfig({ column: null, direction: null });
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                        isSelected
                          ? 'bg-primary/20 border-primary text-primary font-bold'
                          : 'bg-white/5 border-transparent text-foreground/70 hover:bg-white/10 hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Table size={14} className="shrink-0" />
                        <span className="truncate">{t.name}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] shrink-0 ${
                        isSelected ? 'bg-primary text-background font-bold' : 'bg-white/10 text-foreground/60'
                      }`}>
                        {t.rowCount ?? '?'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-9 space-y-6">
          {/* SECTION: Database Tables */}
          {activeSection === 'tables' && (
            <div className="space-y-4">
              {/* Tables Toolbar & Actions */}
              <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-4 shadow-lg">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Table size={20} className="text-primary" />
                    <h2 className="text-lg font-bold text-foreground">
                      Таблица: <span className="font-mono text-primary">{activeTable || 'Выберите таблицу'}</span>
                    </h2>
                  </div>

                  {/* Table Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => {
                        setNewRecordData({});
                        setShowAddRecordModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-xs font-bold transition-all"
                    >
                      <Plus size={14} />
                      <span>Добавить запись</span>
                    </button>

                    <a
                      href={`/api/admin/system/export/csv/${activeTable}`}
                      download={`${activeTable}_export.csv`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-foreground/80 text-xs font-semibold transition-all"
                    >
                      <Download size={14} />
                      <span>CSV</span>
                    </a>

                    <button
                      onClick={() => setShowCsvImportModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-foreground/80 text-xs font-semibold transition-all"
                    >
                      <Upload size={14} />
                      <span>Импорт CSV</span>
                    </button>

                    <a
                      href="/api/admin/system/backup/json"
                      download="sqlite_backup.json"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-foreground/80 text-xs font-semibold transition-all"
                    >
                      <Archive size={14} />
                      <span>Бэкап JSON</span>
                    </a>

                    <button
                      onClick={() => setShowRestoreModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-foreground/80 text-xs font-semibold transition-all"
                    >
                      <RefreshCw size={14} />
                      <span>Восстановить</span>
                    </button>
                  </div>
                </div>

                {/* Filter Search */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/40" />
                    <input
                      type="text"
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      placeholder={`Поиск по записям таблицы ${activeTable || ''}...`}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                  <div className="text-xs text-foreground/50 whitespace-nowrap">
                    Найдено: {sortedAndFilteredRows.length} из {tableData.rows.length}
                  </div>
                </div>
              </div>

              {/* Interactive Data Table with Resizable Columns & Sort Headers */}
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-white/10 text-xs font-bold text-foreground/80 uppercase">
                      <tr>
                        <th className="p-3 w-12 text-center border-r border-white/10">#</th>
                        {tableData.columns.map(col => {
                          const colName = col.name || col;
                          const isSorted = sortConfig.column === colName;
                          const width = colWidths[colName] || 160;
                          return (
                            <th
                              key={colName}
                              style={{ width: `${width}px`, minWidth: '100px' }}
                              className="relative p-3 border-r border-white/10 select-none group hover:bg-white/5 transition-colors"
                            >
                              <div 
                                onClick={() => toggleSort(colName)}
                                className="flex items-center justify-between gap-1.5 cursor-pointer pr-3"
                              >
                                <span className="truncate" title={colName}>{colName}</span>
                                <span className="text-primary shrink-0">
                                  {isSorted && sortConfig.direction === 'asc' && <ArrowUp size={14} />}
                                  {isSorted && sortConfig.direction === 'desc' && <ArrowDown size={14} />}
                                  {!isSorted && <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-40" />}
                                </span>
                              </div>

                              {/* Column Resize Handle */}
                              <div
                                onMouseDown={(e) => startColResize(colName, e)}
                                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/60 transition-colors z-30"
                                title="Потяните для изменения ширины колонки"
                              />
                            </th>
                          );
                        })}
                        <th className="p-3 w-20 text-center">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sortedAndFilteredRows.length > 0 ? (
                        sortedAndFilteredRows.map((row, rIdx) => {
                          const rowId = row.id || row.uid || `r_${rIdx}`;
                          return (
                            <tr key={rowId} className="hover:bg-white/5 transition-colors">
                              <td className="p-3 text-center text-xs text-foreground/40 border-r border-white/10 font-mono">
                                {rIdx + 1}
                              </td>
                              {tableData.columns.map(col => {
                                const colName = col.name || col;
                                const val = row[colName];
                                const isJson = typeof val === 'object' && val !== null;
                                const displayVal = isJson ? JSON.stringify(val) : String(val ?? '');

                                return (
                                  <td
                                    key={colName}
                                    onClick={() => {
                                      setInspectedCell({
                                        tableName: activeTable,
                                        rowId,
                                        column: colName,
                                        value: val,
                                        isEditing: true
                                      });
                                      setEditedCellValue(isJson ? JSON.stringify(val, null, 2) : String(val ?? ''));
                                    }}
                                    className="p-3 border-r border-white/10 cursor-pointer hover:bg-primary/10 transition-colors font-mono text-xs max-w-[280px] truncate group/cell"
                                    title="Кликните для просмотра и редактирования поля"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="truncate">{displayVal || <span className="text-foreground/30 italic">null</span>}</span>
                                      <Edit2 size={12} className="opacity-0 group-hover/cell:opacity-60 text-primary shrink-0" />
                                    </div>
                                  </td>
                                );
                              })}
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => setSelectedRowForEdit({ tableName: activeTable, rowData: { ...row } })}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-foreground/70 hover:text-primary transition-all"
                                    title="Редактировать всю запись"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => setSelectedRowForDelete({ tableName: activeTable, rowId })}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-foreground/70 hover:text-rose-400 transition-all"
                                    title="Удалить запись"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={tableData.columns.length + 2} className="p-8 text-center text-foreground/40 italic">
                            {loading ? 'Загрузка данных...' : 'В таблице нет записей или они отфильтрованы'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: Triggers (/system-admin/triggers) */}
          {activeSection === 'triggers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Триггеры базы данных</h3>
                  <p className="text-xs text-foreground/60">Автоматические правила выполнения при событиях в таблицах</p>
                </div>
                <button
                  onClick={() => setShowAddTriggerModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-sm font-bold transition-all"
                >
                  <Plus size={16} />
                  <span>Создать триггер</span>
                </button>
              </div>

              <div className="grid gap-4">
                {triggers.length > 0 ? (
                  triggers.map(trig => (
                    <div key={trig.name} className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-3 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap size={18} className="text-primary" />
                          <h4 className="font-bold text-base text-foreground font-mono">{trig.name}</h4>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-foreground/70">
                            Таблица: {trig.tbl_name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteTrigger(trig.name)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                          title="Удалить триггер"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <pre className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap">
                        {trig.sql}
                      </pre>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md text-foreground/40 italic">
                    Триггеры в базе данных не найдены
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION: Cron Tasks (/system-admin/cron) */}
          {activeSection === 'cron' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Запланированные задачи (Крон)</h3>
                  <p className="text-xs text-foreground/60">Периодическое обслуживание и вычисления</p>
                </div>
                <button
                  onClick={() => setShowAddCronModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-sm font-bold transition-all"
                >
                  <Plus size={16} />
                  <span>Добавить задачу</span>
                </button>
              </div>

              <div className="grid gap-4">
                {cronInfo.jobs.length > 0 ? (
                  cronInfo.jobs.map(job => (
                    <div key={job.id} className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl flex items-center justify-between gap-4 shadow-lg flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock size={18} className="text-primary" />
                          <h4 className="font-bold text-base text-foreground">{job.name}</h4>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-primary/10 text-primary border border-primary/20">
                            {job.schedule}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/60">
                          Последний запуск: {job.last_run ? new Date(job.last_run).toLocaleString('ru-RU') : 'Никогда'} • Статус: {job.status || 'active'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRunCron(job.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-xs font-bold transition-all"
                        >
                          <Activity size={14} />
                          <span>Запустить</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCron(job.id)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                          title="Удалить задачу"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md text-foreground/40 italic">
                    Запланированные задачи отсутствуют
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION: File Manager (/system-admin/files) */}
          {activeSection === 'files' && (
            <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg">
              <FileManager />
            </div>
          )}

          {/* SECTION: Blog and Posts (/system-admin/blog) */}
          {activeSection === 'blog' && (
            <div className="space-y-6">
              {/* Markdown Editor & ProTalk Image Uploader Component */}
              <BlogEditor
                postForm={postForm}
                setPostForm={setPostForm}
                onSave={handleSavePost}
                onCancel={() => {
                  setEditingPost(null);
                  setPostForm({ title: '', content: '', image_url: '', platforms: 'app', scheduled_at: '' });
                }}
                isEditing={!!editingPost}
              />

              {/* Published Posts List */}
              <div className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">
                    Опубликованные статьи ({postsList.length})
                  </h3>
                  <button
                    onClick={fetchPosts}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-foreground/70"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>

                <div className="grid gap-4">
                  {postsList.length > 0 ? (
                    postsList.map(post => (
                      <div key={post.id} className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl flex items-start justify-between gap-4 hover:border-primary/30 transition-all">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-bold text-foreground">{post.title}</h4>
                            {post.platforms && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                {post.platforms}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground/70 line-clamp-2">{post.content}</p>
                          <div className="flex items-center gap-4 text-xs text-foreground/40">
                            <span>Дата: {new Date(post.created_at || Date.now()).toLocaleDateString('ru-RU')}</span>
                            {post.image_url && <span className="text-primary truncate max-w-[200px]">Обложка: {post.image_url}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setEditingPost(post);
                              setPostForm({
                                title: post.title,
                                content: post.content,
                                image_url: post.image_url || '',
                                platforms: post.platforms || 'app',
                                scheduled_at: post.scheduled_at || ''
                              });
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-primary"
                            title="Редактировать"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400"
                            title="Удалить"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-foreground/40 italic">
                      Статей в блоге пока нет. Напишите первую публикацию выше!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION: Prompts Editor (/system-admin/prompts) */}
          {activeSection === 'prompts' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg">
                <h3 className="text-lg font-bold text-foreground">Шаблоны системных промптов нейросети</h3>
                <p className="text-xs text-foreground/60">Промпты для генерации вопросов и ответов в викторинах</p>
              </div>

              <div className="grid gap-4">
                {Object.entries(prompts).map(([key, promptText]) => (
                  <div key={key} className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-primary">{key}</span>
                      <button
                        onClick={() => {
                          setStatusMsg({ type: 'success', text: `Промпт ${key} сохранен` });
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-xs font-bold transition-all"
                      >
                        <Save size={14} />
                        <span>Сохранить</span>
                      </button>
                    </div>
                    <textarea
                      value={promptText}
                      onChange={(e) => setPrompts(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full min-h-[140px] p-3 rounded-xl bg-black/40 border border-white/10 text-sm font-mono text-foreground focus:outline-none focus:border-primary transition-all resize-y custom-scrollbar"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: Logs & Tokens (/system-admin/logs) */}
          {activeSection === 'logs' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl flex items-center justify-between shadow-lg">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Системные логи и расход нейросети</h3>
                  <p className="text-xs text-foreground/60">Автоматический подсчет токенов и стоимости в рублях</p>
                </div>
                <button onClick={fetchLogs} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10">
                  <RefreshCw size={16} />
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="sticky top-0 bg-background/95 border-b border-white/10 text-foreground/70 uppercase">
                      <tr>
                        <th className="p-3">ID</th>
                        <th className="p-3">Действие</th>
                        <th className="p-3">Токены</th>
                        <th className="p-3 text-primary font-bold">Расход (₽)</th>
                        <th className="p-3">Пользователь</th>
                        <th className="p-3">Время</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {logsList.length > 0 ? (
                        logsList.map(log => (
                          <tr key={log.id} className="hover:bg-white/5">
                            <td className="p-3 text-foreground/40">{log.id}</td>
                            <td className="p-3 text-foreground font-semibold">{log.action || log.event}</td>
                            <td className="p-3 text-foreground/70">{log.tokens_total ?? (log.prompt_tokens + log.completion_tokens) ?? 0}</td>
                            <td className="p-3 text-primary font-bold">{log.rub ? `${Number(log.rub).toFixed(4)} ₽` : '0 ₽'}</td>
                            <td className="p-3 text-foreground/60">{log.user_id || log.uid || 'system'}</td>
                            <td className="p-3 text-foreground/40">{new Date(log.created_at || Date.now()).toLocaleString('ru-RU')}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-foreground/40 italic">
                            Логи пока отсутствуют
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CELL INSPECTOR / VALUE EDITOR MODAL */}
      {inspectedCell && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-3xl border border-primary/30 bg-background/95 backdrop-blur-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Code size={18} className="text-primary" />
                  <span>Редактор поля: {inspectedCell.column}</span>
                </h3>
                <p className="text-xs text-foreground/50">
                  Таблица: {inspectedCell.tableName} • Запись: {inspectedCell.rowId}
                </p>
              </div>
              <button
                onClick={() => setInspectedCell(null)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-foreground/70 hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground/60">Содержимое ячейки:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(editedCellValue);
                        setEditedCellValue(JSON.stringify(parsed, null, 2));
                      } catch {
                        setStatusMsg({ type: 'error', text: 'Не удалось разобрать как JSON' });
                      }
                    }}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Форматировать JSON
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(editedCellValue)}
                    className="flex items-center gap-1 text-xs text-foreground/70 hover:text-primary"
                  >
                    <Copy size={12} />
                    <span>Копировать</span>
                  </button>
                </div>
              </div>

              <textarea
                value={editedCellValue}
                onChange={(e) => setEditedCellValue(e.target.value)}
                className="w-full min-h-[220px] max-h-[50vh] p-3 rounded-2xl bg-black/40 border border-white/15 text-sm font-mono text-foreground focus:outline-none focus:border-primary transition-all resize-y custom-scrollbar"
                placeholder="Значение поля..."
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-xs text-foreground/40">
                Символов: {editedCellValue.length} • ~{Math.ceil(editedCellValue.length / 4)} токенов
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectedCell(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold text-foreground/70"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveInspectedCell}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-background font-bold text-sm shadow-md hover:scale-105 transition-all"
                >
                  <Save size={16} />
                  <span>Сохранить поле</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROW EDIT MODAL */}
      {selectedRowForEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-3xl border border-primary/30 bg-background/95 backdrop-blur-2xl shadow-2xl p-6 space-y-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-foreground">
                Редактирование записи ({selectedRowForEdit.tableName})
              </h3>
              <button onClick={() => setSelectedRowForEdit(null)} className="p-1.5 rounded-xl hover:bg-white/10">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1 custom-scrollbar">
              {Object.entries(selectedRowForEdit.rowData).map(([key, val]) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-mono font-bold text-foreground/70">{key}</label>
                  <input
                    type="text"
                    value={typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '')}
                    onChange={(e) => {
                      const text = e.target.value;
                      setSelectedRowForEdit({
                        ...selectedRowForEdit,
                        rowData: { ...selectedRowForEdit.rowData, [key]: text }
                      });
                    }}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setSelectedRowForEdit(null)}
                className="px-4 py-2 rounded-xl bg-white/5 text-sm font-semibold"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveEditRow}
                className="px-6 py-2 rounded-xl bg-primary text-background font-bold text-sm shadow-md"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ROW DELETE MODAL */}
      {selectedRowForDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-rose-500/30 bg-background/95 backdrop-blur-2xl shadow-2xl p-6 space-y-4 text-center">
            <div className="p-3 rounded-full bg-rose-500/10 text-rose-500 w-12 h-12 mx-auto flex items-center justify-center">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-foreground">Подтвердите удаление</h3>
            <p className="text-sm text-foreground/70">
              Вы действительно хотите удалить запись <span className="font-mono text-rose-400 font-bold">{selectedRowForDelete.rowId}</span> из таблицы {selectedRowForDelete.tableName}?
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setSelectedRowForDelete(null)}
                className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteRow}
                className="px-6 py-2 rounded-xl bg-rose-500 text-white font-bold text-sm shadow-lg hover:bg-rose-600 transition-all"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD RECORD MODAL */}
      {showAddRecordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl border border-primary/30 bg-background/95 backdrop-blur-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-foreground">Добавить запись в {activeTable}</h3>
              <button onClick={() => setShowAddRecordModal(false)} className="p-1.5 rounded-xl hover:bg-white/10">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1 custom-scrollbar">
              {tableData.columns.map(col => {
                const colName = col.name || col;
                return (
                  <div key={colName} className="space-y-1">
                    <label className="text-xs font-mono font-bold text-foreground/70">{colName}</label>
                    <input
                      type="text"
                      placeholder={`Значение для ${colName}...`}
                      value={newRecordData[colName] || ''}
                      onChange={(e) => setNewRecordData(prev => ({ ...prev, [colName]: e.target.value }))}
                      className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setShowAddRecordModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-sm font-semibold"
              >
                Отмена
              </button>
              <button
                onClick={handleAddRecord}
                className="px-6 py-2 rounded-xl bg-primary text-background font-bold text-sm shadow-md"
              >
                Создать запись
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {showCsvImportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-primary/30 bg-background/95 backdrop-blur-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-foreground">Импорт CSV в {activeTable}</h3>
              <button onClick={() => setShowCsvImportModal(false)} className="p-1.5 rounded-xl hover:bg-white/10">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div 
                onClick={() => fileInputCsvRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-white/20 hover:border-primary text-center cursor-pointer transition-all bg-white/5"
              >
                <Upload size={32} className="mx-auto text-primary mb-2" />
                <p className="text-sm font-bold text-foreground">{csvFile ? csvFile.name : 'Выберите файл .csv'}</p>
                <p className="text-xs text-foreground/50 mt-1">Или перетащите файл сюда</p>
                <input
                  ref={fileInputCsvRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-foreground/70">Или вставьте текст CSV:</label>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="колонка1,колонка2&#10;знач1,знач2"
                  className="w-full h-28 p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground/80">
                <input
                  type="checkbox"
                  checked={clearTableOnImport}
                  onChange={(e) => setClearTableOnImport(e.target.checked)}
                  className="rounded border-white/20 text-primary focus:ring-0"
                />
                <span>Очистить таблицу перед импортом</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button onClick={() => setShowCsvImportModal(false)} className="px-4 py-2 rounded-xl bg-white/5 text-sm font-semibold">
                Отмена
              </button>
              <button onClick={handleImportCsv} className="px-6 py-2 rounded-xl bg-primary text-background font-bold text-sm shadow-md">
                Импортировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON RESTORE MODAL */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-primary/30 bg-background/95 backdrop-blur-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-foreground">Восстановление базы данных из JSON</h3>
              <button onClick={() => setShowRestoreModal(false)} className="p-1.5 rounded-xl hover:bg-white/10">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div 
                onClick={() => fileInputRestoreRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-white/20 hover:border-primary text-center cursor-pointer transition-all bg-white/5"
              >
                <Archive size={32} className="mx-auto text-primary mb-2" />
                <p className="text-sm font-bold text-foreground">{restoreJsonFile ? restoreJsonFile.name : 'Выберите файл бэкапа .json'}</p>
                <p className="text-xs text-foreground/50 mt-1">Все таблицы будут восстановлены из структуры JSON</p>
                <input
                  ref={fileInputRestoreRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => setRestoreJsonFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-foreground/70">Или вставьте JSON бэкапа:</label>
                <textarea
                  value={restoreJsonText}
                  onChange={(e) => setRestoreJsonText(e.target.value)}
                  placeholder='{"tables": {"users": [...]}}'
                  className="w-full h-28 p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button onClick={() => setShowRestoreModal(false)} className="px-4 py-2 rounded-xl bg-white/5 text-sm font-semibold">
                Отмена
              </button>
              <button onClick={handleRestoreBackupJson} className="px-6 py-2 rounded-xl bg-primary text-background font-bold text-sm shadow-md">
                Восстановить БД
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD TRIGGER MODAL */}
      {showAddTriggerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-primary/30 bg-background/95 backdrop-blur-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-foreground">Создать SQL-триггер</h3>
              <button onClick={() => setShowAddTriggerModal(false)} className="p-1.5 rounded-xl hover:bg-white/10">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-foreground/70">SQL выражение триггера:</label>
              <textarea
                value={newTriggerSql}
                onChange={(e) => setNewTriggerSql(e.target.value)}
                placeholder="CREATE TRIGGER trg_name AFTER INSERT ON users BEGIN ... END;"
                className="w-full h-36 p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-foreground focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button onClick={() => setShowAddTriggerModal(false)} className="px-4 py-2 rounded-xl bg-white/5 text-sm font-semibold">
                Отмена
              </button>
              <button onClick={handleCreateTrigger} className="px-6 py-2 rounded-xl bg-primary text-background font-bold text-sm shadow-md">
                Создать триггер
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CRON MODAL */}
      {showAddCronModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-primary/30 bg-background/95 backdrop-blur-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-foreground">Добавить крон-задачу</h3>
              <button onClick={() => setShowAddCronModal(false)} className="p-1.5 rounded-xl hover:bg-white/10">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-foreground/70">Название задачи:</label>
                <input
                  type="text"
                  value={newCronName}
                  onChange={(e) => setNewCronName(e.target.value)}
                  placeholder="Ежедневный подсчет статистики..."
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-foreground/70">Расписание (Cron):</label>
                <input
                  type="text"
                  value={newCronSchedule}
                  onChange={(e) => setNewCronSchedule(e.target.value)}
                  placeholder="0 0 * * *"
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button onClick={() => setShowAddCronModal(false)} className="px-4 py-2 rounded-xl bg-white/5 text-sm font-semibold">
                Отмена
              </button>
              <button onClick={handleCreateCron} className="px-6 py-2 rounded-xl bg-primary text-background font-bold text-sm shadow-md">
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

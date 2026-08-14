import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  Archive, 
  Filter, 
  Edit3, 
  Trash2, 
  Plus, 
  Check, 
  X, 
  RefreshCw, 
  Search,
  Maximize2,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface TableInfo {
  name: string;
  rowCount: number;
}

export const DatabaseManager: React.FC = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('difficulties');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  // Column Filters
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ col: string | null; dir: 'asc' | 'desc' }>({
    col: null,
    dir: 'asc'
  });

  // Column Widths
  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  // Resizing State
  const [resizingCol, setResizingCol] = useState<{ col: string; startX: number; startWidth: number } | null>(null);

  // Editing state
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: any; col: string; val: any } | null>(null);

  // Prompt Modal state (for full resizable field & prompt editing)
  const [promptModal, setPromptModal] = useState<{
    open: boolean;
    row: any;
    col: string;
    val: string;
  } | null>(null);

  // Add Row Modal state
  const [addRowModal, setAddRowModal] = useState<boolean>(false);
  const [newRowData, setNewRowData] = useState<Record<string, string>>({});

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    tableName: string;
    rowId: any;
    colName?: string;
    oldValue?: any;
    newValue?: any;
    fullRowData?: any;
    actionType: 'cell' | 'row' | 'delete' | 'add';
  } | null>(null);

  // Backup restore modal
  const [restoreModal, setRestoreModal] = useState<{
    open: boolean;
    file: File | null;
    parsedData: any | null;
  } | null>(null);

  // Expand cell modal
  const [expandModal, setExpandModal] = useState<{
    open: boolean;
    title: string;
    content: string;
  } | null>(null);

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable);
      setFilters({});
      setActiveFilterCol(null);
      setSortConfig({ col: null, dir: 'asc' });
    }
  }, [selectedTable]);

  // Handle column resizing drag
  useEffect(() => {
    if (!resizingCol) return;
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizingCol.startX;
      const newWidth = Math.max(120, resizingCol.startWidth + delta);
      setColWidths((prev) => ({ ...prev, [resizingCol.col]: newWidth }));
    };
    const handleMouseUp = () => {
      setResizingCol(null);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCol]);

  const handleMouseDownResize = (e: React.MouseEvent, col: string) => {
    e.stopPropagation();
    e.preventDefault();
    const currentWidth = colWidths[col] || 200;
    setResizingCol({ col, startX: e.clientX, startWidth: currentWidth });
  };

  const handleSortToggle = (col: string) => {
    if (sortConfig.col !== col) {
      setSortConfig({ col, dir: 'asc' });
    } else if (sortConfig.dir === 'asc') {
      setSortConfig({ col, dir: 'desc' });
    } else {
      setSortConfig({ col: null, dir: 'asc' });
    }
  };

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/system/tables');
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
        if (data.tables && data.tables.length > 0 && !selectedTable) {
          setSelectedTable(data.tables[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching tables:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async (tableName: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/system/table/${tableName}`);
      if (res.ok) {
        const data = await res.json();
        setColumns(data.columns || []);
        setRows(data.rows || []);
      }
    } catch (err) {
      console.error('Error fetching table data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  // Export ZIP
  const handleExportZip = () => {
    window.location.href = '/api/admin/system/export/zip';
    showToast('Скачивание ZIP архива со всеми таблицами...');
  };

  // Export JSON Backup
  const handleExportJson = () => {
    window.location.href = '/api/admin/system/backup/json/export';
    showToast('Скачивание полность сохранённого бэкапа JSON...');
  };

  // Select File for Restore
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsedData = JSON.parse(event.target?.result as string);
        if (!parsedData.tables) {
          alert('Невалидный файл бэкапа JSON');
          return;
        }
        setRestoreModal({ open: true, file, parsedData });
      } catch (err) {
        alert('Ошибка чтения файла JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Confirm Restore JSON
  const confirmRestore = async () => {
    if (!restoreModal?.parsedData) return;
    try {
      setLoading(true);
      const res = await fetch('/api/admin/system/backup/json/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupData: restoreModal.parsedData }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'База данных успешно восстановлена!');
        fetchTables();
        if (selectedTable) fetchTableData(selectedTable);
      } else {
        alert(data.error || 'Ошибка восстановления');
      }
    } catch (err: any) {
      alert(err.message || 'Ошибка восстановления');
    } finally {
      setLoading(false);
      setRestoreModal(null);
    }
  };

  const handleAddRow = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/system/table/${selectedTable}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRowData),
      });
      if (res.ok) {
        showToast(`Новая запись успешно добавлена в ${selectedTable}!`);
        setAddRowModal(false);
        setNewRowData({});
        await fetchTableData(selectedTable);
        await fetchTables();
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка при добавлении');
      }
    } catch (err: any) {
      alert('Ошибка при добавлении записи: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save changes via confirmation modal
  const requestCellSave = (row: any, colName: string, newValue: any) => {
    const rowId = row.id ?? row.uid ?? row.game_id ?? row.key;
    const oldValue = row[colName];

    if (oldValue === newValue) {
      setEditingCell(null);
      return;
    }

    setConfirmModal({
      open: true,
      tableName: selectedTable,
      rowId,
      colName,
      oldValue,
      newValue,
      fullRowData: { ...row, [colName]: newValue },
      actionType: 'cell'
    });
  };

  const confirmSaveAction = async () => {
    if (!confirmModal) return;

    try {
      setLoading(true);
      const { tableName, rowId, fullRowData, actionType } = confirmModal;

      if (actionType === 'delete') {
        const res = await fetch(`/api/admin/system/table/${tableName}/${rowId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          showToast(`Запись ${rowId} удалена из ${tableName}`);
        }
      } else if (actionType === 'cell' || actionType === 'row') {
        const res = await fetch(`/api/admin/system/table/${tableName}/${rowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullRowData),
        });
        if (res.ok) {
          showToast(`Изменения в таблице ${tableName} успешно сохранены!`);
        }
      }

      await fetchTableData(selectedTable);
      await fetchTables();
    } catch (err: any) {
      alert('Ошибка при сохранении: ' + err.message);
    } finally {
      setLoading(false);
      setConfirmModal(null);
      setEditingCell(null);
      setEditingRow(null);
    }
  };

  // Filtered and Sorted Rows
  const filteredAndSortedRows = useMemo(() => {
    let result = rows.filter((row) => {
      return Object.entries(filters).every(([col, val]) => {
        if (!val) return true;
        const cellValue = String(row[col] ?? '').toLowerCase();
        return cellValue.includes(val.toLowerCase());
      });
    });

    if (sortConfig.col) {
      const { col, dir } = sortConfig;
      result = [...result].sort((a, b) => {
        const valA = a[col];
        const valB = b[col];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return dir === 'asc' ? valA - valB : valB - valA;
        }
        return dir === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [rows, filters, sortConfig]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {message && (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-center text-sm font-bold text-primary backdrop-blur-md animate-fade-in">
          {message}
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-background/20 p-4 rounded-3xl border border-primary/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Database className="text-primary" size={24} />
          <div>
            <h2 className="text-xl font-bold text-primary tracking-tight">Редактор Баз Данных</h2>
            <p className="text-xs text-foreground/50">Просмотр, сортировка, редактирование полей и промптов в SQLite</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportZip}
            className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-background/40 px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all backdrop-blur-sm"
            title="Скачать все таблицы в ZIP архиве"
          >
            <Archive size={14} />
            Экспорт в ZIP
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-background/40 px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all backdrop-blur-sm"
            title="Скачать бэкап всей базы данных в формате JSON"
          >
            <Download size={14} />
            Скачать бэкап JSON
          </button>

          <label className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-background/40 px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer backdrop-blur-sm">
            <Upload size={14} />
            Восстановить из JSON
            <input type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
          </label>

          <button
            onClick={() => fetchTableData(selectedTable)}
            className="p-2 rounded-full border border-primary/20 bg-background/40 text-primary hover:bg-primary/20 transition-all"
            title="Обновить таблицу"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Table Selector */}
      <div className="flex flex-wrap items-center gap-2 pb-2 overflow-x-auto">
        <span className="text-xs font-bold text-foreground/50 mr-2">Таблицы:</span>
        {tables.map((t) => (
          <button
            key={t.name}
            onClick={() => setSelectedTable(t.name)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all border ${
              selectedTable === t.name
                ? 'bg-primary text-background border-primary shadow-glow'
                : 'bg-background/30 text-foreground/70 border-primary/10 hover:border-primary/30 hover:bg-background/50'
            }`}
          >
            <span>{t.name}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              selectedTable === t.name ? 'bg-background/20 text-background' : 'bg-primary/10 text-primary'
            }`}>
              {t.rowCount}
            </span>
          </button>
        ))}
      </div>

      {/* Active Table Controls & Column Filters */}
      <div className="rounded-3xl border border-primary/20 bg-background/30 p-6 backdrop-blur-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-primary">Таблица: {selectedTable}</span>
            <span className="text-xs text-foreground/50">
              Показано {filteredAndSortedRows.length} из {rows.length} записей
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setNewRowData({});
                setAddRowModal(true);
              }}
              className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-background hover:scale-105 transition-transform shadow-glow"
              title="Добавить новую строку в эту таблицу"
            >
              <Plus size={14} />
              Добавить запись
            </button>

            {sortConfig.col && (
              <span className="text-xs font-bold text-primary flex items-center gap-1">
                Сортировка: {sortConfig.col} ({sortConfig.dir === 'asc' ? 'возр.' : 'убыв.'})
                <button onClick={() => setSortConfig({ col: null, dir: 'asc' })} className="ml-1 underline text-foreground/50">сбросить</button>
              </span>
            )}

            {Object.keys(filters).some((k) => filters[k]) && (
              <button
                onClick={() => setFilters({})}
                className="text-xs font-bold text-primary hover:underline"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        </div>

        {/* Data Grid / Table View */}
        <div className="overflow-x-auto min-h-[350px] border border-primary/10 rounded-2xl bg-background/20 backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-primary/20 bg-background/40 text-xs font-bold text-primary">
                {columns.map((col) => {
                  const hasFilter = !!filters[col];
                  const width = colWidths[col] || 200;
                  const isSorted = sortConfig.col === col;

                  return (
                    <th
                      key={col}
                      style={{ width: `${width}px`, minWidth: '140px' }}
                      className="p-3 relative group border-r border-primary/10 select-none"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => handleSortToggle(col)}
                          className="flex items-center gap-1.5 hover:text-primary transition-colors text-left font-bold truncate flex-1"
                          title="Кликните для сортировки по этой колонке"
                        >
                          <span className="truncate">{col}</span>
                          {isSorted ? (
                            sortConfig.dir === 'asc' ? (
                              <ArrowUp size={13} className="text-primary shrink-0" />
                            ) : (
                              <ArrowDown size={13} className="text-primary shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-40 shrink-0" />
                          )}
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setActiveFilterCol(activeFilterCol === col ? null : col)}
                            className={`p-1 rounded-md transition-colors ${
                              hasFilter ? 'bg-primary text-background' : 'text-foreground/40 hover:text-primary'
                            }`}
                            title="Фильтр колонки"
                          >
                            <Filter size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Resizer Handle */}
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, col)}
                        className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-primary/60 transition-colors z-10"
                        title="Зажмите и тяните для изменения ширины колонки"
                      />

                      {/* Filter Popover */}
                      {activeFilterCol === col && (
                        <div className="absolute left-0 top-full mt-1 z-30 w-52 rounded-xl border border-primary/30 bg-background/95 p-3 shadow-xl backdrop-blur-md">
                          <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1.5">
                            Фильтр по {col}
                          </p>
                          <input
                            type="text"
                            value={filters[col] || ''}
                            onChange={(e) => setFilters((prev) => ({ ...prev, [col]: e.target.value }))}
                            placeholder="Поиск значения..."
                            className="w-full rounded-lg border border-primary/20 bg-background px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                          />
                          <button
                            onClick={() => setActiveFilterCol(null)}
                            className="mt-2 text-[10px] font-bold text-primary hover:underline float-right"
                          >
                            Закрыть
                          </button>
                        </div>
                      )}
                    </th>
                  );
                })}
                <th className="p-3 w-20 text-center">Действия</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-primary/5 text-xs">
              {filteredAndSortedRows.map((row, idx) => {
                const rowId = row.id ?? row.uid ?? row.game_id ?? idx;
                return (
                  <tr key={rowId} className="hover:bg-primary/5 transition-colors">
                    {columns.map((col) => {
                      const cellVal = row[col];
                      const strVal = typeof cellVal === 'object' && cellVal !== null ? JSON.stringify(cellVal) : String(cellVal ?? '');

                      return (
                        <td
                          key={col}
                          className="p-3 border-r border-primary/5 max-w-[300px] align-top"
                        >
                          <div 
                            className="group relative flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-primary/10 cursor-pointer transition-colors"
                            onClick={() => setPromptModal({ open: true, row, col, val: strVal })}
                            title="Кликните для открытия растягиваемого редактора / промптора"
                          >
                            <span
                              className="truncate font-mono text-[11px] flex-1 text-foreground/90 group-hover:text-primary"
                            >
                              {strVal || <span className="italic text-foreground/30">null</span>}
                            </span>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <span
                                className="p-1 text-primary hover:scale-110 transition-transform"
                                title="Редактировать поле / промпт"
                              >
                                <Edit3 size={12} />
                              </span>
                              {strVal.length > 30 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandModal({ open: true, title: `${selectedTable}.${col}`, content: strVal });
                                  }}
                                  className="p-1 text-foreground/40 hover:text-primary transition-colors"
                                  title="Развернуть полный текст"
                                >
                                  <Maximize2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}

                    <td className="p-3 text-center align-top">
                      <button
                        onClick={() =>
                          setConfirmModal({
                            open: true,
                            tableName: selectedTable,
                            rowId,
                            actionType: 'delete',
                          })
                        }
                        className="p-1.5 rounded-lg border border-primary/20 text-primary hover:bg-primary/10 transition-colors"
                        title="Удалить запись"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredAndSortedRows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="p-8 text-center text-foreground/40 italic">
                    Записи в таблице не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prompt / Field Modal Editor (Resizable & Full screen option) */}
      {promptModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl rounded-3xl border border-primary/30 bg-background/95 p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-primary/20 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="text-primary" size={20} />
                <h3 className="text-lg font-bold text-primary">
                  Промптор / Редактор поля {promptModal.col} ({selectedTable})
                </h3>
              </div>
              <button
                onClick={() => setPromptModal(null)}
                className="p-1 rounded-full hover:bg-primary/10 text-foreground/60 hover:text-primary"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/60">
                Текст промпта / значение поля (растягиваемое текстовое окно):
              </label>
              <textarea
                value={promptModal.val}
                onChange={(e) => setPromptModal({ ...promptModal, val: e.target.value })}
                className="w-full min-h-[250px] max-h-[60vh] resize-y rounded-2xl border border-primary/30 bg-background/80 p-4 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                placeholder="Введите промпт или данные поля..."
              />
              <div className="flex items-center justify-between text-xs text-foreground/50">
                <span>Длина: {promptModal.val.length} символов</span>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const formatted = JSON.stringify(JSON.parse(promptModal.val), null, 2);
                      setPromptModal({ ...promptModal, val: formatted });
                    } catch (e) {
                      alert('Текст не является валидным JSON');
                    }
                  }}
                  className="text-primary hover:underline font-bold"
                >
                  Форматировать JSON
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPromptModal(null)}
                className="rounded-full border border-primary/20 bg-background/40 px-5 py-2 text-xs font-bold text-foreground/70 hover:bg-background/60 transition-all"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  const { row, col, val } = promptModal;
                  requestCellSave(row, col, val);
                  setPromptModal(null);
                }}
                className="rounded-full bg-primary px-6 py-2 text-xs font-bold text-background hover:scale-105 transition-transform shadow-glow"
              >
                Сохранить в базу
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Row Modal */}
      {addRowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl rounded-3xl border border-primary/30 bg-background/95 p-6 shadow-2xl backdrop-blur-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-primary/20 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="text-primary" size={20} />
                <h3 className="text-lg font-bold text-primary">
                  Добавление записи в таблицу {selectedTable}
                </h3>
              </div>
              <button
                onClick={() => setAddRowModal(false)}
                className="p-1 rounded-full hover:bg-primary/10 text-foreground/60 hover:text-primary"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar">
              {columns.map((col) => (
                <div key={col} className="space-y-1">
                  <label className="text-xs font-bold text-primary font-mono">{col}:</label>
                  <textarea
                    rows={2}
                    value={newRowData[col] || ''}
                    onChange={(e) => setNewRowData((prev) => ({ ...prev, [col]: e.target.value }))}
                    placeholder={`Значение для ${col}...`}
                    className="w-full rounded-xl border border-primary/30 bg-background/80 p-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-primary/20">
              <button
                onClick={() => setAddRowModal(false)}
                className="rounded-full border border-primary/20 bg-background/40 px-5 py-2 text-xs font-bold text-foreground/70 hover:bg-background/60 transition-all"
              >
                Отмена
              </button>
              <button
                onClick={handleAddRow}
                className="rounded-full bg-primary px-6 py-2 text-xs font-bold text-background hover:scale-105 transition-transform shadow-glow"
              >
                Добавить запись
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Save or Delete */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-primary/30 bg-background/80 p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <AlertTriangle size={28} />
              <h3 className="text-xl font-bold tracking-tight">Подтверждение изменения базы данных</h3>
            </div>

            <div className="space-y-3 text-sm text-foreground/80">
              <p>
                Таблица: <strong className="text-primary">{confirmModal.tableName}</strong>
              </p>
              <p>
                Запись (ID): <code className="bg-primary/10 px-2 py-0.5 rounded text-primary font-mono">{String(confirmModal.rowId)}</code>
              </p>

              {confirmModal.actionType === 'cell' && (
                <div className="space-y-2 rounded-2xl border border-primary/20 bg-background/40 p-4 font-mono text-xs">
                  <div>
                    <span className="text-red-400 font-bold">Старое значение ({confirmModal.colName}):</span>
                    <p className="mt-1 p-2 rounded bg-background/60 border border-primary/10 text-foreground/60 max-h-24 overflow-y-auto">
                      {String(confirmModal.oldValue ?? '')}
                    </p>
                  </div>
                  <div>
                    <span className="text-emerald-400 font-bold">Новое значение ({confirmModal.colName}):</span>
                    <p className="mt-1 p-2 rounded bg-background/60 border border-emerald-500/30 text-emerald-300 max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {String(confirmModal.newValue ?? '')}
                    </p>
                  </div>
                </div>
              )}

              {confirmModal.actionType === 'delete' && (
                <p className="text-red-400 font-bold">
                  Вы действительно хотите удалить эту запись из базы данных? Это действие необратимо!
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="rounded-full border border-primary/20 bg-background/40 px-5 py-2 text-xs font-bold text-foreground/70 hover:bg-background/60 transition-all"
              >
                Отмена
              </button>
              <button
                onClick={confirmSaveAction}
                className="rounded-full bg-primary px-6 py-2 text-xs font-bold text-background hover:scale-105 transition-transform shadow-glow"
              >
                Подтвердить сохранение
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for JSON Restore */}
      {restoreModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-primary/30 bg-background/80 p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <Upload size={28} />
              <h3 className="text-xl font-bold tracking-tight">Восстановление базы данных из JSON</h3>
            </div>

            <div className="space-y-3 text-sm text-foreground/80">
              <p>
                Файл: <strong className="text-primary">{restoreModal.file?.name}</strong>
              </p>
              <p>
                Количество таблиц в бэкапе:{' '}
                <strong className="text-primary">{Object.keys(restoreModal.parsedData?.tables || {}).length}</strong>
              </p>
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300 space-y-1">
                <p className="font-bold">Внимание!</p>
                <p>
                  Восстановление базы данных перезапишет все таблицы совпавшими данными из выбранного бэкапа. Убедитесь,
                  что вы сохранили резервную копию перед этой операцией.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRestoreModal(null)}
                className="rounded-full border border-primary/20 bg-background/40 px-5 py-2 text-xs font-bold text-foreground/70 hover:bg-background/60 transition-all"
              >
                Отмена
              </button>
              <button
                onClick={confirmRestore}
                className="rounded-full bg-primary px-6 py-2 text-xs font-bold text-background hover:scale-105 transition-transform shadow-glow"
              >
                Восстановить сейчас
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Content Expand Modal */}
      {expandModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl rounded-3xl border border-primary/30 bg-background/90 p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-primary/20 pb-3">
              <h3 className="text-lg font-bold text-primary">{expandModal.title}</h3>
              <button
                onClick={() => setExpandModal(null)}
                className="p-1 rounded-full hover:bg-primary/10 text-foreground/60 hover:text-primary"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-primary/10 bg-background/50 p-4 font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {expandModal.content}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setExpandModal(null)}
                className="rounded-full bg-primary px-6 py-2 text-xs font-bold text-background hover:scale-105 transition-transform"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

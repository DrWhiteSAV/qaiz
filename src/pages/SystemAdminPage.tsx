import React, { useState, useEffect } from 'react';
import { Database, Table, Zap, Clock, Trash2, Edit, RefreshCw, HardDrive, ShieldCheck, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const SystemAdminPage: React.FC = () => {
  const { tables, setTables, activeTable, setActiveTable, selectedRowForDelete, setSelectedRowForDelete, selectedRowForEdit, setSelectedRowForEdit } = useAppStore();
  const [tableData, setTableData] = useState<{ columns: any[]; rows: any[] }>({ columns: [], rows: [] });
  const [triggers, setTriggers] = useState<any[]>([]);
  const [cronInfo, setCronInfo] = useState<{ jobs: any[]; logs: any[] }>({ jobs: [], logs: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'tables' | 'triggers' | 'cron'>('tables');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchTables();
    fetchTriggers();
    fetchCron();
  }, []);

  useEffect(() => {
    if (activeTable) {
      fetchTableRows(activeTable);
    }
  }, [activeTable]);

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/admin/system/tables');
      const data = await res.json();
      if (data.tables) {
        setTables(data.tables);
        if (!activeTable && data.tables.length > 0) {
          setActiveTable(data.tables[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching system tables:', err);
    }
  };

  const fetchTableRows = async (tableName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/system/table/${tableName}`);
      const data = await res.json();
      setTableData({ columns: data.columns || [], rows: data.rows || [] });
    } catch (err) {
      console.error('Error fetching table rows:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTriggers = async () => {
    try {
      const res = await fetch('/api/admin/system/triggers');
      const data = await res.json();
      setTriggers(data.triggers || []);
    } catch (err) {
      console.error('Error fetching triggers:', err);
    }
  };

  const fetchCron = async () => {
    try {
      const res = await fetch('/api/admin/system/cron');
      const data = await res.json();
      setCronInfo({ jobs: data.jobs || [], logs: data.logs || [] });
    } catch (err) {
      console.error('Error fetching cron:', err);
    }
  };

  const handleDeleteRow = async () => {
    if (!selectedRowForDelete) return;
    const { tableName, rowId } = selectedRowForDelete;
    try {
      const res = await fetch(`/api/admin/system/table/${tableName}/${rowId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: `Запись ${rowId} успешно удаленаиз таблицы ${tableName}` });
        setSelectedRowForDelete(null);
        fetchTableRows(tableName);
        fetchTables();
      } else {
        setStatusMsg({ type: 'error', text: 'Ошибка при удалении записи' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleSaveEditRow = async () => {
    if (!selectedRowForEdit) return;
    const { tableName, rowData } = selectedRowForEdit;
    const id = rowData.id || rowData.uid;
    try {
      const res = await fetch(`/api/admin/system/table/${tableName}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rowData)
      });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: `Запись ${id} успешно обновлена` });
        setSelectedRowForEdit(null);
        fetchTableRows(tableName);
      } else {
        setStatusMsg({ type: 'error', text: 'Ошибка при сохранении' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleTriggerBackup = async () => {
    try {
      const res = await fetch('/api/admin/system/cron/backup', { method: 'POST' });
      const data = await res.json();
      setStatusMsg({ type: 'success', text: data.message || 'Бэкап создан' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border/40 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">System Admin (SQLite Dashboard)</h1>
              <p className="text-sm text-foreground/60">
                Автономный мониторинг базы данных SQLite, триггеров и кронов
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerBackup}
              className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-medium rounded-xl transition flex items-center gap-2 text-sm"
            >
              <HardDrive className="w-4 h-4" />
              Создать бэкап БД
            </button>
            <button
              onClick={() => { fetchTables(); if (activeTable) fetchTableRows(activeTable); }}
              className="p-2.5 bg-muted hover:bg-muted/80 rounded-xl transition text-foreground"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Message Alert */}
        {statusMsg && (
          <div className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            statusMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'
          }`}>
            <div className="flex items-center gap-2">
              {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{statusMsg.text}</span>
            </div>
            <button onClick={() => setStatusMsg(null)}>
              <X className="w-4 h-4 opacity-70 hover:opacity-100" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border/40 pb-2">
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-2 font-medium text-sm rounded-xl transition flex items-center gap-2 ${
              activeTab === 'tables' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground/70'
            }`}
          >
            <Table className="w-4 h-4" />
            Таблицы БД ({tables.length})
          </button>
          <button
            onClick={() => setActiveTab('triggers')}
            className={`px-4 py-2 font-medium text-sm rounded-xl transition flex items-center gap-2 ${
              activeTab === 'triggers' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground/70'
            }`}
          >
            <Zap className="w-4 h-4" />
            Триггеры БД ({triggers.length})
          </button>
          <button
            onClick={() => setActiveTab('cron')}
            className={`px-4 py-2 font-medium text-sm rounded-xl transition flex items-center gap-2 ${
              activeTab === 'cron' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground/70'
            }`}
          >
            <Clock className="w-4 h-4" />
            Крон-задачи и Логи
          </button>
        </div>

        {/* TAB 1: TABLES */}
        {activeTab === 'tables' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Tables List Sidebar */}
            <div className="lg:col-span-1 space-y-2">
              <h3 className="text-xs uppercase font-semibold text-foreground/50 tracking-wider px-2">
                Таблицы в SQLite
              </h3>
              <div className="space-y-1">
                {tables.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setActiveTable(t.name)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition flex items-center justify-between ${
                      activeTable === t.name
                        ? 'bg-primary/10 text-primary font-semibold border border-primary/20'
                        : 'hover:bg-muted text-foreground/80'
                    }`}
                  >
                    <span className="truncate">{t.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-mono text-foreground/60">
                      {t.rowCount}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Table Records Content */}
            <div className="lg:col-span-3 bg-card rounded-2xl border border-border/40 overflow-hidden shadow-sm flex flex-col">
              <div className="p-4 border-b border-border/40 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-base">{activeTable || 'Выберите таблицу'}</h2>
                </div>
                <span className="text-xs text-foreground/50 font-mono">
                  {tableData.rows.length} записей
                </span>
              </div>

              <div className="overflow-x-auto flex-1 p-2">
                {loading ? (
                  <div className="p-12 text-center text-foreground/50 text-sm">Загрузка данных из SQLite...</div>
                ) : tableData.rows.length === 0 ? (
                  <div className="p-12 text-center text-foreground/50 text-sm">Таблица пуста</div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/20">
                        <th className="p-3 font-semibold text-foreground/70">Действия</th>
                        {tableData.columns.map((col) => (
                          <th key={col.name} className="p-3 font-semibold text-foreground/70 font-mono">
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {tableData.rows.map((row, idx) => {
                        const rowId = row.id || row.uid || idx;
                        return (
                          <tr key={idx} className="hover:bg-muted/30 transition">
                            <td className="p-3 flex items-center gap-2">
                              <button
                                onClick={() => setSelectedRowForEdit({ tableName: activeTable!, rowData: { ...row } })}
                                className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition"
                                title="Редактировать"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setSelectedRowForDelete({ tableName: activeTable!, rowId: String(rowId) })}
                                className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition"
                                title="Удалить"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                            {tableData.columns.map((col) => (
                              <td key={col.name} className="p-3 font-mono max-w-[200px] truncate text-foreground/80">
                                {typeof row[col.name] === 'object'
                                  ? JSON.stringify(row[col.name])
                                  : String(row[col.name] ?? '')}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TRIGGERS */}
        {activeTab === 'triggers' && (
          <div className="bg-card rounded-2xl border border-border/40 p-6 space-y-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Встроенные Триггеры SQLite ({triggers.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {triggers.map((trg) => (
                <div key={trg.name} className="p-4 bg-muted/30 border border-border/40 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-amber-500 font-mono">{trg.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-medium">
                      ON {trg.tbl_name}
                    </span>
                  </div>
                  <pre className="text-xs font-mono bg-background p-3 rounded-lg overflow-x-auto text-foreground/80 border border-border/20">
                    {trg.sql}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CRON & LOGS */}
        {activeTab === 'cron' && (
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-border/40 p-6 space-y-4">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Зарегистрированные Крон-задачи
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cronInfo.jobs.map((job) => (
                  <div key={job.name} className="p-4 bg-muted/30 border border-border/40 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{job.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-medium">
                        {job.status}
                      </span>
                    </div>
                    <div className="text-xs text-foreground/60 space-y-1 font-mono">
                      <p>Расписание: {job.schedule}</p>
                      <p>Последний запуск: {job.lastRun}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border/40 p-6 space-y-4">
              <h3 className="font-semibold text-base">Логи системных рассылок и задач</h3>
              {cronInfo.logs.length === 0 ? (
                <p className="text-sm text-foreground/50">Логи пока отсутствуют</p>
              ) : (
                <div className="space-y-2">
                  {cronInfo.logs.map((log, idx) => (
                    <div key={idx} className="p-3 bg-muted/20 border border-border/30 rounded-xl flex items-center justify-between text-xs font-mono">
                      <span>{log.type} &rarr; {log.recipient_id}</span>
                      <span className="text-foreground/50">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CUSTOM DELETE CONFIRMATION MODAL (No native browser alert/confirm) */}
        {selectedRowForDelete && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 text-red-500">
                <div className="p-3 bg-red-500/10 rounded-xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Подтверждение удаления</h3>
                  <p className="text-xs text-foreground/60">Кастомное модальное окно управления БД</p>
                </div>
              </div>

              <p className="text-sm text-foreground/80">
                Вы действительно хотите удалить запись <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-red-400">{selectedRowForDelete.rowId}</code> из таблицы <strong className="text-foreground">{selectedRowForDelete.tableName}</strong>? Это действие нельзя отменить.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setSelectedRowForDelete(null)}
                  className="px-4 py-2 text-sm font-medium rounded-xl hover:bg-muted transition text-foreground/80"
                >
                  Отмена
                </button>
                <button
                  onClick={handleDeleteRow}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-red-500 hover:bg-red-600 text-white transition shadow-lg shadow-red-500/20"
                >
                  Да, удалить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM EDIT ROW MODAL */}
        {selectedRowForEdit && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Edit className="w-4 h-4 text-blue-500" />
                  Редактирование записи ({selectedRowForEdit.tableName})
                </h3>
                <button onClick={() => setSelectedRowForEdit(null)} className="p-1 rounded-lg hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                {Object.keys(selectedRowForEdit.rowData).map((key) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs font-mono font-semibold text-foreground/70">{key}</label>
                    <input
                      type="text"
                      disabled={key === 'id' || key === 'uid'}
                      value={typeof selectedRowForEdit.rowData[key] === 'object' ? JSON.stringify(selectedRowForEdit.rowData[key]) : String(selectedRowForEdit.rowData[key] ?? '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedRowForEdit({
                          ...selectedRowForEdit,
                          rowData: { ...selectedRowForEdit.rowData, [key]: val }
                        });
                      }}
                      className="w-full px-3 py-2 text-xs font-mono bg-muted/40 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
                <button
                  onClick={() => setSelectedRowForEdit(null)}
                  className="px-4 py-2 text-sm font-medium rounded-xl hover:bg-muted transition"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveEditRow}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground transition shadow-md"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SystemAdminPage;

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Terminal,
  Activity,
  Layers
} from 'lucide-react';
import { TargetConfig, AutomationSettings, ExecutionRowResult, LogMessage, ExecutionSession } from '../types';
import { ParsedSheetData, exportResultsToExcel } from '../utils/excel';
import { StorageService } from '../services/storage';
import { sendMessageToTab } from '../utils/chromeTab';

interface RunnerPageProps {
  sheetData: ParsedSheetData | null;
  config: TargetConfig;
  configs?: TargetConfig[];
  onSelectConfig?: (configId: string) => void;
  settings: AutomationSettings;
  onGoToUpload: () => void;
}

export const RunnerPage: React.FC<RunnerPageProps> = ({
  sheetData,
  config,
  configs,
  onSelectConfig,
  settings,
  onGoToUpload,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const [results, setResults] = useState<ExecutionRowResult[]>([]);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [activeTabUrl, setActiveTabUrl] = useState<string>('');
  const [targetTabId, setTargetTabId] = useState<number | null>(null);
  const [availableTabs, setAvailableTabs] = useState<{ id: number; title: string; url: string }[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isPausedRef = useRef(isPaused);
  const isRunningRef = useRef(isRunning);
  isPausedRef.current = isPaused;
  isRunningRef.current = isRunning;

  const loadOpenTabs = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({}, (tabs) => {
        const validTabs = (tabs || [])
          .filter(
            (t) =>
              t.id !== undefined &&
              t.url &&
              !t.url.startsWith('chrome-extension://') &&
              !t.url.startsWith('chrome://') &&
              !t.url.startsWith('devtools://') &&
              !t.url.startsWith('edge://')
          )
          .map((t) => ({
            id: t.id!,
            title: t.title || t.url || 'Halaman Web',
            url: t.url!,
          }));

        setAvailableTabs(validTabs);

        // Auto select current active tab or first valid tab
        chrome.tabs.query({ active: true, currentWindow: true }, (active) => {
          const currentActive = active?.[0];
          if (currentActive && currentActive.id && validTabs.some((vt) => vt.id === currentActive.id)) {
            setTargetTabId(currentActive.id);
            setActiveTabUrl(currentActive.url || '');
          } else if (validTabs.length > 0 && !targetTabId) {
            setTargetTabId(validTabs[0].id);
            setActiveTabUrl(validTabs[0].url);
          }
        });
      });
    } else {
      setActiveTabUrl(window.location.href);
      setAvailableTabs([{ id: 1, title: 'Demo Web Page', url: window.location.href }]);
      setTargetTabId(1);
    }
  };

  useEffect(() => {
    loadOpenTabs();
  }, []);

  // Initialize row results when sheetData changes
  useEffect(() => {
    if (sheetData) {
      const initialResults: ExecutionRowResult[] = sheetData.rows.map((row, idx) => ({
        rowIndex: idx,
        data: row,
        status: 'PENDING',
      }));
      setResults(initialResults);
    }
  }, [sheetData]);

  const addLog = (level: 'info' | 'warn' | 'error' | 'success', message: string, rowIndex?: number) => {
    const newLog: LogMessage = {
      id: 'log-' + Date.now() + '-' + Math.random(),
      timestamp: Date.now(),
      level,
      message,
      rowIndex,
    };
    setLogs((prev) => [newLog, ...prev].slice(0, 150));
  };

  const executeRowViaTab = async (row: Record<string, any>, _rowIndex: number): Promise<{ success: boolean; error?: string }> => {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      await new Promise((r) => setTimeout(r, settings.defaultDelayMs + 300));
      return { success: true };
    }

    let tabId = targetTabId;
    if (!tabId) {
      const activeTabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (t) => resolve(t || []));
      });
      const validActive = activeTabs.find(
        (t) => t.id && t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://')
      );
      if (validActive?.id) {
        tabId = validActive.id;
        setTargetTabId(tabId);
      }
    }

    if (!tabId) {
      return { success: false, error: 'Tidak ada tab target yang dipilih. Pastikan tab website/form target sudah terbuka di browser.' };
    }

    const rowPayload = {
      row,
      config,
      settings: {
        timeoutMs: settings.timeoutElementMs,
        highlight: settings.highlightElements,
        defaultDelayMs: settings.defaultDelayMs,
        humanizeTyping: settings.humanizeTyping !== false,
        randomDelayJitterMs: settings.randomDelayJitterMs ?? 250,
      },
    };

    try {
      const response = await sendMessageToTab<{ success: boolean; error?: string }>(tabId, {
        type: 'EXECUTE_ROW',
        payload: rowPayload,
      });

      return response || { success: false, error: 'Tidak ada respons dari tab.' };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  };

  const startAutomation = async (onlyFailedRows = false) => {
    if (!sheetData || sheetData.rows.length === 0) {
      alert('Belum ada data Excel yang dimuat. Silakan unggah data terlebih dahulu.');
      return;
    }

    if (!config.mappings || config.mappings.length === 0) {
      alert(`Target preset "${config.name}" belum memiliki mapping kolom! Silakan buka tab "Mapping Field" untuk mengatur mapping elemen website.`);
      return;
    }

    setShowConfirmModal(false);
    isRunningRef.current = true;
    isPausedRef.current = false;
    setIsRunning(true);
    setIsPaused(false);

    const rowsToProcess = onlyFailedRows
      ? results.filter((r) => r.status === 'FAILED')
      : results;

    addLog('info', `Mulai otomatisasi (${rowsToProcess.length} baris data) pada target: ${config.name}`);

    for (let i = 0; i < sheetData.rows.length; i++) {
      if (!isRunningRef.current) {
        addLog('warn', 'Otomatisasi dihentikan oleh user.');
        break;
      }

      // Handle Pause
      while (isPausedRef.current && isRunningRef.current) {
        await new Promise((r) => setTimeout(r, 400));
      }

      if (!isRunningRef.current) break;

      const currentStatus = results[i]?.status;
      if (onlyFailedRows && currentStatus !== 'FAILED') {
        continue;
      }

      setCurrentRowIndex(i);
      setResults((prev) =>
        prev.map((r) => (r.rowIndex === i ? { ...r, status: 'RUNNING' } : r))
      );

      addLog('info', `Menginput baris ke-${i + 1}...`, i);
      const startTime = Date.now();

      const execResult = await executeRowViaTab(sheetData.rows[i], i);
      const durationMs = Date.now() - startTime;

      if (execResult.success) {
        setResults((prev) =>
          prev.map((r) =>
            r.rowIndex === i
              ? { ...r, status: 'SUCCESS', errorDetail: undefined, durationMs, processedAt: Date.now() }
              : r
          )
        );
        addLog('success', `Baris ke-${i + 1} berhasil diinput (${durationMs}ms)`, i);
      } else {
        setResults((prev) =>
          prev.map((r) =>
            r.rowIndex === i
              ? { ...r, status: 'FAILED', errorDetail: execResult.error, durationMs, processedAt: Date.now() }
              : r
          )
        );
        addLog('error', `Baris ke-${i + 1} GAGAL: ${execResult.error}`, i);

        if (settings.stopOnError) {
          addLog('warn', 'Berhenti karena opsi "Hentikan jika terjadi error" aktif.');
          isRunningRef.current = false;
          setIsRunning(false);
          break;
        }
      }
    }

    isRunningRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
    addLog('info', 'Proses otomatisasi selesai.');

    // Save session to history
    saveSessionSummary();
  };

  const saveSessionSummary = () => {
    const successCount = results.filter((r) => r.status === 'SUCCESS').length;
    const failedCount = results.filter((r) => r.status === 'FAILED').length;
    const skippedCount = results.filter((r) => r.status === 'SKIPPED' || r.status === 'PENDING').length;

    const session: ExecutionSession = {
      id: 'session-' + Date.now(),
      configId: config.id,
      configName: config.name,
      targetUrl: activeTabUrl,
      totalRows: sheetData?.totalRows || 0,
      successCount,
      failedCount,
      skippedCount,
      status: 'COMPLETED',
      startTime: Date.now(),
      endTime: Date.now(),
      results,
      logs,
    };

    StorageService.saveSessionToHistory(session);
  };

  const handleStop = () => {
    isRunningRef.current = false;
    isPausedRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
    addLog('warn', 'Otomatisasi dihentikan.');
  };

  const handleTogglePause = () => {
    const nextState = !isPaused;
    isPausedRef.current = nextState;
    setIsPaused(nextState);
    addLog('info', nextState ? 'Otomatisasi dijeda.' : 'Otomatisasi dilanjutkan.');
  };

  const handleExport = () => {
    exportResultsToExcel(results, `Hasil_${config.name.replace(/\s+/g, '_')}`);
  };

  const successCount = results.filter((r) => r.status === 'SUCCESS').length;
  const failedCount = results.filter((r) => r.status === 'FAILED').length;
  const pendingCount = results.filter((r) => r.status === 'PENDING' || r.status === 'RUNNING').length;
  const total = results.length || 1;
  const progressPercent = Math.round(((successCount + failedCount) / total) * 100);

  if (!sheetData) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-3">
        <Layers className="h-12 w-12 text-gray-400 mx-auto" />
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Data Spreadsheet Belum Dimuat</h3>
        <p className="text-xs text-gray-500">
          Silakan unggah file Excel atau CSV terlebih dahulu untuk memulai otomatisasi input.
        </p>
        <button
          onClick={onGoToUpload}
          className="px-4 py-2 bg-sky-500 text-white rounded-lg text-xs font-semibold hover:bg-sky-600 transition-colors shadow-xs"
        >
          Ke Halaman Upload
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Automation Runner</h2>
              {configs && configs.length > 1 && onSelectConfig ? (
                <select
                  value={config.id}
                  onChange={(e) => onSelectConfig(e.target.value)}
                  className="text-xs px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 font-semibold border border-sky-200 dark:border-sky-800"
                >
                  {configs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.mappings.length} field)
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 font-semibold border border-sky-200 dark:border-sky-800">
                  {config.name} ({config.mappings.length} field)
                </span>
              )}
            </div>

            {/* Target Tab Selector */}
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span>Target Tab:</span>
              {availableTabs.length > 1 ? (
                <select
                  value={targetTabId || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setTargetTabId(id);
                    const selected = availableTabs.find((t) => t.id === id);
                    if (selected) setActiveTabUrl(selected.url);
                  }}
                  className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-xs font-mono max-w-xs truncate text-gray-900 dark:text-white"
                >
                  {availableTabs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.url.slice(0, 45)}...)
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-mono text-gray-800 dark:text-gray-200 max-w-xs truncate">
                  {activeTabUrl || 'Tab Aktif'}
                </span>
              )}
              <button
                onClick={loadOpenTabs}
                className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline ml-1"
                title="Refresh daftar tab terbuka"
              >
                (Refresh Tab)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isRunning ? (
              <>
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Mulai Otomatisasi
                </button>
                {failedCount > 0 && (
                  <button
                    onClick={() => startAutomation(true)}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Retry ({failedCount}) Gagal
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={handleTogglePause}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {isPaused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5 fill-current" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={handleStop}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Stop
                </button>
              </>
            )}

            <button
              onClick={handleExport}
              className="px-3.5 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export Hasil
            </button>
          </div>
        </div>

        {/* Progress Bar & KPI Stats */}
        <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Progress Eksekusi ({progressPercent}%)
            </span>
            <span className="text-gray-500">
              Baris {currentRowIndex + 1} dari {results.length}
            </span>
          </div>

          <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 transition-all duration-300"
              style={{ width: `${(successCount / total) * 100}%` }}
            />
            <div
              className="bg-rose-500 transition-all duration-300"
              style={{ width: `${(failedCount / total) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-center">
              <span className="text-[10px] text-gray-500 block">Total Data</span>
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{results.length}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 text-center">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">Berhasil</span>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{successCount}</span>
            </div>
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 text-center">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-medium">Gagal</span>
              <span className="text-sm font-bold text-rose-700 dark:text-rose-300">{failedCount}</span>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 text-center">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-medium">Pending</span>
              <span className="text-sm font-bold text-amber-700 dark:text-amber-300">{pendingCount}</span>
            </div>
          </div>

          {/* Side Panel / Popout Tip */}
          <div className="p-2.5 bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-lg flex items-center justify-between text-[11px] text-sky-800 dark:text-sky-300">
            <span>
              💡 <strong>Rekomendasi Nyata:</strong> Gunakan <strong>Panel Samping (Side Panel)</strong> atau <strong>Tab Penuh</strong> pada icon navbar atas agar otomatisasi tidak terputus saat Anda mengeklik halaman website.
            </span>
          </div>
        </div>
      </div>

      {/* Main Execution View: Table + Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Table View */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 shadow-xs space-y-2">
          <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-sky-500" />
              Status Baris Data
            </span>
          </h3>

          <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 z-10">
                <tr>
                  <th className="p-2 font-semibold text-gray-600 dark:text-gray-400 w-10 text-center">#</th>
                  <th className="p-2 font-semibold text-gray-600 dark:text-gray-400 w-24">Status</th>
                  <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Preview Data</th>
                  <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {results.map((r, idx) => {
                  let badge = (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      Pending
                    </span>
                  );
                  if (r.status === 'RUNNING') {
                    badge = (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300 animate-pulse">
                        Proses...
                      </span>
                    );
                  } else if (r.status === 'SUCCESS') {
                    badge = (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" /> Sukses
                      </span>
                    );
                  } else if (r.status === 'FAILED') {
                    badge = (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        <XCircle className="h-3 w-3" /> Gagal
                      </span>
                    );
                  }

                  const firstVal = Object.values(r.data)[0] || '';
                  const secondVal = Object.values(r.data)[1] || '';

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${
                        r.status === 'RUNNING' ? 'bg-sky-50/50 dark:bg-sky-950/30' : ''
                      }`}
                    >
                      <td className="p-2 text-center text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="p-2">{badge}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300 font-medium truncate max-w-xs">
                        {String(firstVal)} {secondVal ? `(${String(secondVal)})` : ''}
                      </td>
                      <td className="p-2 text-[11px] text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {r.errorDetail ? (
                          <span className="text-rose-600 dark:text-rose-400">{r.errorDetail}</span>
                        ) : r.durationMs ? (
                          <span className="text-gray-400">{r.durationMs}ms</span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Logs Terminal */}
        <div className="lg:col-span-5 bg-gray-900 text-gray-100 rounded-xl p-3 shadow-xs space-y-2 font-mono text-xs flex flex-col h-96">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <span className="flex items-center gap-1.5 text-gray-300 font-semibold text-[11px]">
              <Terminal className="h-3.5 w-3.5 text-sky-400" />
              Live Activity Logs
            </span>
            <button
              onClick={() => setLogs([])}
              className="text-[10px] text-gray-400 hover:text-white"
            >
              Clear
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-[11px]">
            {logs.length === 0 ? (
              <p className="text-gray-600 text-[11px]">Belum ada aktivitas tercatat.</p>
            ) : (
              logs.map((log) => {
                let color = 'text-gray-300';
                if (log.level === 'error') color = 'text-rose-400';
                if (log.level === 'warn') color = 'text-amber-400';
                if (log.level === 'success') color = 'text-emerald-400';

                return (
                  <div key={log.id} className="flex items-start gap-1 leading-relaxed">
                    <span className="text-gray-600 shrink-0 text-[10px]">
                      {new Date(log.timestamp).toTimeString().slice(0, 8)}
                    </span>
                    <span className={color}>{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal before starting */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Konfirmasi Eksekusi Otomatisasi</h3>
                <p className="text-xs text-gray-500">Pastikan tab website target sudah terbuka di browser.</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
              <p>• <strong>Target Preset:</strong> {config.name}</p>
              <p>• <strong>Total Baris Data:</strong> {sheetData.totalRows} baris</p>
              <p>• <strong>Field yang Dimapping:</strong> {config.mappings.length} elemen DOM</p>
              <p>• <strong>Submit Otomatis:</strong> {config.submitSelector?.primarySelector ? 'Aktif' : 'Tidak aktif'}</p>
            </div>

            <p className="text-[11px] text-gray-500">
              Data akan diinput langsung ke halaman website aktif menggunakan browser DOM. Seluruh proses berjalan lokal.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => startAutomation(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                Ya, Mulai Input
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

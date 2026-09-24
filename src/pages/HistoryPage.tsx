import React, { useState, useEffect } from 'react';
import { History, Download, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { ExecutionSession } from '../types';
import { StorageService } from '../services/storage';
import { exportResultsToExcel } from '../utils/excel';

export const HistoryPage: React.FC = () => {
  const [sessions, setSessions] = useState<ExecutionSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ExecutionSession | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const list = await StorageService.getHistory();
    setSessions(list);
    if (list.length > 0 && !selectedSession) {
      setSelectedSession(list[0]);
    }
  };

  const handleClear = async () => {
    if (confirm('Hapus seluruh riwayat eksekusi?')) {
      await StorageService.clearHistory();
      setSessions([]);
      setSelectedSession(null);
    }
  };

  const handleExportSession = (session: ExecutionSession) => {
    exportResultsToExcel(session.results, `Riwayat_${session.configName.replace(/\s+/g, '_')}`);
  };

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <History className="h-4 w-4 text-sky-500" />
            Riwayat Eksekusi & Laporan
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Daftar sesi otomatisasi yang pernah dijalankan beserta log dan hasil per baris.
          </p>
        </div>

        {sessions.length > 0 && (
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1 font-medium transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hapus Semua Riwayat
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
          <History className="h-10 w-10 text-gray-400 mx-auto mb-2" />
          <p className="text-xs text-gray-500">Belum ada riwayat proses otomatisasi yang tersimpan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Sessions List */}
          <div className="md:col-span-5 space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {sessions.map((s) => {
              const isSelected = selectedSession?.id === s.id;
              const dateStr = new Date(s.startTime).toLocaleString('id-ID', {
                dateStyle: 'short',
                timeStyle: 'short',
              });

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSession(s)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 shadow-xs'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[200px]">
                      {s.configName}
                    </h3>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {dateStr}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                      {s.successCount} Sukses
                    </span>
                    {s.failedCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-semibold">
                        {s.failedCount} Gagal
                      </span>
                    )}
                    <span className="text-gray-400">Total: {s.totalRows}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Session Detail View */}
          <div className="md:col-span-7 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-xs space-y-3">
            {selectedSession ? (
              <>
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                      Detail Sesi: {selectedSession.configName}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-mono truncate max-w-sm">
                      {selectedSession.targetUrl}
                    </p>
                  </div>

                  <button
                    onClick={() => handleExportSession(selectedSession)}
                    className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export Excel
                  </button>
                </div>

                {/* Summary Badges */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-[10px] text-gray-500 block">Total Baris</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{selectedSession.totalRows}</span>
                  </div>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">Berhasil</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">{selectedSession.successCount}</span>
                  </div>
                  <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-lg">
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 block">Gagal</span>
                    <span className="font-bold text-rose-700 dark:text-rose-300">{selectedSession.failedCount}</span>
                  </div>
                </div>

                {/* Results List */}
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Rincian Hasil Baris:</h4>
                  <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg border border-gray-100 dark:border-gray-800 p-1">
                    {selectedSession.results.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate max-w-xs">
                          {r.status === 'SUCCESS' ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          )}
                          <span className="font-mono text-gray-400 text-[10px]">#{r.rowIndex + 1}</span>
                          <span className="text-gray-700 dark:text-gray-300 truncate">
                            {Object.values(r.data)[0] || 'Data Baris'}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {r.errorDetail ? (
                            <span className="text-rose-500">{r.errorDetail}</span>
                          ) : (
                            `${r.durationMs || 0}ms`
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-500 text-center py-8">Pilih sesi untuk melihat detail.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

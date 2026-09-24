import React, { useState } from 'react';
import { TargetConfig } from '../types';
import { Globe, Plus, Trash2, Edit2, Check, Download, Upload } from 'lucide-react';

interface TargetWebPageProps {
  configs: TargetConfig[];
  activeConfigId: string;
  onSelectConfig: (configId: string) => void;
  onSaveConfig: (config: TargetConfig) => void;
  onDeleteConfig: (configId: string) => void;
  onImportConfigs: (configs: TargetConfig[]) => void;
}

export const TargetWebPage: React.FC<TargetWebPageProps> = ({
  configs,
  activeConfigId,
  onSelectConfig,
  onSaveConfig,
  onDeleteConfig,
  onImportConfigs
}) => {
  const [editingConfig, setEditingConfig] = useState<TargetConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const startNewConfig = () => {
    const newConfig: TargetConfig = {
      id: 'cfg-' + Date.now(),
      name: 'Konfigurasi Website Baru',
      urlPattern: 'https://example.com/admin/*',
      mappings: [],
      submitSelector: {
        selectorType: 'css',
        primarySelector: 'button[type="submit"]',
        fallbackSelectors: []
      },
      navigation: {
        delayBetweenRowsMs: 1000,
        maxRetriesPerRow: 2
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setEditingConfig(newConfig);
    setIsCreating(true);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(configs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `autodatafiller-configs-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string);
        if (Array.isArray(imported)) {
          onImportConfigs(imported);
          alert('Berhasil mengimpor ' + imported.length + ' konfigurasi website!');
        } else if (imported.id && imported.mappings) {
          onImportConfigs([imported]);
          alert('Berhasil mengimpor 1 konfigurasi website!');
        }
      } catch {
        alert('File JSON tidak valid.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Globe className="h-4 w-4 text-sky-500" />
            Pengaturan Target Website & Preset Form
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Pilih atau buat preset otomatisasi untuk berbagai dashboard & form target.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors">
            <Upload className="h-3 w-3" />
            Import JSON
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Download className="h-3 w-3" />
            Export JSON
          </button>

          <button
            onClick={startNewConfig}
            className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Preset Baru
          </button>
        </div>
      </div>

      {/* Editing / Creating Modal or Inline Editor */}
      {editingConfig && (
        <div className="p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl space-y-3">
          <h3 className="text-xs font-bold text-sky-900 dark:text-sky-200">
            {isCreating ? 'Buat Konfigurasi Website Baru' : 'Edit Nama & URL Website'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Nama Preset Website
              </label>
              <input
                type="text"
                value={editingConfig.name}
                onChange={(e) => setEditingConfig({ ...editingConfig, name: e.target.value })}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-xs text-gray-900 dark:text-white"
                placeholder="Contoh: Dashboard Admin ERP"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Pola URL Target (Pattern)
              </label>
              <input
                type="text"
                value={editingConfig.urlPattern}
                onChange={(e) => setEditingConfig({ ...editingConfig, urlPattern: e.target.value })}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-xs font-mono text-gray-900 dark:text-white"
                placeholder="Contoh: https://app.example.com/*"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => {
                setEditingConfig(null);
                setIsCreating(false);
              }}
              className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:underline font-medium"
            >
              Batal
            </button>
            <button
              onClick={() => {
                onSaveConfig(editingConfig);
                setEditingConfig(null);
                setIsCreating(false);
              }}
              className="px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Simpan Preset
            </button>
          </div>
        </div>
      )}

      {/* List of Configs */}
      <div className="grid grid-cols-1 gap-3">
        {configs.map((cfg) => {
          const isSelected = cfg.id === activeConfigId;
          return (
            <div
              key={cfg.id}
              className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isSelected
                  ? 'border-sky-500 bg-sky-50/40 dark:bg-sky-950/20 shadow-xs'
                  : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white">{cfg.name}</h3>
                  {isSelected && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate max-w-md">
                  {cfg.urlPattern}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  <span>{cfg.mappings.length} Field Mapping</span>
                  <span>•</span>
                  <span>Submit: {cfg.submitSelector?.primarySelector || 'Tidak ada'}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {!isSelected && (
                  <button
                    onClick={() => onSelectConfig(cfg.id)}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Pilih
                  </button>
                )}
                <button
                  onClick={() => setEditingConfig(cfg)}
                  className="p-1.5 text-gray-500 hover:text-sky-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title="Edit Preset"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                {configs.length > 1 && (
                  <button
                    onClick={() => {
                      if (confirm(`Hapus preset "${cfg.name}"?`)) {
                        onDeleteConfig(cfg.id);
                      }
                    }}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                    title="Hapus Preset"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

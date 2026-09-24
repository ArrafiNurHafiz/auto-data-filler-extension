import React, { useState, useEffect } from 'react';
import { TargetConfig, FieldMapping, SelectorType, ActionType, PickedElementInfo } from '../types';
import { Plus, Trash2, Save, Sparkles, Layers, Crosshair, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import { sendMessageToTab, getActiveWebTab } from '../utils/chromeTab';

interface MappingPageProps {
  excelHeaders: string[];
  activeConfig: TargetConfig;
  onSaveConfig: (updatedConfig: TargetConfig) => void;
  onGoToRunner: () => void;
}

export const MappingPage: React.FC<MappingPageProps> = ({
  excelHeaders,
  activeConfig,
  onSaveConfig,
  onGoToRunner,
}) => {
  const [mappings, setMappings] = useState<FieldMapping[]>(activeConfig.mappings || []);
  const [submitSelector, setSubmitSelector] = useState(
    activeConfig.submitSelector || {
      selectorType: 'css' as SelectorType,
      primarySelector: 'button[type="submit"]',
      fallbackSelectors: [],
    }
  );
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pickingFieldId, setPickingFieldId] = useState<string | 'submit' | null>(null);
  const [testStatus, setTestStatus] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // Sync state if activeConfig changes
  useEffect(() => {
    setMappings(activeConfig.mappings || []);
    if (activeConfig.submitSelector) {
      setSubmitSelector(activeConfig.submitSelector);
    }
  }, [activeConfig.id]);

  // Helper to apply picked element to state
  const applyPickedElement = (info: PickedElementInfo & { fieldId?: string | 'submit' }) => {
    const targetId = info.fieldId || pickingFieldId;
    if (!targetId) return;

    if (targetId === 'submit') {
      setSubmitSelector({
        selectorType: info.bestSelectorType,
        primarySelector: info.bestSelector,
        fallbackSelectors: info.fallbackSelectors,
      });
    } else {
      setMappings((prev) =>
        prev.map((m) => {
          if (m.id === targetId) {
            return {
              ...m,
              primarySelector: info.bestSelector,
              selectorType: info.bestSelectorType,
              fallbackSelectors: info.fallbackSelectors,
              actionType: info.suggestedActionType,
              targetName: m.targetName && m.targetName !== 'Field Baru' ? m.targetName : info.targetNameSuggestion,
            };
          }
          return m;
        })
      );
    }
    setPickingFieldId(null);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.remove(['lastPickedElement', 'activePickingField']);
    }
  };

  // Listen for picked element message from content script & storage
  useEffect(() => {
    if (typeof chrome === 'undefined') return;

    // Check if there is a pending picked element from background storage
    if (chrome.storage?.local) {
      chrome.storage.local.get(['lastPickedElement', 'activePickingField'], (res) => {
        if (res?.lastPickedElement) {
          applyPickedElement(res.lastPickedElement);
        } else if (res?.activePickingField) {
          setPickingFieldId(res.activePickingField);
        }
      });
    }

    if (chrome.runtime?.onMessage) {
      const listener = (message: any) => {
        if (message.type === 'ELEMENT_PICKED') {
          applyPickedElement(message.payload);
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    }
  }, [pickingFieldId]);

  const startPickingForField = async (fieldId: string | 'submit') => {
    setPickingFieldId(fieldId);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ activePickingField: fieldId });
    }

    if (typeof chrome === 'undefined' || !chrome.tabs) {
      alert('Mode simulasi (bukan di browser extension). Fitur picker memerlukan ekstensi aktif.');
      return;
    }

    try {
      const activeTab = await getActiveWebTab();
      if (!activeTab?.id) {
        alert('Tidak menemukan tab website target. Harap buka tab halaman form Anda.');
        setPickingFieldId(null);
        return;
      }

      await sendMessageToTab(activeTab.id, {
        type: 'START_ELEMENT_PICKER',
        payload: { fieldId },
      });
    } catch (err: any) {
      console.warn('[AutoDataFiller] Error injecting picker:', err.message);
      alert(`Gagal mengaktifkan picker: ${err.message}`);
      setPickingFieldId(null);
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.remove(['activePickingField']);
      }
    }
  };

  const testHighlightElement = async (selectorType: SelectorType, selectorValue: string, testId: string) => {
    if (!selectorValue || !selectorValue.trim()) {
      setTestStatus({ id: testId, success: false, message: 'Selector masih kosong.' });
      return;
    }

    if (typeof chrome === 'undefined' || !chrome.tabs) {
      setTestStatus({ id: testId, success: true, message: 'Simulasi: selector valid.' });
      setTimeout(() => setTestStatus(null), 3000);
      return;
    }

    try {
      const activeTab = await getActiveWebTab();
      if (!activeTab?.id) {
        setTestStatus({ id: testId, success: false, message: 'Tidak ada tab website aktif.' });
        return;
      }

      const res = await sendMessageToTab<{ success: boolean; error?: string }>(activeTab.id, {
        type: 'HIGHLIGHT_ELEMENT',
        payload: { selectorType, selectorValue },
      });

      if (!res?.success) {
        setTestStatus({
          id: testId,
          success: false,
          message: res?.error || 'Elemen tidak ditemukan di halaman.',
        });
      } else {
        setTestStatus({ id: testId, success: true, message: 'Elemen ditemukan & disorot di website!' });
      }
    } catch (err: any) {
      setTestStatus({
        id: testId,
        success: false,
        message: err?.message || 'Gagal berkomunikasi dengan halaman.',
      });
    }
    setTimeout(() => setTestStatus(null), 3500);
  };

  const addMappingRow = () => {
    const newField: FieldMapping = {
      id: 'map-' + Date.now(),
      excelColumn: excelHeaders[0] || '',
      targetName: 'Field Baru',
      selectorType: 'css',
      primarySelector: '',
      fallbackSelectors: [],
      actionType: 'type',
      isRequired: false,
      clearBeforeType: true,
    };
    setMappings([...mappings, newField]);
  };

  const removeMappingRow = (id: string) => {
    setMappings(mappings.filter((m) => m.id !== id));
  };

  const updateMapping = (id: string, updates: Partial<FieldMapping>) => {
    setMappings(mappings.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const [testingAll, setTestingAll] = useState(false);
  const [fieldTestResults, setFieldTestResults] = useState<Record<string, boolean>>({});

  const testAllMappings = async () => {
    if (mappings.length === 0) return;
    setTestingAll(true);
    setFieldTestResults({});

    if (typeof chrome === 'undefined' || !chrome.tabs) {
      const mockRes: Record<string, boolean> = {};
      mappings.forEach((m) => {
        mockRes[m.id] = true;
      });
      setFieldTestResults(mockRes);
      setTestingAll(false);
      return;
    }

    try {
      const activeTab = await getActiveWebTab();
      if (!activeTab?.id) {
        alert('Tidak menemukan tab website target yang aktif.');
        setTestingAll(false);
        return;
      }

      const resultsMap: Record<string, boolean> = {};
      for (const m of mappings) {
        if (!m.primarySelector) {
          resultsMap[m.id] = false;
          continue;
        }
        try {
          const res = await sendMessageToTab<{ success: boolean }>(activeTab.id, {
            type: 'HIGHLIGHT_ELEMENT',
            payload: { selectorType: m.selectorType, selectorValue: m.primarySelector },
          });
          resultsMap[m.id] = !!res?.success;
        } catch {
          resultsMap[m.id] = false;
        }
      }
      setFieldTestResults(resultsMap);
    } catch (err: any) {
      alert(`Gagal mengetes elemen: ${err.message}`);
    } finally {
      setTestingAll(false);
    }
  };

  const autoGenerateMappings = () => {
    const generated: FieldMapping[] = excelHeaders.map((header, idx) => {
      const lower = header.toLowerCase();
      let selectorType: SelectorType = 'css';
      let primarySelector = '';
      let actionType: ActionType = 'type';
      const fallbacks: string[] = [];

      if (lower.includes('email') || lower.includes('surel')) {
        primarySelector = 'input[type="email"], input[name*="email" i], #email';
        fallbacks.push(`input[placeholder*="${header}" i]`);
      } else if (lower.includes('nama') || lower.includes('name')) {
        primarySelector = 'input[name*="name" i], input[name*="nama" i], #name, #nama';
        fallbacks.push(`input[placeholder*="${header}" i]`);
      } else if (lower.includes('telp') || lower.includes('phone') || lower.includes('hp') || lower.includes('wa')) {
        primarySelector = 'input[type="tel"], input[name*="phone" i], input[name*="telepon" i]';
        fallbacks.push(`input[placeholder*="${header}" i]`);
      } else if (lower.includes('kategori') || lower.includes('category') || lower.includes('role') || lower.includes('status')) {
        primarySelector = `select[name*="${lower}" i], select#${lower}`;
        actionType = 'select';
        fallbacks.push(`select`);
      } else if (lower.includes('alamat') || lower.includes('address') || lower.includes('catatan') || lower.includes('pesan') || lower.includes('desc')) {
        primarySelector = `textarea[name*="${lower}" i], textarea#${lower}`;
        fallbacks.push(`textarea`);
      } else {
        primarySelector = `input[name*="${lower}" i], #${lower}`;
        fallbacks.push(`input[placeholder*="${header}" i]`);
      }

      return {
        id: `auto-map-${idx}-${Date.now()}`,
        excelColumn: header,
        targetName: `Input ${header}`,
        selectorType,
        primarySelector,
        fallbackSelectors: fallbacks,
        actionType,
        isRequired: false,
        clearBeforeType: true,
      };
    });

    setMappings(generated);
  };

  const handleSave = () => {
    const updated: TargetConfig = {
      ...activeConfig,
      mappings,
      submitSelector,
      updatedAt: Date.now(),
    };
    onSaveConfig(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="p-3 space-y-3 max-w-5xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-800 pb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5 truncate">
              <Layers className="h-3.5 w-3.5 text-sky-500 shrink-0" />
              Mapping Form Web
            </h2>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-semibold shrink-0">
              {mappings.length} Field
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
            Preset: <span className="font-semibold text-gray-800 dark:text-gray-200">{activeConfig.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {mappings.length > 0 && (
            <button
              onClick={testAllMappings}
              disabled={testingAll}
              className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
            >
              <Eye className="h-3 w-3" />
              <span>{testingAll ? 'Cek Tab...' : 'Uji Semua'}</span>
            </button>
          )}

          {excelHeaders.length > 0 && (
            <button
              onClick={autoGenerateMappings}
              className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              <span>Auto-Map</span>
            </button>
          )}

          <button
            onClick={addMappingRow}
            className="px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
          >
            <Plus className="h-3 w-3" />
            <span>Tambah</span>
          </button>

          <button
            onClick={handleSave}
            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-xs transition-colors"
          >
            <Save className="h-3 w-3" />
            <span>{savedSuccess ? 'Tersimpan!' : 'Simpan'}</span>
          </button>
        </div>
      </div>

      {/* Visual Picker Active Alert */}
      {pickingFieldId && (
        <div className="p-3 bg-sky-50 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-700 rounded-xl flex items-center justify-between text-xs text-sky-800 dark:text-sky-200 animate-pulse">
          <div className="flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-sky-500 animate-spin" />
            <span>
              <strong>Visual Element Picker Aktif:</strong> Beralihlah ke tab website Anda, lalu klik elemen input yang ingin dipilih (Tekan ESC pada website untuk membatalkan).
            </span>
          </div>
          <button
            onClick={() => setPickingFieldId(null)}
            className="px-2 py-1 bg-sky-200 dark:bg-sky-800 hover:bg-sky-300 text-[11px] font-semibold rounded-md"
          >
            Batal
          </button>
        </div>
      )}

      {/* Field Mappings List */}
      {mappings.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
          <p className="text-xs text-gray-500 mb-2">Belum ada kolom yang dimapping.</p>
          <button
            onClick={addMappingRow}
            className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline"
          >
            + Tambah mapping field pertama
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {mappings.map((field) => (
            <div
              key={field.id}
              className={`p-3 bg-white dark:bg-gray-900 border rounded-xl shadow-xs space-y-2 transition-colors ${
                pickingFieldId === field.id
                  ? 'border-sky-500 ring-2 ring-sky-500/20'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center text-xs">
                {/* 1. Kolom Excel */}
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1">Kolom Excel</label>
                  {excelHeaders.length > 0 ? (
                    <select
                      value={field.excelColumn}
                      onChange={(e) => updateMapping(field.id, { excelColumn: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-1.5 font-medium text-gray-900 dark:text-white text-xs"
                    >
                      {excelHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={field.excelColumn}
                      placeholder="Nama header kolom"
                      onChange={(e) => updateMapping(field.id, { excelColumn: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-1.5 text-gray-900 dark:text-white text-xs"
                    />
                  )}
                </div>

                {/* 2. Target Name */}
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1">Nama Label Field</label>
                  <input
                    type="text"
                    value={field.targetName}
                    placeholder="Contoh: Input Email"
                    onChange={(e) => updateMapping(field.id, { targetName: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-1.5 text-gray-900 dark:text-white text-xs"
                  />
                </div>

                {/* 3. Action Type */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1">Tipe Aksi</label>
                  <select
                    value={field.actionType}
                    onChange={(e) => updateMapping(field.id, { actionType: e.target.value as ActionType })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-1.5 text-gray-900 dark:text-white text-xs font-medium"
                  >
                    <option value="type">Ketik (Type)</option>
                    <option value="select">Pilih (Dropdown)</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="radio">Radio Button</option>
                    <option value="click">Klik (Button/Element)</option>
                    <option value="wait">Jeda (Wait)</option>
                  </select>
                </div>

                {/* 4. Selector Type */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1">Metode Selector</label>
                  <select
                    value={field.selectorType}
                    onChange={(e) => updateMapping(field.id, { selectorType: e.target.value as SelectorType })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-1.5 text-gray-900 dark:text-white text-xs font-medium"
                  >
                    <option value="css">CSS Selector</option>
                    <option value="id">ID Element</option>
                    <option value="name">Attribute Name</option>
                    <option value="placeholder">Placeholder Text</option>
                    <option value="label">Label Text</option>
                    <option value="text">Exact/Partial Text</option>
                    <option value="xpath">XPath</option>
                  </select>
                </div>

                {/* 5. Actions: Visual Picker & Delete */}
                <div className="md:col-span-2 flex items-center justify-end gap-1 pt-4">
                  <button
                    onClick={() => startPickingForField(field.id)}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                      pickingFieldId === field.id
                        ? 'bg-sky-500 text-white'
                        : 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 hover:bg-sky-100 border border-sky-200 dark:border-sky-800'
                    }`}
                    title="Pilih langsung dari website aktif (Element Inspector)"
                  >
                    <Crosshair className="h-3.5 w-3.5" />
                    <span>Pick</span>
                  </button>

                  <button
                    onClick={() => removeMappingRow(field.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors"
                    title="Hapus field"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Primary Selector with Highlight Test & Fallbacks */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs pt-1 border-t border-gray-100 dark:border-gray-800/60">
                <div className="md:col-span-7">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <label className="block text-[10px] font-semibold text-gray-500">
                        Primary DOM Selector
                      </label>
                      {fieldTestResults[field.id] !== undefined && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            fieldTestResults[field.id]
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {fieldTestResults[field.id] ? '✓ Ditemukan' : '✗ Belum Ditemukan'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => testHighlightElement(field.selectorType, field.primarySelector, field.id)}
                      className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5 font-medium"
                      title="Tes & sorot elemen ini di halaman website aktif"
                    >
                      <Eye className="h-3 w-3" /> Tes Sorot
                    </button>
                  </div>
                  <input
                    type="text"
                    value={field.primarySelector}
                    placeholder={`Contoh: input[name="email"], #email`}
                    onChange={(e) => updateMapping(field.id, { primarySelector: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-1.5 font-mono text-[11px] text-gray-900 dark:text-white"
                  />
                  {testStatus && testStatus.id === field.id && (
                    <div
                      className={`mt-1 text-[11px] flex items-center gap-1 font-medium ${
                        testStatus.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {testStatus.success ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      <span>{testStatus.message}</span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-5">
                  <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">
                    Fallback Selectors (pisahkan dengan koma)
                  </label>
                  <input
                    type="text"
                    value={field.fallbackSelectors.join(', ')}
                    placeholder="input[placeholder*='email'], #user_email"
                    onChange={(e) =>
                      updateMapping(field.id, {
                        fallbackSelectors: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-1.5 font-mono text-[11px] text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Submit Button Configuration */}
      <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-900 dark:text-white">
            Konfigurasi Tombol Submit / Kirim Form
          </h3>
          <button
            onClick={() => startPickingForField('submit')}
            className="px-2.5 py-1 bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 hover:bg-sky-100 border border-sky-200 dark:border-sky-800 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
          >
            <Crosshair className="h-3.5 w-3.5" />
            Pick Tombol Submit dari Web
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
          <div className="md:col-span-3">
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Tipe Selector Submit</label>
            <select
              value={submitSelector.selectorType}
              onChange={(e) =>
                setSubmitSelector({
                  ...submitSelector,
                  selectorType: e.target.value as SelectorType,
                })
              }
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-1.5 text-gray-900 dark:text-white text-xs"
            >
              <option value="css">CSS Selector</option>
              <option value="id">ID Element</option>
              <option value="text">Teks Tombol</option>
              <option value="xpath">XPath</option>
            </select>
          </div>
          <div className="md:col-span-9">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-semibold text-gray-500">Primary Submit Selector</label>
              <button
                onClick={() => testHighlightElement(submitSelector.selectorType, submitSelector.primarySelector, 'submit')}
                className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5 font-medium"
              >
                <Eye className="h-3 w-3" /> Tes Sorot Submit
              </button>
            </div>
            <input
              type="text"
              value={submitSelector.primarySelector}
              placeholder='Contoh: button[type="submit"], #btn-save, .btn-primary'
              onChange={(e) =>
                setSubmitSelector({
                  ...submitSelector,
                  primarySelector: e.target.value,
                })
              }
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-1.5 font-mono text-[11px] text-gray-900 dark:text-white"
            />
            {testStatus && testStatus.id === 'submit' && (
              <div
                className={`mt-1 text-[11px] flex items-center gap-1 font-medium ${
                  testStatus.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {testStatus.success ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                <span>{testStatus.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save & Navigation */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-semibold transition-colors"
        >
          Simpan Konfigurasi
        </button>
        <button
          onClick={() => {
            handleSave();
            onGoToRunner();
          }}
          className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          Lanjut ke Automation Runner →
        </button>
      </div>
    </div>
  );
};

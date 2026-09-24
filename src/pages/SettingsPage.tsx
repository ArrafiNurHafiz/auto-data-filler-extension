import React, { useState } from 'react';
import { Settings, Moon, Sun, Shield, Sliders, Save, Check } from 'lucide-react';
import { AutomationSettings } from '../types';

interface SettingsPageProps {
  settings: AutomationSettings;
  onSaveSettings: (settings: AutomationSettings) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSaveSettings }) => {
  const [formData, setFormData] = useState<AutomationSettings>(settings);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="border-b border-gray-200 dark:border-gray-800 pb-3">
        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="h-4 w-4 text-sky-500" />
          Pengaturan Ekstensi
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Konfigurasi timeout, jeda antar input, keamanan, dan tema aplikasi.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Kecepatan & Timeout */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-sky-500" />
            Kecepatan & Waktu Tunggu (Timing)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                Jeda Antar Field (ms)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={formData.defaultDelayMs}
                onChange={(e) =>
                  setFormData({ ...formData, defaultDelayMs: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-xs text-gray-900 dark:text-white"
              />
              <span className="text-[10px] text-gray-400">Jeda setelah mengetik sebelum pindah ke field berikutnya.</span>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                Timeout Pencarian Elemen DOM (ms)
              </label>
              <input
                type="number"
                min="1000"
                step="500"
                value={formData.timeoutElementMs}
                onChange={(e) =>
                  setFormData({ ...formData, timeoutElementMs: parseInt(e.target.value, 10) || 5000 })
                }
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-xs text-gray-900 dark:text-white"
              />
              <span className="text-[10px] text-gray-400">Waktu maksimal menunggu elemen muncul sebelum ditandai gagal.</span>
            </div>
          </div>
        </div>

        {/* Mode Ketahanan Web Ketat & Anti-Bot */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              Ketahanan Web Ketat & Anti-Bot Engine
            </h3>
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Enterprise Ready
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.humanizeTyping}
                onChange={(e) => setFormData({ ...formData, humanizeTyping: e.target.checked })}
                className="mt-0.5 rounded border-gray-300 text-sky-500 focus:ring-sky-400"
              />
              <div>
                <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                  Simulasi Ketik Manusia (Human Keystroke Simulation)
                </span>
                <span className="text-[11px] text-gray-500 block">
                  Mengirimkan urutan event keyboard nyata (`keydown`, `keypress`, `beforeinput`, `keyup`) dengan jeda mikro antar karakter untuk melewati validasi input mask ketat.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.deepShadowDomSupport}
                onChange={(e) => setFormData({ ...formData, deepShadowDomSupport: e.target.checked })}
                className="mt-0.5 rounded border-gray-300 text-sky-500 focus:ring-sky-400"
              />
              <div>
                <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                  Pencarian Elemen Mendalam (Deep Shadow DOM & Web Components)
                </span>
                <span className="text-[11px] text-gray-500 block">
                  Menembus Open Shadow Root pada framework modern (Salesforce, SAP, ServiceNow, LitElement).
                </span>
              </div>
            </label>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                Jeda Acak (Random Jitter Anti-Rate Limit) (ms)
              </label>
              <input
                type="number"
                min="0"
                max="2000"
                step="50"
                value={formData.randomDelayJitterMs}
                onChange={(e) =>
                  setFormData({ ...formData, randomDelayJitterMs: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-xs text-gray-900 dark:text-white"
              />
              <span className="text-[10px] text-gray-400">Variasi jeda acak antar field untuk memecah pola otomatisasi kaku (menghindari deteksi bot WAF / Cloudflare).</span>
            </div>
          </div>
        </div>

        {/* Error & Visual Preferences */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-sky-500" />
            Preferensi Eksekusi
          </h3>

          <div className="space-y-2.5 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.highlightElements}
                onChange={(e) => setFormData({ ...formData, highlightElements: e.target.checked })}
                className="rounded border-gray-300 text-sky-500 focus:ring-sky-400"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Sorot (highlight) elemen DOM dengan border biru saat sedang diinput
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.stopOnError}
                onChange={(e) => setFormData({ ...formData, stopOnError: e.target.checked })}
                className="rounded border-gray-300 text-sky-500 focus:ring-sky-400"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Hentikan seluruh otomatisasi jika salah satu baris gagal (Stop on Error)
              </span>
            </label>
          </div>
        </div>

        {/* Tema Tampilan */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            <Sun className="h-3.5 w-3.5 text-sky-500" />
            Tema Tampilan
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, theme: 'light' })}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold transition-all ${
                formData.theme === 'light'
                  ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Sun className="h-4 w-4" /> Light Mode
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, theme: 'dark' })}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold transition-all ${
                formData.theme === 'dark'
                  ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Moon className="h-4 w-4" /> Dark Mode
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="submit"
            className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? 'Tersimpan!' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  );
};

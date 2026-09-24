import { TargetConfig, AutomationSettings, ExecutionSession } from '../types';
import { ParsedSheetData } from '../utils/excel';

const STORAGE_KEYS = {
  TARGET_CONFIGS: 'adf_target_configs',
  ACTIVE_CONFIG_ID: 'adf_active_config_id',
  SETTINGS: 'adf_settings',
  HISTORY: 'adf_execution_history',
  SHEET_DATA: 'adf_current_sheet_data',
};

export const defaultSettings: AutomationSettings = {
  defaultDelayMs: 600,
  timeoutElementMs: 7000,
  maxRetries: 2,
  stopOnError: false,
  highlightElements: true,
  theme: 'light',
  humanizeTyping: true,
  randomDelayJitterMs: 250,
  pauseBeforeSubmit: false,
  deepShadowDomSupport: true,
};

export const initialMockConfigs: TargetConfig[] = [
  {
    id: 'config-sample-contact',
    name: 'Form Kontak / Registrasi Demo',
    urlPattern: 'https://*/*',
    mappings: [
      {
        id: 'map-1',
        excelColumn: 'Nama',
        targetName: 'Input Nama Lengkap',
        selectorType: 'css',
        primarySelector: 'input[name="nama"], input[name="name"], #name, #nama',
        fallbackSelectors: ['input[placeholder*="Nama" i]', 'input[placeholder*="Name" i]'],
        actionType: 'type',
        isRequired: true,
        clearBeforeType: true
      },
      {
        id: 'map-2',
        excelColumn: 'Email',
        targetName: 'Input Email',
        selectorType: 'css',
        primarySelector: 'input[type="email"], input[name="email"], #email',
        fallbackSelectors: ['input[placeholder*="Email" i]'],
        actionType: 'type',
        isRequired: true,
        clearBeforeType: true
      },
      {
        id: 'map-3',
        excelColumn: 'Telepon',
        targetName: 'Input No HP / Telepon',
        selectorType: 'css',
        primarySelector: 'input[type="tel"], input[name="phone"], input[name="telepon"], #phone',
        fallbackSelectors: ['input[placeholder*="Phone" i]', 'input[placeholder*="Telepon" i]'],
        actionType: 'type'
      },
      {
        id: 'map-4',
        excelColumn: 'Kategori',
        targetName: 'Dropdown Kategori / Divisi',
        selectorType: 'css',
        primarySelector: 'select[name="category"], select[name="kategori"], #category',
        fallbackSelectors: ['select'],
        actionType: 'select'
      },
      {
        id: 'map-5',
        excelColumn: 'Alamat',
        targetName: 'Textarea Alamat',
        selectorType: 'css',
        primarySelector: 'textarea[name="address"], textarea[name="alamat"], #address',
        fallbackSelectors: ['textarea'],
        actionType: 'type'
      }
    ],
    submitSelector: {
      selectorType: 'css',
      primarySelector: 'button[type="submit"], input[type="submit"], .btn-submit, #submit',
      fallbackSelectors: ['//button[contains(., "Submit") or contains(., "Kirim") or contains(., "Simpan")]']
    },
    navigation: {
      delayBetweenRowsMs: 1200,
      maxRetriesPerRow: 2,
      successIndicatorSelector: '.alert-success, .success-message, [data-status="success"]'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

export class StorageService {
  static async getConfigs(): Promise<TargetConfig[]> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const res = await chrome.storage.local.get(STORAGE_KEYS.TARGET_CONFIGS);
      if (res[STORAGE_KEYS.TARGET_CONFIGS] && res[STORAGE_KEYS.TARGET_CONFIGS].length > 0) {
        return res[STORAGE_KEYS.TARGET_CONFIGS];
      }
    } else {
      const item = localStorage.getItem(STORAGE_KEYS.TARGET_CONFIGS);
      if (item) {
        try {
          return JSON.parse(item);
        } catch {}
      }
    }
    // Fallback to sample config
    await StorageService.saveConfigs(initialMockConfigs);
    return initialMockConfigs;
  }

  static async saveConfigs(configs: TargetConfig[]): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEYS.TARGET_CONFIGS]: configs });
    } else {
      localStorage.setItem(STORAGE_KEYS.TARGET_CONFIGS, JSON.stringify(configs));
    }
  }

  static async saveConfig(config: TargetConfig): Promise<void> {
    const configs = await StorageService.getConfigs();
    const index = configs.findIndex((c) => c.id === config.id);
    if (index >= 0) {
      configs[index] = { ...config, updatedAt: Date.now() };
    } else {
      configs.push({ ...config, createdAt: Date.now(), updatedAt: Date.now() });
    }
    await StorageService.saveConfigs(configs);
  }

  static async deleteConfig(configId: string): Promise<void> {
    const configs = await StorageService.getConfigs();
    const filtered = configs.filter((c) => c.id !== configId);
    await StorageService.saveConfigs(filtered);
  }

  static async getSettings(): Promise<AutomationSettings> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const res = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      return res[STORAGE_KEYS.SETTINGS] || defaultSettings;
    } else {
      const item = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (item) {
        try {
          return { ...defaultSettings, ...JSON.parse(item) };
        } catch {}
      }
      return defaultSettings;
    }
  }

  static async saveSettings(settings: AutomationSettings): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
    } else {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }
  }

  static async getHistory(): Promise<ExecutionSession[]> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const res = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
      return res[STORAGE_KEYS.HISTORY] || [];
    } else {
      const item = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return item ? JSON.parse(item) : [];
    }
  }

  static async saveSessionToHistory(session: ExecutionSession): Promise<void> {
    const history = await StorageService.getHistory();
    // Keep last 30 sessions
    const updated = [session, ...history.filter((s) => s.id !== session.id)].slice(0, 30);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: updated });
    } else {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
    }
  }

  static async clearHistory(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.remove(STORAGE_KEYS.HISTORY);
    } else {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
    }
  }

  static async getSheetData(): Promise<ParsedSheetData | null> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const res = await chrome.storage.local.get(STORAGE_KEYS.SHEET_DATA);
      return res[STORAGE_KEYS.SHEET_DATA] || null;
    } else {
      const item = localStorage.getItem(STORAGE_KEYS.SHEET_DATA);
      return item ? JSON.parse(item) : null;
    }
  }

  static async saveSheetData(data: ParsedSheetData | null): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEYS.SHEET_DATA]: data });
    } else {
      if (data) localStorage.setItem(STORAGE_KEYS.SHEET_DATA, JSON.stringify(data));
      else localStorage.removeItem(STORAGE_KEYS.SHEET_DATA);
    }
  }
}

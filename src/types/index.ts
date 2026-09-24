export type SelectorType = 'css' | 'xpath' | 'id' | 'name' | 'placeholder' | 'label' | 'text';

export type ActionType = 'type' | 'click' | 'select' | 'checkbox' | 'radio' | 'wait' | 'file_placeholder';

export interface PickedElementInfo {
  tag: string;
  id?: string;
  name?: string;
  placeholder?: string;
  labelText?: string;
  ariaLabel?: string;
  bestSelector: string;
  bestSelectorType: SelectorType;
  fallbackSelectors: string[];
  suggestedActionType: ActionType;
  targetNameSuggestion: string;
}

export interface FieldMapping {
  id: string;
  excelColumn: string; // Header name or column key
  targetName: string; // Descriptive field label (e.g. "Input Nama")
  selectorType: SelectorType;
  primarySelector: string; // e.g. "#username", "//input[@name='user']"
  fallbackSelectors: string[]; // Backup selectors if primary fails
  actionType: ActionType;
  defaultValue?: string;
  isRequired?: boolean;
  clearBeforeType?: boolean;
  delayAfterMs?: number;
}

export interface TargetConfig {
  id: string;
  name: string; // e.g., "Dashboard Input Karyawan"
  urlPattern: string; // Regex or wildcard match, e.g. "https://example.com/admin/*"
  mappings: FieldMapping[];
  submitSelector?: {
    selectorType: SelectorType;
    primarySelector: string;
    fallbackSelectors: string[];
  };
  navigation?: {
    nextButtonSelector?: string;
    successIndicatorSelector?: string; // Wait for this indicator before continuing
    delayBetweenRowsMs: number;
    maxRetriesPerRow: number;
  };
  createdAt: number;
  updatedAt: number;
}

export type RowStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';

export interface ExecutionRowResult {
  rowIndex: number;
  data: Record<string, any>;
  status: RowStatus;
  errorDetail?: string;
  processedAt?: number;
  durationMs?: number;
}

export interface ExecutionSession {
  id: string;
  configId: string;
  configName: string;
  targetUrl: string;
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED' | 'COMPLETED';
  startTime: number;
  endTime?: number;
  results: ExecutionRowResult[];
  logs: LogMessage[];
}

export interface LogMessage {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  rowIndex?: number;
}

export interface AutomationSettings {
  defaultDelayMs: number;
  timeoutElementMs: number;
  maxRetries: number;
  stopOnError: boolean;
  highlightElements: boolean;
  theme: 'light' | 'dark' | 'system';
  // Strict Web Security & Anti-Bot options
  humanizeTyping: boolean; // Simulates human keystroke events with micro-jitter
  randomDelayJitterMs: number; // Adds random delay variation to bypass bot rate-limit detection
  pauseBeforeSubmit: boolean; // Pauses before submitting for manual CAPTCHA/2FA verification
  deepShadowDomSupport: boolean; // Enables deep recursive traversal into Open Shadow DOM
}

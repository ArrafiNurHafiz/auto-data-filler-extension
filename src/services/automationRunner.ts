import { TargetConfig, FieldMapping } from '../types';
import {
  findElementWithFallbacks,
  waitForElement,
  simulateInput,
  simulateSelect,
  simulateCheckbox,
  simulateRadio,
  highlightElement
} from '../utils/dom';

export interface ExecuteRowPayload {
  row: Record<string, any>;
  rowIndex: number;
  config: TargetConfig;
  settings: {
    timeoutMs: number;
    highlight: boolean;
    defaultDelayMs: number;
  };
}

export interface StepExecutionResult {
  success: boolean;
  error?: string;
}

/**
 * Execute a single action for a mapped field on the active web page DOM.
 */
export async function executeFieldAction(
  mapping: FieldMapping,
  rawValue: any,
  settings: { timeoutMs: number; highlight: boolean; defaultDelayMs: number }
): Promise<StepExecutionResult> {
  const value = rawValue !== undefined && rawValue !== null ? String(rawValue).trim() : (mapping.defaultValue || '');

  if (mapping.isRequired && !value) {
    return {
      success: false,
      error: `Field wajib "${mapping.targetName}" (${mapping.excelColumn}) kosong pada baris data.`
    };
  }

  try {
    const el = await waitForElement(
      mapping.selectorType,
      mapping.primarySelector,
      mapping.fallbackSelectors,
      settings.timeoutMs
    );

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (settings.highlight) {
      highlightElement(el, '#0ea5e9');
    }

    switch (mapping.actionType) {
      case 'type': {
        simulateInput(el, value, mapping.clearBeforeType !== false);
        break;
      }
      case 'select': {
        if (el.tagName.toLowerCase() === 'select') {
          simulateSelect(el, value);
        } else {
          // Custom dropdown trigger (click option by text)
          simulateSelect(el, value);
          await new Promise((r) => setTimeout(r, 200));
          const optionEl = findElementWithFallbacks('text', value, [
            `//li[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${value.toLowerCase()}')]`,
            `//div[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${value.toLowerCase()}')]`,
            `[role="option"]:has-text("${value}")`
          ]);
          if (optionEl) {
            optionEl.click();
          }
        }
        break;
      }
      case 'checkbox': {
        const shouldCheck =
          value.toLowerCase() === 'true' ||
          value.toLowerCase() === '1' ||
          value.toLowerCase() === 'yes' ||
          value.toLowerCase() === 'ya';
        simulateCheckbox(el as HTMLInputElement, shouldCheck);
        break;
      }
      case 'radio': {
        simulateRadio(el, value);
        break;
      }
      case 'click': {
        el.click();
        break;
      }
      case 'wait': {
        const waitTime = parseInt(value, 10) || mapping.delayAfterMs || 1000;
        await new Promise((r) => setTimeout(r, waitTime));
        break;
      }
      default: {
        simulateInput(el, value);
      }
    }

    if (mapping.delayAfterMs && mapping.delayAfterMs > 0) {
      await new Promise((r) => setTimeout(r, mapping.delayAfterMs));
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: `Gagal mengisi field "${mapping.targetName}": ${err.message}`
    };
  }
}

/**
 * Executes a full row of inputs, followed by submitting the form if configured.
 */
export async function processRowOnPage(payload: ExecuteRowPayload): Promise<StepExecutionResult> {
  const { row, config, settings } = payload;

  // 1. Process all mapped fields sequentially
  for (const mapping of config.mappings) {
    const cellValue = row[mapping.excelColumn];
    const res = await executeFieldAction(mapping, cellValue, settings);

    if (!res.success) {
      return res; // Fail fast for this row, caller logs and continues to next row
    }

    // Small delay between field inputs
    if (settings.defaultDelayMs > 0) {
      await new Promise((r) => setTimeout(r, settings.defaultDelayMs));
    }
  }

  // 2. Submit form if configured
  if (config.submitSelector && config.submitSelector.primarySelector) {
    try {
      const submitBtn = await waitForElement(
        config.submitSelector.selectorType,
        config.submitSelector.primarySelector,
        config.submitSelector.fallbackSelectors,
        settings.timeoutMs
      );

      if (settings.highlight) {
        highlightElement(submitBtn, '#22c55e');
      }

      submitBtn.click();

      // If success indicator configured, wait for confirmation
      if (config.navigation?.successIndicatorSelector) {
        try {
          await waitForElement(
            'css',
            config.navigation.successIndicatorSelector,
            [],
            settings.timeoutMs
          );
        } catch {
          console.warn('[AutoDataFiller] Success indicator not observed within timeout, continuing...');
        }
      }
    } catch (err: any) {
      return {
        success: false,
        error: `Gagal klik tombol submit: ${err.message}`
      };
    }
  }

  // Inter-row settle delay
  const rowDelay = config.navigation?.delayBetweenRowsMs || 1000;
  await new Promise((r) => setTimeout(r, rowDelay));

  return { success: true };
}

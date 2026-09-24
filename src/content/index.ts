import { TargetConfig, FieldMapping, PickedElementInfo } from '../types';
import {
  findElement,
  findElementWithFallbacks,
  waitForElement,
  simulateInput,
  simulateSelect,
  simulateCheckbox,
  simulateRadio,
  highlightElement,
  inspectElement,
} from '../utils/dom';

let isPickerActive = false;
let pickerOverlay: HTMLDivElement | null = null;
let pickerTooltip: HTMLDivElement | null = null;
let hoveredElement: HTMLElement | null = null;

/**
 * Initializes the Visual Element Picker overlay and listeners on the page.
 */
export function startElementPicker(callback: (info: PickedElementInfo) => void) {
  if (isPickerActive) stopElementPicker();
  isPickerActive = true;

  // Create highlight overlay box
  pickerOverlay = document.createElement('div');
  pickerOverlay.id = 'adf-picker-overlay';
  pickerOverlay.style.position = 'fixed';
  pickerOverlay.style.pointerEvents = 'none';
  pickerOverlay.style.border = '2px dashed #0284c7';
  pickerOverlay.style.backgroundColor = 'rgba(14, 165, 233, 0.18)';
  pickerOverlay.style.zIndex = '2147483646';
  pickerOverlay.style.transition = 'all 0.08s ease-out';
  pickerOverlay.style.display = 'none';
  pickerOverlay.style.borderRadius = '4px';

  // Create informative tooltip
  pickerTooltip = document.createElement('div');
  pickerTooltip.id = 'adf-picker-tooltip';
  pickerTooltip.style.position = 'fixed';
  pickerTooltip.style.pointerEvents = 'none';
  pickerTooltip.style.backgroundColor = '#0f172a';
  pickerTooltip.style.color = '#ffffff';
  pickerTooltip.style.padding = '6px 10px';
  pickerTooltip.style.fontSize = '12px';
  pickerTooltip.style.fontFamily = 'monospace, sans-serif';
  pickerTooltip.style.borderRadius = '6px';
  pickerTooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  pickerTooltip.style.zIndex = '2147483647';
  pickerTooltip.style.display = 'none';
  pickerTooltip.innerHTML = `🎯 <strong>Klik untuk memilih</strong> (ESC untuk batal)`;

  document.documentElement.appendChild(pickerOverlay);
  document.documentElement.appendChild(pickerTooltip);

  const handleMouseMove = (e: MouseEvent) => {
    if (!isPickerActive) return;
    const target = e.target as HTMLElement;
    if (!target || target === pickerOverlay || target === pickerTooltip) return;

    hoveredElement = target;
    const rect = target.getBoundingClientRect();

    if (pickerOverlay) {
      pickerOverlay.style.display = 'block';
      pickerOverlay.style.top = `${rect.top}px`;
      pickerOverlay.style.left = `${rect.left}px`;
      pickerOverlay.style.width = `${rect.width}px`;
      pickerOverlay.style.height = `${rect.height}px`;
    }

    if (pickerTooltip) {
      pickerTooltip.style.display = 'block';
      let tooltipTop = rect.top - 36;
      if (tooltipTop < 10) tooltipTop = rect.bottom + 8;
      let tooltipLeft = Math.max(10, Math.min(rect.left, window.innerWidth - 300));

      const tagDesc = `${target.tagName.toLowerCase()}${target.id ? '#' + target.id : ''}${target.getAttribute('name') ? `[name="${target.getAttribute('name')}"]` : ''}`;
      pickerTooltip.innerHTML = `🎯 <strong>${tagDesc}</strong> | Klik untuk pilih (ESC: batal)`;
      pickerTooltip.style.top = `${tooltipTop}px`;
      pickerTooltip.style.left = `${tooltipLeft}px`;
    }
  };

  const handleClick = (e: MouseEvent) => {
    if (!isPickerActive) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const target = (e.target as HTMLElement) || hoveredElement;
    if (target && target !== pickerOverlay && target !== pickerTooltip) {
      const info = inspectElement(target);
      highlightElement(target, '#10b981');
      stopElementPicker();
      callback(info);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      stopElementPicker();
    }
  };

  window.addEventListener('mousemove', handleMouseMove, true);
  window.addEventListener('click', handleClick, true);
  window.addEventListener('keydown', handleKeyDown, true);

  (window as any).__adf_cleanup_picker = () => {
    window.removeEventListener('mousemove', handleMouseMove, true);
    window.removeEventListener('click', handleClick, true);
    window.removeEventListener('keydown', handleKeyDown, true);
    if (pickerOverlay && pickerOverlay.parentNode) pickerOverlay.parentNode.removeChild(pickerOverlay);
    if (pickerTooltip && pickerTooltip.parentNode) pickerTooltip.parentNode.removeChild(pickerTooltip);
    pickerOverlay = null;
    pickerTooltip = null;
    hoveredElement = null;
    isPickerActive = false;
  };
}

export function stopElementPicker() {
  if ((window as any).__adf_cleanup_picker) {
    (window as any).__adf_cleanup_picker();
    delete (window as any).__adf_cleanup_picker;
  }
}

export async function executeFieldAction(
  mapping: FieldMapping,
  rawValue: any,
  settings: { timeoutMs: number; highlight: boolean; defaultDelayMs: number }
) {
  const value = rawValue !== undefined && rawValue !== null ? String(rawValue).trim() : (mapping.defaultValue || '');

  if (mapping.isRequired && !value) {
    return {
      success: false,
      error: `Field wajib "${mapping.targetName}" (${mapping.excelColumn}) kosong pada data.`
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
          simulateSelect(el, value);
          await new Promise((r) => setTimeout(r, 200));
          const optionEl = findElementWithFallbacks('text', value, [
            `//li[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${value.toLowerCase()}')]`,
            `//div[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${value.toLowerCase()}')]`,
            `[role="option"]:has-text("${value}")`
          ]);
          if (optionEl) optionEl.click();
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

export async function processRowOnPage(
  row: Record<string, any>,
  config: TargetConfig,
  settings: { timeoutMs: number; highlight: boolean; defaultDelayMs: number }
) {
  if (!config.mappings || config.mappings.length === 0) {
    return {
      success: false,
      error: 'Preset ini belum memiliki mapping kolom! Silakan atur di tab Mapping Field.'
    };
  }

  for (const mapping of config.mappings) {
    let cellValue = row[mapping.excelColumn];
    if (cellValue === undefined && row) {
      const matchKey = Object.keys(row).find(
        (k) => k.trim().toLowerCase() === mapping.excelColumn.trim().toLowerCase()
      );
      if (matchKey) cellValue = row[matchKey];
    }

    const res = await executeFieldAction(mapping, cellValue, settings);
    if (!res.success) {
      return res;
    }
    if (settings.defaultDelayMs > 0) {
      await new Promise((r) => setTimeout(r, settings.defaultDelayMs));
    }
  }

  // Submit if configured
  if (config.submitSelector && config.submitSelector.primarySelector) {
    try {
      const submitBtn = await waitForElement(
        config.submitSelector.selectorType,
        config.submitSelector.primarySelector,
        config.submitSelector.fallbackSelectors,
        settings.timeoutMs
      );

      submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });

      if (settings.highlight) {
        highlightElement(submitBtn, '#22c55e');
      }

      submitBtn.click();

      if (config.navigation?.successIndicatorSelector) {
        try {
          await waitForElement(
            'css',
            config.navigation.successIndicatorSelector,
            [],
            settings.timeoutMs
          );
        } catch {
          // continue
        }
      }
    } catch (err: any) {
      return {
        success: false,
        error: `Gagal klik tombol submit: ${err.message}`
      };
    }
  }

  const rowDelay = config.navigation?.delayBetweenRowsMs || 1000;
  await new Promise((r) => setTimeout(r, rowDelay));

  return { success: true };
}

(window as any).processRowOnPage = processRowOnPage;
(window as any).inspectElement = inspectElement;
(window as any).startElementPicker = startElementPicker;
(window as any).stopElementPicker = stopElementPicker;

console.log('[AutoDataFiller] Content script ready on:', window.location.href);

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'PING') {
      sendResponse({ status: 'PONG', url: window.location.href, title: document.title });
      return true;
    }

    if (message.type === 'START_ELEMENT_PICKER') {
      const fieldId = message.payload?.fieldId;
      startElementPicker((pickedInfo) => {
        try {
          chrome.runtime.sendMessage({
            type: 'ELEMENT_PICKED',
            payload: {
              ...pickedInfo,
              fieldId,
            },
          });
        } catch {}
      });
      sendResponse({ status: 'PICKER_STARTED' });
      return true;
    }

    if (message.type === 'STOP_ELEMENT_PICKER') {
      stopElementPicker();
      sendResponse({ status: 'PICKER_STOPPED' });
      return true;
    }

    if (message.type === 'HIGHLIGHT_ELEMENT') {
      const { selectorType, selectorValue } = message.payload;
      const el = findElement(selectorType, selectorValue);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightElement(el, '#0ea5e9');
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Elemen tidak ditemukan pada halaman ini.' });
      }
      return true;
    }

    if (message.type === 'EXECUTE_ROW') {
      const { row, config, settings } = message.payload;
      processRowOnPage(row, config, settings)
        .then((res) => sendResponse(res))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }
  });
}


import type { SelectorType, ActionType, PickedElementInfo } from '../types';

/**
 * Recursively searches for an element matching a selector across document and Open Shadow Roots.
 */
export function querySelectorDeep(selector: string, root: Document | Element | ShadowRoot = document): HTMLElement | null {
  try {
    const direct = root.querySelector(selector);
    if (direct) return direct as HTMLElement;
  } catch {}

  const allNodes = root.querySelectorAll('*');
  for (let i = 0; i < allNodes.length; i++) {
    const node = allNodes[i];
    if (node.shadowRoot) {
      const found = querySelectorDeep(selector, node.shadowRoot);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Finds an element in the DOM using a flexible multi-strategy approach with Shadow DOM support.
 */
export function findElement(selectorType: SelectorType, selectorValue: string): HTMLElement | null {
  if (!selectorValue || !selectorValue.trim()) return null;
  const val = selectorValue.trim();

  try {
    switch (selectorType) {
      case 'id': {
        const cleanId = val.startsWith('#') ? val.substring(1) : val;
        const direct = document.getElementById(cleanId);
        if (direct) return direct;
        return querySelectorDeep(`#${CSS.escape(cleanId)}`);
      }
      case 'name': {
        const direct = document.querySelector(`[name="${CSS.escape(val)}"]`) as HTMLElement;
        if (direct) return direct;
        return querySelectorDeep(`[name="${CSS.escape(val)}"]`);
      }
      case 'placeholder': {
        const direct = document.querySelector(`[placeholder*="${CSS.escape(val)}" i]`) as HTMLElement;
        if (direct) return direct;
        return querySelectorDeep(`[placeholder*="${CSS.escape(val)}" i]`);
      }
      case 'label': {
        // 1. Check label with 'for' attribute matching an ID
        const labels = Array.from(document.querySelectorAll('label'));
        const matchedLabel = labels.find((l) => l.textContent?.trim().toLowerCase().includes(val.toLowerCase()));
        if (matchedLabel) {
          const forId = matchedLabel.getAttribute('for');
          if (forId) {
            const target = document.getElementById(forId) || querySelectorDeep(`#${CSS.escape(forId)}`);
            if (target) return target;
          }
          // Check nested input inside label
          const innerInput = matchedLabel.querySelector('input, select, textarea, [contenteditable="true"]');
          if (innerInput) return innerInput as HTMLElement;
        }
        // Fallback: aria-label
        const ariaDirect = document.querySelector(`[aria-label*="${CSS.escape(val)}" i]`) as HTMLElement;
        if (ariaDirect) return ariaDirect;
        return querySelectorDeep(`[aria-label*="${CSS.escape(val)}" i]`);
      }
      case 'text': {
        // Search buttons, links, or elements containing exact/partial text
        const lower = val.toLowerCase();
        const xpath = `//*[self::button or self::a or self::span or self::div or self::p or self::label][contains(translate(normalize-space(text()), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${lower}')]`;
        const res = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        return res.singleNodeValue as HTMLElement;
      }
      case 'xpath': {
        const res = document.evaluate(val, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        return res.singleNodeValue as HTMLElement;
      }
      case 'css':
      default: {
        try {
          const el = document.querySelector(val) as HTMLElement;
          if (el) return el;
        } catch {}

        const deep = querySelectorDeep(val);
        if (deep) return deep;

        // Smart fallback if val is plain text without CSS symbols
        if (!val.includes('#') && !val.includes('.') && !val.includes('[') && !val.includes(' ') && !val.includes('>')) {
          const byId = document.getElementById(val) || querySelectorDeep(`#${CSS.escape(val)}`);
          if (byId) return byId;
          const byName = document.querySelector(`[name="${CSS.escape(val)}"]`) as HTMLElement || querySelectorDeep(`[name="${CSS.escape(val)}"]`);
          if (byName) return byName;
          const byPh = document.querySelector(`[placeholder*="${CSS.escape(val)}" i]`) as HTMLElement || querySelectorDeep(`[placeholder*="${CSS.escape(val)}" i]`);
          if (byPh) return byPh;
        }
        return null;
      }
    }
  } catch (err) {
    console.warn(`[AutoDataFiller] Error finding element with ${selectorType} "${selectorValue}":`, err);
    return null;
  }
}

/**
 * Finds element trying primary selector, then iterating fallback selectors.
 */
export function findElementWithFallbacks(
  primaryType: SelectorType,
  primarySelector: string,
  fallbacks: string[] = []
): HTMLElement | null {
  const el = findElement(primaryType, primarySelector);
  if (el) return el;

  for (const fallback of fallbacks) {
    if (!fallback || !fallback.trim()) continue;
    let type: SelectorType = 'css';
    if (fallback.startsWith('//') || fallback.startsWith('(')) {
      type = 'xpath';
    } else if (fallback.startsWith('#')) {
      type = 'id';
    }
    const fallbackEl = findElement(type, fallback);
    if (fallbackEl) return fallbackEl;
  }

  return null;
}

/**
 * Wait for an element to appear in DOM with polling.
 */
export async function waitForElement(
  primaryType: SelectorType,
  primarySelector: string,
  fallbacks: string[] = [],
  timeoutMs: number = 8000,
  pollIntervalMs: number = 200
): Promise<HTMLElement> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const element = findElementWithFallbacks(primaryType, primarySelector, fallbacks);
      if (element) {
        resolve(element);
        return;
      }

      if (Date.now() - startTime >= timeoutMs) {
        reject(
          new Error(
            `Elemen tidak ditemukan setelah ${timeoutMs / 1000}s (Selector: [${primaryType}] "${primarySelector}")`
          )
        );
        return;
      }

      setTimeout(check, pollIntervalMs);
    };

    check();
  });
}

/**
 * Simulates human-like typing and dispatches comprehensive DOM events to trigger React/Vue/Angular state listeners
 * and bypass strict input masks/anti-bot checks.
 */
export async function simulateInput(
  element: HTMLElement,
  value: string,
  clearFirst = true,
  humanize = true
) {
  element.focus();
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Simulate pointer interactions for strict frameworks
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, composed: true }));
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

  if (element.getAttribute('contenteditable') === 'true') {
    if (clearFirst) element.textContent = '';
    element.textContent = value;
    element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    element.blur();
    return;
  }

  const inputEl = element as HTMLInputElement | HTMLTextAreaElement;

  if (clearFirst) {
    inputEl.value = '';
    inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  // If humanize is on and value is reasonable length, simulate keystroke stream with micro-jitter
  if (humanize && value.length > 0 && value.length <= 150) {
    let currentVal = '';
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      currentVal += char;

      inputEl.dispatchEvent(
        new KeyboardEvent('keydown', { key: char, code: `Key${char.toUpperCase()}`, bubbles: true, composed: true })
      );
      inputEl.dispatchEvent(
        new KeyboardEvent('keypress', { key: char, code: `Key${char.toUpperCase()}`, bubbles: true, composed: true })
      );

      // React 16+ prototype setter bypass
      const prototype = Object.getPrototypeOf(inputEl);
      const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(inputEl, currentVal);
      } else {
        inputEl.value = currentVal;
      }

      inputEl.dispatchEvent(new InputEvent('input', { data: char, inputType: 'insertText', bubbles: true, composed: true }));
      inputEl.dispatchEvent(
        new KeyboardEvent('keyup', { key: char, code: `Key${char.toUpperCase()}`, bubbles: true, composed: true })
      );

      // 8-18ms micro-jitter
      await new Promise((r) => setTimeout(r, 8 + Math.floor(Math.random() * 10)));
    }
  } else {
    // Fast prototype setter
    const prototype = Object.getPrototypeOf(inputEl);
    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (nativeSetter) {
      nativeSetter.call(inputEl, value);
    } else {
      inputEl.value = value;
    }
    inputEl.dispatchEvent(new InputEvent('input', { data: value, inputType: 'insertText', bubbles: true, composed: true }));
  }

  inputEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  inputEl.dispatchEvent(new Event('blur', { bubbles: true, composed: true }));
}

/**
 * Simulates selection on a <select> dropdown element or custom comboboxes (React-Select, Radix, Tailwind UI, MUI).
 */
export async function simulateSelect(element: HTMLElement, value: string) {
  element.focus();
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const valStr = String(value).trim().toLowerCase();

  if (element.tagName.toLowerCase() === 'select') {
    const selectEl = element as HTMLSelectElement;
    let matchedOptionIndex = -1;

    for (let i = 0; i < selectEl.options.length; i++) {
      const opt = selectEl.options[i];
      if (
        opt.value.toLowerCase() === valStr ||
        opt.text.toLowerCase() === valStr ||
        opt.text.toLowerCase().includes(valStr)
      ) {
        matchedOptionIndex = i;
        break;
      }
    }

    if (matchedOptionIndex !== -1) {
      selectEl.selectedIndex = matchedOptionIndex;
      const proto = Object.getPrototypeOf(selectEl);
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) {
        setter.call(selectEl, selectEl.options[matchedOptionIndex].value);
      }
    } else {
      selectEl.value = value;
    }

    selectEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    selectEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    selectEl.blur();
  } else {
    // Custom dropdown trigger (Click to open popup, then click matching option)
    element.click();
    await new Promise((r) => setTimeout(r, 200));

    // Try finding option inside opened listbox
    const optionEl = findElementWithFallbacks('text', value, [
      `//li[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${valStr}')]`,
      `//div[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${valStr}')]`,
      `[role="option"]:has-text("${value}")`,
      `[role="menuitem"]:has-text("${value}")`
    ]);

    if (optionEl) {
      optionEl.click();
    }
  }
}

/**
 * Simulates checkbox toggle.
 */
export function simulateCheckbox(element: HTMLInputElement, shouldCheck: boolean) {
  element.focus();
  if (element.checked !== shouldCheck) {
    element.click();
    element.checked = shouldCheck;
    element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }
  element.blur();
}

/**
 * Simulates radio button selection.
 */
export function simulateRadio(element: HTMLElement, value: string) {
  if (element instanceof HTMLInputElement && element.type === 'radio') {
    const groupName = element.name;
    if (groupName) {
      // Find all radios with this group name
      const radios = Array.from(document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(groupName)}"]`));
      const targetRadio = radios.find((r) => {
        const valMatch = r.value.toLowerCase() === value.toLowerCase();
        // Check label next to it
        const parentLabel = r.closest('label')?.textContent?.toLowerCase() || '';
        return valMatch || parentLabel.includes(value.toLowerCase());
      });

      if (targetRadio) {
        targetRadio.click();
        targetRadio.checked = true;
        targetRadio.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        return;
      }
    }
    element.click();
  } else {
    element.click();
  }
}

/**
 * Temporarily highlights DOM element for visual verification.
 */
export function highlightElement(element: HTMLElement, color: string = '#0ea5e9') {
  const originalOutline = element.style.outline;
  const originalTransition = element.style.transition;

  element.style.transition = 'outline 0.15s ease-in-out';
  element.style.outline = `3px solid ${color}`;

  setTimeout(() => {
    element.style.outline = originalOutline;
    element.style.transition = originalTransition;
  }, 800);
}

/**
 * Extracts element metadata and builds clean, resilient selectors for Visual Element Picker.
 */
export function inspectElement(el: HTMLElement): PickedElementInfo {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? el.id.trim() : undefined;
  const name = el.getAttribute('name') || undefined;
  const placeholder = el.getAttribute('placeholder') || undefined;
  const ariaLabel = el.getAttribute('aria-label') || undefined;
  const typeAttr = el.getAttribute('type')?.toLowerCase();

  // Find associated label text if any
  let labelText: string | undefined;
  if (id) {
    const labelEl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (labelEl) labelText = labelEl.textContent?.trim();
  }
  if (!labelText) {
    const parentLabel = el.closest('label');
    if (parentLabel) labelText = parentLabel.textContent?.trim();
  }

  // Determine suggested actionType
  let suggestedActionType: ActionType = 'type';
  if (tag === 'select') {
    suggestedActionType = 'select';
  } else if (typeAttr === 'checkbox') {
    suggestedActionType = 'checkbox';
  } else if (typeAttr === 'radio') {
    suggestedActionType = 'radio';
  } else if (tag === 'button' || typeAttr === 'submit' || typeAttr === 'button' || tag === 'a') {
    suggestedActionType = 'click';
  }

  // Generate optimal selectors
  let bestSelectorType: SelectorType = 'css';
  let bestSelector = '';
  const fallbackSelectors: string[] = [];

  if (id && document.querySelectorAll(`#${CSS.escape(id)}`).length === 1) {
    bestSelectorType = 'id';
    bestSelector = id;
  } else if (name && document.querySelectorAll(`[name="${CSS.escape(name)}"]`).length === 1) {
    bestSelectorType = 'name';
    bestSelector = name;
  } else if (placeholder) {
    bestSelectorType = 'placeholder';
    bestSelector = placeholder;
  } else if (labelText) {
    bestSelectorType = 'label';
    bestSelector = labelText;
  } else if (ariaLabel) {
    bestSelectorType = 'css';
    bestSelector = `[aria-label="${ariaLabel}"]`;
  } else {
    // Generate CSS path
    bestSelectorType = 'css';
    bestSelector = generateCssSelector(el);
  }

  // Add Fallbacks
  if (name && bestSelector !== name) {
    fallbackSelectors.push(`[name="${name}"]`);
  }
  if (placeholder && bestSelector !== placeholder) {
    fallbackSelectors.push(`[placeholder*="${placeholder}"]`);
  }
  if (id && bestSelector !== id) {
    fallbackSelectors.push(`#${id}`);
  }
  const cssPath = generateCssSelector(el);
  if (bestSelector !== cssPath && !fallbackSelectors.includes(cssPath)) {
    fallbackSelectors.push(cssPath);
  }

  // Generate human-friendly field name suggestion
  const targetNameSuggestion =
    labelText ||
    placeholder ||
    (name ? `Input ${name}` : '') ||
    (id ? `Input ${id}` : '') ||
    el.innerText?.trim().slice(0, 30) ||
    `Elemen ${tag}`;

  return {
    tag,
    id,
    name,
    placeholder,
    labelText,
    ariaLabel,
    bestSelector,
    bestSelectorType,
    fallbackSelectors: fallbackSelectors.slice(0, 3),
    suggestedActionType,
    targetNameSuggestion,
  };
}

/**
 * Generates a concise and unique CSS selector path for an element.
 */
function generateCssSelector(el: HTMLElement): string {
  if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) {
    return `#${el.id}`;
  }

  const path: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current !== document.body && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();
    if (current.id && document.querySelectorAll(`#${CSS.escape(current.id)}`).length === 1) {
      path.unshift(`#${current.id}`);
      break;
    }

    if (current.getAttribute('name')) {
      selector += `[name="${current.getAttribute('name')}"]`;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className
        .trim()
        .split(/\s+/)
        .filter((c) => c && !c.includes(':') && !c.startsWith('ng-') && !c.includes('/'))
        .slice(0, 2);
      if (classes.length > 0) {
        selector += `.${classes.join('.')}`;
      }
    }

    const parentElement: HTMLElement | null = current.parentElement;
    if (parentElement) {
      const siblings = Array.from(parentElement.children).filter((c: Element) => c.tagName === current?.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = parentElement;
    if (path.length >= 3) break;
  }

  return path.join(' > ');
}

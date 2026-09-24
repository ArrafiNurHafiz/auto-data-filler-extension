/**
 * Checks if a tab URL is allowed for content script injection.
 */
export function isInjectableUrl(url?: string): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  if (
    lower.startsWith('chrome://') ||
    lower.startsWith('chrome-extension://') ||
    lower.startsWith('devtools://') ||
    lower.startsWith('edge://') ||
    lower.startsWith('about:') ||
    lower.startsWith('view-source:') ||
    lower.includes('chromewebstore.google.com') ||
    lower.includes('chrome.google.com/webstore')
  ) {
    return false;
  }
  return true;
}

/**
 * Gets the active valid web tab, ignoring internal chrome:// or extension pages.
 */
export async function getActiveWebTab(): Promise<chrome.tabs.Tab | null> {
  if (typeof chrome === 'undefined' || !chrome.tabs) return null;

  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const active = tabs?.[0];
      if (active && active.url && isInjectableUrl(active.url)) {
        resolve(active);
        return;
      }

      // If current active tab is chrome://, find first valid web tab in current window
      chrome.tabs.query({ currentWindow: true }, (allTabs) => {
        const validTab = (allTabs || []).find((t) => t.url && isInjectableUrl(t.url));
        resolve(validTab || active || null);
      });
    });
  });
}

/**
 * Sends a message to a tab, automatically injecting content.js with robust retries.
 */
export async function sendMessageToTab<T = any>(tabId: number, message: any): Promise<T> {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    throw new Error('Chrome extension API tidak tersedia (mode simulasi).');
  }

  // Verify tab URL if accessible
  const tab = await new Promise<chrome.tabs.Tab | undefined>((resolve) => {
    chrome.tabs.get(tabId, (t) => {
      if (chrome.runtime.lastError) resolve(undefined);
      else resolve(t);
    });
  });

  if (!tab) {
    throw new Error('Tab target tidak ditemukan. Buka halaman website target terlebih dahulu.');
  }

  if (tab.url && !isInjectableUrl(tab.url)) {
    throw new Error(
      `Halaman "${tab.title || tab.url}" diproteksi oleh browser (${tab.url.split('/')[0]}//). Silakan buka tab website form target.`
    );
  }

  // 1. Try sending message directly
  const trySend = (): Promise<{ success: boolean; res?: any; error?: string }> => {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve({ success: true, res });
        }
      });
    });
  };

  const firstAttempt = await trySend();
  if (firstAttempt.success) {
    return firstAttempt.res as T;
  }

  // 2. If receiving end does not exist, inject content.js dynamically and retry with backoff
  const errStr = firstAttempt.error || '';
  if (
    errStr.includes('Receiving end does not exist') ||
    errStr.includes('Could not establish connection') ||
    errStr.includes('The message port closed')
  ) {
    try {
      if (chrome.scripting && chrome.scripting.executeScript) {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js'],
        });

        // Retry with backoff (150ms, 300ms, 600ms)
        const delays = [150, 300, 600];
        for (const delay of delays) {
          await new Promise((r) => setTimeout(r, delay));
          const retryRes = await trySend();
          if (retryRes.success) {
            return retryRes.res as T;
          }
        }
        throw new Error('Content script berhasil diinjeksi namun belum merespons. Silakan refresh tab website.');
      }
    } catch (err: any) {
      const msg = err.message || String(err);
      if (msg.includes('Cannot access contents of url "file:') || msg.includes('file url access')) {
        throw new Error(
          'Untuk menguji file lokal (file://), aktifkan opsi "Allow access to file URLs" di chrome://extensions > Details AutoDataFiller. Atau gunakan http://localhost.'
        );
      }
      throw new Error(`Gagal menginjeksi ke tab web: ${msg}`);
    }
  }

  throw new Error(firstAttempt.error || 'Gagal mengirim pesan ke tab website.');
}

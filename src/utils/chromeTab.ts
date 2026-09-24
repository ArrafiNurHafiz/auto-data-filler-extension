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
 * Sends a message to a tab, automatically injecting content.js if not already present.
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
    throw new Error('Tab target tidak ditemukan atau telah ditutup. Silakan pilih tab aktif.');
  }

  if (tab.url && !isInjectableUrl(tab.url)) {
    throw new Error(
      'Ekstensi tidak dapat berjalan pada halaman internal browser (chrome://, Web Store, about:blank). Buka halaman website atau file form terlebih dahulu.'
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

  // 2. If receiving end does not exist, inject content.js dynamically and retry
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

        // Short pause to allow content script to register listeners
        await new Promise((r) => setTimeout(r, 150));

        const secondAttempt = await trySend();
        if (secondAttempt.success) {
          return secondAttempt.res as T;
        }
        throw new Error(secondAttempt.error || 'Gagal berkomunikasi dengan halaman web.');
      }
    } catch (err: any) {
      const msg = err.message || String(err);
      if (msg.includes('Cannot access contents of url "file:') || msg.includes('file url access')) {
        throw new Error(
          'Untuk menguji file lokal (file://), aktifkan opsi "Allow access to file URLs" di chrome://extensions > Details ekstensi ini. Atau buka via http://localhost:3456/demo_test_page.html'
        );
      }
      throw new Error(`Gagal menginjeksi content script: ${msg}. Coba refresh halaman tab website target.`);
    }
  }

  throw new Error(firstAttempt.error || 'Gagal mengirim pesan ke tab website.');
}

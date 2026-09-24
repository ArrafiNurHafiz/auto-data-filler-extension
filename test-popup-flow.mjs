import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testFullExtensionFlow() {
  const extensionPath = path.resolve(__dirname, 'dist');
  console.log('[Test] Loading extension from:', extensionPath);

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome-stable',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  try {
    // Open target web page first
    const webPage = await browser.newPage();
    await webPage.goto('http://localhost:3456', { waitUntil: 'load' });
    console.log('[Test] Target web page opened:', await webPage.title());

    // Wait a bit for Chrome to register the extension
    await new Promise((r) => setTimeout(r, 2000));

    // Get all targets
    const targets = browser.targets();
    console.log('[Test] Targets found:', targets.length);
    for (const t of targets) {
      console.log(' - Type:', t.type(), 'URL:', t.url());
    }

    // If service worker isn't listed, open chrome://extensions to find extension ID
    let extensionId = '';
    const extTarget = targets.find((t) => t.url().startsWith('chrome-extension://'));
    if (extTarget) {
      extensionId = extTarget.url().split('/')[2];
    } else {
      const extManagePage = await browser.newPage();
      await extManagePage.goto('chrome://extensions', { waitUntil: 'load' });
      await new Promise((r) => setTimeout(r, 1000));
      const extTargets = browser.targets().filter((t) => t.url().startsWith('chrome-extension://'));
      if (extTargets.length > 0) {
        extensionId = extTargets[0].url().split('/')[2];
      }
    }

    console.log('[Test] Found extension ID:', extensionId);

    if (!extensionId) {
      throw new Error('Extension ID could not be determined.');
    }

    // 3. Open extension popup
    const popupPage = await browser.newPage();
    popupPage.on('console', (msg) => console.log('[Popup Console]:', msg.type(), msg.text()));
    popupPage.on('pageerror', (err) => console.error('[Popup Error]:', err));

    await popupPage.goto(`chrome-extension://${extensionId}/index.html`, { waitUntil: 'networkidle0' });
    console.log('[Test] Popup page opened');

    // 4. Click "Load Data Contoh" in Upload tab
    await popupPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent && b.textContent.includes('Load Data Contoh'));
      if (btn) btn.click();
    });
    console.log('[Test] Clicked "Load Data Contoh"');
    await new Promise((r) => setTimeout(r, 800));

    // 5. Navigate to Target Web tab and choose "Form Kontak / Registrasi Demo"
    await popupPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent && b.textContent.includes('Target Web'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    await popupPage.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div.rounded-xl'));
      for (const card of cards) {
        if (card.textContent && card.textContent.includes('Form Kontak / Registrasi Demo')) {
          const selectBtn = card.querySelector('button');
          if (selectBtn && selectBtn.textContent?.includes('Pilih')) {
            selectBtn.click();
          }
        }
      }
    });
    console.log('[Test] Selected "Form Kontak / Registrasi Demo" preset');
    await new Promise((r) => setTimeout(r, 800));

    // 6. Navigate to Runner tab
    await popupPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent && b.textContent.includes('Runner'));
      if (btn) btn.click();
    });
    console.log('[Test] Navigated to Runner tab');
    await new Promise((r) => setTimeout(r, 800));

    // 7. Click "Mulai Otomatisasi"
    await popupPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent && b.textContent.includes('Mulai Otomatisasi'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // 8. Click modal "Ya, Mulai Input"
    await popupPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent && b.textContent.includes('Ya, Mulai Input'));
      if (btn) btn.click();
    });
    console.log('[Test] Confirmed automation start');

    // 9. Wait for execution to finish
    await new Promise((r) => setTimeout(r, 10000));

    // 10. Check results in target webPage
    const targetLogs = await webPage.evaluate(() => {
      return document.getElementById('logBox')?.innerText;
    });
    console.log('\n======================================================');
    console.log('[Test] LOGS ON TARGET WEB PAGE (http://localhost:3456):');
    console.log(targetLogs);
    console.log('======================================================\n');

    await webPage.screenshot({ path: 'test_target_web.png' });
    await popupPage.screenshot({ path: 'test_popup.png' });

    await browser.close();
  } catch (err) {
    console.error('[Test Failure]:', err);
    await browser.close();
  }
}

testFullExtensionFlow();

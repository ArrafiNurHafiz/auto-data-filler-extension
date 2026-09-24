import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runLiveTest() {
  const pathToExtension = path.resolve(__dirname, 'dist');
  const demoPageUrl = 'file://' + path.resolve(__dirname, 'public/demo_test_page.html');

  console.log('[Test] Path to extension:', pathToExtension);
  console.log('[Test] Demo page URL:', demoPageUrl);

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome-stable',
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--allow-file-access-from-files'
    ]
  });

  try {
    const extId = 'pjfmofgemkeaneiflobpldibffogfahp';
    console.log('[Test] Using calculated Extension ID:', extId);

    // Open demo form page
    const page = await browser.newPage();
    await page.goto(demoPageUrl, { waitUntil: 'load' });
    console.log('[Test] Opened demo page:', await page.title());

    // Open extension popup page
    const popupPage = await browser.newPage();
    await popupPage.goto(`chrome-extension://${extId}/index.html`, { waitUntil: 'networkidle0' });
    console.log('[Test] Opened popup UI');

    // Click "Load Data Contoh"
    await popupPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent && b.textContent.includes('Load Data Contoh'));
      if (btn) btn.click();
    });
    console.log('[Test] Clicked "Load Data Contoh"');
    await new Promise((r) => setTimeout(r, 1000));

    // Click "Runner" Tab
    await popupPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent && b.textContent.includes('Runner'));
      if (btn) btn.click();
    });
    console.log('[Test] Navigated to Runner');
    await new Promise((r) => setTimeout(r, 1000));

    // Focus demo page tab, then click "Mulai Otomatisasi" in popup
    // (Note: in real browser, user clicks popup while active on the demo page)
    console.log('[Test] Bringing demo page to front...');
    await page.bringToFront();
    await new Promise((r) => setTimeout(r, 500));

    // Click "Mulai Otomatisasi" and confirm modal directly
    await popupPage.bringToFront();
    await popupPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent && b.textContent.includes('Mulai Otomatisasi'));
      if (btn) btn.click();
    });

    await new Promise((r) => setTimeout(r, 500));

    await popupPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent && b.textContent.includes('Ya, Mulai Input'));
      if (btn) btn.click();
    });
    console.log('[Test] Clicked "Ya, Mulai Input"');

    // Wait 12 seconds for auto-filling
    await new Promise((r) => setTimeout(r, 12000));

    // Inspect demo page logBox
    const logs = await page.evaluate(() => {
      return document.getElementById('logBox')?.innerText || '';
    });

    console.log('\n=======================================================');
    console.log('HASIL LOG PADA DEMO PAGE SETELAH OTOMATISASI BERJALAN:');
    console.log(logs);
    console.log('=======================================================\n');

    await page.screenshot({ path: 'demo_page_result.png' });
    await popupPage.screenshot({ path: 'popup_runner_result.png' });
    console.log('[Test] Screenshots saved: demo_page_result.png, popup_runner_result.png');

    await browser.close();
  } catch (err) {
    console.error('[Test Error]:', err);
    await browser.close();
  }
}

runLiveTest();

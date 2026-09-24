import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runDirectContentScriptTest() {
  console.log('[Test] Menjalankan uji coba eksekusi DOM Content Script secara langsung di Chrome...');

  const demoPagePath = path.resolve(__dirname, 'public/demo_test_page.html');
  const contentScriptPath = path.resolve(__dirname, 'dist/content.js');
  const contentScriptCode = fs.readFileSync(contentScriptPath, 'utf8');

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome-stable',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  await page.goto('file://' + demoPagePath, { waitUntil: 'load' });
  console.log('[Test] Halaman demo target terbuka:', await page.title());

  // Inject the actual bundled content.js code
  await page.evaluate(contentScriptCode);
  console.log('[Test] Content script dist/content.js berhasil diinjeksi ke DOM!');

  // Test data to fill
  const testRows = [
    { Nama: 'Budi Santoso', Email: 'budi@example.com', Telepon: '081234567890', Kategori: 'Teknologi', Alamat: 'Jl. Sudirman No. 45, Jakarta' },
    { Nama: 'Siti Rahmawati', Email: 'siti@example.com', Telepon: '082345678901', Kategori: 'Pemasaran', Alamat: 'Jl. Gatot Subroto No. 12, Bandung' },
    { Nama: 'Andi Wijaya', Email: 'andi@example.com', Telepon: '083456789012', Kategori: 'Keuangan', Alamat: 'Jl. Diponegoro No. 88, Surabaya' }
  ];

  const config = {
    id: 'config-sample-contact',
    name: 'Form Kontak / Registrasi Demo',
    urlPattern: 'https://*/*',
    mappings: [
      {
        id: 'map-1',
        excelColumn: 'Nama',
        targetName: 'Input Nama Lengkap',
        selectorType: 'css',
        primarySelector: 'input[name="nama"], #nama',
        fallbackSelectors: ['input[placeholder*="Nama" i]'],
        actionType: 'type',
        isRequired: true,
        clearBeforeType: true
      },
      {
        id: 'map-2',
        excelColumn: 'Email',
        targetName: 'Input Email',
        selectorType: 'css',
        primarySelector: 'input[name="email"], #email',
        fallbackSelectors: ['input[placeholder*="Email" i]'],
        actionType: 'type',
        isRequired: true,
        clearBeforeType: true
      },
      {
        id: 'map-3',
        excelColumn: 'Telepon',
        targetName: 'Input No HP',
        selectorType: 'css',
        primarySelector: 'input[name="telepon"], #telepon',
        fallbackSelectors: ['input[placeholder*="Telepon" i]'],
        actionType: 'type'
      },
      {
        id: 'map-4',
        excelColumn: 'Kategori',
        targetName: 'Dropdown Kategori',
        selectorType: 'css',
        primarySelector: 'select[name="kategori"], #kategori',
        fallbackSelectors: ['select'],
        actionType: 'select'
      },
      {
        id: 'map-5',
        excelColumn: 'Alamat',
        targetName: 'Textarea Alamat',
        selectorType: 'css',
        primarySelector: 'textarea[name="alamat"], #alamat',
        fallbackSelectors: ['textarea'],
        actionType: 'type'
      }
    ],
    submitSelector: {
      selectorType: 'css',
      primarySelector: 'button[type="submit"], #btnSubmit, .btn-submit',
      fallbackSelectors: []
    },
    navigation: {
      delayBetweenRowsMs: 800,
      maxRetriesPerRow: 2,
      successIndicatorSelector: '#statusAlert'
    }
  };

  const settings = {
    timeoutMs: 4000,
    highlight: true,
    defaultDelayMs: 250,
    stopOnError: false
  };

  // Run the processRowOnPage for each row
  for (let i = 0; i < testRows.length; i++) {
    console.log(`[Test] Menginput baris ke-${i + 1}: ${testRows[i].Nama}...`);
    const result = await page.evaluate(async (row, cfg, st) => {
      // @ts-ignore
      return await window.processRowOnPage(row, cfg, st);
    }, testRows[i], config, settings);

    console.log(`[Test] Hasil baris ke-${i + 1}:`, result);
    await new Promise((r) => setTimeout(r, 600));
  }

  // Check the logBox in the demo page
  const pageLogs = await page.evaluate(() => {
    return document.getElementById('logBox')?.innerText || '';
  });

  console.log('\n======================================================');
  console.log('LOG RIWAYAT PADA HALAMAN TARGET (demo_test_page.html):');
  console.log(pageLogs);
  console.log('======================================================\n');

  await page.screenshot({ path: 'live_test_success.png' });
  console.log('[Test] Screenshot disimpan ke: live_test_success.png');

  await browser.close();
  console.log('[Test] Selesai!');
}

runDirectContentScriptTest();

# AutoDataFiller - Web Form Automator Chrome Extension

Ekstensi Google Chrome (Manifest V3) untuk melakukan otomatisasi input data dari spreadsheet Excel (`.xlsx`, `.xls`) dan CSV ke formulir atau dashboard website secara presisi menggunakan selektor DOM cerdas.

---

## 🚀 Fitur Utama

- **Upload & Parser Spreadsheet:** Membaca file Excel dan CSV multi-baris secara lokal di browser.
- **Visual Element Picker:** Memilih elemen input langsung dari halaman website aktif hanya dengan mengarahkan kursor dan mengeklik elemen (lengkap dengan outline visual).
- **Multi-Strategy DOM Selector:** Mendukung CSS Selector, ID, Name, Placeholder, Label Text, Button Text, hingga XPath.
- **React / Vue State Dispatcher:** Mendukung bypass native setter prototype dan event dispatches (`input`, `change`, `focus`, `blur`, `keyup`) agar kompatibel dengan framework SPA modern.
- **Automation Runner:**
  - Progress bar & KPI real-time (total, berhasil, gagal, pending).
  - Kontrol jeda (Pause), lanjutkan (Resume), dan henti (Stop).
  - Terminal live activity log.
  - Auto retry baris yang gagal.
  - Export laporan hasil ke Excel.
- **Side Panel & Full Tab View:** Mendukung mode Panel Samping (`sidePanel`) dan Tab Penuh agar UI otomatisasi tidak tertutup saat berinteraksi dengan website.
- **Local Storage Persistence:** Menyimpan konfigurasi preset, histori sesi, dan state data secara aman di `chrome.storage.local`.

---

## 🛠️ Tech Stack

- **Framework & UI:** React 18, TypeScript, Tailwind CSS, Lucide Icons
- **Bundler:** Vite
- **Parser Excel:** SheetJS (`xlsx`)
- **Platform:** Chrome Extension Manifest V3 (Side Panel, Scripting, Storage, Content Scripts)

---

## 📦 Cara Instalasi & Menjalankan

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/ArrafiNurHafiz/auto-data-filler-extension.git
cd auto-data-filler-extension
npm install
```

### 2. Build Ekstensi
```bash
npm run build
```
Hasil build akan tersedia pada direktori `dist/`.

### 3. Pasang di Google Chrome
1. Buka browser Chrome dan buka URL `chrome://extensions`.
2. Aktifkan toggle **Developer Mode** di pojok kanan atas.
3. Klik tombol **Load unpacked (Muat yang belum dibongkar)** di pojok kiri atas.
4. Pilih folder `dist/` dari proyek ini.
5. Ekstensi **AutoDataFiller** siap digunakan!

---

## 🧪 Menguji dengan Demo Form Lokal

1. Jalankan demo server lokal:
   ```bash
   node serve-demo.mjs
   ```
2. Buka tab browser ke `http://localhost:3456/demo_test_page.html`.
3. Buka ekstensi **AutoDataFiller** $\rightarrow$ klik **Load Data Contoh** $\rightarrow$ buka tab **Runner** $\rightarrow$ pilih tab target $\rightarrow$ klik **Mulai Otomatisasi**.

---

## 📄 Lisensi
MIT License.

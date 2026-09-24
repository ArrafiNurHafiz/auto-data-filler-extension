import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, ArrowRight, AlertCircle, RefreshCw, Table } from 'lucide-react';
import { ParsedSheetData, parseExcelFile } from '../utils/excel';

interface UploadPageProps {
  data: ParsedSheetData | null;
  onDataParsed: (data: ParsedSheetData) => void;
  onGoToMapping: () => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ data, onDataParsed, onGoToMapping }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    const validExts = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setError('Format file tidak didukung. Harap upload file .xlsx, .xls, atau .csv');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const parsed = await parseExcelFile(file);
      onDataParsed(parsed);
    } catch (err: any) {
      setError(err.message || 'Gagal memproses file Excel.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const loadDemoData = () => {
    const demoRows = [
      { Nama: 'Budi Santoso', Email: 'budi@example.com', Telepon: '081234567890', Kategori: 'Teknologi', Alamat: 'Jl. Sudirman No. 45, Jakarta' },
      { Nama: 'Siti Rahma', Email: 'siti@example.com', Telepon: '082345678901', Kategori: 'Pemasaran', Alamat: 'Jl. Gatot Subroto No. 12, Bandung' },
      { Nama: 'Andi Wijaya', Email: 'andi@example.com', Telepon: '083456789012', Kategori: 'Keuangan', Alamat: 'Jl. Diponegoro No. 88, Surabaya' },
      { Nama: 'Dewi Lestari', Email: 'dewi@example.com', Telepon: '085678901234', Kategori: 'Operasional', Alamat: 'Jl. Malioboro No. 23, Yogyakarta' },
    ];
    onDataParsed({
      fileName: 'Sample_Contact_Demo.xlsx',
      sheetNames: ['Sheet1'],
      currentSheet: 'Sheet1',
      headers: ['Nama', 'Email', 'Telepon', 'Kategori', 'Alamat'],
      rows: demoRows,
      totalRows: demoRows.length
    });
  };

  return (
    <div className="p-3 space-y-3 max-w-2xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-xs font-bold text-gray-900 dark:text-white truncate">Upload Data Spreadsheet</h2>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
            File Excel / CSV untuk diinput ke form web.
          </p>
        </div>
        <button
          onClick={loadDemoData}
          className="shrink-0 text-[11px] text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 px-2 py-1 rounded-md border border-sky-200 dark:border-sky-800 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Data Contoh</span>
        </button>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-150 ${
          isDragging
            ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/40'
            : 'border-gray-300 dark:border-gray-800 hover:border-sky-400 dark:hover:border-sky-700 bg-white dark:bg-gray-900/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="h-10 w-10 rounded-full bg-sky-50 dark:bg-sky-950/70 border border-sky-100 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
              Klik untuk pilih file atau tarik file ke sini
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Format didukung: <span className="font-medium text-gray-700 dark:text-gray-300">.xlsx, .xls, .csv</span>
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-3 text-xs font-medium text-sky-600 bg-sky-50 dark:bg-sky-950/30 rounded-lg">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>Membaca dan memvalidasi spreadsheet...</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2 text-red-700 dark:text-red-300 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loaded File Card & Table Preview */}
      {data && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 space-y-3.5 shadow-xs">
          {/* File Info & Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 shrink-0">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{data.fileName}</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{data.totalRows} baris</span> • {data.headers.length} kolom
                </p>
              </div>
            </div>

            <button
              onClick={onGoToMapping}
              className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-500 active:scale-[0.98] text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all shrink-0"
            >
              <span>Lanjut ke Mapping</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Table Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Table className="h-3.5 w-3.5 text-gray-500" />
                <span>Pratinjau Data (5 Baris Pertama)</span>
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100/70 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                    <th className="py-2 px-2.5 font-semibold w-10 text-center text-gray-500">#</th>
                    {data.headers.map((h, i) => (
                      <th key={i} className="py-2 px-2.5 font-semibold whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
                  {data.rows.slice(0, 5).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="py-1.5 px-2.5 text-center text-gray-400 font-mono text-[11px]">{rIdx + 1}</td>
                      {data.headers.map((h, cIdx) => (
                        <td key={cIdx} className="py-1.5 px-2.5 text-gray-800 dark:text-gray-200 max-w-xs truncate text-[11px]">
                          {String(row[h] !== undefined ? row[h] : '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

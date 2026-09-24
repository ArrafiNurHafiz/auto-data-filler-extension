import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, Eye } from 'lucide-react';
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
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Upload File Data (Excel / CSV)</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Unggah file .xlsx, .xls, atau .csv berisi data yang ingin diinput ke website.
          </p>
        </div>
        <button
          onClick={loadDemoData}
          className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium flex items-center gap-1 bg-sky-50 dark:bg-sky-950/30 px-2.5 py-1 rounded-md border border-sky-200 dark:border-sky-800"
        >
          <RefreshCw className="h-3 w-3" />
          Load Data Contoh
        </button>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40'
            : 'border-gray-300 dark:border-gray-700 hover:border-sky-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
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
          <div className="h-12 w-12 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Klik atau Tarik File ke Sini
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Mendukung file Microsoft Excel (.xlsx, .xls) & CSV
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-sky-600">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Membaca dan memproses struktur spreadsheet...</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2 text-red-700 dark:text-red-300 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Data Summary & Preview */}
      {data && (
        <div className="space-y-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white">{data.fileName}</h3>
                <p className="text-[11px] text-gray-500">
                  {data.totalRows} baris data ditemukan | {data.headers.length} kolom
                </p>
              </div>
            </div>

            <button
              onClick={onGoToMapping}
              className="px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Lanjut ke Mapping Field
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> Preview Data (Maksimal 5 baris pertama):
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-800">
                    <th className="p-2 font-semibold text-gray-600 dark:text-gray-400 w-12 text-center">#</th>
                    {data.headers.map((h, i) => (
                      <th key={i} className="p-2 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.rows.slice(0, 5).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="p-2 text-center text-gray-400">{rIdx + 1}</td>
                      {data.headers.map((h, cIdx) => (
                        <td key={cIdx} className="p-2 text-gray-800 dark:text-gray-200 max-w-xs truncate">
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

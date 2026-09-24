import * as XLSX from 'xlsx';

export interface ParsedSheetData {
  fileName: string;
  sheetNames: string[];
  currentSheet: string;
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

export async function parseExcelFile(file: File): Promise<ParsedSheetData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('File tidak memiliki sheet yang valid.');
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
          defval: '',
          raw: false
        });

        if (jsonData.length === 0) {
          throw new Error('Sheet kosong atau tidak memiliki baris data.');
        }

        const headers = Object.keys(jsonData[0] || {});

        resolve({
          fileName: file.name,
          sheetNames: workbook.SheetNames,
          currentSheet: firstSheetName,
          headers,
          rows: jsonData,
          totalRows: jsonData.length
        });
      } catch (err: any) {
        reject(new Error(err.message || 'Gagal memproses file Excel/CSV.'));
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file dari disk.'));
    reader.readAsArrayBuffer(file);
  });
}

export function exportResultsToExcel(
  results: Array<{ rowIndex: number; status: string; errorDetail?: string; data: Record<string, any> }>,
  baseFileName: string = 'automation-results'
) {
  const flattened = results.map((r) => ({
    'Baris ke': r.rowIndex + 1,
    'Status Proses': r.status,
    'Keterangan / Error': r.errorDetail || '',
    ...r.data
  }));

  const worksheet = XLSX.utils.json_to_sheet(flattened);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Hasil Eksekusi');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  XLSX.writeFile(workbook, `${baseFileName}_${timestamp}.xlsx`);
}

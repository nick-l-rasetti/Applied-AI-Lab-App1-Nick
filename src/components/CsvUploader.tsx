import React, { useRef, useState } from 'react';
import { SAMPLE_CSV_CONTENT } from '../data/sampleOrders';
import { Download, FileSpreadsheet, FileText, Info, Sparkles, UploadCloud } from 'lucide-react';

interface CsvUploaderProps {
  onDataLoaded: (csvText: string, filename?: string) => void;
  isLoading?: boolean;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({ onDataLoaded, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        onDataLoaded(text, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_sales_orders.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
        {/* Upload Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,text/csv"
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Click to upload or drag &amp; drop your sales CSV
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comma-separated CSV with columns: quarter, region, channel, product, units, discount_pct, revenue
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions & Sample Data Loader */}
        <div className="flex flex-col justify-center space-y-3 min-w-[240px]">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Or Quick Start With
          </div>

          <button
            type="button"
            onClick={() => onDataLoaded(SAMPLE_CSV_CONTENT, 'sample_sales_orders.csv')}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Load Sample Sales Data</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadSample}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample CSV Template</span>
          </button>
        </div>
      </div>

      {/* Column schema pill list */}
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
          <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
          Required Columns:
        </span>
        {['quarter', 'region', 'channel', 'product', 'units', 'discount_pct', 'revenue'].map((col) => (
          <span
            key={col}
            className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]"
          >
            {col}
          </span>
        ))}
      </div>
    </div>
  );
};

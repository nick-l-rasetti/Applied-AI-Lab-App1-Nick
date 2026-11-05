import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Sparkles, FileSpreadsheet } from 'lucide-react';
import { parseSalesCSV } from '../utils/calculator.ts';
import { SalesOrder } from '../types.ts';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (orders: SalesOrder[], fileName: string) => void;
  onLoadSample: () => void;
  onLoadUserData?: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
  onLoadSample,
  onLoadUserData,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [pastedCSV, setPastedCSV] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFile = (file: File) => {
    setErrorMessage(null);
    setWarnings([]);

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && !file.type.includes('text/')) {
      // Still allow text files
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setErrorMessage('Could not read file content.');
        return;
      }
      handleParseText(text, file.name);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read the file.');
    };
    reader.readAsText(file);
  };

  const handleParseText = (csvText: string, fileName = 'custom_sales_data.csv') => {
    setErrorMessage(null);
    setWarnings([]);

    const result = parseSalesCSV(csvText);

    if (result.errors.length > 0) {
      setErrorMessage(result.errors.join(' '));
      if (result.warnings.length > 0) setWarnings(result.warnings);
      return;
    }

    if (result.warnings.length > 0) {
      setWarnings(result.warnings);
    }

    onDataLoaded(result.orders, fileName);
    onClose();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Upload Sales Orders CSV</h2>
              <p className="text-xs text-slate-400">
                Required columns: quarter, region, channel, product, units, discount_pct, revenue
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 px-6 pt-2 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('file')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'file'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            File Upload / Drag &amp; Drop
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'paste'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Paste Raw CSV Text
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Validation Error</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                {warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'file' ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-950/30 hover:bg-slate-950/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3 border border-indigo-500/20">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200 mb-1">
                Click to browse or drop your CSV file here
              </p>
              <p className="text-xs text-slate-400 mb-4">
                Standard .csv format with headers. Values like currency ($) and percentages (%) are automatically cleaned.
              </p>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 border border-slate-700">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>Select file from computer</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-300">
                Paste CSV table data (including header row):
              </label>
              <textarea
                value={pastedCSV}
                onChange={(e) => setPastedCSV(e.target.value)}
                placeholder="quarter,region,channel,product,units,discount_pct,revenue&#10;Q1,North America,Enterprise Direct,Cloud Enterprise Platform,140,0.10,770000..."
                rows={7}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => handleParseText(pastedCSV, 'pasted_data.csv')}
                disabled={!pastedCSV.trim()}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Parse &amp; Load Pasted CSV
              </button>
            </div>
          )}

          {/* Expected Columns Pill Grid */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80">
            <h4 className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Expected 7 Columns
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { col: 'quarter', desc: 'e.g. Q1, Q2, Q3, Q4' },
                { col: 'region', desc: 'e.g. North America, EMEA' },
                { col: 'channel', desc: 'e.g. Enterprise, Online' },
                { col: 'product', desc: 'Product/SKU name' },
                { col: 'units', desc: 'Numeric quantity' },
                { col: 'discount_pct', desc: 'e.g. 0.15 or 15%' },
                { col: 'revenue', desc: 'Order total in USD ($)' },
              ].map(({ col, desc }) => (
                <div
                  key={col}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-left"
                >
                  <code className="text-indigo-400 text-xs font-bold block">{col}</code>
                  <span className="text-[10px] text-slate-400 block truncate">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onLoadUserData && (
              <button
                onClick={() => {
                  onLoadUserData();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Load Lab 1 Sales Dataset
              </button>
            )}
            <button
              onClick={() => {
                onLoadSample();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Sample Demo Dataset
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

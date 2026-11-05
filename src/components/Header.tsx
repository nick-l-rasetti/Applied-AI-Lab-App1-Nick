import React from 'react';
import { BarChart3, UploadCloud, FileSpreadsheet, Sparkles, Download, Layers } from 'lucide-react';
import { SalesAggregation } from '../types.ts';
import { formatCompactCurrency } from '../utils/calculator.ts';
import { SAMPLE_CSV_CONTENT } from '../utils/sampleData.ts';

interface HeaderProps {
  aggregation: SalesAggregation | null;
  onLoadSample: () => void;
  onLoadUserData?: () => void;
  onOpenUpload: () => void;
  onOpenRawData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  aggregation,
  onLoadSample,
  onLoadUserData,
  onOpenUpload,
  onOpenRawData,
}) => {
  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sales_orders_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Quarterly Sales Performance
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  AI Region Analyst
                </span>
              </div>
              <p className="text-xs text-slate-400">
                CSV Revenue Analytics &amp; Q2→Q3 Attributed Variance Summaries
              </p>
            </div>
          </div>

          {/* Key Metrics Strip if data loaded */}
          {aggregation && (
            <div className="hidden lg:flex items-center space-x-4 bg-slate-950/60 border border-slate-800/80 rounded-xl px-3.5 py-1.5 text-xs">
              <div>
                <span className="text-slate-500 block">Total Revenue</span>
                <span className="font-bold text-white">
                  {formatCompactCurrency(aggregation.grandTotal)}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-slate-500 block">Orders</span>
                <span className="font-semibold text-slate-200">
                  {aggregation.totalOrders.toLocaleString()}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-slate-500 block">Regions</span>
                <span className="font-semibold text-slate-200">
                  {aggregation.regions.length}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-slate-500 block">Quarters</span>
                <span className="font-semibold text-indigo-400">
                  {aggregation.quarters.join(', ')}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {onLoadUserData && (
              <button
                onClick={onLoadUserData}
                title="Load your Lab 1 sales data"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-700/40 rounded-lg transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                Lab 1 Sales Data
              </button>
            )}

            <button
              onClick={handleDownloadSample}
              title="Download sample CSV template"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              Template CSV
            </button>

            <button
              onClick={onLoadSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:text-indigo-200 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-700/40 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
              Load Sample Data
            </button>

            {aggregation && (
              <button
                onClick={onOpenRawData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 rounded-lg transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                Inspect Orders
              </button>
            )}

            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 rounded-lg shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.02]"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Upload CSV
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

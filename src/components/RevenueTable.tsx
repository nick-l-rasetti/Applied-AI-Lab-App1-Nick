import React, { useState } from 'react';
import { Q2Q3AnalysisResult, RegionQuarterMatrix } from '../types';
import { formatCurrency, formatPercent } from '../utils/analytics';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Info, Table as TableIcon } from 'lucide-react';

interface RevenueTableProps {
  matrix: RegionQuarterMatrix;
  q2q3Analysis: Q2Q3AnalysisResult;
  onSelectRegion?: (region: string) => void;
  selectedRegion?: string | null;
}

type SortField = 'region' | 'total' | 'diff' | 'pct' | string; // or quarter name

export const RevenueTable: React.FC<RevenueTableProps> = ({
  matrix,
  q2q3Analysis,
  onSelectRegion,
  selectedRegion,
}) => {
  const [sortField, setSortField] = useState<SortField>('diff');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { regions, quarters, revenue, regionTotals, quarterTotals, grandTotal } = matrix;
  const hasQ2Q3 = q2q3Analysis.hasQ2AndQ3;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Build rows data
  const rows = regions.map((region) => {
    const q2Delta = q2q3Analysis.regionsAnalyzed.find((r) => r.region === region);
    return {
      region,
      quarterRevenues: quarters.map((q) => revenue[region]?.[q] || 0),
      total: regionTotals[region] || 0,
      diff: q2Delta ? q2Delta.diffRevenue : 0,
      pct: q2Delta ? q2Delta.pctChange : 0,
      isMostChanged: q2q3Analysis.mostChangedByAbsolute?.region === region,
    };
  });

  // Sort rows
  const sortedRows = [...rows].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'region') {
      comparison = a.region.localeCompare(b.region);
    } else if (sortField === 'total') {
      comparison = a.total - b.total;
    } else if (sortField === 'diff') {
      comparison = a.diff - b.diff;
    } else if (sortField === 'pct') {
      comparison = a.pct - b.pct;
    } else {
      // Sort by a specific quarter
      const qIdx = quarters.indexOf(sortField);
      if (qIdx !== -1) {
        comparison = (a.quarterRevenues[qIdx] || 0) - (b.quarterRevenues[qIdx] || 0);
      }
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
      {/* Table Title Bar */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TableIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Regional Revenue Matrix by Quarter
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Click any row for product and channel variance breakdown</span>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              <th
                onClick={() => handleSort('region')}
                className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Region</span>
                  {getSortIcon('region')}
                </div>
              </th>

              {quarters.map((q) => (
                <th
                  key={`th-${q}`}
                  onClick={() => handleSort(q)}
                  className={`py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group select-none ${
                    q === 'Q2' || q === 'Q3' ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-300' : ''
                  }`}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>{q} Revenue</span>
                    {getSortIcon(q)}
                  </div>
                </th>
              ))}

              <th
                onClick={() => handleSort('total')}
                className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group select-none font-bold"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Total</span>
                  {getSortIcon('total')}
                </div>
              </th>

              {hasQ2Q3 && (
                <>
                  <th
                    onClick={() => handleSort('diff')}
                    className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group select-none bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Q2 → Q3 Delta ($)</span>
                      {getSortIcon('diff')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('pct')}
                    className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group select-none bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Q2 → Q3 Change (%)</span>
                      {getSortIcon('pct')}
                    </div>
                  </th>
                </>
              )}

              <th className="py-3.5 px-3 text-center w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedRows.map((row) => {
              const isSelected = selectedRegion === row.region;
              return (
                <tr
                  key={row.region}
                  onClick={() => onSelectRegion?.(row.region)}
                  className={`group cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/90 dark:bg-indigo-950/40 ring-1 ring-inset ring-indigo-500/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      <span>{row.region}</span>
                      {row.isMostChanged && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          Highest Shift
                        </span>
                      )}
                    </div>
                  </td>

                  {row.quarterRevenues.map((rev, qIdx) => {
                    const qName = quarters[qIdx];
                    const isQ2Q3 = qName === 'Q2' || qName === 'Q3';
                    return (
                      <td
                        key={`cell-${row.region}-${qName}`}
                        className={`py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300 ${
                          isQ2Q3 ? 'bg-indigo-50/30 dark:bg-indigo-950/10 font-semibold' : ''
                        }`}
                      >
                        {formatCurrency(rev)}
                      </td>
                    );
                  })}

                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(row.total)}
                  </td>

                  {hasQ2Q3 && (
                    <>
                      <td className="py-3 px-4 text-right font-mono bg-indigo-50/30 dark:bg-indigo-950/10">
                        <span
                          className={`font-semibold inline-flex items-center gap-0.5 ${
                            row.diff > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : row.diff < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {row.diff > 0 ? '+' : ''}
                          {formatCurrency(row.diff)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono bg-indigo-50/30 dark:bg-indigo-950/10">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            row.pct > 0
                              ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                              : row.pct < 0
                              ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                          }`}
                        >
                          {formatPercent(row.pct)}
                        </span>
                      </td>
                    </>
                  )}

                  <td className="py-3 px-3 text-center text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Grand Totals Footer */}
          <tfoot>
            <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100">
              <td className="py-3 px-4 uppercase text-xs tracking-wider">
                Total All Regions
              </td>
              {quarters.map((q) => (
                <td
                  key={`foot-${q}`}
                  className={`py-3 px-4 text-right font-mono ${
                    q === 'Q2' || q === 'Q3' ? 'bg-indigo-100/50 dark:bg-indigo-900/30 text-indigo-950 dark:text-indigo-200' : ''
                  }`}
                >
                  {formatCurrency(quarterTotals[q] || 0)}
                </td>
              ))}
              <td className="py-3 px-4 text-right font-mono text-indigo-700 dark:text-indigo-300 font-extrabold">
                {formatCurrency(grandTotal)}
              </td>
              {hasQ2Q3 && (
                <>
                  <td className="py-3 px-4 text-right font-mono bg-indigo-100/50 dark:bg-indigo-900/30">
                    <span
                      className={
                        q2q3Analysis.overallDiffRevenue >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }
                    >
                      {q2q3Analysis.overallDiffRevenue >= 0 ? '+' : ''}
                      {formatCurrency(q2q3Analysis.overallDiffRevenue)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono bg-indigo-100/50 dark:bg-indigo-900/30">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        q2q3Analysis.overallPctChange >= 0
                          ? 'bg-emerald-200/70 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-200/70 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {formatPercent(q2q3Analysis.overallPctChange)}
                    </span>
                  </td>
                </>
              )}
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

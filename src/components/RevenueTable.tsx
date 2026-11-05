import React, { useState, useMemo } from 'react';
import { Table, ArrowUpDown, ChevronDown, ChevronRight, Search, Download, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { SalesAggregation } from '../types.ts';
import { formatCurrency, formatCompactCurrency } from '../utils/calculator.ts';

interface RevenueTableProps {
  aggregation: SalesAggregation;
  onSelectRegionDetail?: (region: string) => void;
}

type SortField = 'region' | 'total' | 'q2q3diff' | 'q2q3pct' | string;
type SortDirection = 'asc' | 'desc';

export const RevenueTable: React.FC<RevenueTableProps> = ({ aggregation }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('total');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedRegions, setExpandedRegions] = useState<Record<string, boolean>>({});

  const { quarters, regions, matrix, unitsMatrix, discountMatrix, regionTotals, quarterTotals, grandTotal, hasQ2AndQ3 } = aggregation;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleExpand = (region: string) => {
    setExpandedRegions((prev) => ({
      ...prev,
      [region]: !prev[region],
    }));
  };

  // Filtered & Sorted Regions
  const sortedRegions = useMemo(() => {
    let list = regions.filter((r) => r.toLowerCase().includes(searchTerm.toLowerCase()));

    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'region') {
        valA = a;
        valB = b;
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortField === 'total') {
        valA = regionTotals[a] || 0;
        valB = regionTotals[b] || 0;
      } else if (sortField === 'q2q3diff') {
        valA = (matrix[a]?.['Q3'] || 0) - (matrix[a]?.['Q2'] || 0);
        valB = (matrix[b]?.['Q3'] || 0) - (matrix[b]?.['Q2'] || 0);
      } else if (sortField === 'q2q3pct') {
        const q2A = matrix[a]?.['Q2'] || 0;
        const q3A = matrix[a]?.['Q3'] || 0;
        valA = q2A > 0 ? ((q3A - q2A) / q2A) * 100 : 0;

        const q2B = matrix[b]?.['Q2'] || 0;
        const q3B = matrix[b]?.['Q3'] || 0;
        valB = q2B > 0 ? ((q3B - q2B) / q2B) * 100 : 0;
      } else {
        // Quarter specific sort
        valA = matrix[a]?.[sortField] || 0;
        valB = matrix[b]?.[sortField] || 0;
      }

      if (sortDirection === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });

    return list;
  }, [regions, searchTerm, sortField, sortDirection, regionTotals, matrix]);

  // Export pivot table as CSV
  const exportPivotCSV = () => {
    const headers = ['Region', ...quarters, 'Total Revenue'];
    if (hasQ2AndQ3) {
      headers.push('Q2 to Q3 Diff ($)', 'Q2 to Q3 Pct (%)');
    }

    const rows = regions.map((r) => {
      const row = [r];
      quarters.forEach((q) => {
        row.push((matrix[r]?.[q] || 0).toString());
      });
      row.push((regionTotals[r] || 0).toString());

      if (hasQ2AndQ3) {
        const q2 = matrix[r]?.['Q2'] || 0;
        const q3 = matrix[r]?.['Q3'] || 0;
        const diff = q3 - q2;
        const pct = q2 > 0 ? ((diff / q2) * 100).toFixed(2) : '0';
        row.push(diff.toString(), `${pct}%`);
      }
      return row.join(',');
    });

    // Add totals row
    const totalRow = ['Total', ...quarters.map((q) => quarterTotals[q].toString()), grandTotal.toString()];
    if (hasQ2AndQ3) {
      const totalDiff = aggregation.totalRevenueDiff;
      totalRow.push(totalDiff.toString(), `${aggregation.totalRevenuePctChange.toFixed(2)}%`);
    }
    rows.push(totalRow.join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sales_revenue_by_region_and_quarter.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Table className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Quarterly Revenue Cross-Tabulation Table
            </h3>
            <p className="text-xs text-slate-400">
              Region-level aggregation with Q2→Q3 variance and volume metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search region..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44"
            />
          </div>

          <button
            onClick={exportPivotCSV}
            title="Download pivot table as CSV"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Table</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 select-none">
              <th
                onClick={() => handleSort('region')}
                className="py-3 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Region</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              {quarters.map((q) => {
                const isQ2OrQ3 = q === 'Q2' || q === 'Q3';
                return (
                  <th
                    key={q}
                    onClick={() => handleSort(q)}
                    className={`py-3 px-3 text-right font-semibold cursor-pointer hover:text-white transition-colors ${
                      isQ2OrQ3 ? 'text-indigo-300 bg-indigo-950/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{q} Revenue</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                );
              })}

              {hasQ2AndQ3 && (
                <>
                  <th
                    onClick={() => handleSort('q2q3diff')}
                    className="py-3 px-3 text-right font-semibold text-emerald-400 cursor-pointer hover:text-emerald-300 transition-colors bg-slate-900/50"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Δ Q2→Q3 ($)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('q2q3pct')}
                    className="py-3 px-3 text-right font-semibold text-emerald-400 cursor-pointer hover:text-emerald-300 transition-colors bg-slate-900/50"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Δ Q2→Q3 (%)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                </>
              )}

              <th
                onClick={() => handleSort('total')}
                className="py-3 px-4 text-right font-semibold text-slate-200 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Total Revenue</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              <th className="py-3 px-3 text-right font-semibold text-slate-400">
                Share (%)
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60">
            {sortedRegions.map((region) => {
              const total = regionTotals[region] || 0;
              const share = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
              const isExpanded = !!expandedRegions[region];

              const q2Rev = matrix[region]?.['Q2'] || 0;
              const q3Rev = matrix[region]?.['Q3'] || 0;
              const diff = q3Rev - q2Rev;
              const pct = q2Rev > 0 ? (diff / q2Rev) * 100 : 0;
              const isGrowth = diff >= 0;

              return (
                <React.Fragment key={region}>
                  <tr className="hover:bg-slate-900/50 transition-colors group">
                    <td className="py-3 px-4 text-white font-medium">
                      <button
                        onClick={() => toggleExpand(region)}
                        className="flex items-center gap-2 hover:text-indigo-400 text-left transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />
                        )}
                        <span>{region}</span>
                      </button>
                    </td>

                    {quarters.map((q) => {
                      const val = matrix[region]?.[q] || 0;
                      const isQ2OrQ3 = q === 'Q2' || q === 'Q3';
                      return (
                        <td
                          key={q}
                          className={`py-3 px-3 text-right font-mono text-slate-300 ${
                            isQ2OrQ3 ? 'bg-indigo-950/10 font-semibold text-indigo-200' : ''
                          }`}
                        >
                          {formatCurrency(val)}
                        </td>
                      );
                    })}

                    {hasQ2AndQ3 && (
                      <>
                        <td
                          className={`py-3 px-3 text-right font-mono font-semibold ${
                            isGrowth ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isGrowth ? '+' : ''}
                          {formatCurrency(diff)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              isGrowth
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {isGrowth ? (
                              <TrendingUp className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-rose-400" />
                            )}
                            {isGrowth ? '+' : ''}
                            {pct.toFixed(1)}%
                          </span>
                        </td>
                      </>
                    )}

                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      {formatCurrency(total)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-400">
                      {share.toFixed(1)}%
                    </td>
                  </tr>

                  {/* Expanded Sub-Row showing Units & Discount rate per quarter */}
                  {isExpanded && (
                    <tr className="bg-slate-900/90 text-[11px]">
                      <td colSpan={quarters.length + (hasQ2AndQ3 ? 4 : 2)} className="p-3 pl-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                          {quarters.map((q) => {
                            const units = unitsMatrix[region]?.[q] || 0;
                            const avgDisc = discountMatrix[region]?.[q] || 0;
                            return (
                              <div key={q} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                                <span className="text-indigo-400 font-bold block">{q} Metrics:</span>
                                <div className="flex justify-between text-slate-400 mt-1">
                                  <span>Units Sold:</span>
                                  <span className="font-mono text-slate-200">{units.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                  <span>Avg Discount:</span>
                                  <span className="font-mono text-slate-200">{avgDisc.toFixed(1)}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {/* Total Footer Row */}
            <tr className="bg-slate-900 font-bold text-slate-200 border-t-2 border-slate-700">
              <td className="py-3 px-4 text-white">Company Total</td>

              {quarters.map((q) => (
                <td key={q} className="py-3 px-3 text-right font-mono text-white">
                  {formatCurrency(quarterTotals[q] || 0)}
                </td>
              ))}

              {hasQ2AndQ3 && (
                <>
                  <td
                    className={`py-3 px-3 text-right font-mono ${
                      aggregation.totalRevenueDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {aggregation.totalRevenueDiff >= 0 ? '+' : ''}
                    {formatCurrency(aggregation.totalRevenueDiff)}
                  </td>
                  <td
                    className={`py-3 px-3 text-right font-mono ${
                      aggregation.totalRevenueDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {aggregation.totalRevenueDiff >= 0 ? '+' : ''}
                    {aggregation.totalRevenuePctChange.toFixed(1)}%
                  </td>
                </>
              )}

              <td className="py-3 px-4 text-right font-mono text-emerald-400">
                {formatCurrency(grandTotal)}
              </td>
              <td className="py-3 px-3 text-right font-mono text-slate-300">100.0%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <span>Click chevron to inspect quarterly units and discount rates per region</span>
        <span>Showing {sortedRegions.length} of {regions.length} regions</span>
      </div>
    </div>
  );
};

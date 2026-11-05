import React, { useState, useMemo } from 'react';
import { X, Search, Filter, Layers, Download } from 'lucide-react';
import { SalesOrder } from '../types.ts';
import { formatCurrency } from '../utils/calculator.ts';

interface RawDataDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orders: SalesOrder[];
  fileName?: string;
}

export const RawDataDrawer: React.FC<RawDataDrawerProps> = ({
  isOpen,
  onClose,
  orders,
  fileName = 'orders.csv',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [quarterFilter, setQuarterFilter] = useState('ALL');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const quarters = useMemo(() => Array.from(new Set(orders.map((o) => o.quarter))).sort(), [orders]);
  const regions = useMemo(() => Array.from(new Set(orders.map((o) => o.region))).sort(), [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        o.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.channel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.quarter.toLowerCase().includes(searchTerm.toLowerCase());

      const matchQuarter = quarterFilter === 'ALL' || o.quarter === quarterFilter;
      const matchRegion = regionFilter === 'ALL' || o.region === regionFilter;

      return matchSearch && matchQuarter && matchRegion;
    });
  }, [orders, searchTerm, quarterFilter, regionFilter]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const pagedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Parsed Sales Orders Raw Data</h2>
              <p className="text-xs text-slate-400">
                Source: {fileName} ({orders.length} total orders)
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

        {/* Filter bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44"
              />
            </div>

            <select
              value={quarterFilter}
              onChange={(e) => {
                setQuarterFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Quarters</option>
              {quarters.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>

            <select
              value={regionFilter}
              onChange={(e) => {
                setRegionFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-slate-400">
            Showing {filteredOrders.length} matching rows
          </span>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1 p-4">
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                  <th className="py-2.5 px-3 font-semibold">#</th>
                  <th className="py-2.5 px-3 font-semibold">Quarter</th>
                  <th className="py-2.5 px-3 font-semibold">Region</th>
                  <th className="py-2.5 px-3 font-semibold">Channel</th>
                  <th className="py-2.5 px-3 font-semibold">Product</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Units</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Discount %</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Revenue ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {pagedOrders.map((o, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50 text-slate-300">
                    <td className="py-2 px-3 text-slate-500 font-sans">
                      {o.rawIndex || (page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px]">
                        {o.quarter}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-white font-sans">{o.region}</td>
                    <td className="py-2 px-3 font-sans text-slate-400">{o.channel}</td>
                    <td className="py-2 px-3 font-sans text-slate-200">{o.product}</td>
                    <td className="py-2 px-3 text-right">{o.units.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{o.discount_pct.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right font-bold text-white">
                      {formatCurrency(o.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

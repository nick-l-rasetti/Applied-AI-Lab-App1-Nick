import React from 'react';
import { RegionQ2Q3Delta, RegionQuarterMatrix, SalesOrder } from '../types';
import { formatCurrency, formatPercent } from '../utils/analytics';
import { Layers, Package, ShoppingBag, X } from 'lucide-react';

interface RegionDrilldownModalProps {
  region: string | null;
  onClose: () => void;
  q2q3Delta?: RegionQ2Q3Delta;
  matrix: RegionQuarterMatrix;
  orders: SalesOrder[];
}

export const RegionDrilldownModal: React.FC<RegionDrilldownModalProps> = ({
  region,
  onClose,
  q2q3Delta,
  matrix,
  orders,
}) => {
  if (!region) return null;

  const regionOrders = orders.filter((o) => o.region === region);
  const quarters = matrix.quarters;
  const regionalRevenues = quarters.map((q) => ({
    quarter: q,
    revenue: matrix.revenue[region]?.[q] || 0,
    units: matrix.units[region]?.[q] || 0,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {region} — Deep Dive Analytics
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Breakdown by quarter, products, and channels
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quarter Overview Grid */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Quarterly Revenue Progression
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {regionalRevenues.map((qr) => (
                <div
                  key={qr.quarter}
                  className={`p-3 rounded-xl border text-center ${
                    qr.quarter === 'Q2' || qr.quarter === 'Q3'
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {qr.quarter}
                  </div>
                  <div className="text-base font-mono font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {formatCurrency(qr.revenue)}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {qr.units.toLocaleString()} units
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Q2 to Q3 Deep Shift (if available) */}
          {q2q3Delta && (
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Q2 → Q3 Performance Shift
                </span>
                <span
                  className={`text-xs font-mono font-bold ${
                    q2q3Delta.diffRevenue >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {q2q3Delta.diffRevenue >= 0 ? '+' : ''}
                  {formatCurrency(q2q3Delta.diffRevenue)} ({formatPercent(q2q3Delta.pctChange)})
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-slate-400">Revenue Shift</div>
                  <div className="font-mono text-slate-200 font-semibold mt-0.5">
                    {formatCurrency(q2q3Delta.q2Revenue)} → {formatCurrency(q2q3Delta.q3Revenue)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Unit Volume</div>
                  <div className="font-mono text-slate-200 font-semibold mt-0.5">
                    {q2q3Delta.q2Units} → {q2q3Delta.q3Units} ({q2q3Delta.diffUnits >= 0 ? '+' : ''}
                    {q2q3Delta.diffUnits})
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Avg Discount</div>
                  <div className="font-mono text-slate-200 font-semibold mt-0.5">
                    {q2q3Delta.q2AvgDiscountPct.toFixed(1)}% → {q2q3Delta.q3AvgDiscountPct.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Product Impact in this Region */}
              {q2q3Delta.productImpacts && q2q3Delta.productImpacts.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
                    <Package className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Product Contribution (Q2 vs Q3)</span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {q2q3Delta.productImpacts.map((prod) => (
                      <div
                        key={prod.product}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-800/60"
                      >
                        <span className="text-slate-200 font-medium truncate max-w-[200px]">
                          {prod.product}
                        </span>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-slate-400">
                            {formatCurrency(prod.q2Revenue)} → {formatCurrency(prod.q3Revenue)}
                          </span>
                          <span
                            className={`font-semibold ${
                              prod.diffRevenue >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {prod.diffRevenue >= 0 ? '+' : ''}
                            {formatCurrency(prod.diffRevenue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Channel Impact in this Region */}
              {q2q3Delta.channelImpacts && q2q3Delta.channelImpacts.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Channel Contribution (Q2 vs Q3)</span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {q2q3Delta.channelImpacts.map((chan) => (
                      <div
                        key={chan.channel}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-800/60"
                      >
                        <span className="text-slate-200 font-medium truncate max-w-[200px]">
                          {chan.channel}
                        </span>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-slate-400">
                            {formatCurrency(chan.q2Revenue)} → {formatCurrency(chan.q3Revenue)}
                          </span>
                          <span
                            className={`font-semibold ${
                              chan.diffRevenue >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {chan.diffRevenue >= 0 ? '+' : ''}
                            {formatCurrency(chan.diffRevenue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

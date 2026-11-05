import React, { useMemo, useState } from 'react';
import { SalesOrder } from '../types';
import { formatCurrency } from '../utils/analytics';
import { Calculator, CheckCircle2, ChevronDown, HelpCircle, Search, ShieldAlert, Sparkles } from 'lucide-react';

interface NumberVerifierProps {
  orders: SalesOrder[];
}

export const NumberVerifier: React.FC<NumberVerifierProps> = ({ orders }) => {
  const regions = useMemo(() => Array.from(new Set(orders.map((o) => o.region))).sort(), [orders]);
  const quarters = useMemo(() => Array.from(new Set(orders.map((o) => o.quarter))).sort(), [orders]);

  // Default to West and Q3 as asked in class assignment
  const [selectedRegion, setSelectedRegion] = useState(() => {
    return regions.includes('West') ? 'West' : regions[0] || '';
  });
  const [selectedQuarter, setSelectedQuarter] = useState(() => {
    return quarters.includes('Q3') ? 'Q3' : quarters[0] || '';
  });
  const [expectedValue, setExpectedValue] = useState<string>('');

  // Find matching orders
  const matchingOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.region.toLowerCase() === selectedRegion.toLowerCase() &&
        o.quarter.toLowerCase() === selectedQuarter.toLowerCase()
    );
  }, [orders, selectedRegion, selectedQuarter]);

  const totalCalculatedRevenue = useMemo(() => {
    return matchingOrders.reduce((acc, o) => acc + o.revenue, 0);
  }, [matchingOrders]);

  const totalUnits = useMemo(() => {
    return matchingOrders.reduce((acc, o) => acc + o.units, 0);
  }, [matchingOrders]);

  const avgDiscount = useMemo(() => {
    return matchingOrders.length > 0
      ? matchingOrders.reduce((acc, o) => acc + o.discount_pct, 0) / matchingOrders.length
      : 0;
  }, [matchingOrders]);

  const cleanExpected = parseFloat(expectedValue.replace(/[\$,]/g, ''));
  const hasExpected = !isNaN(cleanExpected);
  const isMatch = hasExpected && Math.abs(cleanExpected - totalCalculatedRevenue) < 0.01;
  const difference = hasExpected ? totalCalculatedRevenue - cleanExpected : 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-5 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Check One Number — Class Revenue Auditor
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verify exact row-by-row calculations (e.g. West Q3) before trusting high-level insights
            </p>
          </div>
        </div>

        {/* Region & Quarter Selectors */}
        <div className="flex items-center gap-2">
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            {regions.map((r) => (
              <option key={r} value={r}>
                Region: {r}
              </option>
            ))}
          </select>

          <select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            {quarters.map((q) => (
              <option key={q} value={q}>
                Quarter: {q}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Result Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main Result Card */}
        <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              App Calculated Total for {selectedRegion} {selectedQuarter}
            </span>
            <div className="text-3xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
              {formatCurrency(totalCalculatedRevenue)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Sum of {matchingOrders.length} matching order lines ({totalUnits.toLocaleString()} units,{' '}
              {avgDiscount.toFixed(1)}% average discount rate)
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Calculation formula: Exact sum of column &quot;revenue&quot; for rows where region=&apos;{selectedRegion}&apos; and quarter=&apos;{selectedQuarter}&apos;</span>
          </div>
        </div>

        {/* Verification Check against Class Discussion */}
        <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950/80 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Compare With Class Answer
          </div>
          <div>
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
              Enter number from discussion ($):
            </label>
            <input
              type="text"
              placeholder="e.g. 405400"
              value={expectedValue}
              onChange={(e) => setExpectedValue(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-xs font-mono border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          {hasExpected && (
            <div
              className={`p-2.5 rounded-lg text-xs font-medium ${
                isMatch
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
              }`}
            >
              {isMatch ? (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Exact Match! Your app numbers are 100% verified.</span>
                </div>
              ) : (
                <div>
                  <div className="font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Variance: {formatCurrency(Math.abs(difference))}</span>
                  </div>
                  <div className="text-[11px] mt-0.5 opacity-90">
                    App calculated {formatCurrency(totalCalculatedRevenue)} vs entered{' '}
                    {formatCurrency(cleanExpected)}. Check row-level table below.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Row-by-Row Table for this specific Region & Quarter */}
      <div>
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Row-by-Row Audit for {selectedRegion} — {selectedQuarter} ({matchingOrders.length} records)
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-400">
              <tr>
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Product</th>
                <th className="py-2 px-3">Channel</th>
                <th className="py-2 px-3 text-right">Units</th>
                <th className="py-2 px-3 text-right">Discount</th>
                <th className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {matchingOrders.map((o, idx) => (
                <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                    {o.product}
                  </td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{o.channel}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                    {o.units.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-500">
                    {o.discount_pct.toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(o.revenue)}
                  </td>
                </tr>
              ))}
              {matchingOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No order rows found for {selectedRegion} in {selectedQuarter}.
                  </td>
                </tr>
              )}
            </tbody>
            {matchingOrders.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t border-slate-300 dark:border-slate-700">
                  <td colSpan={3} className="py-2 px-3 text-slate-900 dark:text-slate-100">
                    Sum Total ({selectedRegion} {selectedQuarter})
                  </td>
                  <td className="py-2 px-3 text-right font-mono">{totalUnits.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right font-mono">{avgDiscount.toFixed(1)}%</td>
                  <td className="py-2 px-3 text-right font-mono text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(totalCalculatedRevenue)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

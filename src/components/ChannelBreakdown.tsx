import React, { useMemo } from 'react';
import { SalesOrder } from '../types';
import { formatCurrency, formatPercent } from '../utils/analytics';
import { Layers, ShoppingBag, TrendingUp } from 'lucide-react';

interface ChannelBreakdownProps {
  orders: SalesOrder[];
}

export const ChannelBreakdown: React.FC<ChannelBreakdownProps> = ({ orders }) => {
  // Aggregate revenue and units by channel and quarter
  const { channels, quarters, channelData, totalRevenue } = useMemo(() => {
    const channelSet = new Set<string>();
    const quarterSet = new Set<string>();
    let totalRev = 0;

    orders.forEach((o) => {
      if (o.channel) channelSet.add(o.channel);
      if (o.quarter) quarterSet.add(o.quarter);
      totalRev += o.revenue;
    });

    const chList = Array.from(channelSet).sort();
    const qList = Array.from(quarterSet).sort();

    const data: Record<
      string,
      {
        totalRevenue: number;
        totalUnits: number;
        avgDiscount: number;
        byQuarter: Record<string, number>;
        q2Rev: number;
        q3Rev: number;
      }
    > = {};

    chList.forEach((ch) => {
      data[ch] = {
        totalRevenue: 0,
        totalUnits: 0,
        avgDiscount: 0,
        byQuarter: {},
        q2Rev: 0,
        q3Rev: 0,
      };
      qList.forEach((q) => {
        data[ch].byQuarter[q] = 0;
      });
    });

    const discountLists: Record<string, number[]> = {};
    chList.forEach((ch) => (discountLists[ch] = []));

    orders.forEach((o) => {
      if (data[o.channel]) {
        data[o.channel].totalRevenue += o.revenue;
        data[o.channel].totalUnits += o.units;
        data[o.channel].byQuarter[o.quarter] = (data[o.channel].byQuarter[o.quarter] || 0) + o.revenue;
        discountLists[o.channel].push(o.discount_pct);

        if (o.quarter.toUpperCase() === 'Q2') data[o.channel].q2Rev += o.revenue;
        if (o.quarter.toUpperCase() === 'Q3') data[o.channel].q3Rev += o.revenue;
      }
    });

    chList.forEach((ch) => {
      const dList = discountLists[ch];
      data[ch].avgDiscount = dList.length > 0 ? dList.reduce((a, b) => a + b, 0) / dList.length : 0;
    });

    return {
      channels: chList,
      quarters: qList,
      channelData: data,
      totalRevenue: totalRev,
    };
  }, [orders]);

  if (channels.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Sales Breakdown by Channel
          </h3>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Distribution across {channels.length} routes to market
        </span>
      </div>

      {/* Channel Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {channels.map((channel) => {
          const ch = channelData[channel];
          const sharePct = totalRevenue > 0 ? (ch.totalRevenue / totalRevenue) * 100 : 0;
          const q2q3Diff = ch.q3Rev - ch.q2Rev;
          const q2q3Pct = ch.q2Rev > 0 ? (q2q3Diff / ch.q2Rev) * 100 : 0;

          return (
            <div
              key={channel}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{channel}</h4>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {sharePct.toFixed(1)}% of total sales
                  </div>
                </div>
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Layers className="w-4 h-4" />
                </div>
              </div>

              {/* Total Revenue */}
              <div>
                <div className="text-lg font-mono font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(ch.totalRevenue)}
                </div>
                <div className="text-xs font-mono text-slate-500 mt-0.5">
                  {ch.totalUnits.toLocaleString()} units sold • {ch.avgDiscount.toFixed(1)}% avg disc.
                </div>
              </div>

              {/* Q2 vs Q3 Shift */}
              {(ch.q2Rev > 0 || ch.q3Rev > 0) && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Q2 → Q3 Shift:</span>
                  <span
                    className={`font-mono font-semibold ${
                      q2q3Diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                    }`}
                  >
                    {q2q3Diff >= 0 ? '+' : ''}
                    {formatCurrency(q2q3Diff)} ({formatPercent(q2q3Pct)})
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Channel Quarterly Pivot Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-2.5 px-4">Channel</th>
              {quarters.map((q) => (
                <th key={q} className="py-2.5 px-4 text-right">
                  {q} Revenue
                </th>
              ))}
              <th className="py-2.5 px-4 text-right font-bold">Total</th>
              <th className="py-2.5 px-4 text-right">Q2→Q3 Delta</th>
              <th className="py-2.5 px-4 text-right">Units</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {channels.map((channel) => {
              const ch = channelData[channel];
              const q2q3Diff = ch.q3Rev - ch.q2Rev;
              return (
                <tr key={channel} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                    {channel}
                  </td>
                  {quarters.map((q) => (
                    <td key={q} className="py-2.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                      {formatCurrency(ch.byQuarter[q] || 0)}
                    </td>
                  ))}
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(ch.totalRevenue)}
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right font-mono font-semibold ${
                      q2q3Diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                    }`}
                  >
                    {q2q3Diff >= 0 ? '+' : ''}
                    {formatCurrency(q2q3Diff)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                    {ch.totalUnits.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

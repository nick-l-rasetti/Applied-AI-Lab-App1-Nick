import React from 'react';
import { RegionQuarterMatrix } from '../types';
import { Percent, TrendingDown, TrendingUp } from 'lucide-react';

interface DiscountChartProps {
  matrix: RegionQuarterMatrix;
}

const REGION_COLORS = [
  { fill: '#3b82f6', border: 'border-blue-500', text: 'text-blue-500' },
  { fill: '#10b981', border: 'border-emerald-500', text: 'text-emerald-500' },
  { fill: '#8b5cf6', border: 'border-purple-500', text: 'text-purple-500' },
  { fill: '#f59e0b', border: 'border-amber-500', text: 'text-amber-500' },
  { fill: '#ec4899', border: 'border-pink-500', text: 'text-pink-500' },
];

export const DiscountChart: React.FC<DiscountChartProps> = ({ matrix }) => {
  const { regions, quarters, discounts } = matrix;

  if (regions.length === 0 || quarters.length === 0) return null;

  // Compute average discount % for each region and quarter
  const avgDiscounts: Record<string, Record<string, number>> = {};
  let maxDisc = 0;

  regions.forEach((r) => {
    avgDiscounts[r] = {};
    quarters.forEach((q) => {
      const list = discounts[r]?.[q] || [];
      const avg = list.length > 0 ? list.reduce((a, b) => a + b, 0) / list.length : 0;
      avgDiscounts[r][q] = avg;
      if (avg > maxDisc) maxDisc = avg;
    });
  });

  const chartMax = Math.ceil(Math.max(25, maxDisc * 1.25));
  const chartHeight = 260;
  const chartWidth = 680;
  const pLeft = 55;
  const pRight = 20;
  const pTop = 25;
  const pBottom = 40;
  const plotWidth = chartWidth - pLeft - pRight;
  const plotHeight = chartHeight - pTop - pBottom;

  const getY = (val: number) => pTop + plotHeight - (val / chartMax) * plotHeight;
  const catWidth = plotWidth / quarters.length;

  const yTicks = [0, 5, 10, 15, 20, chartMax].filter(
    (v, i, a) => v <= chartMax && a.indexOf(v) === i
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Percent className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Chart of Average Discounts by Region &amp; Quarter
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Tracking regional promotional pricing trends &amp; discount pressure
        </p>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto min-w-[540px] select-none"
        >
          {/* Y Axis ticks */}
          {yTicks.map((val) => {
            const y = getY(val);
            return (
              <g key={`disc-ytick-${val}`}>
                <line
                  x1={pLeft}
                  y1={y}
                  x2={chartWidth - pRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800"
                  strokeDasharray="2 2"
                />
                <text
                  x={pLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[11px] fill-slate-400 font-mono"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Grouped bars per quarter */}
          {quarters.map((q, qIdx) => {
            const catStartX = pLeft + qIdx * catWidth;
            const innerPadding = catWidth * 0.15;
            const usableWidth = catWidth - innerPadding * 2;
            const barWidth = Math.max(8, usableWidth / regions.length - 3);

            return (
              <g key={`q-${q}`}>
                {regions.map((r, rIdx) => {
                  const color = REGION_COLORS[rIdx % REGION_COLORS.length];
                  const val = avgDiscounts[r]?.[q] || 0;
                  const barX = catStartX + innerPadding + rIdx * (barWidth + 3);
                  const barY = getY(val);
                  const barH = Math.max(0, chartHeight - pBottom - barY);

                  return (
                    <g key={`bar-${q}-${r}`}>
                      <rect
                        x={barX}
                        y={barY}
                        width={barWidth}
                        height={barH}
                        fill={color.fill}
                        rx={2}
                        className="transition-all hover:opacity-80 cursor-pointer"
                      />
                      {val > 0 && (
                        <text
                          x={barX + barWidth / 2}
                          y={barY - 4}
                          textAnchor="middle"
                          className="text-[9px] fill-slate-500 font-mono"
                        >
                          {val.toFixed(0)}%
                        </text>
                      )}
                    </g>
                  );
                })}

                <text
                  x={catStartX + catWidth / 2}
                  y={chartHeight - 14}
                  textAnchor="middle"
                  className="text-[12px] font-semibold fill-slate-700 dark:fill-slate-300"
                >
                  {q}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
        {regions.map((r, idx) => {
          const color = REGION_COLORS[idx % REGION_COLORS.length];
          return (
            <div key={`legend-${r}`} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.fill }} />
              <span className="text-slate-700 dark:text-slate-300 font-medium">{r}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

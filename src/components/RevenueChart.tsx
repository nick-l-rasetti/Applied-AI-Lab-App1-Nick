import React, { useState } from 'react';
import { RegionQuarterMatrix } from '../types';
import { formatCurrency } from '../utils/analytics';
import { BarChart3, Layers, SlidersHorizontal } from 'lucide-react';

interface RevenueChartProps {
  matrix: RegionQuarterMatrix;
}

const REGION_COLORS = [
  { fill: '#3b82f6', bg: 'bg-blue-500', text: 'text-blue-500', name: 'blue' },
  { fill: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-500', name: 'emerald' },
  { fill: '#8b5cf6', bg: 'bg-purple-500', text: 'text-purple-500', name: 'purple' },
  { fill: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-500', name: 'amber' },
  { fill: '#ec4899', bg: 'bg-pink-500', text: 'text-pink-500', name: 'pink' },
  { fill: '#06b6d4', bg: 'bg-cyan-500', text: 'text-cyan-500', name: 'cyan' },
  { fill: '#6366f1', bg: 'bg-indigo-500', text: 'text-indigo-500', name: 'indigo' },
];

export const RevenueChart: React.FC<RevenueChartProps> = ({ matrix }) => {
  const [groupBy, setGroupBy] = useState<'quarter' | 'region'>('quarter');
  const [chartType, setChartType] = useState<'grouped' | 'stacked'>('grouped');
  const [activeTooltip, setActiveTooltip] = useState<{
    title: string;
    item: string;
    value: number;
    units: number;
    x: number;
    y: number;
  } | null>(null);

  const { regions, quarters, revenue, units } = matrix;

  if (regions.length === 0 || quarters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
        <p className="font-medium text-slate-600 dark:text-slate-300">No chart data available</p>
        <p className="text-sm text-slate-500">Upload a CSV or load sample data to visualize revenue.</p>
      </div>
    );
  }

  // Calculate maximum values for scale
  let maxRevenue = 0;

  if (groupBy === 'quarter') {
    if (chartType === 'stacked') {
      quarters.forEach((q) => {
        let sum = 0;
        regions.forEach((r) => {
          sum += revenue[r]?.[q] || 0;
        });
        if (sum > maxRevenue) maxRevenue = sum;
      });
    } else {
      quarters.forEach((q) => {
        regions.forEach((r) => {
          const val = revenue[r]?.[q] || 0;
          if (val > maxRevenue) maxRevenue = val;
        });
      });
    }
  } else {
    // Group by Region
    if (chartType === 'stacked') {
      regions.forEach((r) => {
        let sum = 0;
        quarters.forEach((q) => {
          sum += revenue[r]?.[q] || 0;
        });
        if (sum > maxRevenue) maxRevenue = sum;
      });
    } else {
      regions.forEach((r) => {
        quarters.forEach((q) => {
          const val = revenue[r]?.[q] || 0;
          if (val > maxRevenue) maxRevenue = val;
        });
      });
    }
  }

  // Round up to nice number for Y axis
  const niceMax = Math.ceil((maxRevenue * 1.15) / 10000) * 10000 || 100000;
  const yTicks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];

  const chartHeight = 320;
  const chartPaddingTop = 30;
  const chartPaddingBottom = 45;
  const chartPaddingLeft = 75;
  const chartPaddingRight = 25;
  const chartWidth = 720;
  const plotWidth = chartWidth - chartPaddingLeft - chartPaddingRight;
  const plotHeight = chartHeight - chartPaddingTop - chartPaddingBottom;

  const getY = (val: number) => {
    return chartPaddingTop + plotHeight - (val / niceMax) * plotHeight;
  };

  const primaryCategories = groupBy === 'quarter' ? quarters : regions;
  const subCategories = groupBy === 'quarter' ? regions : quarters;
  const numPrimary = primaryCategories.length;
  const categoryWidth = plotWidth / numPrimary;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Total Revenue by Region &amp; Quarter
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {groupBy === 'quarter'
              ? 'Comparing regional performance across quarterly periods'
              : 'Tracking individual regional revenue trajectories'}
          </p>
        </div>

        {/* View toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Group By Selector */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setGroupBy('quarter')}
              className={`px-2.5 py-1.5 rounded-md transition-all ${
                groupBy === 'quarter'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Group by Quarter
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('region')}
              className={`px-2.5 py-1.5 rounded-md transition-all ${
                groupBy === 'region'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Group by Region
            </button>
          </div>

          {/* Chart Type Selector */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setChartType('grouped')}
              className={`px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1 ${
                chartType === 'grouped'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Grouped Bars"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Bars</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('stacked')}
              className={`px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1 ${
                chartType === 'stacked'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Stacked Bars"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Stacked</span>
            </button>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto min-w-[580px] max-h-[380px] select-none"
        >
          {/* Grid lines and Y axis ticks */}
          {yTicks.map((tickVal, i) => {
            const y = getY(tickVal);
            return (
              <g key={`ytick-${i}`}>
                <line
                  x1={chartPaddingLeft}
                  y1={y}
                  x2={chartWidth - chartPaddingRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800"
                  strokeDasharray={tickVal === 0 ? 'none' : '3 3'}
                  strokeWidth={1}
                />
                <text
                  x={chartPaddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[11px] fill-slate-400 font-mono"
                >
                  {formatCurrency(tickVal)}
                </text>
              </g>
            );
          })}

          {/* Render Bars */}
          {primaryCategories.map((primaryCat, pIdx) => {
            const catStartX = chartPaddingLeft + pIdx * categoryWidth;
            const innerPadding = categoryWidth * 0.15;
            const usableWidth = categoryWidth - innerPadding * 2;

            if (chartType === 'stacked') {
              let currentStackedRev = 0;
              return (
                <g key={`cat-${primaryCat}`}>
                  {subCategories.map((subCat, sIdx) => {
                    const color = REGION_COLORS[sIdx % REGION_COLORS.length];
                    const rev =
                      groupBy === 'quarter'
                        ? revenue[subCat]?.[primaryCat] || 0
                        : revenue[primaryCat]?.[subCat] || 0;
                    const unitCount =
                      groupBy === 'quarter'
                        ? units[subCat]?.[primaryCat] || 0
                        : units[primaryCat]?.[subCat] || 0;

                    const barY = getY(currentStackedRev + rev);
                    const barHeight = Math.max(0, getY(currentStackedRev) - barY);
                    currentStackedRev += rev;

                    if (rev === 0) return null;

                    return (
                      <rect
                        key={`stacked-${subCat}-${primaryCat}`}
                        x={catStartX + innerPadding}
                        y={barY}
                        width={usableWidth}
                        height={barHeight}
                        fill={color.fill}
                        rx={sIdx === subCategories.length - 1 ? 4 : 0}
                        className="transition-all duration-200 hover:opacity-80 cursor-pointer"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setActiveTooltip({
                            title: primaryCat,
                            item: subCat,
                            value: rev,
                            units: unitCount,
                            x: rect.x + rect.width / 2,
                            y: rect.y,
                          });
                        }}
                        onMouseLeave={() => setActiveTooltip(null)}
                      />
                    );
                  })}

                  {/* Primary Category Label */}
                  <text
                    x={catStartX + categoryWidth / 2}
                    y={chartHeight - 12}
                    textAnchor="middle"
                    className="text-[12px] font-semibold fill-slate-700 dark:fill-slate-300"
                  >
                    {primaryCat}
                    {(primaryCat === 'Q2' || primaryCat === 'Q3') && (
                      <tspan className="text-[10px] fill-indigo-500 font-bold"> *</tspan>
                    )}
                  </text>
                </g>
              );
            }

            // Grouped Bars
            const numBars = subCategories.length;
            const barGap = 4;
            const totalGaps = (numBars - 1) * barGap;
            const barWidth = Math.max(8, (usableWidth - totalGaps) / numBars);

            return (
              <g key={`cat-${primaryCat}`}>
                {/* Background highlight pill for Q2/Q3 */}
                {(primaryCat === 'Q2' || primaryCat === 'Q3') && (
                  <rect
                    x={catStartX + 4}
                    y={chartPaddingTop}
                    width={categoryWidth - 8}
                    height={plotHeight}
                    fill="currentColor"
                    className="text-indigo-500/5 dark:text-indigo-400/5"
                    rx={6}
                  />
                )}

                {subCategories.map((subCat, sIdx) => {
                  const color = REGION_COLORS[sIdx % REGION_COLORS.length];
                  const rev =
                    groupBy === 'quarter'
                      ? revenue[subCat]?.[primaryCat] || 0
                      : revenue[primaryCat]?.[subCat] || 0;
                  const unitCount =
                    groupBy === 'quarter'
                      ? units[subCat]?.[primaryCat] || 0
                      : units[primaryCat]?.[subCat] || 0;

                  const barX = catStartX + innerPadding + sIdx * (barWidth + barGap);
                  const barY = getY(rev);
                  const barHeight = Math.max(rev > 0 ? 3 : 0, chartHeight - chartPaddingBottom - barY);

                  return (
                    <rect
                      key={`bar-${primaryCat}-${subCat}`}
                      x={barX}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      fill={color.fill}
                      rx={3}
                      className="transition-all duration-200 hover:brightness-110 cursor-pointer"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setActiveTooltip({
                          title: primaryCat,
                          item: subCat,
                          value: rev,
                          units: unitCount,
                          x: rect.x + rect.width / 2,
                          y: rect.y,
                        });
                      }}
                      onMouseLeave={() => setActiveTooltip(null)}
                    />
                  );
                })}

                {/* Primary Category Label */}
                <text
                  x={catStartX + categoryWidth / 2}
                  y={chartHeight - 14}
                  textAnchor="middle"
                  className={`text-[12px] font-semibold ${
                    primaryCat === 'Q2' || primaryCat === 'Q3'
                      ? 'fill-indigo-600 dark:fill-indigo-400 font-bold'
                      : 'fill-slate-700 dark:fill-slate-300'
                  }`}
                >
                  {primaryCat}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {activeTooltip && (
          <div
            className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-slate-700"
            style={{
              left: `${activeTooltip.x}px`,
              top: `${activeTooltip.y - 8}px`,
            }}
          >
            <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1 mb-1">
              {activeTooltip.title} • {activeTooltip.item}
            </div>
            <div className="flex items-center justify-between gap-4 font-mono">
              <span className="text-slate-400">Revenue:</span>
              <span className="text-emerald-400 font-bold">{formatCurrency(activeTooltip.value)}</span>
            </div>
            {activeTooltip.units > 0 && (
              <div className="flex items-center justify-between gap-4 font-mono text-[11px] text-slate-300">
                <span className="text-slate-400">Units:</span>
                <span>{activeTooltip.units.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-center gap-4 text-xs">
        <span className="text-slate-400 font-medium">
          {groupBy === 'quarter' ? 'Regions:' : 'Quarters:'}
        </span>
        {subCategories.map((subCat, idx) => {
          const color = REGION_COLORS[idx % REGION_COLORS.length];
          return (
            <div key={`legend-${subCat}`} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: color.fill }}
              />
              <span className="text-slate-700 dark:text-slate-300 font-medium">{subCat}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

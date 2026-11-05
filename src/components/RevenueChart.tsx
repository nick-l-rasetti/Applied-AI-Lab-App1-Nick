import React, { useState } from 'react';
import { BarChart3, TrendingUp, Layers, HelpCircle, ArrowRight } from 'lucide-react';
import { SalesAggregation } from '../types.ts';
import { formatCurrency, formatCompactCurrency } from '../utils/calculator.ts';

interface RevenueChartProps {
  aggregation: SalesAggregation;
}

type ChartMode = 'region-grouped' | 'quarter-grouped' | 'q2-q3-delta' | 'trend-line';

const COLOR_PALETTE = [
  { name: 'Indigo', bg: '#6366f1', light: '#818cf8', gradient: ['#4f46e5', '#818cf8'] },
  { name: 'Cyan', bg: '#06b6d4', light: '#22d3ee', gradient: ['#0891b2', '#22d3ee'] },
  { name: 'Emerald', bg: '#10b981', light: '#34d399', gradient: ['#059669', '#34d399'] },
  { name: 'Amber', bg: '#f59e0b', light: '#fbbf24', gradient: ['#d97706', '#fbbf24'] },
  { name: 'Rose', bg: '#f43f5e', light: '#fb7185', gradient: ['#e11d48', '#fb7185'] },
  { name: 'Violet', bg: '#8b5cf6', light: '#a78bfa', gradient: ['#7c3aed', '#a78bfa'] },
  { name: 'Sky', bg: '#0284c7', light: '#38bdf8', gradient: ['#0369a1', '#38bdf8'] },
  { name: 'Teal', bg: '#14b8a6', light: '#2dd4bf', gradient: ['#0d9488', '#2dd4bf'] },
];

export const RevenueChart: React.FC<RevenueChartProps> = ({ aggregation }) => {
  const [chartMode, setChartMode] = useState<ChartMode>('region-grouped');
  const [hoveredData, setHoveredData] = useState<{
    region: string;
    quarter: string;
    revenue: number;
    units?: number;
    pctShare?: number;
    x: number;
    y: number;
  } | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const { quarters, regions, matrix, unitsMatrix, hasQ2AndQ3, q2q3Analysis } = aggregation;

  // Chart Dimensions
  const svgWidth = 860;
  const svgHeight = 360;
  const padding = { top: 30, right: 30, bottom: 50, left: 75 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Calculate Max Value for scale
  let maxRevenue = 0;
  if (chartMode === 'region-grouped' || chartMode === 'quarter-grouped' || chartMode === 'trend-line') {
    regions.forEach((r) => {
      quarters.forEach((q) => {
        const val = matrix[r]?.[q] || 0;
        if (val > maxRevenue) maxRevenue = val;
      });
    });
  } else if (chartMode === 'q2-q3-delta') {
    regions.forEach((r) => {
      const q2 = matrix[r]?.['Q2'] || 0;
      const q3 = matrix[r]?.['Q3'] || 0;
      if (q2 > maxRevenue) maxRevenue = q2;
      if (q3 > maxRevenue) maxRevenue = q3;
    });
  }

  // Round maxRevenue up to nice ceiling
  maxRevenue = Math.max(maxRevenue * 1.15, 100000);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => pct * maxRevenue);

  const getY = (val: number) => {
    return chartHeight - (val / maxRevenue) * chartHeight;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      {/* Header and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Total Revenue by Region &amp; Quarter
            </h3>
            <p className="text-xs text-slate-400">
              Interactive multi-series breakdown across sales territories
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => setChartMode('region-grouped')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              chartMode === 'region-grouped'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            By Region
          </button>
          <button
            onClick={() => setChartMode('quarter-grouped')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              chartMode === 'quarter-grouped'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            By Quarter
          </button>
          {hasQ2AndQ3 && (
            <button
              onClick={() => setChartMode('q2-q3-delta')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                chartMode === 'q2-q3-delta'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Q2 vs Q3 Delta
            </button>
          )}
          <button
            onClick={() => setChartMode('trend-line')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              chartMode === 'trend-line'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Trends
          </button>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-x-auto bg-slate-950/40 rounded-xl border border-slate-800/80 p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[680px] select-none"
          onMouseLeave={() => setHoveredData(null)}
        >
          <defs>
            {/* Linear gradients for bars and lines */}
            {COLOR_PALETTE.map((c, i) => (
              <linearGradient
                key={i}
                id={`bar-grad-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={c.gradient[1]} stopOpacity={0.95} />
                <stop offset="100%" stopColor={c.gradient[0]} stopOpacity={0.7} />
              </linearGradient>
            ))}
            <linearGradient id="q2-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="q3-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
            </linearGradient>
          </defs>

          {/* Grid lines and Y axis ticks */}
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {yTicks.map((tick, i) => {
              const yPos = getY(tick);
              return (
                <g key={i}>
                  <line
                    x1={0}
                    y1={yPos}
                    x2={chartWidth}
                    y2={yPos}
                    stroke="#1e293b"
                    strokeDasharray={i === 0 ? '' : '3 3'}
                  />
                  <text
                    x={-10}
                    y={yPos + 4}
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 font-mono"
                  >
                    {formatCompactCurrency(tick)}
                  </text>
                </g>
              );
            })}

            {/* Render chart according to mode */}

            {/* Mode 1: Region Grouped (Quarters side-by-side within each Region) */}
            {chartMode === 'region-grouped' && (
              <g>
                {regions.map((region, rIdx) => {
                  const groupWidth = chartWidth / regions.length;
                  const groupX = rIdx * groupWidth;
                  const innerPadding = groupWidth * 0.15;
                  const usableWidth = groupWidth - innerPadding * 2;
                  const barWidth = Math.min(usableWidth / quarters.length, 36);
                  const startX = groupX + (groupWidth - barWidth * quarters.length) / 2;

                  const isRegionDimmed = selectedRegion !== null && selectedRegion !== region;

                  return (
                    <g key={region} opacity={isRegionDimmed ? 0.35 : 1} className="transition-opacity">
                      {quarters.map((quarter, qIdx) => {
                        const rev = matrix[region]?.[quarter] || 0;
                        const barHeight = (rev / maxRevenue) * chartHeight;
                        const barX = startX + qIdx * barWidth;
                        const barY = chartHeight - barHeight;
                        const colorObj = COLOR_PALETTE[qIdx % COLOR_PALETTE.length];

                        return (
                          <rect
                            key={quarter}
                            x={barX + 2}
                            y={barY}
                            width={barWidth - 4}
                            height={Math.max(barHeight, 2)}
                            rx={4}
                            fill={`url(#bar-grad-${qIdx % COLOR_PALETTE.length})`}
                            className="cursor-pointer transition-all hover:brightness-125"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredData({
                                region,
                                quarter,
                                revenue: rev,
                                units: unitsMatrix[region]?.[quarter],
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                              });
                            }}
                          />
                        );
                      })}

                      {/* Region X label */}
                      <text
                        x={groupX + groupWidth / 2}
                        y={chartHeight + 22}
                        textAnchor="middle"
                        className="text-[11px] fill-slate-300 font-semibold"
                      >
                        {region.length > 18 ? region.slice(0, 16) + '...' : region}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Mode 2: Quarter Grouped (Regions side-by-side within each Quarter) */}
            {chartMode === 'quarter-grouped' && (
              <g>
                {quarters.map((quarter, qIdx) => {
                  const groupWidth = chartWidth / quarters.length;
                  const groupX = qIdx * groupWidth;
                  const innerPadding = groupWidth * 0.15;
                  const usableWidth = groupWidth - innerPadding * 2;
                  const barWidth = Math.min(usableWidth / regions.length, 36);
                  const startX = groupX + (groupWidth - barWidth * regions.length) / 2;

                  return (
                    <g key={quarter}>
                      {regions.map((region, rIdx) => {
                        const rev = matrix[region]?.[quarter] || 0;
                        const barHeight = (rev / maxRevenue) * chartHeight;
                        const barX = startX + rIdx * barWidth;
                        const barY = chartHeight - barHeight;
                        const isRegionDimmed = selectedRegion !== null && selectedRegion !== region;

                        return (
                          <rect
                            key={region}
                            x={barX + 2}
                            y={barY}
                            width={barWidth - 4}
                            height={Math.max(barHeight, 2)}
                            rx={4}
                            fill={`url(#bar-grad-${rIdx % COLOR_PALETTE.length})`}
                            opacity={isRegionDimmed ? 0.35 : 1}
                            className="cursor-pointer transition-all hover:brightness-125"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredData({
                                region,
                                quarter,
                                revenue: rev,
                                units: unitsMatrix[region]?.[quarter],
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                              });
                            }}
                          />
                        );
                      })}

                      {/* Quarter X label */}
                      <text
                        x={groupX + groupWidth / 2}
                        y={chartHeight + 22}
                        textAnchor="middle"
                        className="text-[12px] fill-slate-200 font-bold"
                      >
                        {quarter}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Mode 3: Q2 vs Q3 Direct Delta */}
            {chartMode === 'q2-q3-delta' && hasQ2AndQ3 && (
              <g>
                {regions.map((region, rIdx) => {
                  const groupWidth = chartWidth / regions.length;
                  const groupX = rIdx * groupWidth;
                  const barWidth = Math.min((groupWidth * 0.7) / 2, 40);
                  const startX = groupX + (groupWidth - barWidth * 2) / 2;

                  const q2Rev = matrix[region]?.['Q2'] || 0;
                  const q3Rev = matrix[region]?.['Q3'] || 0;
                  const q2Height = (q2Rev / maxRevenue) * chartHeight;
                  const q3Height = (q3Rev / maxRevenue) * chartHeight;
                  const diff = q3Rev - q2Rev;
                  const pct = q2Rev > 0 ? (diff / q2Rev) * 100 : 0;
                  const isUp = diff >= 0;

                  return (
                    <g key={region}>
                      {/* Q2 Bar */}
                      <rect
                        x={startX}
                        y={chartHeight - q2Height}
                        width={barWidth - 4}
                        height={Math.max(q2Height, 2)}
                        rx={4}
                        fill="url(#q2-grad)"
                        className="cursor-pointer hover:brightness-125"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredData({
                            region,
                            quarter: 'Q2',
                            revenue: q2Rev,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                      />

                      {/* Q3 Bar */}
                      <rect
                        x={startX + barWidth}
                        y={chartHeight - q3Height}
                        width={barWidth - 4}
                        height={Math.max(q3Height, 2)}
                        rx={4}
                        fill="url(#q3-grad)"
                        className="cursor-pointer hover:brightness-125"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredData({
                            region,
                            quarter: 'Q3',
                            revenue: q3Rev,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                      />

                      {/* Delta Label Badge */}
                      <text
                        x={startX + barWidth}
                        y={Math.min(chartHeight - Math.max(q2Height, q3Height) - 8, chartHeight - 10)}
                        textAnchor="middle"
                        className={`text-[10px] font-bold font-mono ${
                          isUp ? 'fill-emerald-400' : 'fill-rose-400'
                        }`}
                      >
                        {isUp ? '+' : ''}
                        {pct.toFixed(1)}%
                      </text>

                      {/* Region X label */}
                      <text
                        x={groupX + groupWidth / 2}
                        y={chartHeight + 22}
                        textAnchor="middle"
                        className="text-[11px] fill-slate-300 font-semibold"
                      >
                        {region.length > 18 ? region.slice(0, 16) + '...' : region}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Mode 4: Quarterly Trendline */}
            {chartMode === 'trend-line' && (
              <g>
                {regions.map((region, rIdx) => {
                  const colorObj = COLOR_PALETTE[rIdx % COLOR_PALETTE.length];
                  const isRegionDimmed = selectedRegion !== null && selectedRegion !== region;

                  const step = chartWidth / (quarters.length > 1 ? quarters.length - 1 : 1);
                  const points = quarters.map((q, qIdx) => {
                    const rev = matrix[region]?.[q] || 0;
                    return {
                      x: qIdx * step,
                      y: getY(rev),
                      rev,
                      q,
                    };
                  });

                  const pathD = points
                    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
                    .join(' ');

                  return (
                    <g key={region} opacity={isRegionDimmed ? 0.25 : 1} className="transition-opacity">
                      <path
                        d={pathD}
                        fill="none"
                        stroke={colorObj.bg}
                        strokeWidth={selectedRegion === region ? 3.5 : 2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {points.map((pt, idx) => (
                        <circle
                          key={idx}
                          cx={pt.x}
                          cy={pt.y}
                          r={selectedRegion === region ? 6 : 4}
                          fill={colorObj.light}
                          stroke="#0f172a"
                          strokeWidth={2}
                          className="cursor-pointer transition-transform hover:scale-150"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredData({
                              region,
                              quarter: pt.q,
                              revenue: pt.rev,
                              x: rect.left,
                              y: rect.top,
                            });
                          }}
                        />
                      ))}
                    </g>
                  );
                })}

                {/* Quarter X labels */}
                {quarters.map((quarter, qIdx) => {
                  const step = chartWidth / (quarters.length > 1 ? quarters.length - 1 : 1);
                  return (
                    <text
                      key={quarter}
                      x={qIdx * step}
                      y={chartHeight + 22}
                      textAnchor="middle"
                      className="text-[12px] fill-slate-200 font-bold"
                    >
                      {quarter}
                    </text>
                  );
                })}
              </g>
            )}
          </g>
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredData && (
          <div
            className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-full mb-3 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-2xl text-xs backdrop-blur-md"
            style={{
              left: Math.max(100, Math.min(hoveredData.x, window.innerWidth - 120)),
              top: Math.max(20, hoveredData.y - 10),
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1 mb-1">
              <span className="font-bold text-white">{hoveredData.region}</span>
              <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                {hoveredData.quarter}
              </span>
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between gap-4 text-slate-300">
                <span>Revenue:</span>
                <span className="font-bold text-white font-mono">
                  {formatCurrency(hoveredData.revenue)}
                </span>
              </div>
              {hoveredData.units !== undefined && (
                <div className="flex justify-between gap-4 text-slate-400 text-[11px]">
                  <span>Units:</span>
                  <span className="font-mono text-slate-200">
                    {hoveredData.units.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
        {chartMode === 'region-grouped' && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-medium">Quarter Series:</span>
            {quarters.map((quarter, qIdx) => (
              <div key={quarter} className="flex items-center space-x-1.5">
                <span
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: COLOR_PALETTE[qIdx % COLOR_PALETTE.length].bg }}
                />
                <span className="text-slate-300 font-medium">{quarter}</span>
              </div>
            ))}
          </div>
        )}

        {(chartMode === 'quarter-grouped' || chartMode === 'trend-line') && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium">Filter Region:</span>
            <button
              onClick={() => setSelectedRegion(null)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                selectedRegion === null
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All Regions
            </button>
            {regions.map((region, rIdx) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(selectedRegion === region ? null : region)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  selectedRegion === region
                    ? 'bg-slate-700 text-white ring-1 ring-indigo-400'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLOR_PALETTE[rIdx % COLOR_PALETTE.length].bg }}
                />
                <span>{region}</span>
              </button>
            ))}
          </div>
        )}

        {chartMode === 'q2-q3-delta' && (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-500" />
              <span className="text-slate-300">Q2 Revenue Base</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-slate-300">Q3 Revenue Outcome</span>
            </div>
            <span className="text-slate-500 text-[11px]">Labels show % change from Q2</span>
          </div>
        )}
      </div>
    </div>
  );
};

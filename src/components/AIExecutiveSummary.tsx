import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, Copy, Check, TrendingUp, TrendingDown, ShieldCheck, ChevronDown, ChevronUp, AlertCircle, Info } from 'lucide-react';
import { SalesAggregation, Q2Q3RegionAnalysis } from '../types.ts';
import { formatCurrency, formatCompactCurrency } from '../utils/calculator.ts';

interface AIExecutiveSummaryProps {
  aggregation: SalesAggregation;
}

export const AIExecutiveSummary: React.FC<AIExecutiveSummaryProps> = ({ aggregation }) => {
  const [metricFocus, setMetricFocus] = useState<'dollar' | 'percent'>('dollar');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [sentences, setSentences] = useState<string[]>([]);
  const [targetRegion, setTargetRegion] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showAuditTable, setShowAuditTable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { hasQ2AndQ3, q2q3Analysis, largestDollarRegion, largestPctRegion } = aggregation;

  const currentFocusRegion: Q2Q3RegionAnalysis | null =
    metricFocus === 'percent' ? largestPctRegion : largestDollarRegion;

  const fetchAISummary = useCallback(async () => {
    if (!hasQ2AndQ3 || !currentFocusRegion) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/analyze-q2-q3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionMetrics: q2q3Analysis,
          largestDollarRegion,
          largestPctRegion,
          totalQ2Revenue: aggregation.totalQ2Revenue,
          totalQ3Revenue: aggregation.totalQ3Revenue,
          totalRevenueDiff: aggregation.totalRevenueDiff,
          totalRevenuePctChange: aggregation.totalRevenuePctChange,
          primaryFocusMetric: metricFocus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      setSummary(data.summary || '');
      setSentences(data.sentences && data.sentences.length > 0 ? data.sentences : [data.summary]);
      setTargetRegion(data.targetRegion || currentFocusRegion.region);
      setSource(data.source || 'gemini-3.8-flash');
    } catch (err: any) {
      console.error('Failed to fetch AI summary:', err);
      setErrorMessage(err.message || 'Unable to generate AI summary.');

      // Synthesize deterministic grounded summary using strictly calculated numbers as instant resilience
      if (currentFocusRegion) {
        const diffSign = currentFocusRegion.revenueDiff >= 0 ? '+' : '';
        const s1 = `${currentFocusRegion.region} showed the most significant revenue shift from Q2 to Q3, moving from ${formatCurrency(currentFocusRegion.q2Revenue)} to ${formatCurrency(currentFocusRegion.q3Revenue)}, a variance of ${diffSign}${formatCurrency(currentFocusRegion.revenueDiff)} (${diffSign}${currentFocusRegion.revenuePctChange.toFixed(1)}%).`;
        
        const topCh = currentFocusRegion.topChannelDrivers?.[0];
        const channelNote = topCh ? ` with the ${topCh.name} channel shifting by ${topCh.diff >= 0 ? '+' : ''}${formatCurrency(topCh.diff)}` : '';
        const s2 = `This movement was driven by a unit volume adjustment from ${currentFocusRegion.q2Units.toLocaleString()} to ${currentFocusRegion.q3Units.toLocaleString()} units (${currentFocusRegion.unitsDiff >= 0 ? '+' : ''}${currentFocusRegion.unitsPctChange.toFixed(1)}%) along with an average discount shift from ${currentFocusRegion.q2AvgDiscount.toFixed(1)}% to ${currentFocusRegion.q3AvgDiscount.toFixed(1)}%${channelNote}.`;
        
        const s3 = `Across the company, total revenue transitioned from ${formatCurrency(aggregation.totalQ2Revenue)} to ${formatCurrency(aggregation.totalQ3Revenue)} (${aggregation.totalRevenuePctChange >= 0 ? '+' : ''}${aggregation.totalRevenuePctChange.toFixed(1)}%), highlighting ${currentFocusRegion.region}'s pivotal role in quarterly results.`;
        
        setSummary(`${s1} ${s2} ${s3}`);
        setSentences([s1, s2, s3]);
        setTargetRegion(currentFocusRegion.region);
        setSource('deterministic-calculator');
      }
    } finally {
      setLoading(false);
    }
  }, [hasQ2AndQ3, currentFocusRegion, q2q3Analysis, largestDollarRegion, largestPctRegion, aggregation, metricFocus]);

  useEffect(() => {
    fetchAISummary();
  }, [fetchAISummary]);

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!hasQ2AndQ3) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-400">
        <div className="flex items-center gap-3 text-amber-400 mb-2">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-semibold text-white">Q2 to Q3 Analysis Unavailable</h3>
        </div>
        <p className="text-sm">
          The uploaded dataset does not contain both <span className="text-white font-medium">Q2</span> and{' '}
          <span className="text-white font-medium">Q3</span> data. Please upload a dataset with both quarters to enable the AI variance analysis.
        </p>
      </div>
    );
  }

  const isGrowth = currentFocusRegion && currentFocusRegion.revenueDiff >= 0;

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-indigo-500/20 rounded-2xl shadow-xl shadow-indigo-950/20 overflow-hidden relative">
      {/* Top Banner & Control Bar */}
      <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/40 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">
                AI Q2 → Q3 Regional Variance Summary
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {source === 'gemini-3.8-flash' ? 'Gemini 3.8 Flash' : 'Calculated Engine'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Strict 3-sentence executive analysis grounded exclusively in calculated numbers
            </p>
          </div>
        </div>

        {/* Focus Selector & Actions */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setMetricFocus('dollar')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                metricFocus === 'dollar'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Largest $ Change
            </button>
            <button
              onClick={() => setMetricFocus('percent')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                metricFocus === 'percent'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Largest % Change
            </button>
          </div>

          <button
            onClick={fetchAISummary}
            disabled={loading}
            title="Regenerate summary"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={handleCopy}
            disabled={!summary}
            title="Copy 3-sentence summary"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 space-y-6">
        {/* Metric Pill Highlight */}
        {currentFocusRegion && (
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl ${
                  isGrowth
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {isGrowth ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Most Changed Region (Q2 vs Q3)
                </span>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {currentFocusRegion.region}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isGrowth
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {isGrowth ? '+' : ''}
                    {formatCompactCurrency(currentFocusRegion.revenueDiff)} (
                    {isGrowth ? '+' : ''}
                    {currentFocusRegion.revenuePctChange.toFixed(1)}%)
                  </span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs">
              <div>
                <span className="text-slate-500 block">Q2 Revenue</span>
                <span className="font-semibold text-slate-200">
                  {formatCurrency(currentFocusRegion.q2Revenue)}
                </span>
              </div>
              <div className="text-slate-600 font-bold">→</div>
              <div>
                <span className="text-slate-500 block">Q3 Revenue</span>
                <span className="font-semibold text-white">
                  {formatCurrency(currentFocusRegion.q3Revenue)}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-800 hidden sm:block" />
              <div className="hidden sm:block">
                <span className="text-slate-500 block">Units Shift</span>
                <span className="font-semibold text-slate-200">
                  {currentFocusRegion.unitsDiff >= 0 ? '+' : ''}
                  {currentFocusRegion.unitsDiff.toLocaleString()} (
                  {currentFocusRegion.unitsDiff >= 0 ? '+' : ''}
                  {currentFocusRegion.unitsPctChange.toFixed(1)}%)
                </span>
              </div>
              <div className="h-8 w-px bg-slate-800 hidden sm:block" />
              <div className="hidden sm:block">
                <span className="text-slate-500 block">Avg Discount Shift</span>
                <span className="font-semibold text-slate-200">
                  {currentFocusRegion.q2AvgDiscount.toFixed(1)}% → {currentFocusRegion.q3AvgDiscount.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3-Sentence Summary Card */}
        <div className="relative">
          {loading ? (
            <div className="p-8 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
              <p className="text-xs text-slate-400">
                Generating 3-sentence variance attribution using calculated figures...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Full Paragraph presentation */}
              <div className="p-5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-slate-100 text-sm leading-relaxed relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                <p className="relative font-medium text-slate-200">
                  &ldquo;{summary}&rdquo;
                </p>
              </div>

              {/* Individual Sentence Visual Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px]">
                      1
                    </span>
                    Variance Finding
                  </div>
                  <p className="text-xs text-slate-300 leading-snug">
                    {sentences[0] || 'Identifying the region with the largest Q2 to Q3 shift.'}
                  </p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px]">
                      2
                    </span>
                    Underlying Drivers (Why)
                  </div>
                  <p className="text-xs text-slate-300 leading-snug">
                    {sentences[1] || 'Explaining unit volume, discount, and channel drivers.'}
                  </p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px]">
                      3
                    </span>
                    Comparative Context
                  </div>
                  <p className="text-xs text-slate-300 leading-snug">
                    {sentences[2] || 'Benchmarking against other regions and total revenue.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Audit Verification Drawer Toggle */}
        <div className="pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setShowAuditTable(!showAuditTable)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verify Calculation Source Grounding (All Numbers Computed In-App)</span>
            {showAuditTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAuditTable && (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span className="font-semibold text-white">Application Calculation Audit Table</span>
                <span className="text-[11px] text-slate-500">
                  Every number passed to the AI is deterministically aggregated below
                </span>
              </div>

              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800/60 font-semibold">
                    <th className="py-2 pr-4">Region</th>
                    <th className="py-2 px-3 text-right">Q2 Revenue</th>
                    <th className="py-2 px-3 text-right">Q3 Revenue</th>
                    <th className="py-2 px-3 text-right">Variance ($)</th>
                    <th className="py-2 px-3 text-right">Variance (%)</th>
                    <th className="py-2 px-3 text-right">Q2 Units</th>
                    <th className="py-2 px-3 text-right">Q3 Units</th>
                    <th className="py-2 px-3 text-right">Q2 Avg Disc.</th>
                    <th className="py-2 pl-3 text-right">Q3 Avg Disc.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {q2q3Analysis.map((r) => {
                    const isTarget = r.region === targetRegion;
                    const rIsGrowth = r.revenueDiff >= 0;
                    return (
                      <tr
                        key={r.region}
                        className={`hover:bg-slate-900/50 transition-colors ${
                          isTarget ? 'bg-indigo-950/30 font-medium' : ''
                        }`}
                      >
                        <td className="py-2 pr-4 text-white flex items-center gap-1.5">
                          {isTarget && (
                            <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                          )}
                          {r.region}
                          {isTarget && (
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-normal">
                              Target
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300 font-mono">
                          {formatCurrency(r.q2Revenue)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300 font-mono">
                          {formatCurrency(r.q3Revenue)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-semibold ${
                            rIsGrowth ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {rIsGrowth ? '+' : ''}
                          {formatCurrency(r.revenueDiff)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-semibold ${
                            rIsGrowth ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {rIsGrowth ? '+' : ''}
                          {r.revenuePctChange.toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300 font-mono">
                          {r.q2Units.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300 font-mono">
                          {r.q3Units.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-400 font-mono">
                          {r.q2AvgDiscount.toFixed(1)}%
                        </td>
                        <td className="py-2 pl-3 text-right text-slate-400 font-mono">
                          {r.q3AvgDiscount.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total Row */}
                  <tr className="border-t-2 border-slate-700 font-bold bg-slate-900/80">
                    <td className="py-2 pr-4 text-white">Company Total</td>
                    <td className="py-2 px-3 text-right text-white font-mono">
                      {formatCurrency(aggregation.totalQ2Revenue)}
                    </td>
                    <td className="py-2 px-3 text-right text-white font-mono">
                      {formatCurrency(aggregation.totalQ3Revenue)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono ${
                        aggregation.totalRevenueDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {aggregation.totalRevenueDiff >= 0 ? '+' : ''}
                      {formatCurrency(aggregation.totalRevenueDiff)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono ${
                        aggregation.totalRevenueDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {aggregation.totalRevenueDiff >= 0 ? '+' : ''}
                      {aggregation.totalRevenuePctChange.toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400 font-mono">-</td>
                    <td className="py-2 px-3 text-right text-slate-400 font-mono">-</td>
                    <td className="py-2 px-3 text-right text-slate-400 font-mono">-</td>
                    <td className="py-2 pl-3 text-right text-slate-400 font-mono">-</td>
                  </tr>
                </tbody>
              </table>

              {/* Key Drivers for target region */}
              {currentFocusRegion && (
                <div className="pt-2 text-[11px] text-slate-400 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800">
                    <span className="text-slate-300 font-semibold block mb-1">
                      Top Channel Shift ({currentFocusRegion.region})
                    </span>
                    {currentFocusRegion.topChannelDrivers.length > 0 ? (
                      <div className="flex justify-between items-center text-slate-300">
                        <span>{currentFocusRegion.topChannelDrivers[0].name}</span>
                        <span className="font-mono text-indigo-300">
                          {currentFocusRegion.topChannelDrivers[0].diff >= 0 ? '+' : ''}
                          {formatCurrency(currentFocusRegion.topChannelDrivers[0].diff)}
                        </span>
                      </div>
                    ) : (
                      <span>No channel variance detected</span>
                    )}
                  </div>

                  <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800">
                    <span className="text-slate-300 font-semibold block mb-1">
                      Top Product Shift ({currentFocusRegion.region})
                    </span>
                    {currentFocusRegion.topProductDrivers.length > 0 ? (
                      <div className="flex justify-between items-center text-slate-300">
                        <span>{currentFocusRegion.topProductDrivers[0].name}</span>
                        <span className="font-mono text-cyan-300">
                          {currentFocusRegion.topProductDrivers[0].diff >= 0 ? '+' : ''}
                          {formatCurrency(currentFocusRegion.topProductDrivers[0].diff)}
                        </span>
                      </div>
                    ) : (
                      <span>No product variance detected</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AiSummaryCard } from './components/AiSummaryCard';
import { ChannelBreakdown } from './components/ChannelBreakdown';
import { CsvUploader } from './components/CsvUploader';
import { DiscountChart } from './components/DiscountChart';
import { NumberVerifier } from './components/NumberVerifier';
import { RawDataDrawer } from './components/RawDataDrawer';
import { RegionDrilldownModal } from './components/RegionDrilldownModal';
import { RevenueChart } from './components/RevenueChart';
import { RevenueTable } from './components/RevenueTable';
import { getSampleOrders } from './data/sampleOrders';
import { CsvParseResult, Q2Q3AnalysisResult, SalesOrder } from './types';
import {
  analyzeQ2ToQ3Variance,
  computeRegionQuarterMatrix,
  formatCurrency,
  formatPercent,
} from './utils/analytics';
import { exportOrdersToCsv, parseSalesCsv } from './utils/csvParser';
import {
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  Calculator,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  Filter,
  Globe,
  HelpCircle,
  Layers,
  Percent,
  PlusCircle,
  ShoppingBag,
  Sparkles,
  Table as TableIcon,
  TrendingUp,
  X,
} from 'lucide-react';

export default function App() {
  const [orders, setOrders] = useState<SalesOrder[]>(() => getSampleOrders());
  const [fileName, setFileName] = useState<string>('sample_sales_orders.csv');
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [isRawDataOpen, setIsRawDataOpen] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  // New features: Product filter and view switcher
  const [productFilter, setProductFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'channels' | 'discounts' | 'verifier'>('overview');

  // AI Summary State
  const [summaryText, setSummaryText] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [sourceType, setSourceType] = useState<string>('gemini-3.8-flash');

  // Available unique products for filter
  const availableProducts = useMemo(() => {
    return Array.from(new Set(orders.map((o) => o.product))).sort();
  }, [orders]);

  // Orders filtered by the product filter
  const filteredOrders = useMemo(() => {
    if (productFilter === 'all') return orders;
    return orders.filter((o) => o.product === productFilter);
  }, [orders, productFilter]);

  // Compute Cross-tab Matrix & Q2->Q3 variance on filtered orders
  const matrix = useMemo(() => computeRegionQuarterMatrix(filteredOrders), [filteredOrders]);
  const q2q3Analysis = useMemo(() => analyzeQ2ToQ3Variance(filteredOrders), [filteredOrders]);

  // Request AI Summary from server-side endpoint
  const fetchAiSummary = useCallback(async (analysis: Q2Q3AnalysisResult) => {
    if (!analysis.hasQ2AndQ3 || !analysis.mostChangedByAbsolute) {
      setSummaryText('');
      return;
    }

    setIsAiLoading(true);

    const payload = {
      mostChangedRegion: analysis.mostChangedByAbsolute,
      rankingByAbsoluteChange: analysis.regionsAnalyzed.map((r) => ({
        region: r.region,
        absDiff: r.absDiffRevenue,
        diffRevenue: r.diffRevenue,
        pctChange: r.pctChange,
      })),
      overallQ2Revenue: analysis.overallQ2Revenue,
      overallQ3Revenue: analysis.overallQ3Revenue,
      overallDiff: analysis.overallDiffRevenue,
    };

    try {
      const response = await fetch('/api/analyze-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server status ${response.status}`);
      }

      const data = await response.json();
      if (data.summary) {
        setSummaryText(data.summary);
        setSourceType(data.source || 'gemini-3.8-flash');
      } else {
        throw new Error('No summary returned');
      }
    } catch (err) {
      console.warn('Using client-side calculated summary fallback:', err);
      // Fallback deterministic 3-sentence summary using the exact calculated numbers
      const m = analysis.mostChangedByAbsolute;
      const isGain = m.diffRevenue >= 0;
      const s1 = `Between Q2 and Q3, the ${m.region} region changed the most in total revenue, ${
        isGain ? 'increasing' : 'decreasing'
      } by ${formatCurrency(Math.abs(m.diffRevenue))} (${formatPercent(m.pctChange)}) from ${formatCurrency(
        m.q2Revenue
      )} in Q2 to ${formatCurrency(m.q3Revenue)} in Q3.`;

      let s2 = '';
      if (m.topProductByDiff) {
        s2 = `The primary product driver was "${m.topProductByDiff.product}", which shifted by ${formatCurrency(
          Math.abs(m.topProductByDiff.diffRevenue)
        )} from ${formatCurrency(m.topProductByDiff.q2Revenue)} in Q2 to ${formatCurrency(
          m.topProductByDiff.q3Revenue
        )} in Q3.`;
      } else {
        s2 = `This variance was driven by net order volume changing by ${Math.abs(m.diffUnits).toLocaleString()} units (from ${m.q2Units.toLocaleString()} units to ${m.q3Units.toLocaleString()} units).`;
      }

      let s3 = '';
      if (m.topChannelByDiff) {
        s3 = `In addition, the ${m.topChannelByDiff.channel} distribution channel experienced a ${formatCurrency(
          Math.abs(m.topChannelByDiff.diffRevenue)
        )} swing (moving from ${formatCurrency(m.topChannelByDiff.q2Revenue)} to ${formatCurrency(
          m.topChannelByDiff.q3Revenue
        )}), while average promotional discounts adjusted from ${m.q2AvgDiscountPct.toFixed(1)}% to ${m.q3AvgDiscountPct.toFixed(1)}%.`;
      } else {
        s3 = `Additionally, regional sales volume shifted across sales channels while average discount levels adjusted from ${m.q2AvgDiscountPct.toFixed(1)}% to ${m.q3AvgDiscountPct.toFixed(1)}%.`;
      }

      setSummaryText(`${s1} ${s2} ${s3}`);
      setSourceType('engine_computed_fallback');
    } finally {
      setIsAiLoading(false);
    }
  }, []);

  // Fetch AI summary whenever Q2-to-Q3 analysis changes
  useEffect(() => {
    if (q2q3Analysis.hasQ2AndQ3) {
      fetchAiSummary(q2q3Analysis);
    }
  }, [q2q3Analysis, fetchAiSummary]);

  // Handle CSV upload
  const handleDataLoaded = (csvContent: string, name?: string) => {
    const parseResult: CsvParseResult = parseSalesCsv(csvContent);
    setParseErrors(parseResult.errors);
    setParseWarnings(parseResult.warnings);

    if (parseResult.orders.length > 0) {
      setOrders(parseResult.orders);
      setProductFilter('all');
      if (name) setFileName(name);
      setShowUploader(false);
    }
  };

  const handleExportCurrentData = () => {
    const csvStr = exportOrdersToCsv(filteredOrders);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName || 'sales_orders_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Identify highest grossing region
  const topGrossingRegion = useMemo(() => {
    let top = '';
    let max = 0;
    for (const [r, rev] of Object.entries(matrix.regionTotals)) {
      if (rev > max) {
        max = rev;
        top = r;
      }
    }
    return { region: top, revenue: max };
  }, [matrix.regionTotals]);

  const selectedRegionDelta = useMemo(() => {
    if (!selectedRegion) return undefined;
    return q2q3Analysis.regionsAnalyzed.find((r) => r.region === selectedRegion);
  }, [selectedRegion, q2q3Analysis.regionsAnalyzed]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  SalesOrder Analytics
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                  QoQ Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Revenue by Region &amp; Quarter with AI Q2→Q3 Variance
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRawDataOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Inspect Orders</span>
              <span className="font-mono text-slate-500">({orders.length})</span>
            </button>

            <button
              type="button"
              onClick={handleExportCurrentData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              title="Download current dataset as CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setShowUploader(!showUploader)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{showUploader ? 'Close Upload' : 'Upload CSV'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* CSV Parse Errors & Warnings Banner */}
        {parseErrors.length > 0 && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>CSV Processing Issues</span>
            </div>
            {parseErrors.map((err, i) => (
              <p key={i}>• {err}</p>
            ))}
          </div>
        )}

        {parseWarnings.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
            <span className="font-semibold">Notice:</span> {parseWarnings.join(' ')}
          </div>
        )}

        {/* Upload Drawer (Collapsible) */}
        {showUploader && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-200">
            <CsvUploader onDataLoaded={handleDataLoaded} />
          </div>
        )}

        {/* Filter Bar & View Navigation Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          {/* View Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Matrix &amp; Chart</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('channels')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'channels'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Breakdown by Channel</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('discounts')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'discounts'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Chart of Discounts</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('verifier')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'verifier'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Check One Number (West Q3)</span>
            </button>
          </div>

          {/* Product Filter Dropdown */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <Filter className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Filter by Product:</span>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Products ({orders.length} orders)</option>
              {availableProducts.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {productFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setProductFilter('all')}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Reset product filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* High-level KPI Summary Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Grand Total Revenue */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Total Revenue</span>
              <Globe className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
              {formatCurrency(matrix.grandTotal)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>
                {productFilter !== 'all' ? `Filtered by ${productFilter}` : `Across ${matrix.quarters.length} quarters & ${matrix.regions.length} regions`}
              </span>
            </div>
          </div>

          {/* Card 2: Highest Grossing Region */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Top Grossing Region</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2 truncate">
              {topGrossingRegion.region || '—'}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">
              {formatCurrency(topGrossingRegion.revenue)} total revenue
            </div>
          </div>

          {/* Card 3: Q2 -> Q3 Total Shift */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Q2 → Q3 Overall Delta</span>
              <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
            </div>
            {q2q3Analysis.hasQ2AndQ3 ? (
              <>
                <div
                  className={`text-xl sm:text-2xl font-bold font-mono mt-2 ${
                    q2q3Analysis.overallDiffRevenue >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                  }`}
                >
                  {q2q3Analysis.overallDiffRevenue >= 0 ? '+' : ''}
                  {formatCurrency(q2q3Analysis.overallDiffRevenue)}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">
                  Growth: {formatPercent(q2q3Analysis.overallPctChange)}
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 mt-3">Q2 or Q3 missing</div>
            )}
          </div>

          {/* Card 4: Region that Changed Most */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Region Changed Most</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            {q2q3Analysis.mostChangedByAbsolute ? (
              <>
                <div className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2 truncate">
                  {q2q3Analysis.mostChangedByAbsolute.region}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1">
                  <span
                    className={
                      q2q3Analysis.mostChangedByAbsolute.diffRevenue >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }
                  >
                    {q2q3Analysis.mostChangedByAbsolute.diffRevenue >= 0 ? '+' : ''}
                    {formatCurrency(q2q3Analysis.mostChangedByAbsolute.diffRevenue)}
                  </span>
                  <span>({formatPercent(q2q3Analysis.mostChangedByAbsolute.pctChange)})</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 mt-3">Requires Q2 &amp; Q3</div>
            )}
          </div>
        </div>

        {/* AI Three-Sentence Executive Summary Card */}
        <AiSummaryCard
          analysis={q2q3Analysis}
          summaryText={summaryText}
          isLoading={isAiLoading}
          onRefresh={() => fetchAiSummary(q2q3Analysis)}
          sourceType={sourceType}
        />

        {/* Active Tab View Rendering */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Chart: Total Revenue by Region and Quarter */}
            <RevenueChart matrix={matrix} />

            {/* Table: Total Revenue by Region and Quarter */}
            <RevenueTable
              matrix={matrix}
              q2q3Analysis={q2q3Analysis}
              onSelectRegion={(reg) => setSelectedRegion(reg)}
              selectedRegion={selectedRegion}
            />
          </div>
        )}

        {activeTab === 'channels' && (
          <ChannelBreakdown orders={filteredOrders} />
        )}

        {activeTab === 'discounts' && (
          <DiscountChart matrix={matrix} />
        )}

        {activeTab === 'verifier' && (
          <NumberVerifier orders={orders} />
        )}

        {/* Active Data Source Information Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
            <span>
              Loaded File: <strong className="text-slate-700 dark:text-slate-200">{fileName}</strong> ({orders.length} orders across{' '}
              {matrix.regions.length} regions
              {productFilter !== 'all' ? ` • Filtered: ${filteredOrders.length} orders for ${productFilter}` : ''}
              )
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsRawDataOpen(true)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
            >
              Browse all {orders.length} orders
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                setOrders(getSampleOrders());
                setFileName('sample_sales_orders.csv');
                setProductFilter('all');
                setParseErrors([]);
                setParseWarnings([]);
              }}
              className="text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
            >
              Reset to Sample Data
            </button>
          </div>
        </div>
      </main>

      {/* Region Drilldown Modal */}
      <RegionDrilldownModal
        region={selectedRegion}
        onClose={() => setSelectedRegion(null)}
        q2q3Delta={selectedRegionDelta}
        matrix={matrix}
        orders={filteredOrders}
      />

      {/* Raw Data Explorer Drawer */}
      <RawDataDrawer
        orders={filteredOrders}
        isOpen={isRawDataOpen}
        onClose={() => setIsRawDataOpen(false)}
      />
    </div>
  );
}

import {
  ChannelImpact,
  ProductImpact,
  Q2Q3AnalysisResult,
  RegionQ2Q3Delta,
  RegionQuarterMatrix,
  SalesOrder,
} from '../types';

export function computeRegionQuarterMatrix(orders: SalesOrder[]): RegionQuarterMatrix {
  const regionSet = new Set<string>();
  const quarterSet = new Set<string>();

  for (const o of orders) {
    if (o.region) regionSet.add(o.region);
    if (o.quarter) quarterSet.add(o.quarter);
  }

  // Natural quarter sort order (Q1, Q2, Q3, Q4, or alphanumeric)
  const quarterOrder: Record<string, number> = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
  const quarters = Array.from(quarterSet).sort((a, b) => {
    const aOrder = quarterOrder[a.toUpperCase()] ?? 99;
    const bOrder = quarterOrder[b.toUpperCase()] ?? 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.localeCompare(b);
  });

  const regions = Array.from(regionSet).sort((a, b) => a.localeCompare(b));

  const revenue: Record<string, Record<string, number>> = {};
  const units: Record<string, Record<string, number>> = {};
  const discounts: Record<string, Record<string, number[]>> = {};

  const regionTotals: Record<string, number> = {};
  const quarterTotals: Record<string, number> = {};
  let grandTotal = 0;

  for (const r of regions) {
    revenue[r] = {};
    units[r] = {};
    discounts[r] = {};
    regionTotals[r] = 0;
    for (const q of quarters) {
      revenue[r][q] = 0;
      units[r][q] = 0;
      discounts[r][q] = [];
    }
  }

  for (const q of quarters) {
    quarterTotals[q] = 0;
  }

  for (const o of orders) {
    if (!revenue[o.region]) {
      revenue[o.region] = {};
      units[o.region] = {};
      discounts[o.region] = {};
      regionTotals[o.region] = 0;
    }
    if (revenue[o.region][o.quarter] === undefined) {
      revenue[o.region][o.quarter] = 0;
      units[o.region][o.quarter] = 0;
      discounts[o.region][o.quarter] = [];
    }

    revenue[o.region][o.quarter] += o.revenue;
    units[o.region][o.quarter] += o.units;
    discounts[o.region][o.quarter].push(o.discount_pct);

    regionTotals[o.region] += o.revenue;
    quarterTotals[o.quarter] = (quarterTotals[o.quarter] || 0) + o.revenue;
    grandTotal += o.revenue;
  }

  return {
    regions,
    quarters,
    revenue,
    units,
    discounts,
    regionTotals,
    quarterTotals,
    grandTotal,
  };
}

export function analyzeQ2ToQ3Variance(orders: SalesOrder[]): Q2Q3AnalysisResult {
  const hasQ2 = orders.some((o) => o.quarter.toUpperCase() === 'Q2');
  const hasQ3 = orders.some((o) => o.quarter.toUpperCase() === 'Q3');

  if (!hasQ2 || !hasQ3) {
    return {
      hasQ2AndQ3: false,
      regionsAnalyzed: [],
      mostChangedByAbsolute: null,
      mostChangedByPercentage: null,
      overallQ2Revenue: 0,
      overallQ3Revenue: 0,
      overallDiffRevenue: 0,
      overallPctChange: 0,
      summaryMessage: !hasQ2 && !hasQ3
        ? 'Uploaded data has neither Q2 nor Q3 records.'
        : !hasQ2
        ? 'Uploaded data is missing Q2 records.'
        : 'Uploaded data is missing Q3 records.',
    };
  }

  const regionSet = new Set<string>();
  for (const o of orders) {
    if (o.region) regionSet.add(o.region);
  }
  const regions = Array.from(regionSet).sort((a, b) => a.localeCompare(b));

  const regionsAnalyzed: RegionQ2Q3Delta[] = [];
  let overallQ2Revenue = 0;
  let overallQ3Revenue = 0;

  for (const region of regions) {
    const regionOrdersQ2 = orders.filter((o) => o.region === region && o.quarter.toUpperCase() === 'Q2');
    const regionOrdersQ3 = orders.filter((o) => o.region === region && o.quarter.toUpperCase() === 'Q3');

    const q2Revenue = regionOrdersQ2.reduce((acc, o) => acc + o.revenue, 0);
    const q3Revenue = regionOrdersQ3.reduce((acc, o) => acc + o.revenue, 0);
    const diffRevenue = q3Revenue - q2Revenue;
    const absDiffRevenue = Math.abs(diffRevenue);
    const pctChange = q2Revenue > 0 ? (diffRevenue / q2Revenue) * 100 : (q3Revenue > 0 ? 100 : 0);

    const q2Units = regionOrdersQ2.reduce((acc, o) => acc + o.units, 0);
    const q3Units = regionOrdersQ3.reduce((acc, o) => acc + o.units, 0);
    const diffUnits = q3Units - q2Units;

    const q2AvgDiscountPct = regionOrdersQ2.length > 0
      ? regionOrdersQ2.reduce((acc, o) => acc + o.discount_pct, 0) / regionOrdersQ2.length
      : 0;

    const q3AvgDiscountPct = regionOrdersQ3.length > 0
      ? regionOrdersQ3.reduce((acc, o) => acc + o.discount_pct, 0) / regionOrdersQ3.length
      : 0;

    overallQ2Revenue += q2Revenue;
    overallQ3Revenue += q3Revenue;

    // Analyze Product drivers in this region
    const productSet = new Set<string>();
    regionOrdersQ2.forEach((o) => productSet.add(o.product));
    regionOrdersQ3.forEach((o) => productSet.add(o.product));

    const productImpacts: ProductImpact[] = Array.from(productSet).map((prod) => {
      const q2Rev = regionOrdersQ2.filter((o) => o.product === prod).reduce((acc, o) => acc + o.revenue, 0);
      const q3Rev = regionOrdersQ3.filter((o) => o.product === prod).reduce((acc, o) => acc + o.revenue, 0);
      const diff = q3Rev - q2Rev;
      const pct = q2Rev > 0 ? (diff / q2Rev) * 100 : (q3Rev > 0 ? 100 : 0);
      return {
        product: prod,
        q2Revenue: q2Rev,
        q3Revenue: q3Rev,
        diffRevenue: diff,
        pctChange: pct,
      };
    }).sort((a, b) => Math.abs(b.diffRevenue) - Math.abs(a.diffRevenue));

    const topProductByDiff = productImpacts[0];

    // Analyze Channel drivers in this region
    const channelSet = new Set<string>();
    regionOrdersQ2.forEach((o) => channelSet.add(o.channel));
    regionOrdersQ3.forEach((o) => channelSet.add(o.channel));

    const channelImpacts: ChannelImpact[] = Array.from(channelSet).map((chan) => {
      const q2Rev = regionOrdersQ2.filter((o) => o.channel === chan).reduce((acc, o) => acc + o.revenue, 0);
      const q3Rev = regionOrdersQ3.filter((o) => o.channel === chan).reduce((acc, o) => acc + o.revenue, 0);
      const diff = q3Rev - q2Rev;
      const pct = q2Rev > 0 ? (diff / q2Rev) * 100 : (q3Rev > 0 ? 100 : 0);
      return {
        channel: chan,
        q2Revenue: q2Rev,
        q3Revenue: q3Rev,
        diffRevenue: diff,
        pctChange: pct,
      };
    }).sort((a, b) => Math.abs(b.diffRevenue) - Math.abs(a.diffRevenue));

    const topChannelByDiff = channelImpacts[0];

    regionsAnalyzed.push({
      region,
      q2Revenue,
      q3Revenue,
      diffRevenue,
      absDiffRevenue,
      pctChange,
      q2Units,
      q3Units,
      diffUnits,
      q2AvgDiscountPct,
      q3AvgDiscountPct,
      productImpacts,
      topProductByDiff,
      channelImpacts,
      topChannelByDiff,
    });
  }

  // Sort by absolute dollar change descending
  const sortedByAbs = [...regionsAnalyzed].sort((a, b) => b.absDiffRevenue - a.absDiffRevenue);
  const mostChangedByAbsolute = sortedByAbs[0] || null;

  // Sort by percentage change descending
  const sortedByPct = [...regionsAnalyzed].sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));
  const mostChangedByPercentage = sortedByPct[0] || null;

  const overallDiffRevenue = overallQ3Revenue - overallQ2Revenue;
  const overallPctChange = overallQ2Revenue > 0 ? (overallDiffRevenue / overallQ2Revenue) * 100 : 0;

  return {
    hasQ2AndQ3: true,
    regionsAnalyzed: sortedByAbs,
    mostChangedByAbsolute,
    mostChangedByPercentage,
    overallQ2Revenue,
    overallQ3Revenue,
    overallDiffRevenue,
    overallPctChange,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyPrecise(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(pct: number): string {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

import Papa from 'papaparse';
import { SalesOrder, SalesAggregation, Q2Q3RegionAnalysis, Q2Q3Driver } from '../types.ts';

export interface CSVParseResult {
  orders: SalesOrder[];
  errors: string[];
  warnings: string[];
  columnMap: Record<string, string>;
}

const REQUIRED_COLUMNS = ['quarter', 'region', 'channel', 'product', 'units', 'discount_pct', 'revenue'];

export function parseSalesCSV(csvString: string): CSVParseResult {
  const result: CSVParseResult = {
    orders: [],
    errors: [],
    warnings: [],
    columnMap: {},
  };

  const parsed = Papa.parse<Record<string, string>>(csvString.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors && parsed.errors.length > 0) {
    const fatal = parsed.errors.filter((e) => e.type !== 'FieldMismatch');
    if (fatal.length > 0) {
      result.errors.push(`CSV parsing error: ${fatal[0].message} (row ${fatal[0].row})`);
    }
  }

  if (!parsed.data || parsed.data.length === 0) {
    result.errors.push('The uploaded CSV file is empty or contains no data rows.');
    return result;
  }

  const rawHeaders = Object.keys(parsed.data[0]);
  const headerLookup: Record<string, string> = {};

  // Fuzzy header matcher
  rawHeaders.forEach((h) => {
    const cleaned = h.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleaned.includes('quarter') || cleaned === 'qtr' || cleaned === 'q') headerLookup['quarter'] = h;
    else if (cleaned.includes('region') || cleaned.includes('geo') || cleaned.includes('territory')) headerLookup['region'] = h;
    else if (cleaned.includes('channel') || cleaned.includes('segment')) headerLookup['channel'] = h;
    else if (cleaned.includes('product') || cleaned.includes('sku') || cleaned.includes('item')) headerLookup['product'] = h;
    else if (cleaned.includes('unit') || cleaned.includes('qty') || cleaned.includes('quantity')) headerLookup['units'] = h;
    else if (cleaned.includes('discount') || cleaned.includes('disc')) headerLookup['discount_pct'] = h;
    else if (cleaned.includes('revenue') || cleaned.includes('sales') || cleaned.includes('amount') || cleaned.includes('total')) headerLookup['revenue'] = h;
  });

  // Verify all required columns are found
  const missing = REQUIRED_COLUMNS.filter((col) => !headerLookup[col]);
  if (missing.length > 0) {
    result.errors.push(
      `Missing required column(s): ${missing.join(', ')}. Expected: quarter, region, channel, product, units, discount_pct, revenue. Detected columns: ${rawHeaders.join(', ')}`
    );
    return result;
  }

  result.columnMap = headerLookup;

  const validOrders: SalesOrder[] = [];
  let invalidRows = 0;

  parsed.data.forEach((row, idx) => {
    const rawQuarter = (row[headerLookup['quarter']] || '').trim();
    const rawRegion = (row[headerLookup['region']] || '').trim();
    const rawChannel = (row[headerLookup['channel']] || '').trim();
    const rawProduct = (row[headerLookup['product']] || '').trim();
    const rawUnits = (row[headerLookup['units']] || '').toString().replace(/,/g, '').trim();
    const rawDiscount = (row[headerLookup['discount_pct']] || '').toString().replace(/%/g, '').replace(/,/g, '').trim();
    const rawRevenue = (row[headerLookup['revenue']] || '').toString().replace(/[$€£,]/g, '').trim();

    if (!rawQuarter || !rawRegion) {
      invalidRows++;
      return;
    }

    // Standardize quarter (e.g. "q1" -> "Q1", "2024-Q2" -> "Q2", "Q2 2024" -> "Q2")
    let standardizedQuarter = rawQuarter.toUpperCase();
    const qMatch = standardizedQuarter.match(/Q[1-4]/);
    if (qMatch) {
      standardizedQuarter = qMatch[0];
    }

    // Standardize region casing (e.g. "west" -> "West", "south" -> "South")
    let standardizedRegion = rawRegion;
    if (/^[a-z]+$/.test(rawRegion)) {
      standardizedRegion = rawRegion.charAt(0).toUpperCase() + rawRegion.slice(1);
    } else if (rawRegion.toLowerCase() === 'west') {
      standardizedRegion = 'West';
    } else if (rawRegion.toLowerCase() === 'north') {
      standardizedRegion = 'North';
    } else if (rawRegion.toLowerCase() === 'south') {
      standardizedRegion = 'South';
    } else if (rawRegion.toLowerCase() === 'east') {
      standardizedRegion = 'East';
    }

    const units = parseFloat(rawUnits) || 0;
    let discount = parseFloat(rawDiscount) || 0;
    if (discount <= 1 && discount > 0) {
      discount = discount * 100;
    }

    const revenue = parseFloat(rawRevenue) || 0;

    validOrders.push({
      quarter: standardizedQuarter,
      region: standardizedRegion,
      channel: rawChannel || 'General',
      product: rawProduct || 'General',
      units,
      discount_pct: discount,
      revenue,
      rawIndex: idx + 1,
    });
  });

  if (invalidRows > 0) {
    result.warnings.push(`Skipped ${invalidRows} rows with empty quarter or region values.`);
  }

  if (validOrders.length === 0) {
    result.errors.push('No valid data rows could be parsed from the file.');
    return result;
  }

  result.orders = validOrders;
  return result;
}

export function aggregateSales(orders: SalesOrder[]): SalesAggregation {
  const quarterSet = new Set<string>();
  const regionSet = new Set<string>();
  const channelSet = new Set<string>();
  const productSet = new Set<string>();

  const matrix: Record<string, Record<string, number>> = {};
  const unitsMatrix: Record<string, Record<string, number>> = {};
  const discountWeightedSumMatrix: Record<string, Record<string, number>> = {};
  const discountUnitsSumMatrix: Record<string, Record<string, number>> = {};

  orders.forEach((order) => {
    quarterSet.add(order.quarter);
    regionSet.add(order.region);
    channelSet.add(order.channel);
    productSet.add(order.product);

    if (!matrix[order.region]) matrix[order.region] = {};
    if (!unitsMatrix[order.region]) unitsMatrix[order.region] = {};
    if (!discountWeightedSumMatrix[order.region]) discountWeightedSumMatrix[order.region] = {};
    if (!discountUnitsSumMatrix[order.region]) discountUnitsSumMatrix[order.region] = {};

    matrix[order.region][order.quarter] = (matrix[order.region][order.quarter] || 0) + order.revenue;
    unitsMatrix[order.region][order.quarter] = (unitsMatrix[order.region][order.quarter] || 0) + order.units;

    // Weight discount by units or by order count if units 0
    const weight = order.units > 0 ? order.units : 1;
    discountWeightedSumMatrix[order.region][order.quarter] =
      (discountWeightedSumMatrix[order.region][order.quarter] || 0) + order.discount_pct * weight;
    discountUnitsSumMatrix[order.region][order.quarter] =
      (discountUnitsSumMatrix[order.region][order.quarter] || 0) + weight;
  });

  // Natural sort quarters: Q1, Q2, Q3, Q4, etc.
  const quarters = Array.from(quarterSet).sort((a, b) => {
    const aNum = parseInt(a.replace(/\D/g, ''), 10);
    const bNum = parseInt(b.replace(/\D/g, ''), 10);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    return a.localeCompare(b);
  });

  const regions = Array.from(regionSet).sort((a, b) => a.localeCompare(b));
  const channels = Array.from(channelSet).sort((a, b) => a.localeCompare(b));
  const products = Array.from(productSet).sort((a, b) => a.localeCompare(b));

  const discountMatrix: Record<string, Record<string, number>> = {};
  const regionTotals: Record<string, number> = {};
  const quarterTotals: Record<string, number> = {};
  let grandTotal = 0;

  quarters.forEach((q) => {
    quarterTotals[q] = 0;
  });

  regions.forEach((r) => {
    regionTotals[r] = 0;
    discountMatrix[r] = {};

    quarters.forEach((q) => {
      const rev = matrix[r]?.[q] || 0;
      regionTotals[r] += rev;
      quarterTotals[q] = (quarterTotals[q] || 0) + rev;
      grandTotal += rev;

      const totalWeight = discountUnitsSumMatrix[r]?.[q] || 0;
      const weightedSum = discountWeightedSumMatrix[r]?.[q] || 0;
      discountMatrix[r][q] = totalWeight > 0 ? weightedSum / totalWeight : 0;
    });
  });

  // Check if dataset includes Q2 and Q3
  const hasQ2 = quarters.some((q) => q.toUpperCase() === 'Q2');
  const hasQ3 = quarters.some((q) => q.toUpperCase() === 'Q3');
  const hasQ2AndQ3 = hasQ2 && hasQ3;

  const q2q3Analysis: Q2Q3RegionAnalysis[] = [];
  let totalQ2Revenue = 0;
  let totalQ3Revenue = 0;

  if (hasQ2AndQ3) {
    regions.forEach((region) => {
      const q2Revenue = matrix[region]?.['Q2'] || 0;
      const q3Revenue = matrix[region]?.['Q3'] || 0;
      const revenueDiff = q3Revenue - q2Revenue;
      const revenuePctChange = q2Revenue > 0 ? (revenueDiff / q2Revenue) * 100 : q3Revenue > 0 ? 100 : 0;

      const q2Units = unitsMatrix[region]?.['Q2'] || 0;
      const q3Units = unitsMatrix[region]?.['Q3'] || 0;
      const unitsDiff = q3Units - q2Units;
      const unitsPctChange = q2Units > 0 ? (unitsDiff / q2Units) * 100 : q3Units > 0 ? 100 : 0;

      const q2AvgDiscount = discountMatrix[region]?.['Q2'] || 0;
      const q3AvgDiscount = discountMatrix[region]?.['Q3'] || 0;
      const discountDiff = q3AvgDiscount - q2AvgDiscount;

      totalQ2Revenue += q2Revenue;
      totalQ3Revenue += q3Revenue;

      // Drivers: Channel breakdown for Q2 vs Q3
      const channelRevMap: Record<string, { q2: number; q3: number }> = {};
      const productRevMap: Record<string, { q2: number; q3: number }> = {};

      orders
        .filter((o) => o.region === region && (o.quarter === 'Q2' || o.quarter === 'Q3'))
        .forEach((o) => {
          if (!channelRevMap[o.channel]) channelRevMap[o.channel] = { q2: 0, q3: 0 };
          if (!productRevMap[o.product]) productRevMap[o.product] = { q2: 0, q3: 0 };

          if (o.quarter === 'Q2') {
            channelRevMap[o.channel].q2 += o.revenue;
            productRevMap[o.product].q2 += o.revenue;
          } else if (o.quarter === 'Q3') {
            channelRevMap[o.channel].q3 += o.revenue;
            productRevMap[o.product].q3 += o.revenue;
          }
        });

      const topChannelDrivers: Q2Q3Driver[] = Object.entries(channelRevMap)
        .map(([name, data]) => {
          const diff = data.q3 - data.q2;
          const pct = data.q2 > 0 ? (diff / data.q2) * 100 : 0;
          return { name, q2Rev: data.q2, q3Rev: data.q3, diff, pctChange: pct };
        })
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

      const topProductDrivers: Q2Q3Driver[] = Object.entries(productRevMap)
        .map(([name, data]) => {
          const diff = data.q3 - data.q2;
          const pct = data.q2 > 0 ? (diff / data.q2) * 100 : 0;
          return { name, q2Rev: data.q2, q3Rev: data.q3, diff, pctChange: pct };
        })
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

      q2q3Analysis.push({
        region,
        q2Revenue,
        q3Revenue,
        revenueDiff,
        revenuePctChange,
        absRevenueDiff: Math.abs(revenueDiff),
        absRevenuePctChange: Math.abs(revenuePctChange),
        q2Units,
        q3Units,
        unitsDiff,
        unitsPctChange,
        q2AvgDiscount,
        q3AvgDiscount,
        discountDiff,
        topChannelDrivers,
        topProductDrivers,
      });
    });
  }

  // Find region with largest change
  let largestDollarRegion: Q2Q3RegionAnalysis | null = null;
  let largestPctRegion: Q2Q3RegionAnalysis | null = null;

  if (q2q3Analysis.length > 0) {
    largestDollarRegion = [...q2q3Analysis].sort((a, b) => b.absRevenueDiff - a.absRevenueDiff)[0];
    largestPctRegion = [...q2q3Analysis].sort((a, b) => b.absRevenuePctChange - a.absRevenuePctChange)[0];
  }

  const totalRevenueDiff = totalQ3Revenue - totalQ2Revenue;
  const totalRevenuePctChange = totalQ2Revenue > 0 ? (totalRevenueDiff / totalQ2Revenue) * 100 : 0;

  return {
    quarters,
    regions,
    channels,
    products,
    matrix,
    unitsMatrix,
    discountMatrix,
    regionTotals,
    quarterTotals,
    grandTotal,
    hasQ2AndQ3,
    q2q3Analysis,
    largestDollarRegion,
    largestPctRegion,
    totalQ2Revenue,
    totalQ3Revenue,
    totalRevenueDiff,
    totalRevenuePctChange,
    totalOrders: orders.length,
  };
}

export function formatCurrency(num: number): string {
  const hasDecimals = Math.abs(num % 1) > 0.001;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatCompactCurrency(num: number): string {
  if (Math.abs(num) >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(num) >= 1_000) {
    return `$${(num / 1_000).toFixed(0)}k`;
  }
  return formatCurrency(num);
}

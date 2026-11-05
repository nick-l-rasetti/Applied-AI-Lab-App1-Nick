import { CsvParseResult, SalesOrder } from '../types';

// Robust CSV row splitter that respects quotes
export function parseCsvLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

const COLUMN_ALIASES: Record<string, string[]> = {
  quarter: ['quarter', 'qtr', 'period', 'quarter_period', 'quarter_name', 'time_period'],
  region: ['region', 'territory', 'geo', 'geography', 'market', 'area', 'zone'],
  channel: ['channel', 'sales_channel', 'distribution_channel', 'channel_type', 'route'],
  product: ['product', 'item', 'product_name', 'sku', 'offering', 'service'],
  units: ['units', 'qty', 'quantity', 'volume', 'units_sold', 'unit_count', 'count'],
  discount_pct: ['discount_pct', 'discount', 'discount%', 'discount_percentage', 'discount_rate', 'discount_percent', 'disc_pct', 'pct_discount'],
  revenue: ['revenue', 'sales', 'amount', 'total_revenue', 'net_revenue', 'total_sales', 'order_revenue'],
};

function normalizeHeader(raw: string): string {
  return raw.toLowerCase().replace(/[\s\-_]+/g, '').trim();
}

export function parseSalesCsv(csvText: string): CsvParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const orders: SalesOrder[] = [];

  const rawLines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  if (rawLines.length === 0) {
    return {
      orders: [],
      errors: ['The uploaded CSV file is empty.'],
      warnings: [],
      detectedColumns: [],
      totalRows: 0,
    };
  }

  // Detect delimiter (comma or semicolon or tab)
  const firstLine = rawLines[0];
  let delimiter = ',';
  if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';
  if (firstLine.includes('\t') && !firstLine.includes(',')) delimiter = '\t';

  const rawHeaders = parseCsvLine(firstLine, delimiter);
  const detectedColumns = rawHeaders.map((h) => h.replace(/^["']|["']$/g, '').trim());

  // Map normalized header to canonical property
  const headerMap: Record<string, number> = {};

  for (const [canonicalKey, aliases] of Object.entries(COLUMN_ALIASES)) {
    const aliasNorms = [canonicalKey, ...aliases].map((a) => normalizeHeader(a));
    const foundIndex = detectedColumns.findIndex((col) => {
      const colNorm = normalizeHeader(col);
      return aliasNorms.includes(colNorm);
    });

    if (foundIndex !== -1) {
      headerMap[canonicalKey] = foundIndex;
    }
  }

  const requiredFields = ['quarter', 'region', 'channel', 'product', 'units', 'discount_pct', 'revenue'];
  const missingFields = requiredFields.filter((req) => headerMap[req] === undefined);

  if (missingFields.length > 0) {
    errors.push(
      `Missing required column(s): ${missingFields.join(', ')}. Detected columns: [${detectedColumns.join(', ')}].`
    );
    return {
      orders: [],
      errors,
      warnings,
      detectedColumns,
      totalRows: 0,
    };
  }

  // Parse rows
  let rowCount = 0;
  for (let i = 1; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line) continue;
    const parts = parseCsvLine(line, delimiter);

    // Skip blank or comment lines
    if (parts.length === 1 && parts[0] === '') continue;

    rowCount++;

    const getVal = (field: string): string => {
      const idx = headerMap[field];
      return idx !== undefined && parts[idx] !== undefined ? parts[idx].replace(/^["']|["']$/g, '').trim() : '';
    };

    let quarter = getVal('quarter');
    const region = getVal('region') || 'Unknown Region';
    const channel = getVal('channel') || 'General Channel';
    const product = getVal('product') || 'Standard Product';

    // Standardize quarter (e.g. "2024-Q2" or "2024 Q2" or "q2" -> "Q2")
    const qMatch = quarter.match(/Q[1-4]/i);
    if (qMatch) {
      quarter = qMatch[0].toUpperCase();
    } else if (/^[1-4]$/.test(quarter)) {
      quarter = `Q${quarter}`;
    }

    // Parse units
    const rawUnits = getVal('units').replace(/[$,]/g, '');
    const units = parseFloat(rawUnits);
    if (isNaN(units)) {
      warnings.push(`Row ${i + 1}: Invalid units "${getVal('units')}". Defaulted to 0.`);
    }

    // Parse discount_pct
    let rawDisc = getVal('discount_pct').replace(/[%$,]/g, '');
    let discount_pct = parseFloat(rawDisc);
    if (isNaN(discount_pct)) {
      discount_pct = 0;
    } else {
      // If discount is in decimal form like 0.15, convert to 15.0%
      if (discount_pct > 0 && discount_pct < 1 && !rawDisc.includes('%')) {
        discount_pct = discount_pct * 100;
      }
    }

    // Parse revenue
    const rawRev = getVal('revenue').replace(/[$,]/g, '');
    const revenue = parseFloat(rawRev);
    if (isNaN(revenue)) {
      warnings.push(`Row ${i + 1}: Invalid revenue "${getVal('revenue')}". Defaulted to 0.`);
    }

    orders.push({
      id: `ord-${i}`,
      quarter: quarter || 'Unknown',
      region,
      channel,
      product,
      units: isNaN(units) ? 0 : units,
      discount_pct: isNaN(discount_pct) ? 0 : discount_pct,
      revenue: isNaN(revenue) ? 0 : revenue,
    });
  }

  if (orders.length === 0) {
    errors.push('No valid data rows found in the CSV file.');
  }

  return {
    orders,
    errors,
    warnings: warnings.slice(0, 5), // show at most 5 warnings
    detectedColumns,
    totalRows: rowCount,
  };
}

// Convert SalesOrder list back to clean CSV
export function exportOrdersToCsv(orders: SalesOrder[]): string {
  const headers = ['quarter', 'region', 'channel', 'product', 'units', 'discount_pct', 'revenue'];
  const lines = [headers.join(',')];

  for (const o of orders) {
    const quote = (val: string | number) => {
      const str = String(val);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    };

    lines.push([
      quote(o.quarter),
      quote(o.region),
      quote(o.channel),
      quote(o.product),
      o.units,
      o.discount_pct,
      o.revenue,
    ].join(','));
  }

  return lines.join('\n');
}

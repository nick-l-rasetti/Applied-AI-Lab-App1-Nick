export interface SalesOrder {
  id: string;
  quarter: string; // e.g. 'Q1', 'Q2', 'Q3', 'Q4'
  region: string;  // e.g. 'North America', 'EMEA', 'APAC', 'LATAM'
  channel: string; // e.g. 'Direct Sales', 'Online', 'Retail Partner', 'Wholesale'
  product: string; // e.g. 'Cloud Enterprise', 'Analytics Pro', etc.
  units: number;
  discount_pct: number; // 0 to 100 percentage
  revenue: number;
}

export interface RegionQuarterMatrix {
  regions: string[];
  quarters: string[];
  // revenue[region][quarter]
  revenue: Record<string, Record<string, number>>;
  units: Record<string, Record<string, number>>;
  discounts: Record<string, Record<string, number[]>>; // array of discounts to compute avg
  // totals
  regionTotals: Record<string, number>;
  quarterTotals: Record<string, number>;
  grandTotal: number;
}

export interface ProductImpact {
  product: string;
  q2Revenue: number;
  q3Revenue: number;
  diffRevenue: number;
  pctChange: number;
}

export interface ChannelImpact {
  channel: string;
  q2Revenue: number;
  q3Revenue: number;
  diffRevenue: number;
  pctChange: number;
}

export interface RegionQ2Q3Delta {
  region: string;
  q2Revenue: number;
  q3Revenue: number;
  diffRevenue: number;      // Q3 - Q2
  absDiffRevenue: number;   // |Q3 - Q2|
  pctChange: number;        // ((Q3 - Q2) / Q2) * 100
  q2Units: number;
  q3Units: number;
  diffUnits: number;
  q2AvgDiscountPct: number;
  q3AvgDiscountPct: number;
  productImpacts: ProductImpact[];
  topProductByDiff?: ProductImpact;
  channelImpacts: ChannelImpact[];
  topChannelByDiff?: ChannelImpact;
}

export interface Q2Q3AnalysisResult {
  hasQ2AndQ3: boolean;
  regionsAnalyzed: RegionQ2Q3Delta[];
  mostChangedByAbsolute: RegionQ2Q3Delta | null;
  mostChangedByPercentage: RegionQ2Q3Delta | null;
  overallQ2Revenue: number;
  overallQ3Revenue: number;
  overallDiffRevenue: number;
  overallPctChange: number;
  summaryMessage?: string;
}

export interface CsvParseResult {
  orders: SalesOrder[];
  errors: string[];
  warnings: string[];
  detectedColumns: string[];
  totalRows: number;
}

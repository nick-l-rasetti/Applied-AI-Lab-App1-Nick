export interface SalesOrder {
  quarter: string;
  region: string;
  channel: string;
  product: string;
  units: number;
  discount_pct: number;
  revenue: number;
  rawIndex?: number;
}

export interface RegionQuarterMetric {
  region: string;
  quarter: string;
  revenue: number;
  units: number;
  discountWeightedSum: number;
  orderCount: number;
}

export interface Q2Q3Driver {
  name: string;
  q2Rev: number;
  q3Rev: number;
  diff: number;
  pctChange: number;
}

export interface Q2Q3RegionAnalysis {
  region: string;
  q2Revenue: number;
  q3Revenue: number;
  revenueDiff: number;
  revenuePctChange: number;
  absRevenueDiff: number;
  absRevenuePctChange: number;
  q2Units: number;
  q3Units: number;
  unitsDiff: number;
  unitsPctChange: number;
  q2AvgDiscount: number;
  q3AvgDiscount: number;
  discountDiff: number;
  topChannelDrivers: Q2Q3Driver[];
  topProductDrivers: Q2Q3Driver[];
}

export interface SalesAggregation {
  quarters: string[];
  regions: string[];
  channels: string[];
  products: string[];
  // region -> quarter -> revenue
  matrix: Record<string, Record<string, number>>;
  // region -> quarter -> units
  unitsMatrix: Record<string, Record<string, number>>;
  // region -> quarter -> avg discount pct
  discountMatrix: Record<string, Record<string, number>>;
  // row totals
  regionTotals: Record<string, number>;
  // col totals
  quarterTotals: Record<string, number>;
  grandTotal: number;
  // Q2 vs Q3 analysis
  hasQ2AndQ3: boolean;
  q2q3Analysis: Q2Q3RegionAnalysis[];
  largestDollarRegion: Q2Q3RegionAnalysis | null;
  largestPctRegion: Q2Q3RegionAnalysis | null;
  totalQ2Revenue: number;
  totalQ3Revenue: number;
  totalRevenueDiff: number;
  totalRevenuePctChange: number;
  totalOrders: number;
}

export interface AISummaryResponse {
  summary: string;
  sentences: string[];
  targetRegion: string;
  source: string;
}

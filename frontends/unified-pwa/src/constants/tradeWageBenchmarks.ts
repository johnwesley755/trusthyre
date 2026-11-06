// Comprehensive wage and earnings benchmark catalog for frontline trades across Indian metro & tier-2 hubs
export interface TradeWageBenchmark {
  trade: string;
  category: string;
  minMonthly: number;
  avgMonthly: number;
  maxMonthly: number;
  avgDaily: number;
  overtimeHourly: number;
  foodAllowanceMonthly: number;
  roomAllowanceMonthly: number;
  demandLevel: 'VERY HIGH' | 'HIGH' | 'STABLE';
}

export const TRADE_WAGE_BENCHMARKS: TradeWageBenchmark[] = [
  {
    trade: 'Electrician',
    category: 'Facility & Electrical',
    minMonthly: 18000,
    avgMonthly: 24000,
    maxMonthly: 32000,
    avgDaily: 920,
    overtimeHourly: 120,
    foodAllowanceMonthly: 3000,
    roomAllowanceMonthly: 4000,
    demandLevel: 'VERY HIGH'
  },
  {
    trade: 'Plumber',
    category: 'Plumbing & Pipe Fitting',
    minMonthly: 17000,
    avgMonthly: 23000,
    maxMonthly: 30000,
    avgDaily: 885,
    overtimeHourly: 110,
    foodAllowanceMonthly: 2500,
    roomAllowanceMonthly: 3500,
    demandLevel: 'HIGH'
  },
  {
    trade: 'Welder (MIG/TIG/Arc)',
    category: 'Manufacturing & Fabrication',
    minMonthly: 20000,
    avgMonthly: 27000,
    maxMonthly: 38000,
    avgDaily: 1040,
    overtimeHourly: 140,
    foodAllowanceMonthly: 3500,
    roomAllowanceMonthly: 4500,
    demandLevel: 'VERY HIGH'
  },
  {
    trade: 'Commercial Driver (Heavy / Light)',
    category: 'Logistics & Transport',
    minMonthly: 19000,
    avgMonthly: 26000,
    maxMonthly: 35000,
    avgDaily: 1000,
    overtimeHourly: 125,
    foodAllowanceMonthly: 3500,
    roomAllowanceMonthly: 4000,
    demandLevel: 'VERY HIGH'
  },
  {
    trade: 'Mason / Bricklayer',
    category: 'Construction & Civil',
    minMonthly: 18000,
    avgMonthly: 25000,
    maxMonthly: 34000,
    avgDaily: 960,
    overtimeHourly: 130,
    foodAllowanceMonthly: 3000,
    roomAllowanceMonthly: 4000,
    demandLevel: 'HIGH'
  },
  {
    trade: 'Carpenter & Woodworker',
    category: 'Interiors & Construction',
    minMonthly: 18000,
    avgMonthly: 24500,
    maxMonthly: 32000,
    avgDaily: 940,
    overtimeHourly: 115,
    foodAllowanceMonthly: 2500,
    roomAllowanceMonthly: 3500,
    demandLevel: 'STABLE'
  },
  {
    trade: 'Cook / Chef (Commercial)',
    category: 'Hospitality & Kitchen',
    minMonthly: 16000,
    avgMonthly: 23000,
    maxMonthly: 32000,
    avgDaily: 880,
    overtimeHourly: 110,
    foodAllowanceMonthly: 4000,
    roomAllowanceMonthly: 4000,
    demandLevel: 'VERY HIGH'
  },
  {
    trade: 'Security Guard / Supervisor',
    category: 'Facility Security',
    minMonthly: 15000,
    avgMonthly: 20000,
    maxMonthly: 26000,
    avgDaily: 770,
    overtimeHourly: 95,
    foodAllowanceMonthly: 2000,
    roomAllowanceMonthly: 3000,
    demandLevel: 'HIGH'
  },
  {
    trade: 'Delivery Partner / Field Executive',
    category: 'E-commerce & Logistics',
    minMonthly: 18000,
    avgMonthly: 25000,
    maxMonthly: 33000,
    avgDaily: 960,
    overtimeHourly: 120,
    foodAllowanceMonthly: 2500,
    roomAllowanceMonthly: 0,
    demandLevel: 'VERY HIGH'
  },
  {
    trade: 'CNC / Lathe Machine Operator',
    category: 'Industrial Machining',
    minMonthly: 21000,
    avgMonthly: 28000,
    maxMonthly: 39000,
    avgDaily: 1075,
    overtimeHourly: 150,
    foodAllowanceMonthly: 3500,
    roomAllowanceMonthly: 4500,
    demandLevel: 'VERY HIGH'
  },
  {
    trade: 'Housekeeping & Facility Attendant',
    category: 'Facility Management',
    minMonthly: 14000,
    avgMonthly: 18500,
    maxMonthly: 24000,
    avgDaily: 710,
    overtimeHourly: 85,
    foodAllowanceMonthly: 2000,
    roomAllowanceMonthly: 2500,
    demandLevel: 'HIGH'
  },
  {
    trade: 'Retail Sales & Billing Assistant',
    category: 'Retail & Showroom',
    minMonthly: 15000,
    avgMonthly: 21000,
    maxMonthly: 28000,
    avgDaily: 810,
    overtimeHourly: 100,
    foodAllowanceMonthly: 2000,
    roomAllowanceMonthly: 0,
    demandLevel: 'HIGH'
  }
];

export function getWageBenchmark(tradeQuery?: string | null): TradeWageBenchmark {
  if (!tradeQuery) return TRADE_WAGE_BENCHMARKS[0];
  const q = tradeQuery.trim().toLowerCase();
  const match = TRADE_WAGE_BENCHMARKS.find((b) => 
    b.trade.toLowerCase().includes(q) || q.includes(b.trade.toLowerCase())
  );
  return match || TRADE_WAGE_BENCHMARKS[0];
}


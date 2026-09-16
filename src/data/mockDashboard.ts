import { DashboardStats } from '../types';

export const mockDashboardStats: DashboardStats = {
  totalInspections: 1284,
  totalInspectionsTrend: 12.4, // +12.4% vs last month
  compliantCount: 841,
  compliantTrend: 8.6,
  reviewRequiredCount: 226,
  reviewTrend: -3.2,
  violationCount: 217,
  violationTrend: 5.1,
};

export const mockComplianceByCategory = [
  { category: 'Packaged Food & Snacks', total: 540, compliant: 378, review: 82, violation: 80, rate: '70%' },
  { category: 'Dairy & Beverages', total: 295, compliant: 210, review: 45, violation: 40, rate: '71%' },
  { category: 'Personal Care & Cosmetics', total: 215, compliant: 118, review: 52, violation: 45, rate: '55%' },
  { category: 'Household & Detergents', total: 134, compliant: 82, review: 27, violation: 25, rate: '61%' },
  { category: 'Electronics & Hardware', total: 100, compliant: 53, review: 20, violation: 27, rate: '53%' },
];

export const mockViolationCategories = [
  { name: 'Missing / Illegible Consumer Care Details (Rule 6(1)(n))', count: 98, percentage: 45 },
  { name: 'Non-Standard Net Quantity / Unit declaration (Rule 11 & 13)', count: 64, percentage: 29 },
  { name: 'MRP Format / Over-stickering Violation (Rule 6(1)(e))', count: 52, percentage: 24 },
  { name: 'Missing Manufacturer / Packer Address (Rule 6(1)(b))', count: 39, percentage: 18 },
  { name: 'Generic / Ambiguous Commodity Name (Rule 6(1)(a))', count: 26, percentage: 12 },
];

export const mockRecentInspections = [
  {
    id: 'LM-2026-001284',
    productName: 'NutriBake Butter Delite Biscuits',
    brand: 'NutriBake Foods',
    category: 'Packaged Food',
    location: 'Central Supermarket, Connaught Place, New Delhi',
    date: '16 Sep 2026',
    time: '11:15 AM',
    officer: 'Inspector Rajesh Varma',
    status: 'REVIEW_REQUIRED',
    score: 80,
    violationSummary: 'Consumer Care declaration missing or obscured on back panel',
  },
  {
    id: 'LM-2026-001283',
    productName: 'PureHarvest Golden Honey 500g',
    brand: 'PureHarvest Organics',
    category: 'Packaged Food',
    location: 'Apna Bazaar, Sector 18, Noida',
    date: '16 Sep 2026',
    time: '09:40 AM',
    officer: 'Inspector Rajesh Varma',
    status: 'COMPLIANT',
    score: 96,
    violationSummary: 'All 5 mandatory declarations verified in full compliance',
  },
  {
    id: 'LM-2026-001282',
    productName: 'DermaGlow Herbal Face Wash 150ml',
    brand: 'DermaGlow Labs',
    category: 'Personal Care',
    location: 'Metro Cash & Carry, Gurugram',
    date: '15 Sep 2026',
    time: '04:20 PM',
    officer: 'Inspector Sunita Sharma',
    status: 'POTENTIAL_VIOLATION',
    score: 62,
    violationSummary: 'Net Quantity font height below prescribed minimum (Rule 9)',
  },
  {
    id: 'LM-2026-001281',
    productName: 'ProShield Disinfectant Liquid 1L',
    brand: 'ProShield Hygiene',
    category: 'Household Goods',
    location: 'BigMart Hypermarket, South Ext, New Delhi',
    date: '15 Sep 2026',
    time: '02:05 PM',
    officer: 'Inspector Amit Kulkarni',
    status: 'COMPLIANT',
    score: 94,
    violationSummary: 'Declarations legible and compliant under Rule 6',
  },
  {
    id: 'LM-2026-001280',
    productName: 'CrispJoy Salted Potato Wafers 80g',
    brand: 'CrispJoy Snacks',
    category: 'Packaged Food',
    location: 'QuickBite Retail, Karol Bagh, New Delhi',
    date: '14 Sep 2026',
    time: '11:50 AM',
    officer: 'Inspector Rajesh Varma',
    status: 'POTENTIAL_VIOLATION',
    score: 58,
    violationSummary: 'Missing unit sale price (USP) calculation (Rule 6(1)(e))',
  },
];

export const mockInspectionActivityTrend = [
  { date: '10 Sep', compliant: 24, review: 6, violation: 7 },
  { date: '11 Sep', compliant: 32, review: 8, violation: 5 },
  { date: '12 Sep', compliant: 28, review: 9, violation: 11 },
  { date: '13 Sep', compliant: 35, review: 7, violation: 6 },
  { date: '14 Sep', compliant: 42, review: 11, violation: 9 },
  { date: '15 Sep', compliant: 38, review: 10, violation: 8 },
  { date: '16 Sep', compliant: 45, review: 12, violation: 10 },
];

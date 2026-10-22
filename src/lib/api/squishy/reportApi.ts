import { apiClient } from '../client';

export interface CategoryAmount {
  category: string;
  name: string;
  emoji: string;
  affectsProfit: boolean;
  amount: number;
  count: number;
}

/** Xem công thức ở DashboardSummaryDto (backend). */
export interface DashboardSummary {
  salesRevenue: number;
  shippingFeeCollected: number;
  returnRefunds: number;
  returnExtraCharges: number;
  totalRevenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpense: number;
  otherIncome: number;
  netProfit: number;
  totalCost: number;
  repairCost: number;
  capitalIn: number;
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
  expenseBreakdown: CategoryAmount[];
  incomeBreakdown: CategoryAmount[];
  totalOrders: number;
  completedOrders: number;
  paidOrders: number;
  cancelledOrders: number;
  totalProducts: number;
  lowStockCount: number;
  totalInventoryValue: number;
}

export interface ChartPoint {
  label: string;
  date: string;
  revenue: number;
  cost: number;
  expense: number;
  profit: number;
  orders: number;
}

export interface TopSellingProduct {
  productId: string;
  productName: string;
  mainImageUrl?: string;
  totalQuantitySold: number;
  totalRevenue: number;
  currentStock: number;
}

export interface Period {
  from?: string;
  to?: string;
}

const query = (params: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && p.append(k, String(v)));
  return p.toString() ? `?${p}` : '';
};

export const reportApi = {
  getSummary: async (period: Period = {}) => {
    return apiClient.get<any, { isSuccess: boolean; data: DashboardSummary }>(`/Report/summary${query({ ...period })}`);
  },

  getChart: async (days: number = 7, period: Period = {}) => {
    return apiClient.get<any, { isSuccess: boolean; data: ChartPoint[] }>(`/Report/chart${query({ days, ...period })}`);
  },

  getTopProducts: async (top: number = 5, period: Period = {}) => {
    return apiClient.get<any, { isSuccess: boolean; data: TopSellingProduct[] }>(`/Report/top-products${query({ top, ...period })}`);
  }
};

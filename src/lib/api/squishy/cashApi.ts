import { apiClient } from '../client';

export type CashType = 'EXPENSE' | 'INCOME';
export type CashMethod = 'CASH' | 'BANK';

export interface CashCategory {
  code: string;
  type: CashType;
  name: string;
  emoji: string;
  /** false: không tính vào lãi/lỗ (VD vốn được cấp) */
  affectsProfit: boolean;
}

export interface CashTransaction {
  id: string;
  code: string;
  type: CashType;
  category: string;
  categoryName: string;
  affectsProfit: boolean;
  amount: number;
  transactionDate: string;
  paymentMethod: CashMethod;
  partyName?: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
  imageCount: number;
}

export interface SaveCashTransactionInput {
  type: CashType;
  category: string;
  amount: number;
  transactionDate: string;
  paymentMethod: CashMethod;
  partyName?: string;
  description?: string;
}

export interface CashTransactionList {
  items: CashTransaction[];
  totalExpense: number;
  totalOtherIncome: number;
  totalCapital: number;
}

type Res<T> = { isSuccess: boolean; data: T; message?: string };

export const cashApi = {
  getCategories: async () => apiClient.get<any, Res<CashCategory[]>>('/CashTransaction/categories'),
  getAll: async (filter: { type?: string; category?: string; from?: string; to?: string; keyword?: string }) => {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => v && params.append(k, v));
    return apiClient.get<any, Res<CashTransactionList>>(`/CashTransaction${params.toString() ? `?${params}` : ''}`);
  },
  create: async (data: SaveCashTransactionInput) => apiClient.post<any, Res<CashTransaction>>('/CashTransaction', data),
  update: async (id: string, data: SaveCashTransactionInput) => apiClient.put<any, Res<CashTransaction>>(`/CashTransaction/${id}`, data),
  delete: async (id: string) => apiClient.delete<any, Res<boolean>>(`/CashTransaction/${id}`),
};

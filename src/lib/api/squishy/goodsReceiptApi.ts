import { apiClient } from '../client';

export interface Supplier {
  id: string;
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
  isActive: boolean;
}

export interface GoodsReceiptItem {
  id: string;
  productId: string;
  productName?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface GoodsReceipt {
  id: string;
  code: string;
  supplierId?: string;
  supplierName?: string;
  receiptDate: string;
  totalAmount: number;
  status: string;
  note?: string;
  createdAt: string;
  details: GoodsReceiptItem[];
}

export interface CreateGoodsReceiptInput {
  supplierId?: string;
  supplierName?: string;
  receiptDate?: string;
  note?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface StockTransaction {
  id: string;
  productName: string;
  sku?: string;
  transactionType: string;
  referenceCode?: string;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  note?: string;
  createdAt: string;
}

export const goodsReceiptApi = {
  getAll: async () => {
    return apiClient.get<any, { isSuccess: boolean; data: GoodsReceipt[] }>('/GoodsReceipt');
  },

  getById: async (id: string) => {
    return apiClient.get<any, { isSuccess: boolean; data: GoodsReceipt }>(`/GoodsReceipt/${id}`);
  },

  create: async (data: CreateGoodsReceiptInput) => {
    return apiClient.post<any, { isSuccess: boolean; data: GoodsReceipt; message: string }>('/GoodsReceipt', data);
  },

  getSuppliers: async () => {
    return apiClient.get<any, { isSuccess: boolean; data: Supplier[] }>('/GoodsReceipt/suppliers');
  },

  createSupplier: async (data: Partial<Supplier>) => {
    return apiClient.post<any, { isSuccess: boolean; data: Supplier; message: string }>('/GoodsReceipt/suppliers', data);
  },

  getStockTransactions: async (productId?: string) => {
    return apiClient.get<any, { isSuccess: boolean; data: StockTransaction[] }>(
      `/GoodsReceipt/stock-transactions${productId ? `?productId=${productId}` : ''}`
    );
  }
};

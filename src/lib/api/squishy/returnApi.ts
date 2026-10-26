import { apiClient } from '../client';
import type { MediaItem } from './mediaApi';

export type ReturnType = 'RETURN' | 'EXCHANGE' | 'REPAIR' | 'FAILED_DELIVERY';
export type ReturnStatus = 'PENDING' | 'PROCESSING' | 'REPAIRING' | 'REPAIRED' | 'COMPLETED' | 'REJECTED';
export type ReasonCategory = 'DEFECTIVE' | 'WRONG_ITEM' | 'CHANGED_MIND' | 'DELIVERY_FAILED' | 'OTHER';
export type ItemCondition = 'GOOD' | 'DEFECTIVE';

export interface ReturnItem {
  id: string;
  orderDetailId: string;
  productId: string;
  productName: string;
  mainImageUrl?: string;
  quantity: number;
  unitPrice: number;
  itemCondition: ItemCondition;
  exchangeProductId?: string;
  exchangeVariantId?: string;
  exchangeProductName?: string;
  exchangeQuantity: number;
  exchangeUnitPrice: number;
}

export interface ReturnRequest {
  id: string;
  code: string;
  orderId: string;
  orderCode: string;
  customerName?: string;
  customerPhone?: string;
  requestType: ReturnType;
  reasonCategory: ReasonCategory;
  reason?: string;
  status: ReturnStatus;
  refundAmount: number;
  refundMethod?: string;
  extraCharge: number;
  repairCost: number;
  stockRestored: boolean;
  resolutionNote?: string;
  completedAt?: string;
  createdAt: string;
  totalQuantity: number;
  items: ReturnItem[];
  images: MediaItem[];
}

export interface ReturnableOrderItem {
  orderDetailId: string;
  productId: string;
  variantId?: string;
  productName: string;
  mainImageUrl?: string;
  quantity: number;
  returnedQuantity: number;
  returnableQuantity: number;
  unitPrice: number;
}

export interface ReturnableOrder {
  orderId: string;
  orderCode: string;
  customerName?: string;
  customerPhone?: string;
  orderType: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  createdAt: string;
  items: ReturnableOrderItem[];
}

export interface CreateReturnInput {
  orderId: string;
  requestType: ReturnType;
  reasonCategory: ReasonCategory;
  reason?: string;
  refundAmount?: number;
  refundMethod?: string;
  extraCharge?: number;
  repairCost: number;
  items: {
    orderDetailId: string;
    quantity: number;
    itemCondition: ItemCondition;
    exchangeProductId?: string;
    exchangeVariantId?: string;
    exchangeQuantity: number;
  }[];
}

export interface UpdateReturnStatusInput {
  status: ReturnStatus;
  resolutionNote?: string;
  refundAmount?: number;
  refundMethod?: string;
  extraCharge?: number;
  repairCost?: number;
  items?: { id: string; itemCondition: ItemCondition }[];
}

type Res<T> = { isSuccess: boolean; data: T; message?: string };

export const returnApi = {
  getAll: async (status?: string, requestType?: string, keyword?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (requestType) params.append('requestType', requestType);
    if (keyword) params.append('keyword', keyword);
    return apiClient.get<any, Res<ReturnRequest[]>>(`/Return${params.toString() ? `?${params.toString()}` : ''}`);
  },

  getById: async (id: string) => apiClient.get<any, Res<ReturnRequest>>(`/Return/${id}`),

  getReturnableOrder: async (orderCode: string) =>
    apiClient.get<any, Res<ReturnableOrder>>(`/Return/order/${encodeURIComponent(orderCode.trim())}`),

  create: async (data: CreateReturnInput) => apiClient.post<any, Res<ReturnRequest>>('/Return', data),

  updateStatus: async (id: string, data: UpdateReturnStatusInput) =>
    apiClient.put<any, Res<ReturnRequest>>(`/Return/${id}/status`, data),
};

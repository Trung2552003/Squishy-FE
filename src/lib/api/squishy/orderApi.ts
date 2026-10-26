import { apiClient } from '../client';
import type { MediaItem } from './mediaApi';

export type ShippingPayer = 'RECEIVER' | 'SENDER';

export interface UpdateOrderInfoInput {
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: string;
  note?: string;
  shippingProvider?: string;
  trackingCode?: string;
  shippingFee: number;
  shippingPayer: ShippingPayer;
  discountAmount: number;
}

export interface OrderDetailItem {
  id: string;
  productId: string;
  variantId?: string;
  variantName?: string;
  /** Đã gồm màu: "Tên - Màu" */
  productName: string;
  mainImageUrl?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderCode: string;
  customerName?: string;
  customerPhone?: string;
  orderType: string; // POS, DELIVERY, ONLINE
  subTotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;

  // Giao hàng
  shippingAddress?: string;
  shippingProvider?: string;
  trackingCode?: string;
  /** Phí trả cho đơn vị vận chuyển */
  shippingFee: number;
  /** RECEIVER: khách trả (cộng vào tổng) | SENDER: shop trả (chi phí của shop) */
  shippingPayer: ShippingPayer;

  // Khâu chuẩn bị & đóng gói (Fulfillment)
  preparationStatus: string; // PENDING, PREPARING, PACKED, SHIPPED
  preparationNote?: string;
  packingChecklistJson?: string;

  transferContent?: string;
  qrCodeUrl?: string;
  paidAt?: string;
  paymentProofImageUrl?: string;
  note?: string;
  createdAt: string;
  details: OrderDetailItem[];
  paymentProofImages: MediaItem[];
}

export interface CreateOrderInput {
  customerName?: string;
  customerPhone?: string;
  orderType?: string;
  discountAmount?: number;
  paymentMethod: string;
  note?: string;
  paymentProofImageUrl?: string;
  shippingAddress?: string;
  shippingProvider?: string;
  trackingCode?: string;
  shippingFee?: number;
  shippingPayer?: ShippingPayer;
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface UpdateFulfillmentInput {
  preparationStatus: string;
  preparationNote?: string;
  trackingCode?: string;
  shippingProvider?: string;
  packingChecklistJson?: string;
}

export const orderApi = {
  getAll: async (status?: string, keyword?: string, orderType?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (keyword) params.append('keyword', keyword);
    if (orderType) params.append('orderType', orderType);
    return apiClient.get<any, { isSuccess: boolean; data: Order[] }>(
      `/Order${params.toString() ? `?${params.toString()}` : ''}`
    );
  },

  getFulfillment: async (prepStatus?: string) => {
    const params = new URLSearchParams();
    if (prepStatus) params.append('prepStatus', prepStatus);
    return apiClient.get<any, { isSuccess: boolean; data: Order[] }>(
      `/Order/fulfillment${params.toString() ? `?${params.toString()}` : ''}`
    );
  },

  getById: async (id: string) => {
    return apiClient.get<any, { isSuccess: boolean; data: Order }>(`/Order/${id}`);
  },

  create: async (data: CreateOrderInput) => {
    return apiClient.post<any, { isSuccess: boolean; data: Order; message: string }>('/Order', data);
  },

  updateStatus: async (id: string, status: string, paymentStatus?: string) => {
    return apiClient.put<any, { isSuccess: boolean; data: Order; message: string }>(
      `/Order/${id}/status`,
      { status, paymentStatus }
    );
  },

  /** Sửa đơn khi nhập sai (người nhận, phí ship, người trả ship, giảm giá, vận chuyển) */
  updateInfo: async (id: string, data: UpdateOrderInfoInput) => {
    return apiClient.put<any, { isSuccess: boolean; data: Order; message: string }>(`/Order/${id}`, data);
  },

  updateFulfillment: async (id: string, data: UpdateFulfillmentInput) => {
    return apiClient.put<any, { isSuccess: boolean; data: Order; message: string }>(
      `/Order/${id}/fulfillment`,
      data
    );
  },

  uploadPaymentProof: async (id: string, imageUrl: string) => {
    return apiClient.post<any, { isSuccess: boolean; message: string }>(
      `/Order/${id}/payment-proof`,
      imageUrl,
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
};

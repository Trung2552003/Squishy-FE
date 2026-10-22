import { apiClient } from '../client';

export type PreorderTag = 'HOT' | 'NEW' | 'NONE';
export type PreorderStatus = 'NEW' | 'CONTACTED' | 'CONFIRMED' | 'CANCELLED';
export type CampaignStatus = 'OPEN' | 'UPCOMING' | 'CLOSED';

export interface PreorderCampaign {
  id: string;
  name: string;
  slug: string;
  description?: string;
  openAt?: string;
  closeAt?: string;
  isActive: boolean;
  createdAt: string;
  status: CampaignStatus;
  itemIds: string[];
  orderCount: number;
  totalQuantity: number;
  totalAmount: number;
}

export interface SavePreorderCampaignInput {
  name: string;
  slug?: string;
  description?: string;
  openAt?: string | null;
  closeAt?: string | null;
  isActive: boolean;
  itemIds: string[];
}

export interface PreorderCampaignPage {
  name: string;
  slug: string;
  description?: string;
  openAt?: string;
  closeAt?: string;
  status: CampaignStatus;
  items: PreorderItem[];
}

export interface PreorderItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  tag: PreorderTag;
  displayOrder: number;
  isActive: boolean;
}

export interface SavePreorderItemInput {
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  tag: PreorderTag;
  displayOrder: number;
  isActive: boolean;
}

export interface PreorderLine {
  id: string;
  preorderItemId: string;
  itemName: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
}

export interface Preorder {
  id: string;
  campaignId?: string;
  campaignName?: string;
  code: string;
  customerName: string;
  customerPhone: string;
  socialContact?: string;
  instagramContact?: string;
  shippingAddress?: string;
  note?: string;
  totalAmount: number;
  status: PreorderStatus;
  adminNote?: string;
  createdAt: string;
  totalQuantity: number;
  lines: PreorderLine[];
}

export interface CreatePreorderInput {
  campaignSlug: string;
  customerName: string;
  customerPhone: string;
  socialContact?: string;
  instagramContact?: string;
  shippingAddress?: string;
  note?: string;
  lines: { preorderItemId: string; quantity: number }[];
}

export interface PreorderReceipt {
  code: string;
  totalAmount: number;
  totalQuantity: number;
}

export interface PreorderSummaryRow {
  preorderItemId: string;
  itemName: string;
  imageUrl?: string;
  price: number;
  totalQuantity: number;
  confirmedQuantity: number;
  orderCount: number;
  totalAmount: number;
}

type Res<T> = { isSuccess: boolean; data: T; message?: string };

/**
 * Link gửi khách cho một đợt. Nếu trang đặt trước được đưa lên tên miền riêng,
 * đặt VITE_PREORDER_SITE_URL (VD: https://order.squishypop.vn) trong file .env.
 */
export function preorderLink(slug: string) {
  const base = (import.meta.env.VITE_PREORDER_SITE_URL || window.location.origin).replace(/\/$/, '');
  return `${base}/dat-truoc/${slug}`;
}

export const preorderApi = {
  // Trang công khai cho khách
  getOpenCampaigns: async () => apiClient.get<any, Res<PreorderCampaign[]>>('/Preorder/campaigns/open'),
  getCampaignPage: async (slug: string) =>
    apiClient.get<any, Res<PreorderCampaignPage>>(`/Preorder/campaigns/by-slug/${encodeURIComponent(slug)}`),
  create: async (data: CreatePreorderInput) => apiClient.post<any, Res<PreorderReceipt>>('/Preorder', data),

  // Quản trị
  getAll: async (status?: string, keyword?: string, campaignId?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (keyword) params.append('keyword', keyword);
    if (campaignId) params.append('campaignId', campaignId);
    return apiClient.get<any, Res<Preorder[]>>(`/Preorder${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getSummary: async (campaignId?: string) =>
    apiClient.get<any, Res<PreorderSummaryRow[]>>(`/Preorder/summary${campaignId ? `?campaignId=${campaignId}` : ''}`),
  getCampaigns: async () => apiClient.get<any, Res<PreorderCampaign[]>>('/Preorder/campaigns'),
  createCampaign: async (data: SavePreorderCampaignInput) => apiClient.post<any, Res<PreorderCampaign>>('/Preorder/campaigns', data),
  updateCampaign: async (id: string, data: SavePreorderCampaignInput) =>
    apiClient.put<any, Res<PreorderCampaign>>(`/Preorder/campaigns/${id}`, data),
  deleteCampaign: async (id: string) => apiClient.delete<any, Res<boolean>>(`/Preorder/campaigns/${id}`),
  updateStatus: async (id: string, status: PreorderStatus, adminNote?: string) =>
    apiClient.put<any, Res<Preorder>>(`/Preorder/${id}/status`, { status, adminNote }),
  getAllItems: async () => apiClient.get<any, Res<PreorderItem[]>>('/Preorder/items/all'),
  createItem: async (data: SavePreorderItemInput) => apiClient.post<any, Res<PreorderItem>>('/Preorder/items', data),
  updateItem: async (id: string, data: SavePreorderItemInput) => apiClient.put<any, Res<PreorderItem>>(`/Preorder/items/${id}`, data),
  deleteItem: async (id: string) => apiClient.delete<any, Res<boolean>>(`/Preorder/items/${id}`),
};

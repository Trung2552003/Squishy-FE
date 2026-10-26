import { apiClient } from '../client';
import type { MediaItem } from './mediaApi';

export interface Product {
  id: string;
  categoryId?: string;
  categoryName?: string;
  sku: string;
  name: string;
  description?: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  currentStock: number;
  minStockAlert: number;
  squishyType?: string;
  mainImageUrl?: string;
  isActive: boolean;
  createdAt: string;
  images: MediaItem[];
  videos: MediaItem[];
  /** Phân loại màu: có màu thì tồn kho của sản phẩm = tổng tồn các màu */
  variants: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  colorHex?: string;
  imageUrl?: string;
  currentStock: number;
  costPrice: number;
  displayOrder: number;
  isActive: boolean;
}

export interface SaveProductVariantInput {
  /** bỏ trống = màu mới */
  id?: string;
  name: string;
  colorHex?: string;
  imageUrl?: string;
  isActive: boolean;
  /** Tồn đầu kỳ, chỉ dùng khi tạo màu mới */
  initialStock?: number;
}

export interface ProductFilter {
  keyword?: string;
  categoryId?: string;
  lowStockOnly?: boolean;
  pageIndex?: number;
  pageSize?: number;
}

export interface CreateUpdateProductInput {
  categoryId?: string;
  sku: string;
  name: string;
  description?: string;
  unit?: string;
  costPrice: number;
  salePrice: number;
  currentStock: number;
  minStockAlert?: number;
  squishyType?: string;
  mainImageUrl?: string;
  isActive?: boolean;
  imageUrls?: string[];
  videoUrls?: string[];
  /** bỏ trống = không đổi phân loại */
  variants?: SaveProductVariantInput[];
}

export const productApi = {
  getPaged: async (filter: ProductFilter) => {
    const params = new URLSearchParams();
    if (filter.keyword) params.append('keyword', filter.keyword);
    if (filter.categoryId) params.append('categoryId', filter.categoryId);
    if (filter.lowStockOnly !== undefined) params.append('lowStockOnly', String(filter.lowStockOnly));
    params.append('pageIndex', String(filter.pageIndex || 1));
    params.append('pageSize', String(filter.pageSize || 20));

    return apiClient.get<any, { isSuccess: boolean; data: { items: Product[]; totalCount: number; pageIndex: number; pageSize: number } }>(
      `/Product/paged?${params.toString()}`
    );
  },

  getActive: async (categoryId?: string) => {
    const params = new URLSearchParams();
    if (categoryId && categoryId !== 'ALL') params.append('categoryId', categoryId);
    params.append('pageIndex', '1');
    params.append('pageSize', '100');
    const res = await apiClient.get<any, { isSuccess: boolean; data: { items: Product[] } }>(
      `/Product/paged?${params.toString()}`
    );
    return {
      isSuccess: res.isSuccess,
      data: res.data?.items || []
    };
  },

  getById: async (id: string) => {
    return apiClient.get<any, { isSuccess: boolean; data: Product }>(`/Product/${id}`);
  },

  create: async (data: CreateUpdateProductInput) => {
    return apiClient.post<any, { isSuccess: boolean; data: Product; message: string }>('/Product', data);
  },

  update: async (id: string, data: CreateUpdateProductInput) => {
    return apiClient.put<any, { isSuccess: boolean; data: Product; message: string }>(`/Product/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete<any, { isSuccess: boolean; message: string }>(`/Product/${id}`);
  }
};

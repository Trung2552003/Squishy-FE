import { apiClient } from '../client';

export interface Category {
  id: string;
  code: string;
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
}

export interface CreateUpdateCategoryInput {
  code: string;
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
}

export const categoryApi = {
  getAll: async () => {
    return apiClient.get<any, { isSuccess: boolean; data: Category[] }>('/Category');
  },

  getById: async (id: string) => {
    return apiClient.get<any, { isSuccess: boolean; data: Category }>(`/Category/${id}`);
  },

  create: async (data: CreateUpdateCategoryInput) => {
    return apiClient.post<any, { isSuccess: boolean; data: Category; message: string }>('/Category', data);
  },

  update: async (id: string, data: CreateUpdateCategoryInput) => {
    return apiClient.put<any, { isSuccess: boolean; data: Category; message: string }>(`/Category/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete<any, { isSuccess: boolean; message: string }>(`/Category/${id}`);
  }
};

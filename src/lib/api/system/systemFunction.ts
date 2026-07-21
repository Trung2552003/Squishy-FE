import { apiClient } from '../client';
import { z } from 'zod';
import type { PaginationRequest } from '../../types/pagination';

export interface SystemFunction {
  id: string;
  createdAt: string;
  updatedAt: string;
  userCreated: string;
  userModified: string;
  code: string;
  name: string;
  url: string;
  order: number;
  type: string;
  icon: string;
  isShow: boolean;
  parentId: string;
  isDeleted: boolean;
}

export const systemFunctionSchema = z.object({
  code: z.string().min(1, "Mã không được để trống"),
  name: z.string().min(1, "Tên không được để trống"),
  url: z.string().optional().or(z.literal('')),
  order: z.coerce.number().min(0, 'Thứ tự phải lớn hơn hoặc bằng 0').default(0),
  type: z.string().optional().or(z.literal('')),
  icon: z.string().optional().default(""),
  isShow: z.boolean().default(true),
  parentId: z.string().optional().or(z.literal("")),
});

export type SystemFunctionPayload = z.infer<typeof systemFunctionSchema>;

export const systemFunctionApi = {
  getAll: async (params?: { includeHidden?: boolean }) => {
    return apiClient.get('/SystemFunction', { params });
  },
  
  getMyFunctions: async () => {
    return apiClient.get('/SystemFunction/my-functions');
  },

  getPaged: async (params: PaginationRequest) => {
    return apiClient.get('/SystemFunction/paged', { params });
  },
  
  create: async (data: SystemFunctionPayload) => {
    const payload = {
      ...data,
      parentId: data.parentId === "" ? "00000000-0000-0000-0000-000000000000" : data.parentId,
    };
    return apiClient.post('/SystemFunction', payload);
  },

  update: async (id: string, data: SystemFunctionPayload) => {
    const payload = {
      ...data,
      id,
      parentId: data.parentId === "" ? "00000000-0000-0000-0000-000000000000" : data.parentId,
    };
    return apiClient.put(`/SystemFunction/${id}`, payload);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/SystemFunction/${id}`);
  },

  deleteMany: async (ids: string[]) => {
    return apiClient.delete('/SystemFunction/multiple', { data: ids });
  }
};

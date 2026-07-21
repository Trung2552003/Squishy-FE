import { apiClient } from '../client';
import { z } from 'zod';
import type { PaginationRequest } from '../../types/pagination';

export interface SystemRole {
  id: string;
  createdAt: string;
  updatedAt: string;
  userCreated: string;
  userModified: string;
  code: string;
  name: string;
  description: string;
  isDeleted: boolean;
}

export const systemRoleSchema = z.object({
  code: z.string().min(1, "Mã không được để trống"),
  name: z.string().min(1, "Tên không được để trống"),
  description: z.string().optional().or(z.literal('')),
  functionIds: z.array(z.string()),
});

export type SystemRolePayload = z.infer<typeof systemRoleSchema>;

export const systemRoleApi = {
  getAll: async () => {
    return apiClient.get('/SystemRole');
  },
  
  getPaged: async (params: PaginationRequest) => {
    return apiClient.get('/SystemRole/paged', { params });
  },
  
  create: async (data: SystemRolePayload) => {
    return apiClient.post('/SystemRole', data);
  },

  update: async (id: string, data: SystemRolePayload) => {
    const payload = {
      ...data,
      id
    };
    return apiClient.put(`/SystemRole/${id}`, payload);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/SystemRole/${id}`);
  },

  deleteMany: async (ids: string[]) => {
    return apiClient.delete('/SystemRole/multiple', { data: ids });
  },

  getRoleFunctions: async (id: string) => {
    return apiClient.get(`/SystemRole/${id}/functions`);
  },

  updateRoleFunctions: async (id: string, functionIds: string[]) => {
    return apiClient.put(`/SystemRole/${id}/functions`, { functionIds });
  }
};

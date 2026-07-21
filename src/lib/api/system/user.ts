import { apiClient } from '../client';
import { z } from 'zod';
import type { PaginationRequest } from '../../types/pagination';

export interface UserDto {
  id: string;
  userName: string;
  email: string | null;
  name: string | null;
  phoneNumber: string | null;
  avatarPath: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserRoleDto {
  roleId: string;
  code: string;
  name: string;
  description: string | null;
  isGranted: boolean;
}

export const userSchema = z.object({
  userName: z.string().min(1, "Tài khoản không được để trống"),
  password: z.string().optional(),
  name: z.string().optional().nullable(),
  email: z.string().email("Email không hợp lệ").optional().nullable().or(z.literal('')),
  phoneNumber: z.string().optional().nullable(),
  avatarPath: z.string().optional().nullable(),
  isActive: z.boolean(),
  roleIds: z.array(z.string()),
});

export type UserPayload = z.infer<typeof userSchema>;

export const userApi = {
  getPaged: async (params: PaginationRequest) => {
    return apiClient.get('/User/paged', { params });
  },
  
  getMe: async () => {
    return apiClient.get('/User/me');
  },
  
  getById: async (id: string) => {
    return apiClient.get(`/User/${id}`);
  },
  
  create: async (data: UserPayload) => {
    return apiClient.post('/User', data);
  },

  update: async (id: string, data: UserPayload) => {
    const payload = {
      userName: data.userName,
      password: data.password,
      email: data.email,
      name: data.name,
      phoneNumber: data.phoneNumber,
      avatarPath: data.avatarPath,
      isActive: data.isActive,
    };
    return apiClient.put(`/User/${id}`, payload);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/User/${id}`);
  },

  deleteMany: async (ids: string[]) => {
    return apiClient.delete('/User/multiple', { data: ids });
  },

  getUserRoles: async (id: string) => {
    return apiClient.get(`/User/${id}/roles`);
  },

  updateUserRoles: async (id: string, roleIds: string[]) => {
    return apiClient.put(`/User/${id}/roles`, { roleIds });
  }
};

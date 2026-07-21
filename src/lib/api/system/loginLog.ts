import { apiClient } from '../client';
import type { PaginationRequest } from '../../types/pagination';

export interface LoginLogDto {
  id: string;
  userId: string | null;
  userName: string;
  ipAddress: string;
  userAgent: string;
  status: string;
  message: string;
  createdAt: string;
}

export const loginLogApi = {
  getPaged: async (params: PaginationRequest) => {
    return apiClient.get('/LoginLog', { params });
  },

  delete: async (id: string) => {
    return apiClient.delete(`/LoginLog/${id}`);
  },

  deleteMany: async (ids: string[]) => {
    return apiClient.delete('/LoginLog/multiple', { data: ids });
  },
};

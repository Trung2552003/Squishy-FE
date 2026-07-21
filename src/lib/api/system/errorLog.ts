import { apiClient } from '../client';
import type { PaginationRequest } from '../../types/pagination';

export interface ErrorLogDto {
  id: string;
  userId: string | null;
  userName: string;
  message: string;
  stackTrace: string;
  path: string;
  ipAddress: string;
  createdAt: string;
}

export const errorLogApi = {
  getPaged: async (params: PaginationRequest) => {
    return apiClient.get('/ErrorLog/paged', { params });
  },

  delete: async (id: string) => {
    return apiClient.delete(`/ErrorLog/${id}`);
  },

  deleteMany: async (ids: string[]) => {
    return apiClient.delete('/ErrorLog/multiple', { data: ids });
  },
};

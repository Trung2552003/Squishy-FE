import { apiClient } from '../client';
import type { PaginationRequest } from '../../types/pagination';

export interface ActionLogDto {
  id: string;
  userId: string | null;
  userName: string;
  action: string;
  module: string;
  description: string;
  ipAddress: string;
  createdAt: string;
}

export const actionLogApi = {
  getPaged: async (params: PaginationRequest) => {
    return apiClient.get('/ActionLog/paged', { params });
  },

  delete: async (id: string) => {
    return apiClient.delete(`/ActionLog/${id}`);
  },

  deleteMany: async (ids: string[]) => {
    return apiClient.delete('/ActionLog/multiple', { data: ids });
  },
};

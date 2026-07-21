import { apiClient } from './client';

export const uploadApi = {
  uploadAvatar: async (file: File) => {
    return apiClient.postForm('/Upload/avatar', { file });
  },
};

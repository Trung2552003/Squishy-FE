import { apiClient } from '../client';
import { compressImage } from '@/lib/compress-image';

export interface MediaItem {
  id: string;
  entityId?: string;
  entityType: string;
  url: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  isPrimary: boolean;
  durationSeconds?: number;
  displayOrder: number;
  createdAt: string;
}

export const mediaApi = {
  getAll: async (entityType?: string, mediaType?: string) => {
    const params = new URLSearchParams();
    if (entityType) params.append('entityType', entityType);
    if (mediaType) params.append('mediaType', mediaType);
    return apiClient.get<any, { isSuccess: boolean; data: MediaItem[] }>(
      `/Media/all${params.toString() ? `?${params.toString()}` : ''}`
    );
  },

  uploadImage: async (file: File, entityType: string = 'PRODUCT', entityId?: string, isPrimary: boolean = false) => {
    const formData = new FormData();
    formData.append('file', await compressImage(file));
    return apiClient.postForm<any, { isSuccess: boolean; data: MediaItem; message: string }>(
      `/Media/upload-image?entityType=${entityType}${entityId ? `&entityId=${entityId}` : ''}&isPrimary=${isPrimary}`,
      formData
    );
  },

  uploadVideo: async (file: File, entityType: string = 'PRODUCT', entityId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postForm<any, { isSuccess: boolean; data: MediaItem; message: string }>(
      `/Media/upload-video?entityType=${entityType}${entityId ? `&entityId=${entityId}` : ''}`,
      formData
    );
  },

  getByEntity: async (entityId: string, entityType: string = 'PRODUCT') => {
    return apiClient.get<any, { isSuccess: boolean; data: MediaItem[] }>(
      `/Media/by-entity/${entityId}?entityType=${entityType}`
    );
  },

  deleteMedia: async (id: string, isVideo: boolean = false) => {
    return apiClient.delete<any, { isSuccess: boolean; message: string }>(
      `/Media/${id}?isVideo=${isVideo}`
    );
  },

  attachMedia: async (entityId: string, entityType: string, imageIds?: string[], videoIds?: string[]) => {
    return apiClient.post<any, { isSuccess: boolean }>(
      '/Media/attach',
      { entityId, entityType, imageIds, videoIds }
    );
  }
};

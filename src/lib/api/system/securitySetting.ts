import { apiClient } from "../client";

export interface SystemSecuritySetting {
  id: string;
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialCharacter: boolean;
  passwordExpiryDays: number;
  maxFailedAccessAttempts: number;
  lockoutDurationMinutes: number;
  allowedAdminIPs: string | null;
}

export const securitySettingApi = {
  getSetting: () => apiClient.get<SystemSecuritySetting>('/SystemSecuritySetting'),
  updateSetting: (data: SystemSecuritySetting) => apiClient.put<SystemSecuritySetting>('/SystemSecuritySetting', data),
};

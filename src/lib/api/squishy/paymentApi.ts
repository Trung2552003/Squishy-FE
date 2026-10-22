import { apiClient } from '../client';

export interface PaymentSetting {
  id: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  qrTemplate: string;
  isActive: boolean;
  // Máy chủ không bao giờ trả khóa thật, chỉ cho biết đã lưu và 4 ký tự cuối
  hasApiKey: boolean;
  apiKeyHint?: string;
  hasWebhookSecret: boolean;
  webhookSecretHint?: string;
}

export interface UpdatePaymentSettingInput {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  qrTemplate: string;
  /** undefined = giữ nguyên, '' = xóa, giá trị = thay mới */
  sePayApiKey?: string;
  sePayWebhookSecret?: string;
}

export type WebhookLogStatus = 'MATCHED' | 'UNMATCHED' | 'DUPLICATE' | 'IGNORED' | 'REJECTED';

export interface PaymentWebhookLog {
  id: string;
  createdAt: string;
  gateway?: string;
  transactionDate?: string;
  amountIn?: number;
  transactionContent?: string;
  transferType?: string;
  status?: WebhookLogStatus;
  message?: string;
  orderCode?: string;
}

/**
 * Địa chỉ webhook dán vào SePay. SePay gọi từ Internet nên cần địa chỉ công khai:
 * đặt VITE_PUBLIC_API_URL (VD: https://api.squishypop.vn/api) khi backend đã lên mạng.
 */
export function sePayWebhookUrl() {
  let base = (import.meta.env.VITE_PUBLIC_API_URL || import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
  // Bản Docker gọi API theo đường dẫn tương đối (/api): ghép thêm địa chỉ web đang mở
  if (base.startsWith('/')) base = `${window.location.origin}${base}`;
  return `${base}/Payment/sepay-webhook`;
}

export const paymentApi = {
  getSettings: async () => {
    return apiClient.get<any, { isSuccess: boolean; data: PaymentSetting }>('/Payment/settings');
  },

  updateSettings: async (data: UpdatePaymentSettingInput) => {
    return apiClient.put<any, { isSuccess: boolean; data: PaymentSetting; message: string }>('/Payment/settings', data);
  },

  getWebhookLogs: async (take = 20) => {
    return apiClient.get<any, { isSuccess: boolean; data: PaymentWebhookLog[] }>(`/Payment/webhook-logs?take=${take}`);
  },

  generateQr: async (orderCode: string, amount: number, transferContent?: string) => {
    const params = new URLSearchParams({
      orderCode,
      amount: String(amount),
    });
    if (transferContent) params.append('transferContent', transferContent);
    return apiClient.get<any, { qrUrl: string }>(`/Payment/generate-qr?${params.toString()}`);
  }
};

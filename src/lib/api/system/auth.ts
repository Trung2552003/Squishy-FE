import { apiClient } from '../client';
import { z } from 'zod';

// Định nghĩa các kiểu dữ liệu gửi lên (Payloads) bằng Zod để dùng chung với Form Validation
export const loginSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập tên đăng nhập"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const registerSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập tên đăng nhập").max(50, "Tên đăng nhập không được quá 50 ký tự"),
  email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
  confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu nhập lại không khớp",
  path: ["confirmPassword"],
});

// Các kiểu Typescript tương ứng được sinh tự động từ Schema
export type LoginPayload = z.infer<typeof loginSchema>;
export type RegisterPayload = z.infer<typeof registerSchema>;

export interface ForceChangePasswordRequest {
  userName: string;
  oldPassword?: string;
  newPassword?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyResetCodeRequest {
  email: string;
  code: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

// Định nghĩa các hàm gọi API
export const authApi = {
  login: async (data: LoginPayload) => {
    return apiClient.post('/Auth/login', data);
  },
  
  forceChangePassword: async (data: ForceChangePasswordRequest) => {
    return apiClient.post('/Auth/force-change-password', data);
  },

  register: async (data: Omit<RegisterPayload, 'confirmPassword'>) => {
    const payload = {
      username: data.username,
      email: data.email,
      password: data.password,
    };
    return apiClient.post('/Auth/register', payload);
  },

  logout: async () => {
    return apiClient.post('/Auth/logout');
  },

  forgotPassword: async (data: ForgotPasswordRequest) => {
    return apiClient.post('/Auth/forgot-password', data);
  },

  verifyResetCode: async (data: VerifyResetCodeRequest) => {
    return apiClient.post('/Auth/verify-reset-code', data);
  },

  resetPassword: async (data: ResetPasswordRequest) => {
    return apiClient.post('/Auth/reset-password', data);
  }
};

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAvatarColor(name: string) {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
    'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
    'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500',
    'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function formatVND(value: number | string | null | undefined): string {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
}

// Số điện thoại Việt Nam: 10 số bắt đầu bằng 0, hoặc +84
export function isValidVNPhone(phone: string): boolean {
  return /^(0|\+84)\d{9}$/.test(phone.replace(/[\s.-]/g, ''))
}

// Địa chỉ SignalR hub (backend map tại /hubs/app, không nằm dưới /api)
export function getHubUrl(): string {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '')
  return `${baseUrl}/hubs/app`
}

export function getFileUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5116/api').replace(/\/api$/, '');
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

const THUMB_EXT = /\.(jpe?g|png|webp|bmp)$/i;

/**
 * Ảnh thu nhỏ do backend tạo (/uploads/...?w=320, WebP). Dùng cho ô ảnh trong danh sách thay vì tải ảnh gốc vài MB.
 * Link ngoài, ảnh chưa tải lên (blob:) hoặc GIF/SVG thì trả nguyên link.
 */
export function getThumbUrl(path: string | null | undefined, width: number): string {
  const url = getFileUrl(path);
  if (!path || !/^\/?uploads\//.test(path) || !THUMB_EXT.test(path)) return url;
  return `${url}?w=${width}`;
}

/** srcSet 1x/2x cho màn hình nét (điện thoại) */
export function getThumbSrcSet(path: string | null | undefined, width: number): string | undefined {
  const one = getThumbUrl(path, width);
  if (one === getFileUrl(path)) return undefined;
  return `${one} 1x, ${getThumbUrl(path, width * 2)} 2x`;
}
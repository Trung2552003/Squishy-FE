// Kỳ báo cáo dùng chung cho trang Báo cáo, Thu chi khác và Bảng điều khiển.
// Gửi lên máy chủ dạng giờ địa phương không kèm múi giờ ("2026-10-01T00:00:00"), khớp với cách lưu trong DB.

export type PeriodPreset = 'TODAY' | 'LAST_7' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'ALL' | 'CUSTOM';

export interface PeriodRange {
  from?: string;
  to?: string; // không tính ngày này (to = ngày cuối + 1)
}

export const PERIOD_OPTIONS: { id: PeriodPreset; label: string }[] = [
  { id: 'TODAY', label: 'Hôm nay' },
  { id: 'LAST_7', label: '7 ngày' },
  { id: 'THIS_MONTH', label: 'Tháng này' },
  { id: 'LAST_MONTH', label: 'Tháng trước' },
  { id: 'THIS_YEAR', label: 'Năm nay' },
  { id: 'ALL', label: 'Tất cả' },
  { id: 'CUSTOM', label: 'Tùy chọn' },
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Date -> "yyyy-MM-dd" theo giờ máy */
export function toDateInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const toParam = (d: Date) => `${toDateInput(d)}T00:00:00`;

/** Khoảng thời gian của một kỳ. customFrom/customTo là "yyyy-MM-dd" (tính cả hai đầu). */
export function periodRange(preset: PeriodPreset, customFrom?: string, customTo?: string): PeriodRange {
  const today = startOfDay(new Date());
  switch (preset) {
    case 'TODAY':
      return { from: toParam(today), to: toParam(addDays(today, 1)) };
    case 'LAST_7':
      return { from: toParam(addDays(today, -6)), to: toParam(addDays(today, 1)) };
    case 'THIS_MONTH':
      return { from: toParam(new Date(today.getFullYear(), today.getMonth(), 1)), to: toParam(new Date(today.getFullYear(), today.getMonth() + 1, 1)) };
    case 'LAST_MONTH':
      return { from: toParam(new Date(today.getFullYear(), today.getMonth() - 1, 1)), to: toParam(new Date(today.getFullYear(), today.getMonth(), 1)) };
    case 'THIS_YEAR':
      return { from: toParam(new Date(today.getFullYear(), 0, 1)), to: toParam(new Date(today.getFullYear() + 1, 0, 1)) };
    case 'CUSTOM': {
      const range: PeriodRange = {};
      if (customFrom) range.from = `${customFrom}T00:00:00`;
      if (customTo) {
        const [y, m, d] = customTo.split('-').map(Number);
        range.to = toParam(new Date(y, m - 1, d + 1));
      }
      return range;
    }
    default:
      return {};
  }
}

/** Số ngày của kỳ (để vẽ biểu đồ theo ngày); null nếu không giới hạn. */
export function periodDays(range: PeriodRange): number | null {
  if (!range.from || !range.to) return null;
  return Math.round((new Date(range.to).getTime() - new Date(range.from).getTime()) / 86_400_000);
}

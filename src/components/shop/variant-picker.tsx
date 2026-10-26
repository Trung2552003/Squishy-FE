import type { ProductVariant } from '@/lib/api/squishy/productApi';
import { cn } from '@/lib/utils';

interface VariantPickerProps {
  variants: ProductVariant[];
  value?: string;
  onChange: (variantId: string) => void;
  /** Hiện số tồn từng màu; màu hết hàng bị khóa khi đang bán */
  showStock?: boolean;
  /** Cho chọn cả màu hết hàng (VD phiếu nhập kho) */
  allowOutOfStock?: boolean;
  size?: 'sm' | 'md';
}

/** Chọn màu dạng các ô tròn màu + tên. Dùng chung cho POS, trang bán hàng, phiếu nhập, đổi trả. */
export function VariantPicker({ variants, value, onChange, showStock, allowOutOfStock, size = 'md' }: VariantPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Chọn màu">
      {variants.map(v => {
        const out = !allowOutOfStock && v.currentStock <= 0;
        const selected = v.id === value;
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={out}
            onClick={() => onChange(v.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border-2 font-semibold transition-colors',
              size === 'sm' ? 'pl-1 pr-2.5 py-0.5 text-xs' : 'pl-1.5 pr-3 py-1 text-sm',
              selected ? 'border-slate-900 bg-[#FEF08A]' : 'border-slate-200 bg-white hover:border-slate-400',
              out && 'opacity-40 line-through cursor-not-allowed hover:border-slate-200'
            )}
          >
            <span
              className={cn('rounded-full border border-black/20 shrink-0', size === 'sm' ? 'w-4 h-4' : 'w-5 h-5')}
              style={{ background: v.colorHex || '#e2e8f0' }}
            />
            {v.name}
            {showStock && <span className="text-[11px] font-normal text-muted-foreground">({v.currentStock})</span>}
          </button>
        );
      })}
    </div>
  );
}

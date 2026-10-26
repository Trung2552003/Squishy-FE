import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash, ImageSquare, Palette } from '@phosphor-icons/react';

import { mediaApi } from '@/lib/api/squishy/mediaApi';
import type { ProductVariant } from '@/lib/api/squishy/productApi';
import { Input } from '@/components/ui/input';
import { cn, getThumbUrl } from '@/lib/utils';

export interface VariantDraft {
  key: string;
  id?: string;
  name: string;
  colorHex: string;
  imageUrl?: string;
  isActive: boolean;
  /** Tồn đầu kỳ cho màu mới */
  initialStock: number;
  /** Tồn hiện tại (màu đã lưu) */
  currentStock?: number;
}

const PRESETS: { name: string; hex: string }[] = [
  { name: 'Hồng', hex: '#F9A8D4' },
  { name: 'Vàng', hex: '#FDE047' },
  { name: 'Xanh dương', hex: '#93C5FD' },
  { name: 'Xanh lá', hex: '#86EFAC' },
  { name: 'Tím', hex: '#C4B5FD' },
  { name: 'Trắng', hex: '#FFFFFF' },
  { name: 'Cam', hex: '#FDBA74' },
  { name: 'Đỏ', hex: '#FCA5A5' },
];

let seq = 0;
const newKey = () => `v${Date.now()}_${seq++}`;

export const toVariantDrafts = (variants?: ProductVariant[]): VariantDraft[] =>
  (variants ?? []).map(v => ({
    key: v.id,
    id: v.id,
    name: v.name,
    colorHex: v.colorHex || '#E2E8F0',
    imageUrl: v.imageUrl,
    isActive: v.isActive,
    initialStock: 0,
    currentStock: v.currentStock,
  }));

interface VariantEditorProps {
  value: VariantDraft[];
  onChange: (next: VariantDraft[]) => void;
  /** Tồn kho hiện có của sản phẩm khi chưa chia màu (sẽ chuyển sang màu đầu tiên) */
  stockToMove: number;
}

/** Danh sách phân loại màu trong form sản phẩm: tên, ô màu, ảnh riêng, đang bán, tồn đầu kỳ. */
export function VariantEditor({ value, onChange, stockToMove }: VariantEditorProps) {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const update = (key: string, patch: Partial<VariantDraft>) => onChange(value.map(v => (v.key === key ? { ...v, ...patch } : v)));

  const add = (preset?: { name: string; hex: string }) => {
    if (preset && value.some(v => v.name.toLowerCase() === preset.name.toLowerCase())) return;
    onChange([...value, { key: newKey(), name: preset?.name ?? '', colorHex: preset?.hex ?? '#E2E8F0', isActive: true, initialStock: 0 }]);
  };

  const remove = (v: VariantDraft) => {
    if ((v.currentStock ?? 0) > 0) {
      toast.error(`Màu "${v.name}" còn ${v.currentStock} chiếc nên không xóa được. Hãy tắt "Đang bán".`);
      return;
    }
    onChange(value.filter(x => x.key !== v.key));
  };

  const uploadImage = async (key: string, file: File) => {
    setUploadingKey(key);
    try {
      const res = await mediaApi.uploadImage(file, 'PRODUCT_VARIANT');
      if (res.isSuccess && res.data) update(key, { imageUrl: res.data.url });
    } catch {
      toast.error('Lỗi khi tải ảnh màu.');
    } finally {
      setUploadingKey(null);
    }
  };

  const firstNewKey = value.find(v => !v.id)?.key;
  const hadSaved = value.some(v => v.id);

  return (
    <div className="rounded-2xl border p-3 sm:p-4 space-y-3 bg-muted/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold flex items-center gap-1.5"><Palette className="w-4 h-4" weight="bold" /> Phân loại màu</span>
        <button type="button" onClick={() => add()} className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" weight="bold" /> Thêm màu
        </button>
      </div>

      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">Sản phẩm chỉ có 1 loại thì bỏ qua. Có nhiều màu thì thêm để theo dõi tồn kho riêng từng màu.</p>
      )}
      {PRESETS.some(p => !value.some(v => v.name.toLowerCase() === p.name.toLowerCase())) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Thêm nhanh:</span>
          {PRESETS.filter(p => !value.some(v => v.name.toLowerCase() === p.name.toLowerCase())).map(p => (
            <button key={p.name} type="button" onClick={() => add(p)} className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-200 bg-white pl-1 pr-2.5 py-0.5 text-xs font-semibold hover:border-slate-400">
              <span className="w-4 h-4 rounded-full border border-black/20" style={{ background: p.hex }} /> {p.name}
            </button>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <>
          <div className="space-y-2">
            {value.map(v => (
              <div key={v.key} className={cn('flex flex-wrap items-center gap-2 rounded-xl border bg-white p-2', !v.isActive && 'opacity-60')}>
                <input
                  type="color"
                  value={v.colorHex}
                  onChange={e => update(v.key, { colorHex: e.target.value.toUpperCase() })}
                  aria-label={`Màu của ${v.name || 'phân loại'}`}
                  className="w-9 h-9 rounded-lg border cursor-pointer shrink-0 p-0.5 bg-white"
                />
                <Input
                  value={v.name}
                  maxLength={50}
                  placeholder="Tên màu, VD: Hồng"
                  onChange={e => update(v.key, { name: e.target.value })}
                  className="h-9 rounded-lg flex-1 min-w-28"
                />
                <label className={cn('w-9 h-9 rounded-lg border-2 border-dashed grid place-items-center overflow-hidden cursor-pointer shrink-0', uploadingKey === v.key && 'opacity-50')} title="Ảnh của màu">
                  {v.imageUrl ? <img src={getThumbUrl(v.imageUrl, 160)} alt="" className="w-full h-full object-cover" /> : <ImageSquare className="w-4 h-4 text-slate-400" />}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingKey !== null}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) uploadImage(v.key, f);
                    }}
                  />
                </label>
                {v.id ? (
                  <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Tồn: {v.currentStock ?? 0}</span>
                ) : (
                  <label className="flex items-center gap-1 text-xs text-slate-600 whitespace-nowrap">
                    Tồn đầu
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={v.initialStock}
                      onChange={e => update(v.key, { initialStock: Math.max(0, Number(e.target.value) || 0) })}
                      className="h-9 w-16 rounded-lg text-right"
                    />
                  </label>
                )}
                <label className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap cursor-pointer">
                  <input type="checkbox" checked={v.isActive} onChange={e => update(v.key, { isActive: e.target.checked })} className="w-4 h-4 accent-emerald-600" />
                  Đang bán
                </label>
                <button type="button" onClick={() => remove(v)} aria-label={`Xóa màu ${v.name}`} className="w-8 h-8 grid place-items-center rounded-lg text-rose-600 hover:bg-rose-50 shrink-0">
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          {!hadSaved && stockToMove > 0 && firstNewKey && (
            <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              Sản phẩm đang có {stockToMove} chiếc: số này sẽ được chuyển sang màu đầu tiên ("{value.find(v => v.key === firstNewKey)?.name || 'màu 1'}").
              Sau đó dùng phiếu nhập để bổ sung cho các màu khác.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Tồn kho sản phẩm = tổng các màu. Sau khi lưu, số lượng từng màu thay đổi qua Phiếu nhập kho và bán hàng. Màu còn hàng không xóa được, chỉ tắt "Đang bán".
          </p>
        </>
      )}
    </div>
  );
}

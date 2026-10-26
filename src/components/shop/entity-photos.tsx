import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X } from '@phosphor-icons/react';

import { mediaApi } from '@/lib/api/squishy/mediaApi';
import { orderApi } from '@/lib/api/squishy/orderApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PhotoPicker } from '@/components/shop/photo-picker';
import { getThumbUrl } from '@/lib/utils';

type PhotoEntityType = 'ORDER_PAYMENT' | 'ORDER_SHIPPING' | 'CASH_TXN';

interface EntityPhotosProps {
  entityId: string;
  type: PhotoEntityType;
  title: string;
  hint?: string;
  readOnly?: boolean;
  onChanged?: () => void;
}

/** Ảnh gắn với một bản ghi (bill chuyển khoản, ảnh bàn giao shipper, hóa đơn thu chi): xem, chụp thêm, xóa. */
export function EntityPhotos({ entityId, type, title, hint, readOnly, onChanged }: EntityPhotosProps) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const queryKey = ['entityPhotos', entityId, type];

  const { data } = useQuery({ queryKey, queryFn: () => mediaApi.getByEntity(entityId, type) });
  const photos = data?.data ?? [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey });
    if (type !== 'CASH_TXN') queryClient.invalidateQueries({ queryKey: ['ordersList'] });
    onChanged?.();
  };

  const upload = async (files: File[]) => {
    setIsUploading(true);
    let ok = 0;
    try {
      for (const file of files) {
        const res = await mediaApi.uploadImage(file, type, entityId, type === 'ORDER_PAYMENT');
        if (!res.isSuccess || !res.data) continue;
        // Ảnh bill: cập nhật luôn ảnh đại diện thanh toán của đơn để bảng đơn hàng hiện "Có ảnh bill"
        if (type === 'ORDER_PAYMENT') await orderApi.uploadPaymentProof(entityId, res.data.url);
        ok++;
      }
      if (ok > 0) toast.success(`Đã lưu ${ok} ảnh`);
      if (ok < files.length) toast.error('Có ảnh chưa tải lên được, bạn thử lại nhé.');
    } catch {
      toast.error('Lỗi khi tải ảnh lên.');
    } finally {
      setIsUploading(false);
      refresh();
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mediaApi.deleteMedia(id),
    onSuccess: () => {
      toast.success('Đã xóa ảnh');
      refresh();
    },
    onError: () => toast.error('Không xóa được ảnh.'),
  });

  if (readOnly && photos.length === 0) return null;

  return (
    <div className="space-y-2">
      <div>
        <span className="text-sm font-semibold text-foreground">{title}{photos.length > 0 ? ` (${photos.length})` : ''}</span>
        {hint && !readOnly && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {photos.map(img => (
          <div key={img.id} className="relative">
            <button type="button" onClick={() => setPreview(getThumbUrl(img.url, 1280))}>
              <img src={getThumbUrl(img.url, 160)} loading="lazy" alt={title} className="w-16 h-16 rounded-lg object-cover border hover:opacity-90" />
            </button>
            {!readOnly && (
              <button
                type="button"
                aria-label="Xóa ảnh"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(img.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white grid place-items-center shadow"
              >
                <X className="w-3 h-3" weight="bold" />
              </button>
            )}
          </div>
        ))}
        {!readOnly && <PhotoPicker disabled={isUploading} busyText="Đang tải" onFiles={upload} />}
      </div>

      <Dialog open={!!preview} onOpenChange={o => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-lg p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {preview && <img src={preview} alt={title} className="w-full h-auto max-h-[80dvh] object-contain rounded-xl" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

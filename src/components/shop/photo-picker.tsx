import { useRef } from 'react';
import { Camera, ImageSquare } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface PhotoPickerProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  busyText?: string;
  className?: string;
}

/**
 * Hai ô vuông "Chụp" và "Thư viện" đặt cạnh danh sách ảnh.
 * "Chụp" dùng capture="environment" nên trên điện thoại mở thẳng camera sau;
 * trên máy tính trình duyệt bỏ qua capture và mở hộp chọn tệp.
 */
export function PhotoPicker({ onFiles, disabled, busyText, className }: PhotoPickerProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length > 0) onFiles(files);
  };

  const tile = cn(
    'w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors disabled:opacity-50',
    className
  );

  return (
    <>
      <button type="button" disabled={disabled} onClick={() => cameraRef.current?.click()} className={cn(tile, 'border-rose-300 text-rose-600 bg-rose-50 hover:border-rose-500')}>
        <Camera className="w-5 h-5" weight="bold" />
        {disabled && busyText ? busyText : 'Chụp'}
      </button>
      <button type="button" disabled={disabled} onClick={() => galleryRef.current?.click()} className={cn(tile, 'border-slate-300 text-slate-500 hover:border-slate-500')}>
        <ImageSquare className="w-5 h-5" />
        Thư viện
      </button>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handle} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handle} />
    </>
  );
}

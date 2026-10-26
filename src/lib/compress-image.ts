const MAX_SIDE = 2048;
const MIN_BYTES = 400 * 1024; // ảnh nhỏ hơn thì giữ nguyên
const COMPRESSIBLE = /^image\/(jpeg|png|webp|bmp)$/;

/**
 * Thu nhỏ ảnh trước khi tải lên: cạnh dài tối đa 2048px, JPEG (PNG → WebP để giữ nền trong suốt).
 * Ảnh chụp điện thoại 4–8MB còn khoảng 300–600KB nên tải lên nhanh và trang hiện ảnh nhẹ hơn.
 * Lỗi hoặc kết quả không nhỏ hơn thì trả lại file gốc.
 */
export async function compressImage(file: File): Promise<File> {
  if (!COMPRESSIBLE.test(file.type) || file.size < MIN_BYTES || typeof createImageBitmap !== 'function') return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const type = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, 0.85));
    // Trình duyệt không hỗ trợ định dạng đích sẽ trả PNG: bỏ qua
    if (!blob || blob.type !== type || blob.size >= file.size) return file;

    const ext = type === 'image/webp' ? 'webp' : 'jpg';
    const name = file.name.replace(/\.[^.]+$/, '') || 'anh';
    return new File([blob], `${name}.${ext}`, { type, lastModified: file.lastModified });
  } catch {
    return file;
  }
}

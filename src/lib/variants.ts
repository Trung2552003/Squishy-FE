import type { Product, ProductVariant } from '@/lib/api/squishy/productApi';

// Tiện ích cho sản phẩm có phân loại màu (tồn kho tính riêng từng màu)

export const hasVariants = (p: Pick<Product, 'variants'>) => (p.variants?.length ?? 0) > 0;

/** Các màu đang bán, theo thứ tự hiển thị */
export const sellableVariants = (p: Pick<Product, 'variants'>) => (p.variants ?? []).filter(v => v.isActive);

/** Tồn có thể bán của sản phẩm (có màu: chỉ tính màu đang bán) */
export const sellableStock = (p: Pick<Product, 'variants' | 'currentStock'>) =>
  hasVariants(p) ? sellableVariants(p).reduce((a, v) => a + v.currentStock, 0) : p.currentStock;

export const findVariant = (p: Pick<Product, 'variants'>, variantId?: string): ProductVariant | undefined =>
  variantId ? p.variants?.find(v => v.id === variantId) : undefined;

/** Tồn của 1 dòng hàng (sản phẩm hoặc màu) */
export const stockOf = (p: Pick<Product, 'variants' | 'currentStock'>, variantId?: string) =>
  variantId ? findVariant(p, variantId)?.currentStock ?? 0 : p.currentStock;

/** "Tên - Màu" */
export const lineName = (p: Pick<Product, 'name' | 'variants'>, variantId?: string) => {
  const v = findVariant(p, variantId);
  return v ? `${p.name} - ${v.name}` : p.name;
};

/** Ảnh của màu, không có thì dùng ảnh chính */
export const lineImage = (p: Pick<Product, 'mainImageUrl' | 'variants'>, variantId?: string) =>
  findVariant(p, variantId)?.imageUrl || p.mainImageUrl;

/** Khóa giỏ hàng: mỗi màu là 1 dòng riêng */
export const cartKey = (productId: string, variantId?: string) => (variantId ? `${productId}:${variantId}` : productId);

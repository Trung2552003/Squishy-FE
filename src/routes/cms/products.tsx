import { useState, useRef, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Package,
  Plus,
  PencilSimple,
  Trash,
  MagnifyingGlass,
  WarningCircle,
  Image,
  Video,
  UploadSimple,
  X
} from '@phosphor-icons/react';

import { productApi, type Product, type CreateUpdateProductInput } from '@/lib/api/squishy/productApi';
import { categoryApi } from '@/lib/api/squishy/categoryApi';
import { mediaApi } from '@/lib/api/squishy/mediaApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { VariantEditor, toVariantDrafts, type VariantDraft } from '@/components/shop/variant-editor';
import { PageHeader, EmptyState, LoadingState } from '@/components/shop/page-header';
import { ProductImage } from '@/components/shop/product-image';
import { cn, formatVND, getFileUrl } from '@/lib/utils';

export const Route = createFileRoute('/cms/products')({
  component: ProductsScreen,
});

const PAGE_SIZE = 15;

function VariantDots({ product }: { product: Product }) {
  if (!product.variants?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {product.variants.map(v => (
        <span
          key={v.id}
          title={`${v.name}: ${v.currentStock}${v.isActive ? '' : ' (ngừng bán)'}`}
          className={cn('inline-flex items-center gap-1 rounded-full border bg-white pl-0.5 pr-1.5 text-[10px] font-semibold', !v.isActive && 'opacity-50 line-through')}
        >
          <span className="w-3 h-3 rounded-full border border-black/20" style={{ background: v.colorHex || '#e2e8f0' }} />
          {v.name} · {v.currentStock}
        </span>
      ))}
    </div>
  );
}

function ProductsScreen() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formUnit, setFormUnit] = useState('Chiếc');
  const [formCostPrice, setFormCostPrice] = useState(0);
  const [formSalePrice, setFormSalePrice] = useState(0);
  const [formCurrentStock, setFormCurrentStock] = useState(0);
  const [formMinStockAlert, setFormMinStockAlert] = useState(5);
  const [formSquishyType, setFormSquishyType] = useState('Slow-rising');
  const [formDescription, setFormDescription] = useState('');
  const [formMainImageUrl, setFormMainImageUrl] = useState('');
  const [formVariants, setFormVariants] = useState<VariantDraft[]>([]);

  // Media (Images & Videos)
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<string[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Tìm kiếm có độ trễ để không gọi API mỗi lần gõ phím; đổi từ khóa thì quay về trang 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
      setPageIndex(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Queries
  const { data: categoriesRes } = useQuery({
    queryKey: ['squishyCategories'],
    queryFn: categoryApi.getAll,
  });
  const categories = categoriesRes?.data || [];

  const { data: productsRes, isLoading } = useQuery({
    queryKey: ['squishyProductsPaged', debouncedKeyword, selectedCatId, lowStockOnly, pageIndex],
    queryFn: () => productApi.getPaged({
      keyword: debouncedKeyword,
      categoryId: selectedCatId || undefined,
      lowStockOnly,
      pageIndex,
      pageSize: PAGE_SIZE
    }),
    placeholderData: keepPreviousData,
  });
  const productData = productsRes?.data;
  const products = productData?.items || [];
  const totalCount = productData?.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const onMutationError = (err: any) => {
    toast.error(err?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
  };

  const invalidateProducts = () => {
    queryClient.invalidateQueries({ queryKey: ['squishyProductsPaged'] });
    queryClient.invalidateQueries({ queryKey: ['squishyActiveProducts'] });
    queryClient.invalidateQueries({ queryKey: ['squishyCategories'] });
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: productApi.create,
    onSuccess: (res) => {
      if (res.isSuccess) {
        toast.success('Đã thêm sản phẩm squishy mới!');
        setIsModalOpen(false);
        invalidateProducts();
      } else {
        toast.error(res.message || 'Lỗi khi tạo sản phẩm');
      }
    },
    onError: onMutationError,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateUpdateProductInput }) => productApi.update(id, data),
    onSuccess: (res) => {
      if (res.isSuccess) {
        toast.success('Đã cập nhật sản phẩm thành công!');
        setIsModalOpen(false);
        invalidateProducts();
      } else {
        toast.error(res.message || 'Lỗi khi cập nhật sản phẩm');
      }
    },
    onError: onMutationError,
  });

  const deleteMutation = useMutation({
    mutationFn: productApi.delete,
    onSuccess: () => {
      toast.success('Đã xóa sản phẩm.');
      setDeletingProduct(null);
      invalidateProducts();
    },
    onError: onMutationError,
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormSku(`SQS-${Date.now().toString().slice(-6)}`);
    setFormName('');
    setFormCategoryId(categories[0]?.id || '');
    setFormUnit('Chiếc');
    setFormCostPrice(20000);
    setFormSalePrice(50000);
    // Hàng vào kho qua Phiếu nhập kho (ghi nhận giá vốn + tiền nhập hàng), nên sản phẩm mới bắt đầu từ 0
    setFormCurrentStock(0);
    setFormMinStockAlert(5);
    setFormSquishyType('Slow-rising');
    setFormDescription('');
    setFormMainImageUrl('');
    setUploadedImages([]);
    setUploadedVideos([]);
    setFormVariants([]);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormSku(p.sku);
    setFormName(p.name);
    setFormCategoryId(p.categoryId || '');
    setFormUnit(p.unit || 'Chiếc');
    setFormCostPrice(p.costPrice);
    setFormSalePrice(p.salePrice);
    setFormCurrentStock(p.currentStock);
    setFormMinStockAlert(p.minStockAlert);
    setFormSquishyType(p.squishyType || 'Slow-rising');
    setFormDescription(p.description || '');
    setFormMainImageUrl(p.mainImageUrl || '');
    setUploadedImages(p.images?.length ? p.images.map(i => i.url) : (p.mainImageUrl ? [p.mainImageUrl] : []));
    setUploadedVideos(p.videos?.map(v => v.url) || []);
    setFormVariants(toVariantDrafts(p.variants));
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSku.trim()) {
      toast.error('Vui lòng nhập tên và mã SKU sản phẩm.');
      return;
    }
    if (formSalePrice <= 0) {
      toast.error('Giá bán phải lớn hơn 0.');
      return;
    }
    if (formVariants.some(v => !v.name.trim())) {
      toast.error('Vui lòng nhập tên cho tất cả các màu.');
      return;
    }

    const payload: CreateUpdateProductInput = {
      categoryId: formCategoryId || undefined,
      sku: formSku.trim(),
      name: formName.trim(),
      description: formDescription.trim(),
      unit: formUnit.trim() || 'Chiếc',
      costPrice: formCostPrice,
      salePrice: formSalePrice,
      currentStock: formCurrentStock,
      minStockAlert: formMinStockAlert,
      squishyType: formSquishyType.trim(),
      mainImageUrl: formMainImageUrl || uploadedImages[0] || '',
      isActive: true,
      imageUrls: uploadedImages,
      videoUrls: uploadedVideos,
      variants: formVariants.map(v => ({
        id: v.id,
        name: v.name.trim(),
        colorHex: v.colorHex,
        imageUrl: v.imageUrl,
        isActive: v.isActive,
        initialStock: v.id ? undefined : v.initialStock,
      })),
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setIsUploadingMedia(true);
    let uploaded = 0;
    try {
      for (const file of files) {
        const res = await mediaApi.uploadImage(file, 'PRODUCT');
        if (res.isSuccess && res.data) {
          uploaded++;
          setUploadedImages(prev => [...prev, res.data.url]);
          setFormMainImageUrl(prev => prev || res.data.url);
        }
      }
      if (uploaded > 0) toast.success(`Đã tải ${uploaded} ảnh lên thành công!`);
    } catch {
      toast.error('Lỗi khi tải ảnh.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploadingMedia(true);
    try {
      const res = await mediaApi.uploadVideo(file, 'PRODUCT');
      if (res.isSuccess && res.data) {
        setUploadedVideos(prev => [...prev, res.data.url]);
        toast.success('Đã tải video review squishy lên thành công!');
      }
    } catch {
      toast.error('Lỗi khi tải video.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const removeImage = (idx: number) => {
    const removed = uploadedImages[idx];
    const remaining = uploadedImages.filter((_, i) => i !== idx);
    setUploadedImages(remaining);
    if (formMainImageUrl === removed) {
      setFormMainImageUrl(remaining[0] || '');
    }
  };

  const stockBadgeClass = (p: Product) =>
    cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black border-1.5 border-black shadow-[1px_1px_0px_#000] whitespace-nowrap',
      p.currentStock <= 0 ? 'bg-[#FECDD3]' : p.currentStock <= p.minStockAlert ? 'bg-[#FEF08A]' : 'bg-[#BBF7D0]'
    );

  const margin = formSalePrice > 0 ? Math.round(((formSalePrice - formCostPrice) / formSalePrice) * 100) : 0;
  const fieldClass = 'rounded-xl h-10 text-base sm:text-sm';
  const labelClass = 'text-sm font-semibold text-foreground block mb-1.5';

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-[1650px] mx-auto font-sans">
      <PageHeader
        emoji="📦"
        title="Sản phẩm & Kho Squishy"
        description="Thiết lập danh mục, bảng giá bán, tồn kho và thư viện ảnh/video đồ chơi Squishy."
        actions={
          <button
            onClick={openCreateModal}
            className="doodle-btn bg-[#FEF08A] hover:bg-[#FDE047] text-black px-4 py-2.5 text-sm flex items-center justify-center gap-2 w-full md:w-auto"
          >
            <Plus className="w-4 h-4 text-black" weight="bold" /> Thêm Squishy mới
          </button>
        }
      />

      {/* Bộ lọc & Tìm kiếm */}
      <div className="doodle-card p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          <div className="relative">
            <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black" weight="bold" />
            <Input
              type="search"
              placeholder="Tìm theo tên squishy, SKU..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className="doodle-input pl-9 h-10 text-base sm:text-sm font-medium"
            />
          </div>

          <select
            value={selectedCatId}
            onChange={e => {
              setSelectedCatId(e.target.value);
              setPageIndex(1);
            }}
            aria-label="Lọc theo danh mục"
            className="h-10 text-base sm:text-sm w-full"
          >
            <option value="">-- Tất cả danh mục --</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button
            onClick={() => {
              setLowStockOnly(!lowStockOnly);
              setPageIndex(1);
            }}
            aria-pressed={lowStockOnly}
            className={cn(
              'doodle-btn h-10 px-3 text-sm flex items-center justify-center gap-2 sm:col-span-2 lg:col-span-1',
              lowStockOnly ? 'bg-[#FECDD3] text-black' : 'bg-white hover:bg-slate-50 text-slate-800'
            )}
          >
            <WarningCircle className="w-4 h-4 text-rose-600" weight="bold" />
            Chỉ hiện hàng sắp hết kho
          </button>
        </div>
      </div>

      {/* Danh sách sản phẩm */}
      <div className="doodle-card overflow-hidden">
        {isLoading ? (
          <LoadingState text="Đang tải danh sách sản phẩm..." />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package className="w-10 h-10 text-slate-400" weight="bold" />}
            title="Chưa có sản phẩm phù hợp"
            description='Thử đổi bộ lọc hoặc nhấn "Thêm Squishy mới" để bắt đầu.'
          />
        ) : (
          <>
            {/* Điện thoại: dạng thẻ */}
            <div className="md:hidden divide-y divide-slate-200">
              {products.map(p => (
                <div key={p.id} className="p-3 flex gap-3">
                  <ProductImage src={p.mainImageUrl} alt={p.name} className="w-16 h-16 rounded-xl border-2 border-black shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="font-black text-slate-900 text-sm leading-snug line-clamp-2">{p.name}</div>
                    <VariantDots product={p} />
                    <div className="flex flex-wrap items-center gap-1 text-[10px]">
                      <span className="border-1.5 border-black rounded-md px-1.5 font-black bg-[#BAE6FD]">{p.sku}</span>
                      <span className="border-1.5 border-black rounded-md px-1.5 font-bold bg-[#E0E7FF] truncate max-w-32">{p.categoryName || 'Chưa phân loại'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="text-sm font-black text-black leading-tight">
                        {formatVND(p.salePrice)}
                        <span className="block text-[10px] font-semibold text-slate-500">Vốn {formatVND(p.costPrice)}</span>
                      </div>
                      <span className={stockBadgeClass(p)}>
                        {p.currentStock} {p.unit}
                        {p.currentStock <= p.minStockAlert && <WarningCircle className="w-3.5 h-3.5 text-rose-700" weight="bold" />}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => openEditModal(p)} className="doodle-btn bg-[#FEF08A] p-2" aria-label="Sửa sản phẩm">
                      <PencilSimple className="w-4 h-4" weight="bold" />
                    </button>
                    <button onClick={() => setDeletingProduct(p)} className="doodle-btn bg-[#FECDD3] p-2 text-rose-800" aria-label="Xóa sản phẩm">
                      <Trash className="w-4 h-4" weight="bold" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Máy tính: dạng bảng (ẩn bớt cột trên màn hình nhỏ) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table-sticky-last w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wide">
                  <tr>
                    <th className="py-3 px-3 lg:px-4">Ảnh & Sản phẩm</th>
                    <th className="py-3 px-3 lg:px-4 hidden lg:table-cell">Danh mục</th>
                    <th className="py-3 px-3 lg:px-4 whitespace-nowrap">Giá vốn</th>
                    <th className="py-3 px-3 lg:px-4 whitespace-nowrap">Giá bán</th>
                    <th className="py-3 px-3 lg:px-4 whitespace-nowrap">Tồn kho</th>
                    <th className="py-3 px-3 lg:px-4 hidden xl:table-cell">Media</th>
                    <th className="py-3 px-3 lg:px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-[#FAF7EE]/60 transition-colors">
                      <td className="py-3 px-3 lg:px-4">
                        <div className="flex items-center gap-3 min-w-56">
                          <ProductImage src={p.mainImageUrl} alt={p.name} className="w-12 h-12 rounded-xl border-2 border-black shadow-[1px_1px_0px_#000] shrink-0" />
                          <div className="min-w-0">
                            <div className="font-black text-slate-900 text-sm line-clamp-2">{p.name}</div>
                            <VariantDots product={p} />
                            <div className="text-xs flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="border-1.5 border-black rounded-md px-1.5 text-[10px] font-black bg-[#BAE6FD]">{p.sku}</span>
                              {p.squishyType && (
                                <span className="border-1.5 border-black rounded-md px-1.5 text-[10px] font-black bg-[#FEF08A]">✨ {p.squishyType}</span>
                              )}
                              <span className="lg:hidden border-1.5 border-black rounded-md px-1.5 text-[10px] font-bold bg-[#E0E7FF]">{p.categoryName || 'Chưa phân loại'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 lg:px-4 hidden lg:table-cell">
                        <span className="border-1.5 border-black rounded-md px-2 py-0.5 text-xs font-bold bg-[#E0E7FF] text-slate-900 whitespace-nowrap">
                          {p.categoryName || 'Chưa phân loại'}
                        </span>
                      </td>
                      <td className="py-3 px-3 lg:px-4 text-slate-600 font-semibold whitespace-nowrap">{formatVND(p.costPrice)}</td>
                      <td className="py-3 px-3 lg:px-4 font-black text-black whitespace-nowrap">{formatVND(p.salePrice)}</td>
                      <td className="py-3 px-3 lg:px-4">
                        <span className={stockBadgeClass(p)}>
                          {p.currentStock} {p.unit}
                          {p.currentStock <= p.minStockAlert && <WarningCircle className="w-3.5 h-3.5 text-rose-700" weight="bold" />}
                        </span>
                      </td>
                      <td className="py-3 px-3 lg:px-4 text-xs hidden xl:table-cell">
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-1 font-bold bg-white border-1.5 border-black px-2 py-0.5 rounded-md">
                            <Image className="w-3.5 h-3.5 text-blue-600" weight="bold" /> {p.images?.length || 0}
                          </span>
                          <span className="flex items-center gap-1 font-bold bg-white border-1.5 border-black px-2 py-0.5 rounded-md">
                            <Video className="w-3.5 h-3.5 text-purple-600" weight="bold" /> {p.videos?.length || 0}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 lg:px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditModal(p)} className="doodle-btn bg-[#FEF08A] hover:bg-[#FDE047] p-2 text-black" title="Sửa sản phẩm">
                            <PencilSimple className="w-4 h-4" weight="bold" />
                          </button>
                          <button onClick={() => setDeletingProduct(p)} className="doodle-btn bg-[#FECDD3] hover:bg-[#FDA4AF] p-2 text-rose-800" title="Xóa sản phẩm">
                            <Trash className="w-4 h-4" weight="bold" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Phân trang */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 border-t border-slate-200 text-sm text-slate-600 font-semibold">
            <span>
              {(pageIndex - 1) * PAGE_SIZE + 1}–{Math.min(pageIndex * PAGE_SIZE, totalCount)} / {totalCount} sản phẩm
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" disabled={pageIndex <= 1} onClick={() => setPageIndex(p => Math.max(1, p - 1))} className="h-8 rounded-lg">
                  Trước
                </Button>
                <span className="px-2 font-black text-black whitespace-nowrap">{pageIndex} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={pageIndex >= totalPages} onClick={() => setPageIndex(p => p + 1)} className="h-8 rounded-lg">
                  Sau
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deletingProduct}
        onOpenChange={open => !open && setDeletingProduct(null)}
        title="Xóa sản phẩm"
        description={`Bạn có chắc muốn xóa "${deletingProduct?.name}"? Hành động này không thể hoàn tác.`}
        isLoading={deleteMutation.isPending}
        onConfirm={() => deletingProduct && deleteMutation.mutate(deletingProduct.id)}
      />

      {/* MODAL THÊM / SỬA SẢN PHẨM */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              <Package className="w-5 h-5 text-rose-500" />
              {editingProduct ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Squishy Mới'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="p-name" className={labelClass}>Tên Squishy *</label>
                <Input id="p-name" required placeholder="Ví dụ: Squishy Bánh Kem Dâu Tây" value={formName} onChange={e => setFormName(e.target.value)} className={fieldClass} />
              </div>

              <div>
                <label htmlFor="p-sku" className={labelClass}>Mã SKU / Barcode *</label>
                <Input id="p-sku" required placeholder="SQS-CAKE-01" value={formSku} onChange={e => setFormSku(e.target.value)} className={cn(fieldClass, 'uppercase font-mono')} />
              </div>

              <div>
                <label htmlFor="p-cat" className={labelClass}>Danh Mục</label>
                <select
                  id="p-cat"
                  value={formCategoryId}
                  onChange={e => setFormCategoryId(e.target.value)}
                  className="w-full h-10 text-base sm:text-sm"
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="p-type" className={labelClass}>Đặc Tính Squishy</label>
                <Input id="p-type" placeholder="Slow-rising, Jumbo, Mochi..." value={formSquishyType} onChange={e => setFormSquishyType(e.target.value)} className={fieldClass} />
              </div>

              <div>
                <label htmlFor="p-unit" className={labelClass}>Đơn Vị Tính</label>
                <Input id="p-unit" placeholder="Chiếc, Bộ, Hộp..." value={formUnit} onChange={e => setFormUnit(e.target.value)} className={fieldClass} />
              </div>

              <div>
                <label htmlFor="p-cost" className={labelClass}>Giá Nhập (Giá vốn)</label>
                <Input id="p-cost" type="number" inputMode="decimal" step="any" min={0} value={formCostPrice} onChange={e => setFormCostPrice(Number(e.target.value))} className={fieldClass} />
              </div>

              <div>
                <label htmlFor="p-sale" className={labelClass}>Giá Bán Niêm Yết *</label>
                <Input id="p-sale" type="number" inputMode="decimal" step="any" min={0} required value={formSalePrice} onChange={e => setFormSalePrice(Number(e.target.value))} className={cn(fieldClass, 'font-bold text-rose-600')} />
                {formSalePrice > 0 && (
                  <span className={cn('text-[11px] font-semibold mt-1 block', margin < 0 ? 'text-red-600' : 'text-emerald-700')}>
                    Lãi gộp: {formatVND(formSalePrice - formCostPrice)} ({margin}%)
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="p-stock" className={labelClass}>Số Lượng Tồn Kho</label>
                {formVariants.length > 0 ? (
                  <div id="p-stock" className={cn(fieldClass, 'flex items-center px-3 border bg-muted/40 font-semibold')}>
                    {editingProduct && editingProduct.variants?.length
                      ? formVariants.reduce((a, v) => a + (v.currentStock ?? 0), 0) + formVariants.filter(v => !v.id).reduce((a, v) => a + v.initialStock, 0)
                      : formCurrentStock + formVariants.reduce((a, v) => a + v.initialStock, 0)}{' '}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">(tổng các màu)</span>
                  </div>
                ) : (
                  <Input id="p-stock" type="number" inputMode="numeric" min={0} value={formCurrentStock} onChange={e => setFormCurrentStock(Number(e.target.value))} className={cn(fieldClass, 'font-semibold')} />
                )}
                {!editingProduct && formVariants.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Nên để 0, rồi nhập hàng qua Phiếu nhập kho để báo cáo tính đúng giá vốn và tiền nhập hàng.</p>
                )}
              </div>

              <div>
                <label htmlFor="p-min" className={labelClass}>Ngưỡng Báo Sắp Hết</label>
                <Input id="p-min" type="number" inputMode="numeric" min={0} value={formMinStockAlert} onChange={e => setFormMinStockAlert(Number(e.target.value))} className={fieldClass} />
              </div>
            </div>

            <VariantEditor
              value={formVariants}
              onChange={setFormVariants}
              stockToMove={editingProduct && !editingProduct.variants?.length ? editingProduct.currentStock : formCurrentStock}
            />

            <div>
              <label htmlFor="p-desc" className={labelClass}>Mô tả chi tiết</label>
              <textarea
                id="p-desc"
                rows={3}
                placeholder="Mô tả độ mềm xốp, độ chậm tăng, kích thước, hương thơm..."
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-background text-base sm:text-sm"
              />
            </div>

            {/* Ảnh sản phẩm */}
            <div className="p-3 sm:p-3.5 rounded-xl border bg-muted/20 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Image className="w-4 h-4 text-blue-500" /> Ảnh sản phẩm ({uploadedImages.length})
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} disabled={isUploadingMedia} className="rounded-xl text-xs h-8">
                  <UploadSimple className="w-3.5 h-3.5 mr-1" /> Thêm ảnh
                </Button>
                <input ref={imageInputRef} type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>

              {uploadedImages.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {uploadedImages.map((imgUrl, idx) => (
                    <div
                      key={`${imgUrl}-${idx}`}
                      className={cn(
                        'relative aspect-square rounded-xl overflow-hidden border-2 bg-background',
                        formMainImageUrl === imgUrl ? 'border-blue-600' : 'border-transparent'
                      )}
                    >
                      <button type="button" onClick={() => setFormMainImageUrl(imgUrl)} className="w-full h-full" title="Đặt làm ảnh chính">
                        <img src={getFileUrl(imgUrl)} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        aria-label="Xóa ảnh"
                        className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 shadow"
                      >
                        <X className="w-3 h-3" weight="bold" />
                      </button>
                      {formMainImageUrl === imgUrl && (
                        <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-[9px] px-1.5 rounded pointer-events-none">
                          Ảnh chính
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Chưa có ảnh. Ảnh đầu tiên sẽ tự động là ảnh chính.</p>
              )}
              {uploadedImages.length > 1 && (
                <p className="text-[11px] text-muted-foreground">Chạm vào một ảnh để đặt làm ảnh chính.</p>
              )}
            </div>

            {/* Video review */}
            <div className="p-3 sm:p-3.5 rounded-xl border bg-muted/20 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-purple-500" /> Video review ({uploadedVideos.length})
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => videoInputRef.current?.click()} disabled={isUploadingMedia} className="rounded-xl text-xs h-8">
                  <UploadSimple className="w-3.5 h-3.5 mr-1" /> Tải video lên
                </Button>
                <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
              </div>

              {uploadedVideos.length > 0 && (
                <div className="space-y-2">
                  {uploadedVideos.map((vidUrl, idx) => (
                    <div key={`${vidUrl}-${idx}`} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-background border text-xs">
                      <a href={getFileUrl(vidUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-2 min-w-0 hover:underline">
                        <Video className="w-4 h-4 text-purple-500 shrink-0" />
                        <span className="truncate">{vidUrl.split('/').pop()}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setUploadedVideos(prev => prev.filter((_, i) => i !== idx))}
                        aria-label="Xóa video"
                        className="text-rose-500 hover:text-rose-700 p-1 shrink-0"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isUploadingMedia && <p className="text-xs font-semibold text-blue-600">Đang tải tệp lên, vui lòng đợi...</p>}

            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl h-10">
                Hủy bỏ
              </Button>
              <Button type="submit" disabled={isUploadingMedia || isSaving} className="rounded-xl h-10 bg-rose-600 hover:bg-rose-700 text-white">
                {isSaving ? 'Đang lưu...' : editingProduct ? 'Lưu Thay Đổi' : 'Tạo Sản Phẩm'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

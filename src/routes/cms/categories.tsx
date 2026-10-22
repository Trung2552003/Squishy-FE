import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Folder,
  Plus,
  PencilSimple,
  Trash,
  Sparkle
} from '@phosphor-icons/react';

import { categoryApi, type Category, type CreateUpdateCategoryInput } from '@/lib/api/squishy/categoryApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader, EmptyState, LoadingState } from '@/components/shop/page-header';

export const Route = createFileRoute('/cms/categories')({
  component: CategoriesScreen,
});

// Tạo slug không dấu từ tên tiếng Việt
function toSlug(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function CategoriesScreen() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState(1);

  const { data: categoriesRes, isLoading } = useQuery({
    queryKey: ['squishyCategories'],
    queryFn: categoryApi.getAll,
  });
  const categories = categoriesRes?.data || [];

  const onMutationError = (err: any) => {
    toast.error(err?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['squishyCategories'] });
    queryClient.invalidateQueries({ queryKey: ['squishyPublicCategories'] });
  };

  const createMutation = useMutation({
    mutationFn: categoryApi.create,
    onSuccess: (res) => {
      if (res.isSuccess) {
        toast.success('Đã thêm danh mục mới!');
        setIsModalOpen(false);
        invalidate();
      } else {
        toast.error(res.message || 'Lỗi khi tạo danh mục');
      }
    },
    onError: onMutationError,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateUpdateCategoryInput }) => categoryApi.update(id, data),
    onSuccess: (res) => {
      if (res.isSuccess) {
        toast.success('Đã cập nhật danh mục!');
        setIsModalOpen(false);
        invalidate();
      } else {
        toast.error(res.message || 'Lỗi khi cập nhật danh mục');
      }
    },
    onError: onMutationError,
  });

  const deleteMutation = useMutation({
    mutationFn: categoryApi.delete,
    onSuccess: () => {
      toast.success('Đã xóa danh mục.');
      setDeletingCategory(null);
      invalidate();
    },
    onError: onMutationError,
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormCode(`CAT_${Date.now().toString().slice(-4)}`);
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormDisplayOrder(categories.length + 1);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormCode(cat.code);
    setFormName(cat.name);
    setFormSlug(cat.slug || '');
    setFormDescription(cat.description || '');
    setFormDisplayOrder(cat.displayOrder);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim()) {
      toast.error('Vui lòng nhập mã và tên danh mục.');
      return;
    }

    const payload: CreateUpdateCategoryInput = {
      code: formCode.trim().toUpperCase(),
      name: formName.trim(),
      slug: formSlug.trim() || toSlug(formName),
      description: formDescription.trim(),
      displayOrder: formDisplayOrder,
      isActive: true,
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const fieldClass = 'rounded-xl h-10 text-base sm:text-sm';

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-5xl mx-auto font-sans">
      <PageHeader
        emoji="🗂️"
        title="Danh mục sản phẩm"
        description="Phân loại squishy: Bánh ngọt, Động vật cute, Jumbo khổng lồ, Mochi siêu dẻo..."
        actions={
          <button
            onClick={openCreateModal}
            className="doodle-btn bg-[#FEF08A] hover:bg-[#FDE047] text-black px-4 py-2.5 text-sm flex items-center justify-center gap-2 w-full md:w-auto"
          >
            <Plus className="w-4 h-4" weight="bold" /> Thêm danh mục
          </button>
        }
      />

      <div className="doodle-card overflow-hidden">
        {isLoading ? (
          <LoadingState text="Đang tải danh mục..." />
        ) : categories.length === 0 ? (
          <EmptyState icon={<Folder className="w-10 h-10 text-slate-400" weight="bold" />} title="Chưa có danh mục nào." />
        ) : (
          <>
            <div className="sm:hidden divide-y divide-slate-200">
              {categories.map(c => (
                <div key={c.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm flex items-center gap-1.5">
                      <Sparkle className="w-4 h-4 text-rose-500 shrink-0" weight="fill" />
                      <span className="truncate">{c.name}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      <span className="font-mono">#{c.code}</span> • {c.productCount} sản phẩm • Thứ tự {c.displayOrder}
                    </div>
                    {c.description && <div className="text-[11px] text-muted-foreground line-clamp-1">{c.description}</div>}
                  </div>
                  <button onClick={() => openEditModal(c)} className="doodle-btn bg-[#FEF08A] p-2" aria-label="Sửa danh mục">
                    <PencilSimple className="w-4 h-4" weight="bold" />
                  </button>
                  <button onClick={() => setDeletingCategory(c)} className="doodle-btn bg-[#FECDD3] p-2 text-rose-800" aria-label="Xóa danh mục">
                    <Trash className="w-4 h-4" weight="bold" />
                  </button>
                </div>
              ))}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="table-sticky-last w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wide">
                  <tr>
                    <th className="py-3 px-4">Mã & Tên danh mục</th>
                    <th className="py-3 px-4 hidden md:table-cell">Mô tả</th>
                    <th className="py-3 px-4 whitespace-nowrap">Số sản phẩm</th>
                    <th className="py-3 px-4 whitespace-nowrap">Thứ tự</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {categories.map(c => (
                    <tr key={c.id} className="hover:bg-[#FAF7EE]/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold flex items-center gap-2">
                          <Sparkle className="w-4 h-4 text-rose-500 shrink-0" weight="fill" /> {c.name}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">#{c.code}</div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-xs truncate hidden md:table-cell">{c.description || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-xs bg-rose-50 text-rose-600 px-2.5 py-1 rounded-md whitespace-nowrap">
                          {c.productCount} sản phẩm
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-muted-foreground">#{c.displayOrder}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditModal(c)} className="doodle-btn bg-[#FEF08A] hover:bg-[#FDE047] p-2" title="Sửa">
                            <PencilSimple className="w-4 h-4" weight="bold" />
                          </button>
                          <button onClick={() => setDeletingCategory(c)} className="doodle-btn bg-[#FECDD3] hover:bg-[#FDA4AF] p-2 text-rose-800" title="Xóa">
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
      </div>

      <ConfirmDialog
        open={!!deletingCategory}
        onOpenChange={open => !open && setDeletingCategory(null)}
        title="Xóa danh mục"
        description={
          deletingCategory && deletingCategory.productCount > 0
            ? `Danh mục "${deletingCategory.name}" đang có ${deletingCategory.productCount} sản phẩm. Bạn vẫn muốn xóa?`
            : `Xóa danh mục "${deletingCategory?.name}"? Hành động này không thể hoàn tác.`
        }
        isLoading={deleteMutation.isPending}
        onConfirm={() => deletingCategory && deleteMutation.mutate(deletingCategory.id)}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Chỉnh Sửa Danh Mục' : 'Thêm Danh Mục Mới'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <div>
                <label htmlFor="c-code" className="text-sm font-semibold block mb-1.5">Mã danh mục *</label>
                <Input id="c-code" required value={formCode} onChange={e => setFormCode(e.target.value)} className={`${fieldClass} uppercase font-mono`} />
              </div>
              <div>
                <label htmlFor="c-order" className="text-sm font-semibold block mb-1.5">Thứ tự</label>
                <Input id="c-order" type="number" inputMode="numeric" min={0} value={formDisplayOrder} onChange={e => setFormDisplayOrder(Number(e.target.value))} className={fieldClass} />
              </div>
            </div>

            <div>
              <label htmlFor="c-name" className="text-sm font-semibold block mb-1.5">Tên danh mục *</label>
              <Input id="c-name" required placeholder="Ví dụ: Squishy Bánh Ngọt & Trái Cây" value={formName} onChange={e => setFormName(e.target.value)} className={fieldClass} />
            </div>

            <div>
              <label htmlFor="c-slug" className="text-sm font-semibold block mb-1.5">Đường dẫn (slug)</label>
              <Input id="c-slug" placeholder={toSlug(formName) || 'tu-dong-tao-tu-ten'} value={formSlug} onChange={e => setFormSlug(e.target.value)} className={`${fieldClass} font-mono`} />
            </div>

            <div>
              <label htmlFor="c-desc" className="text-sm font-semibold block mb-1.5">Mô tả</label>
              <textarea
                id="c-desc"
                rows={3}
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-background text-base sm:text-sm"
              />
            </div>

            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl h-10">
                Hủy bỏ
              </Button>
              <Button type="submit" disabled={isSaving} className="rounded-xl h-10 bg-rose-600 hover:bg-rose-700 text-white font-semibold">
                {isSaving ? 'Đang lưu...' : editingCategory ? 'Lưu thay đổi' : 'Tạo danh mục'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

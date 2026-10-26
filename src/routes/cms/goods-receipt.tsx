import React, { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Receipt,
  Plus,
  Trash,
  Eye,
  CheckCircle,
  ArrowsLeftRight,
  PlusCircle,
  XCircle,
  Copy
} from '@phosphor-icons/react';

import {
  goodsReceiptApi,
  type GoodsReceipt,
  type CreateGoodsReceiptInput
} from '@/lib/api/squishy/goodsReceiptApi';
import { productApi } from '@/lib/api/squishy/productApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageHeader, EmptyState, LoadingState } from '@/components/shop/page-header';
import { cn, formatVND } from '@/lib/utils';

export const Route = createFileRoute('/cms/goods-receipt')({
  component: GoodsReceiptScreen,
});

// Nhãn loại giao dịch thẻ kho (gồm cả đổi trả / hàng lỗi)
const STOCK_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  IMPORT: { label: 'Nhập kho (+)', className: 'bg-blue-100 text-blue-700' },
  EXPORT: { label: 'Xuất bán (-)', className: 'bg-orange-100 text-orange-700' },
  RETURN_IN: { label: 'Khách trả, nhập lại (+)', className: 'bg-emerald-100 text-emerald-700' },
  EXCHANGE_OUT: { label: 'Xuất đổi hàng (-)', className: 'bg-sky-100 text-sky-700' },
  DEFECTIVE: { label: 'Hàng lỗi khách trả', className: 'bg-rose-100 text-rose-700' },
  IMPORT_CANCEL: { label: 'Hủy phiếu nhập (-)', className: 'bg-slate-200 text-slate-700' },
};

function ReceiptStatusBadge({ status }: { status: string }) {
  return status === 'CANCELLED' ? (
    <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-md whitespace-nowrap">
      <XCircle className="w-3.5 h-3.5" /> Đã hủy
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-md whitespace-nowrap">
      <CheckCircle className="w-3.5 h-3.5" /> Đã nhập kho
    </span>
  );
}

type ReceiptItem = { productId: string; quantity: number; unitPrice: number };

function GoodsReceiptScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'RECEIPTS' | 'STOCK_LOG'>('RECEIPTS');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState('');
  const [receiptNote, setReceiptNote] = useState('');
  const [shippingFee, setShippingFee] = useState(0);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);

  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [newSupName, setNewSupName] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupAddress, setNewSupAddress] = useState('');

  const { data: receiptsRes, isLoading: isLoadingReceipts } = useQuery({
    queryKey: ['goodsReceipts'],
    queryFn: goodsReceiptApi.getAll,
  });
  const receipts = receiptsRes?.data || [];

  const { data: suppliersRes } = useQuery({
    queryKey: ['suppliers'],
    queryFn: goodsReceiptApi.getSuppliers,
  });
  const suppliers = suppliersRes?.data || [];

  const { data: productsRes, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['squishyActiveProductsAll'],
    queryFn: () => productApi.getActive(),
  });
  const products = productsRes?.data || [];
  // Phiếu nhập chỉ cộng kho cho sản phẩm đã có trong danh mục: chưa có sản phẩm thì phải tạo trước
  const noProducts = !isLoadingProducts && products.length === 0;

  const { data: stockLogsRes, isLoading: isLoadingStockLogs } = useQuery({
    queryKey: ['stockTransactions'],
    queryFn: () => goodsReceiptApi.getStockTransactions(),
    enabled: activeTab === 'STOCK_LOG'
  });
  const stockLogs = stockLogsRes?.data || [];

  const onMutationError = (err: any) => {
    toast.error(err?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
  };

  const createReceiptMutation = useMutation({
    mutationFn: goodsReceiptApi.create,
    onSuccess: (res) => {
      if (res.isSuccess) {
        toast.success(`Tạo phiếu nhập ${res.data.code} thành công và đã cộng tồn kho!`);
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: ['goodsReceipts'] });
        queryClient.invalidateQueries({ queryKey: ['stockTransactions'] });
        queryClient.invalidateQueries({ queryKey: ['squishyActiveProducts'] });
        queryClient.invalidateQueries({ queryKey: ['squishyActiveProductsAll'] });
        queryClient.invalidateQueries({ queryKey: ['squishyProductsPaged'] });
      } else {
        toast.error(res.message || 'Lỗi khi tạo phiếu nhập');
      }
    },
    onError: onMutationError,
  });

  const cancelReceiptMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => goodsReceiptApi.cancel(id, reason),
    onSuccess: (res) => {
      toast.success(res.message || 'Đã hủy phiếu nhập');
      setIsCancelOpen(false);
      setCancelReason('');
      if (res.data) setSelectedReceipt(res.data);
      ['goodsReceipts', 'stockTransactions', 'squishyActiveProducts', 'squishyActiveProductsAll', 'squishyProductsPaged', 'reportSummary', 'reportChart']
        .forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
    },
    onError: onMutationError,
  });

  const createSupplierMutation = useMutation({
    mutationFn: goodsReceiptApi.createSupplier,
    onSuccess: (res) => {
      if (res.isSuccess && res.data) {
        toast.success(`Đã thêm nhà cung cấp "${res.data.name}"!`);
        setSupplierId(res.data.id);
        setIsAddSupplierOpen(false);
        setNewSupName('');
        setNewSupPhone('');
        setNewSupAddress('');
        queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      }
    },
    onError: onMutationError,
  });

  const newRow = (): ReceiptItem | null => {
    // Ưu tiên sản phẩm chưa có trong phiếu
    const product = products.find(p => !receiptItems.some(i => i.productId === p.id)) || products[0];
    return product ? { productId: product.id, quantity: 10, unitPrice: product.costPrice || 0 } : null;
  };

  const handleOpenCreate = () => {
    setSupplierId(suppliers[0]?.id || '');
    setReceiptNote('');
    setShippingFee(0);
    const first = products[0];
    setReceiptItems(first ? [{ productId: first.id, quantity: 10, unitPrice: first.costPrice || 0 }] : []);
    setIsCreateOpen(true);
  };

  // Nhập nhầm: mở phiếu mới điền sẵn nội dung của phiếu cũ để sửa lại cho đúng
  const copyToNewReceipt = (r: GoodsReceipt) => {
    setSupplierId(r.supplierId || '');
    setReceiptNote(r.note || '');
    setShippingFee(r.shippingFee || 0);
    setReceiptItems(r.details.map(d => ({ productId: d.productId, quantity: d.quantity, unitPrice: d.unitPrice })));
    setIsDetailOpen(false);
    setIsCreateOpen(true);
  };

  const addItemRow = () => {
    const row = newRow();
    if (row) setReceiptItems(prev => [...prev, row]);
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: string | number) => {
    setReceiptItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      if (field === 'productId') {
        const prod = products.find(p => p.id === value);
        if (prod) copy[index].unitPrice = prod.costPrice;
      }
      return copy;
    });
  };

  const removeItemRow = (index: number) => {
    setReceiptItems(prev => prev.filter((_, i) => i !== index));
  };

  const goodsAmount = receiptItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const totalReceiptAmount = goodsAmount + shippingFee;
  const totalQty = receiptItems.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
  // Giá vốn thực 1 chiếc (xem trước): giá nhập + phí ship phân bổ theo giá trị dòng hàng
  const landedCost = (item: ReceiptItem) => {
    if (!shippingFee || item.quantity <= 0) return item.unitPrice;
    const share = goodsAmount > 0 ? (item.quantity * item.unitPrice) / goodsAmount : item.quantity / Math.max(1, totalQty);
    return item.unitPrice + (shippingFee * share) / item.quantity;
  };

  const handleSubmitReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (receiptItems.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm để nhập kho.');
      return;
    }
    if (receiptItems.some(i => i.quantity <= 0)) {
      toast.error('Số lượng nhập phải lớn hơn 0.');
      return;
    }

    const payload: CreateGoodsReceiptInput = {
      supplierId: supplierId || undefined,
      note: receiptNote.trim(),
      shippingFee,
      items: receiptItems.map(i => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
      })),
    };

    createReceiptMutation.mutate(payload);
  };

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return;
    createSupplierMutation.mutate({
      name: newSupName.trim(),
      phone: newSupPhone.trim(),
      address: newSupAddress.trim(),
    });
  };

  const openReceiptDetail = async (r: GoodsReceipt) => {
    setLoadingReceiptId(r.id);
    try {
      const res = await goodsReceiptApi.getById(r.id);
      if (res.isSuccess && res.data) {
        setSelectedReceipt(res.data);
        setIsDetailOpen(true);
      }
    } catch {
      toast.error('Không tải được chi tiết phiếu nhập.');
    } finally {
      setLoadingReceiptId(null);
    }
  };

  const tabClass = (active: boolean) =>
    cn(
      'px-3 sm:px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 shrink-0 border-2 border-black',
      active ? 'bg-[#FEF08A] text-black shadow-[2px_2px_0px_#000]' : 'bg-white text-slate-700 hover:bg-slate-100'
    );

  const fieldClass = 'rounded-xl h-10 text-base sm:text-sm';

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-7xl mx-auto font-sans">
      <PageHeader
        emoji="🧾"
        title="Phiếu nhập hàng & Thẻ kho"
        description="Ghi nhận chi phí đầu vào, tự động tính giá vốn và cộng số lượng tồn kho."
        actions={
          <button
            onClick={handleOpenCreate}
            disabled={noProducts}
            title={noProducts ? 'Cần tạo sản phẩm trước khi nhập kho' : undefined}
            className="doodle-btn bg-[#FEF08A] hover:bg-[#FDE047] text-black px-4 py-2.5 text-sm flex items-center justify-center gap-2 w-full md:w-auto"
          >
            <Plus className="w-4 h-4" weight="bold" /> Tạo phiếu nhập kho
          </button>
        }
      />

      {noProducts && (
        <div className="doodle-card p-4 bg-[#FEF3C7] flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="flex-1 text-sm font-semibold text-amber-900">
            Chưa có sản phẩm nào nên chưa tạo được phiếu nhập. Phiếu nhập dùng để cộng số lượng và tính giá vốn cho các sản phẩm đã có,
            vì vậy hãy tạo sản phẩm (để tồn kho = 0) trước, rồi quay lại đây nhập hàng.
          </p>
          <Link to="/cms/products" className="doodle-btn bg-white px-4 py-2 text-sm text-center shrink-0">
            + Tạo sản phẩm
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setActiveTab('RECEIPTS')} className={tabClass(activeTab === 'RECEIPTS')}>
          <Receipt className="w-4 h-4" weight="bold" /> Phiếu nhập ({receipts.length})
        </button>
        <button onClick={() => setActiveTab('STOCK_LOG')} className={tabClass(activeTab === 'STOCK_LOG')}>
          <ArrowsLeftRight className="w-4 h-4" weight="bold" /> Biến động thẻ kho
        </button>
      </div>

      {/* TAB 1: DANH SÁCH PHIẾU NHẬP */}
      {activeTab === 'RECEIPTS' && (
        <div className="doodle-card overflow-hidden">
          {isLoadingReceipts ? (
            <LoadingState text="Đang tải phiếu nhập..." />
          ) : receipts.length === 0 ? (
            <EmptyState icon={<Receipt className="w-10 h-10 text-slate-400" weight="bold" />} title="Chưa có phiếu nhập hàng nào." />
          ) : (
            <>
              <div className="md:hidden divide-y divide-slate-200">
                {receipts.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => openReceiptDetail(r)}
                    className={cn('w-full text-left p-3 space-y-1 hover:bg-[#FAF7EE]/60', r.status === 'CANCELLED' && 'opacity-60')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono font-black text-sm">{r.code}</span>
                      <span className={cn('font-black shrink-0', r.status === 'CANCELLED' ? 'line-through text-slate-500' : 'text-rose-600')}>{formatVND(r.totalAmount)}</span>
                    </div>
                    {r.status === 'CANCELLED' && <ReceiptStatusBadge status={r.status} />}
                    <div className="text-xs text-foreground font-semibold">{r.supplierName || 'NCC vãng lai'}</div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>{new Date(r.receiptDate).toLocaleDateString('vi-VN')}{r.note ? ` • ${r.note}` : ''}</span>
                      {loadingReceiptId === r.id && <span>Đang mở...</span>}
                    </div>
                  </button>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="table-sticky-last w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wide">
                    <tr>
                      <th className="py-3 px-4 whitespace-nowrap">Mã phiếu</th>
                      <th className="py-3 px-4">Nhà cung cấp</th>
                      <th className="py-3 px-4 whitespace-nowrap">Ngày nhập</th>
                      <th className="py-3 px-4 whitespace-nowrap">Tổng tiền</th>
                      <th className="py-3 px-4 whitespace-nowrap hidden lg:table-cell">Trạng thái</th>
                      <th className="py-3 px-4 hidden xl:table-cell">Ghi chú</th>
                      <th className="py-3 px-4 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {receipts.map(r => (
                      <tr key={r.id} className={cn('hover:bg-[#FAF7EE]/60 transition-colors', r.status === 'CANCELLED' && 'opacity-60')}>
                        <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">{r.code}</td>
                        <td className="py-3 px-4 font-medium">{r.supplierName || 'NCC vãng lai'}</td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{new Date(r.receiptDate).toLocaleDateString('vi-VN')}</td>
                        <td className={cn('py-3 px-4 font-bold whitespace-nowrap', r.status === 'CANCELLED' ? 'line-through text-slate-500' : 'text-rose-600')}>
                          {formatVND(r.totalAmount)}
                          {r.shippingFee > 0 && <span className="block text-[11px] font-semibold text-muted-foreground no-underline">gồm ship {formatVND(r.shippingFee)}</span>}
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell"><ReceiptStatusBadge status={r.status} /></td>
                        <td className="py-3 px-4 text-muted-foreground max-w-xs truncate hidden xl:table-cell">{r.note || '—'}</td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openReceiptDetail(r)} disabled={loadingReceiptId === r.id} className="rounded-lg text-xs">
                            <Eye className="w-4 h-4 mr-1" /> Xem
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: LỊCH SỬ THẺ KHO */}
      {activeTab === 'STOCK_LOG' && (
        <div className="doodle-card overflow-hidden">
          {isLoadingStockLogs ? (
            <LoadingState text="Đang tải thẻ kho..." />
          ) : stockLogs.length === 0 ? (
            <EmptyState icon={<ArrowsLeftRight className="w-10 h-10 text-slate-400" weight="bold" />} title="Chưa có lịch sử thẻ kho." />
          ) : (
            <>
              <div className="md:hidden divide-y divide-slate-200">
                {stockLogs.map(log => (
                  <div key={log.id} className="p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <div className="font-bold text-sm truncate">{log.productName}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString('vi-VN')} • <span className="font-mono">{log.referenceCode}</span>
                      </div>
                      {log.note && <div className="text-[11px] text-muted-foreground line-clamp-2">{log.note}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className={cn('font-black text-base', log.quantityChange > 0 ? 'text-blue-600' : 'text-rose-600')}>
                        {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{log.quantityBefore} → {log.quantityAfter}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wide">
                    <tr>
                      <th className="py-3 px-3 whitespace-nowrap">Thời gian</th>
                      <th className="py-3 px-3">Sản phẩm</th>
                      <th className="py-3 px-3 whitespace-nowrap">Loại GD</th>
                      <th className="py-3 px-3 whitespace-nowrap hidden lg:table-cell">Mã tham chiếu</th>
                      <th className="py-3 px-3 whitespace-nowrap">Tồn trước</th>
                      <th className="py-3 px-3 whitespace-nowrap">Biến động</th>
                      <th className="py-3 px-3 whitespace-nowrap">Tồn sau</th>
                      <th className="py-3 px-3 hidden xl:table-cell">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {stockLogs.map(log => (
                      <tr key={log.id} className="hover:bg-[#FAF7EE]/60 transition-colors">
                        <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(log.createdAt).toLocaleString('vi-VN')}</td>
                        <td className="py-2.5 px-3 font-bold">
                          {log.productName}
                          <span className="block text-xs font-normal text-muted-foreground">#{log.sku}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={cn(
                            'text-xs font-bold px-2 py-0.5 rounded-md whitespace-nowrap',
                            STOCK_TYPE_LABELS[log.transactionType]?.className || 'bg-orange-100 text-orange-700'
                          )}>
                            {STOCK_TYPE_LABELS[log.transactionType]?.label || 'Xuất bán (-)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs font-semibold hidden lg:table-cell">{log.referenceCode}</td>
                        <td className="py-2.5 px-3 font-semibold text-muted-foreground">{log.quantityBefore}</td>
                        <td className={cn('py-2.5 px-3 font-bold', log.quantityChange > 0 ? 'text-blue-600' : 'text-rose-600')}>
                          {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
                        </td>
                        <td className="py-2.5 px-3 font-bold">{log.quantityAfter}</td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground hidden xl:table-cell">{log.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL TẠO PHIẾU NHẬP */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-3xl p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              <Receipt className="w-5 h-5 text-rose-500" /> Tạo Phiếu Nhập Hàng
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitReceipt} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="gr-supplier" className="text-sm font-semibold text-foreground">Nhà Cung Cấp</label>
                  <button type="button" onClick={() => setIsAddSupplierOpen(true)} className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1">
                    <PlusCircle className="w-3.5 h-3.5" /> Thêm NCC
                  </button>
                </div>
                <select
                  id="gr-supplier"
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                  className="w-full h-10 text-base sm:text-sm"
                >
                  <option value="">-- NCC vãng lai --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="gr-note" className="text-sm font-semibold text-foreground block mb-1.5">Ghi Chú</label>
                <Input id="gr-note" placeholder="Ghi chú đợt nhập hàng..." value={receiptNote} onChange={e => setReceiptNote(e.target.value)} className={fieldClass} />
              </div>
            </div>

            <div className="border rounded-2xl p-3 sm:p-4 bg-muted/10 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase text-muted-foreground">
                  Sản phẩm nhập ({receiptItems.length})
                </span>
                <Button type="button" variant="outline" size="sm" onClick={addItemRow} className="rounded-xl text-sm h-8">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Thêm dòng
                </Button>
              </div>

              <div className="space-y-2.5">
                {receiptItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_5rem_7.5rem_6.5rem_auto] items-center gap-2 p-2.5 bg-background rounded-xl border">
                    <select
                      value={item.productId}
                      onChange={e => updateItem(idx, 'productId', e.target.value)}
                      aria-label="Sản phẩm"
                      className="h-10 sm:h-9 text-base sm:text-sm min-w-0"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>

                    <button type="button" onClick={() => removeItemRow(idx)} aria-label="Xóa dòng" className="sm:order-last text-muted-foreground hover:text-rose-500 p-1.5">
                      <Trash className="w-4 h-4" />
                    </button>

                    <div className="col-span-2 sm:col-span-1 grid grid-cols-3 sm:contents gap-2">
                      <label className="flex flex-col sm:block">
                        <span className="text-[10px] text-muted-foreground sm:hidden">Số lượng</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                          aria-label="Số lượng"
                          className="w-full h-10 sm:h-9 px-2 text-center text-base sm:text-sm font-bold rounded-lg border bg-background"
                        />
                      </label>
                      <label className="flex flex-col sm:block">
                        <span className="text-[10px] text-muted-foreground sm:hidden">Giá nhập (đ)</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={item.unitPrice}
                          onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))}
                          aria-label="Giá nhập"
                          className="w-full h-10 sm:h-9 px-2 text-right text-base sm:text-sm font-bold rounded-lg border bg-background text-rose-600"
                        />
                      </label>
                      <div className="flex flex-col justify-end sm:block text-right">
                        <span className="text-[10px] text-muted-foreground sm:hidden">Thành tiền</span>
                        <span className="text-xs font-bold leading-10 sm:leading-normal">{formatVND(item.quantity * item.unitPrice)}</span>
                        {shippingFee > 0 && (
                          <span className="block text-[10px] text-muted-foreground whitespace-nowrap">vốn {formatVND(Math.round(landedCost(item)))}/chiếc</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tiền hàng</span>
                  <span className="font-semibold tabular-nums">{formatVND(goodsAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="gr-ship" className="text-muted-foreground">Phí vận chuyển nhập hàng</label>
                  <div className="relative w-36">
                    <Input
                      id="gr-ship"
                      inputMode="numeric"
                      placeholder="0"
                      value={shippingFee ? shippingFee.toLocaleString('vi-VN') : ''}
                      onChange={e => setShippingFee(Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0))}
                      className="h-9 rounded-xl pr-7 text-right font-semibold tabular-nums"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">đ</span>
                  </div>
                </div>
                {shippingFee > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Phí ship được chia vào giá vốn từng sản phẩm theo giá trị hàng, để lợi nhuận tính đúng khi bán.
                  </p>
                )}
                <div className="flex items-center justify-between font-bold">
                  <span>Tổng tiền phiếu</span>
                  <span className="text-base text-rose-600 tabular-nums">{formatVND(totalReceiptAmount)}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl h-10">
                Hủy bỏ
              </Button>
              <Button type="submit" disabled={createReceiptMutation.isPending} className="rounded-xl h-10 bg-rose-600 hover:bg-rose-700 text-white font-semibold">
                {createReceiptMutation.isPending ? 'Đang nhập kho...' : 'Hoàn tất & Nhập kho'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL THÊM NHÀ CUNG CẤP */}
      <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm Nhà Cung Cấp</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSupplier} className="space-y-3">
            <div>
              <label htmlFor="sup-name" className="text-sm font-semibold block mb-1.5">Tên nhà cung cấp *</label>
              <Input id="sup-name" required placeholder="Ví dụ: Xưởng Squishy Hà Nội" value={newSupName} onChange={e => setNewSupName(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="sup-phone" className="text-sm font-semibold block mb-1.5">Số điện thoại</label>
              <Input id="sup-phone" type="tel" inputMode="tel" placeholder="0912345678" value={newSupPhone} onChange={e => setNewSupPhone(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="sup-address" className="text-sm font-semibold block mb-1.5">Địa chỉ</label>
              <Input id="sup-address" placeholder="Địa chỉ xưởng..." value={newSupAddress} onChange={e => setNewSupAddress(e.target.value)} className={fieldClass} />
            </div>
            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" onClick={() => setIsAddSupplierOpen(false)} className="rounded-xl h-10">Hủy</Button>
              <Button type="submit" disabled={createSupplierMutation.isPending} className="rounded-xl h-10 bg-rose-600 hover:bg-rose-700 text-white">
                Thêm NCC
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* XÁC NHẬN HỦY PHIẾU NHẬP */}
      <Dialog open={isCancelOpen} onOpenChange={o => { setIsCancelOpen(o); if (!o) setCancelReason(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hủy phiếu {selectedReceipt?.code}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
              <li>Trừ lại số lượng đã nhập khỏi tồn kho và tính lại giá vốn.</li>
              <li>Phiếu được giữ lại với trạng thái <strong>Đã hủy</strong>, không tính vào báo cáo.</li>
              <li>Nếu hàng của phiếu đã bán bớt thì không hủy được.</li>
            </ul>
            <label htmlFor="gr-cancel-reason" className="block">
              <span className="font-semibold block mb-1.5">Lý do hủy</span>
              <textarea
                id="gr-cancel-reason"
                rows={2}
                maxLength={500}
                placeholder="VD: Nhập sai số lượng, nhập nhầm sản phẩm..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-background text-base sm:text-sm"
              />
            </label>
            <p className="text-xs text-muted-foreground">Sau khi hủy, bấm "Sao chép thành phiếu mới" để nhập lại cho đúng.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCancelOpen(false)} className="rounded-xl h-10">Không hủy</Button>
            <Button
              type="button"
              disabled={cancelReceiptMutation.isPending || !selectedReceipt}
              onClick={() => selectedReceipt && cancelReceiptMutation.mutate({ id: selectedReceipt.id, reason: cancelReason.trim() || undefined })}
              className="rounded-xl h-10 bg-rose-600 hover:bg-rose-700 text-white"
            >
              {cancelReceiptMutation.isPending ? 'Đang hủy...' : 'Hủy phiếu & trừ kho'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CHI TIẾT PHIẾU NHẬP */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              <Receipt className="w-5 h-5 text-rose-500 shrink-0" /> Phiếu nhập: {selectedReceipt?.code}
            </DialogTitle>
          </DialogHeader>

          {selectedReceipt && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2 p-3 bg-muted/30 rounded-xl text-xs">
                <div>
                  <span className="text-muted-foreground block">Nhà cung cấp</span>
                  <strong>{selectedReceipt.supplierName || 'NCC vãng lai'}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">Ngày nhập</span>
                  <strong>{new Date(selectedReceipt.receiptDate).toLocaleString('vi-VN')}</strong>
                </div>
                {selectedReceipt.note && (
                  <div className="min-[420px]:col-span-2">
                    <span className="text-muted-foreground block">Ghi chú</span>
                    <span>{selectedReceipt.note}</span>
                  </div>
                )}
                <div className="min-[420px]:col-span-2"><ReceiptStatusBadge status={selectedReceipt.status} /></div>
                {selectedReceipt.status === 'CANCELLED' && (
                  <div className="min-[420px]:col-span-2 text-slate-600">
                    Hủy lúc {selectedReceipt.cancelledAt ? new Date(selectedReceipt.cancelledAt).toLocaleString('vi-VN') : ''}
                    {selectedReceipt.cancelReason ? ` • Lý do: ${selectedReceipt.cancelReason}` : ''}
                  </div>
                )}
              </div>

              <div className="divide-y border rounded-xl overflow-hidden">
                <div className="p-2.5 bg-muted/60 text-xs font-bold text-muted-foreground flex justify-between">
                  <span>Sản phẩm</span>
                  <span>SL x Giá = Thành tiền</span>
                </div>
                {selectedReceipt.details?.map(d => (
                  <div key={d.id} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <strong className="block">{d.productName}</strong>
                      <span className="text-muted-foreground">SKU: {d.sku}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div>{d.quantity} x {formatVND(d.unitPrice)}</div>
                      <strong className="text-rose-600">{formatVND(d.totalPrice)}</strong>
                      {d.landedUnitCost != null && d.landedUnitCost !== d.unitPrice && (
                        <div className="text-[10px] text-muted-foreground">vốn gồm ship {formatVND(d.landedUnitCost)}/chiếc</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {selectedReceipt.shippingFee > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Phí vận chuyển (đã chia vào giá vốn)</span>
                  <span className="font-semibold">{formatVND(selectedReceipt.shippingFee)}</span>
                </div>
              )}
              <div className="flex items-center justify-between font-bold text-base pt-1">
                <span>Tổng tiền phiếu</span>
                <span className={selectedReceipt.status === 'CANCELLED' ? 'line-through text-slate-500' : 'text-rose-600'}>{formatVND(selectedReceipt.totalAmount)}</span>
              </div>

              {/* Xử lý phiếu nhập nhầm */}
              <div className="flex flex-col min-[420px]:flex-row gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => copyToNewReceipt(selectedReceipt)} className="rounded-xl h-10 min-[420px]:flex-1">
                  <Copy className="w-4 h-4 mr-1" /> Sao chép thành phiếu mới
                </Button>
                {selectedReceipt.status !== 'CANCELLED' && (
                  <Button type="button" variant="outline" onClick={() => setIsCancelOpen(true)} className="rounded-xl h-10 min-[420px]:flex-1 text-rose-600 hover:bg-rose-50">
                    <XCircle className="w-4 h-4 mr-1" /> Hủy phiếu nhập
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

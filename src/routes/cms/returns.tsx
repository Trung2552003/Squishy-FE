import React, { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MagnifyingGlass,
  Plus,
  Minus,
  Printer,
  CheckCircle,
  XCircle,
  Wrench,
  ArrowRight,
  Image as ImageIcon
} from '@phosphor-icons/react';

import {
  returnApi,
  type ReturnRequest,
  type ReturnType,
  type ReturnStatus,
  type ReasonCategory,
  type ItemCondition,
  type ReturnableOrder,
  type UpdateReturnStatusInput
} from '@/lib/api/squishy/returnApi';
import { productApi } from '@/lib/api/squishy/productApi';
import { VariantPicker } from '@/components/shop/variant-picker';
import { hasVariants, sellableStock, sellableVariants } from '@/lib/variants';
import { mediaApi } from '@/lib/api/squishy/mediaApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader, EmptyState, LoadingState } from '@/components/shop/page-header';
import { PhotoPicker } from '@/components/shop/photo-picker';
import { ProductImage } from '@/components/shop/product-image';
import { cn, formatDateTime, formatVND, getFileUrl } from '@/lib/utils';

export const Route = createFileRoute('/cms/returns')({
  validateSearch: (search: Record<string, unknown>): { order?: string } => ({
    order: typeof search.order === 'string' ? search.order : undefined,
  }),
  component: ReturnsScreen,
});

// ===== Nhãn hiển thị =====
const TYPE_INFO: Record<ReturnType, { label: string; short: string; emoji: string; color: string; desc: string }> = {
  RETURN: { label: 'Trả hàng – hoàn tiền', short: 'Trả hàng', emoji: '↩️', color: '#FFD6E0', desc: 'Khách trả lại sản phẩm, shop hoàn tiền' },
  EXCHANGE: { label: 'Đổi hàng', short: 'Đổi hàng', emoji: '🔁', color: '#BAE6FD', desc: 'Đổi sản phẩm lỗi / sai mẫu sang sản phẩm mới' },
  REPAIR: { label: 'Sửa / bảo hành', short: 'Bảo hành', emoji: '🛠️', color: '#FEF08A', desc: 'Nhận sản phẩm lỗi về sửa rồi trả lại khách' },
  FAILED_DELIVERY: { label: 'Hoàn hàng (giao thất bại)', short: 'Hoàn hàng', emoji: '📦', color: '#DDD6FE', desc: 'Shipper hoàn đơn về shop' },
};

const STATUS_INFO: Record<ReturnStatus, { label: string; className: string }> = {
  PENDING: { label: 'Mới tiếp nhận', className: 'bg-amber-100 text-amber-800' },
  PROCESSING: { label: 'Đang xử lý', className: 'bg-sky-100 text-sky-800' },
  REPAIRING: { label: 'Đang sửa', className: 'bg-violet-100 text-violet-800' },
  REPAIRED: { label: 'Sửa xong – chờ trả khách', className: 'bg-teal-100 text-teal-800' },
  COMPLETED: { label: 'Hoàn tất', className: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { label: 'Từ chối', className: 'bg-slate-200 text-slate-700' },
};

const REASONS: Record<ReasonCategory, string> = {
  DEFECTIVE: 'Hàng lỗi / hư hỏng',
  WRONG_ITEM: 'Giao sai mẫu',
  CHANGED_MIND: 'Khách đổi ý',
  DELIVERY_FAILED: 'Giao hàng thất bại',
  OTHER: 'Lý do khác',
};

const STATUS_TABS: { id: '' | ReturnStatus; label: string }[] = [
  { id: '', label: 'Tất cả' },
  { id: 'PENDING', label: 'Mới tiếp nhận' },
  { id: 'PROCESSING', label: 'Đang xử lý' },
  { id: 'REPAIRING', label: 'Đang sửa' },
  { id: 'REPAIRED', label: 'Chờ trả khách' },
  { id: 'COMPLETED', label: 'Hoàn tất' },
  { id: 'REJECTED', label: 'Từ chối' },
];

const errorMessage = (err: any, fallback: string) => err?.response?.data?.message || fallback;

function StatusBadge({ status }: { status: ReturnStatus }) {
  const info = STATUS_INFO[status];
  return <span className={cn('inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-md whitespace-nowrap', info.className)}>{info.label}</span>;
}

function TypeBadge({ type }: { type: ReturnType }) {
  const info = TYPE_INFO[type];
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md border-1.5 border-slate-800 whitespace-nowrap" style={{ backgroundColor: info.color }}>
      {info.emoji} {info.short}
    </span>
  );
}

function ConditionToggle({ value, onChange, disabled }: { value: ItemCondition; onChange: (v: ItemCondition) => void; disabled?: boolean }) {
  return (
    <div className="inline-flex rounded-lg border-1.5 border-slate-800 overflow-hidden text-xs font-bold shrink-0">
      {(['GOOD', 'DEFECTIVE'] as ItemCondition[]).map(c => (
        <button
          key={c}
          type="button"
          disabled={disabled}
          onClick={() => onChange(c)}
          aria-pressed={value === c}
          className={cn(
            'px-2.5 py-1 transition-colors',
            value === c ? (c === 'GOOD' ? 'bg-emerald-300' : 'bg-rose-300') : 'bg-white text-slate-500 hover:bg-slate-50'
          )}
        >
          {c === 'GOOD' ? 'Còn tốt' : 'Bị lỗi'}
        </button>
      ))}
    </div>
  );
}

// ===================================================================================
// TRANG DANH SÁCH
// ===================================================================================
function ReturnsScreen() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: '/cms/returns' });
  const [statusFilter, setStatusFilter] = useState<'' | ReturnStatus>('');
  const [typeFilter, setTypeFilter] = useState<'' | ReturnType>('');
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [createOrderCode, setCreateOrderCode] = useState<string | null>(null);
  // Đi từ trang Đơn hàng (?order=HD-...) thì mở sẵn form tạo phiếu
  const createCode = createOrderCode ?? search.order ?? null;
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  const closeCreate = () => {
    setCreateOrderCode(null);
    if (search.order) navigate({ search: {}, replace: true });
  };

  const { data, isLoading } = useQuery({
    queryKey: ['returns', statusFilter, typeFilter, debouncedKeyword],
    queryFn: () => returnApi.getAll(statusFilter || undefined, typeFilter || undefined, debouncedKeyword || undefined),
    placeholderData: keepPreviousData,
  });
  const requests = data?.data || [];

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-[1650px] mx-auto font-sans">
      <PageHeader
        emoji="🔁"
        title="Đổi trả & Bảo hành"
        description="Tiếp nhận hàng khách trả, đổi hàng lỗi, sửa chữa bảo hành và đơn hoàn do giao thất bại."
        actions={
          <button
            onClick={() => setCreateOrderCode('')}
            className="doodle-btn bg-[#FEF08A] hover:bg-[#FDE047] text-black px-4 py-2.5 text-sm flex items-center justify-center gap-2 w-full md:w-auto"
          >
            <Plus className="w-4 h-4" weight="bold" /> Tạo phiếu đổi trả
          </button>
        }
      />

      <div className="doodle-card p-3 sm:p-4 space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black" weight="bold" />
            <Input
              type="search"
              placeholder="Mã phiếu, mã đơn, tên khách, SĐT..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className="doodle-input pl-9 h-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as '' | ReturnType)}
            aria-label="Lọc loại phiếu"
            className="h-10 text-base sm:text-sm w-full sm:w-60"
          >
            <option value="">-- Tất cả loại phiếu --</option>
            {(Object.keys(TYPE_INFO) as ReturnType[]).map(t => (
              <option key={t} value={t}>{TYPE_INFO[t].emoji} {TYPE_INFO[t].label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-sm font-bold transition-all border-2 border-black',
                statusFilter === tab.id ? 'bg-[#FEF08A] shadow-[2px_2px_0px_#000]' : 'bg-white hover:bg-slate-100 text-slate-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="doodle-card overflow-hidden">
        {isLoading ? (
          <LoadingState text="Đang tải phiếu đổi trả..." />
        ) : requests.length === 0 ? (
          <EmptyState title="Chưa có phiếu đổi trả nào." description='Nhấn "Tạo phiếu đổi trả" khi khách mang hàng tới, hoặc mở từ chi tiết đơn hàng.' />
        ) : (
          <>
            {/* Điện thoại: thẻ */}
            <div className="lg:hidden divide-y divide-slate-200">
              {requests.map(r => (
                <button key={r.id} type="button" onClick={() => setDetailId(r.id)} className="w-full text-left p-3 space-y-1.5 hover:bg-[#FAF7EE]/60">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono font-black text-sm">{r.code}</div>
                      <div className="text-xs text-muted-foreground">Đơn {r.orderCode} • {formatDateTime(r.createdAt)}</div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-sm font-semibold">
                    {r.customerName || 'Khách lẻ'}
                    {r.customerPhone && <span className="font-normal text-muted-foreground"> • {r.customerPhone}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <TypeBadge type={r.requestType} />
                    <span className="text-muted-foreground">{REASONS[r.reasonCategory]} • {r.totalQuantity} sản phẩm</span>
                    {r.refundAmount > 0 && <span className="font-bold text-rose-600">Hoàn {formatVND(r.refundAmount)}</span>}
                  </div>
                </button>
              ))}
            </div>

            {/* Máy tính: bảng */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wide">
                  <tr>
                    <th className="py-3 px-4 whitespace-nowrap">Mã phiếu</th>
                    <th className="py-3 px-4">Khách hàng</th>
                    <th className="py-3 px-4 whitespace-nowrap">Loại</th>
                    <th className="py-3 px-4">Lý do</th>
                    <th className="py-3 px-4 whitespace-nowrap">SL</th>
                    <th className="py-3 px-4 whitespace-nowrap">Tiền hoàn / thu</th>
                    <th className="py-3 px-4 whitespace-nowrap">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {requests.map(r => (
                    <tr key={r.id} onClick={() => setDetailId(r.id)} className="hover:bg-[#FAF7EE]/60 cursor-pointer transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold whitespace-nowrap">{r.code}</div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">Đơn {r.orderCode} • {formatDateTime(r.createdAt)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{r.customerName || 'Khách lẻ'}</div>
                        {r.customerPhone && <div className="text-xs text-muted-foreground">{r.customerPhone}</div>}
                      </td>
                      <td className="py-3 px-4"><TypeBadge type={r.requestType} /></td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium">{REASONS[r.reasonCategory]}</div>
                        {r.reason && <div className="text-xs text-muted-foreground truncate" title={r.reason}>{r.reason}</div>}
                      </td>
                      <td className="py-3 px-4 font-bold">{r.totalQuantity}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {r.refundAmount > 0 && <div className="font-bold text-rose-600">−{formatVND(r.refundAmount)}</div>}
                        {r.extraCharge > 0 && <div className="font-bold text-emerald-600">+{formatVND(r.extraCharge)}</div>}
                        {r.refundAmount === 0 && r.extraCharge === 0 && <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {createCode !== null && (
        <CreateReturnDialog
          key={createCode}
          initialOrderCode={createCode}
          onClose={closeCreate}
          onCreated={id => {
            closeCreate();
            setDetailId(id);
          }}
        />
      )}

      <ReturnDetailDialog key={detailId ?? 'none'} id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

// ===================================================================================
// FORM TẠO PHIẾU
// ===================================================================================
interface LineState {
  quantity: number;
  condition: ItemCondition;
  exchangeProductId: string;
  /** Màu giao cho khách khi đổi (sản phẩm có phân loại) */
  exchangeVariantId?: string;
}

const allowedReasons = (type: ReturnType): ReasonCategory[] =>
  type === 'FAILED_DELIVERY' ? ['DELIVERY_FAILED', 'OTHER'] : ['DEFECTIVE', 'WRONG_ITEM', 'CHANGED_MIND', 'OTHER'];

function CreateReturnDialog({ initialOrderCode, onClose, onCreated }: {
  initialOrderCode: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [orderCode, setOrderCode] = useState(initialOrderCode);
  const [submittedCode, setSubmittedCode] = useState(initialOrderCode.trim());

  // Người dùng chưa chọn thì dùng giá trị mặc định suy ra từ đơn hàng
  const [typeChoice, setTypeChoice] = useState<ReturnType | null>(null);
  const [reasonChoice, setReasonChoice] = useState<ReasonCategory | null>(null);
  const [reason, setReason] = useState('');
  const [lineEdits, setLineEdits] = useState<Record<string, Partial<LineState>>>({});
  const [refundOverride, setRefundOverride] = useState<number | null>(null);
  const [extraOverride, setExtraOverride] = useState<number | null>(null);
  const [refundMethod, setRefundMethod] = useState('CASH');
  const [repairCost, setRepairCost] = useState(0);
  const [photos, setPhotos] = useState<File[]>([]);

  const { data: orderRes, isFetching: isLookingUp, error: lookupErr } = useQuery({
    queryKey: ['returnableOrder', submittedCode],
    queryFn: () => returnApi.getReturnableOrder(submittedCode),
    enabled: !!submittedCode,
    retry: false,
    staleTime: 0,
  });
  const order: ReturnableOrder | null = orderRes?.data ?? null;
  const lookupError = lookupErr ? errorMessage(lookupErr, 'Không tìm thấy đơn hàng.') : '';

  const orderIsDone = order ? order.orderStatus === 'COMPLETED' || order.orderStatus === 'RETURNED' : false;
  const requestType: ReturnType = typeChoice ?? (orderIsDone ? 'RETURN' : 'FAILED_DELIVERY');
  const reasonCategory: ReasonCategory =
    reasonChoice && allowedReasons(requestType).includes(reasonChoice)
      ? reasonChoice
      : requestType === 'FAILED_DELIVERY' ? 'DELIVERY_FAILED' : 'DEFECTIVE';

  const { data: productsRes } = useQuery({
    queryKey: ['squishyActiveProductsAll'],
    queryFn: () => productApi.getActive(),
    enabled: requestType === 'EXCHANGE',
  });
  const products = productsRes?.data ?? [];

  const lookup = (code: string) => {
    if (!code.trim()) return;
    // Tìm đơn khác thì bỏ hết lựa chọn cũ
    setTypeChoice(null);
    setReasonChoice(null);
    setLineEdits({});
    setRefundOverride(null);
    setExtraOverride(null);
    setSubmittedCode(code.trim());
  };

  const defaultExchangeVariant = (i: ReturnableOrder['items'][number], productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod || !hasVariants(prod)) return undefined;
    if (productId === i.productId && i.variantId) return i.variantId;
    return sellableVariants(prod).find(v => v.currentStock > 0)?.id;
  };

  const lineOf = (i: ReturnableOrder['items'][number]): LineState => {
    const edit = lineEdits[i.orderDetailId] ?? {};
    return {
      // Hoàn hàng giao thất bại thường là cả đơn; lý do "hàng lỗi" → mặc định hàng nhận về bị lỗi
      quantity: edit.quantity ?? (requestType === 'FAILED_DELIVERY' ? i.returnableQuantity : 0),
      condition: edit.condition ?? (reasonCategory === 'DEFECTIVE' ? 'DEFECTIVE' : 'GOOD'),
      exchangeProductId: edit.exchangeProductId ?? i.productId,
      exchangeVariantId: 'exchangeVariantId' in edit ? edit.exchangeVariantId : defaultExchangeVariant(i, edit.exchangeProductId ?? i.productId),
    };
  };

  const resetMoney = () => {
    setRefundOverride(null);
    setExtraOverride(null);
  };

  const changeType = (type: ReturnType) => {
    setTypeChoice(type);
    setLineEdits(prev => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, { ...v, condition: undefined }])));
    resetMoney();
  };

  const changeReason = (r: ReasonCategory) => {
    setReasonChoice(r);
    // Đổi lý do thì tình trạng hàng quay về mặc định theo lý do mới
    setLineEdits(prev => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, { ...v, condition: undefined }])));
  };

  const updateLine = (id: string, patch: Partial<LineState>) => {
    setLineEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    resetMoney();
  };

  const orderItems = order?.items ?? [];
  const lines: Record<string, LineState> = Object.fromEntries(orderItems.map(i => [i.orderDetailId, lineOf(i)]));
  const selected = orderItems.filter(i => lines[i.orderDetailId].quantity > 0);

  // Tính tiền giống backend để xem trước
  const returnedValue = selected.reduce((a, i) => a + lines[i.orderDetailId].quantity * i.unitPrice, 0);
  let autoRefund = 0;
  let autoExtra = 0;
  if (requestType === 'RETURN') autoRefund = returnedValue;
  else if (requestType === 'FAILED_DELIVERY') autoRefund = order?.paymentStatus === 'PAID' ? returnedValue : 0;
  else if (requestType === 'EXCHANGE') {
    const exchangeValue = selected.reduce((a, i) => {
      const l = lines[i.orderDetailId];
      const p = products.find(x => x.id === l.exchangeProductId);
      const price = l.exchangeProductId === i.productId || !p ? i.unitPrice : p.salePrice;
      return a + l.quantity * price;
    }, 0);
    const diff = exchangeValue - returnedValue;
    if (diff > 0) autoExtra = diff;
    else autoRefund = -diff;
  }

  const refund = refundOverride ?? autoRefund;
  const extra = extraOverride ?? autoExtra;

  const createMutation = useMutation({
    mutationFn: returnApi.create,
    onSuccess: async res => {
      const created = res.data;
      // Ảnh chứng từ: tải lên sau khi đã có mã phiếu
      let failed = 0;
      for (const file of photos) {
        try {
          await mediaApi.uploadImage(file, 'RETURN_REQUEST', created.id);
        } catch {
          failed++;
        }
      }
      if (failed > 0) toast.warning(`${failed} ảnh chưa tải lên được, bạn có thể thêm lại trong chi tiết phiếu.`);
      toast.success(`Đã tạo phiếu ${created.code}`);
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      onCreated(created.id);
    },
    onError: (err: any) => toast.error(errorMessage(err, 'Không tạo được phiếu đổi trả.')),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (selected.length === 0) {
      toast.error('Chọn ít nhất 1 sản phẩm và số lượng.');
      return;
    }
    createMutation.mutate({
      orderId: order.orderId,
      requestType,
      reasonCategory,
      reason: reason.trim() || undefined,
      refundAmount: refundOverride ?? undefined,
      refundMethod: refund > 0 ? refundMethod : undefined,
      extraCharge: extraOverride ?? (requestType === 'REPAIR' ? 0 : undefined),
      repairCost: requestType === 'REPAIR' ? repairCost : 0,
      items: selected.map(i => {
        const l = lines[i.orderDetailId];
        return {
          orderDetailId: i.orderDetailId,
          quantity: l.quantity,
          itemCondition: l.condition,
          exchangeProductId: requestType === 'EXCHANGE' ? l.exchangeProductId : undefined,
          exchangeVariantId: requestType === 'EXCHANGE' ? l.exchangeVariantId : undefined,
          exchangeQuantity: requestType === 'EXCHANGE' ? l.quantity : 0,
        };
      }),
    });
  };

  const maxFor = (i: ReturnableOrder['items'][number]) => (requestType === 'REPAIR' ? i.quantity : i.returnableQuantity);
  const moneyInput = 'h-10 rounded-xl text-right font-bold';

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-8">Tạo phiếu đổi trả / bảo hành</DialogTitle>
        </DialogHeader>

        {/* Bước 1: tìm đơn */}
        <form
          onSubmit={e => {
            e.preventDefault();
            lookup(orderCode);
          }}
          className="flex gap-2"
        >
          <Input
            autoFocus={!initialOrderCode}
            placeholder="Mã đơn, VD: HD-20261021-001"
            value={orderCode}
            onChange={e => setOrderCode(e.target.value.toUpperCase())}
            className="h-10 rounded-xl font-mono"
          />
          <Button type="submit" disabled={isLookingUp || !orderCode.trim()} className="h-10 rounded-xl shrink-0">
            <MagnifyingGlass className="w-4 h-4 mr-1" weight="bold" /> {isLookingUp ? 'Đang tìm...' : 'Tìm đơn'}
          </Button>
        </form>
        {lookupError && <p className="text-sm font-semibold text-red-600 -mt-2">{lookupError}</p>}

        {order && (
          <form onSubmit={submit} className="space-y-4">
            <div className="rounded-xl bg-muted/40 p-3 text-sm grid grid-cols-1 min-[460px]:grid-cols-2 gap-1.5">
              <div><span className="text-muted-foreground">Khách: </span><strong>{order.customerName || 'Khách lẻ'}</strong>{order.customerPhone && ` • ${order.customerPhone}`}</div>
              <div><span className="text-muted-foreground">Ngày mua: </span>{formatDateTime(order.createdAt)}</div>
              <div><span className="text-muted-foreground">Tổng đơn: </span><strong>{formatVND(order.totalAmount)}</strong></div>
              <div>
                <span className="text-muted-foreground">Trạng thái: </span>
                <strong>{order.orderStatus === 'COMPLETED' ? 'Hoàn tất' : order.orderStatus === 'RETURNED' ? 'Đã hoàn hàng' : order.orderStatus === 'CANCELLED' ? 'Đã hủy' : 'Chưa hoàn tất'}</strong>
                {order.paymentStatus === 'PAID' ? ' • Đã thanh toán' : ' • Chưa thanh toán'}
              </div>
            </div>

            {order.orderStatus === 'CANCELLED' ? (
              <p className="text-sm font-semibold text-red-600">Đơn đã bị hủy nên không thể đổi trả.</p>
            ) : (
              <>
                {/* Loại yêu cầu */}
                <div>
                  <span className="text-sm font-semibold block mb-1.5">Loại yêu cầu</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(TYPE_INFO) as ReturnType[]).map(t => {
                      const disabled = t !== 'FAILED_DELIVERY' && !orderIsDone;
                      return (
                        <button
                          key={t}
                          type="button"
                          disabled={disabled}
                          onClick={() => changeType(t)}
                          aria-pressed={requestType === t}
                          className={cn(
                            'text-left rounded-xl border-2 p-2.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed',
                            requestType === t ? 'border-slate-800 shadow-[2px_2px_0_#1e293b]' : 'border-slate-200 hover:border-slate-400'
                          )}
                          style={requestType === t ? { backgroundColor: TYPE_INFO[t].color } : undefined}
                        >
                          <span className="text-sm font-bold block">{TYPE_INFO[t].emoji} {TYPE_INFO[t].label}</span>
                          <span className="text-xs text-slate-600 leading-snug block mt-0.5">{TYPE_INFO[t].desc}</span>
                        </button>
                      );
                    })}
                  </div>
                  {!orderIsDone && (
                    <p className="text-xs text-amber-700 font-semibold mt-1.5">
                      Đơn chưa hoàn tất nên chỉ ghi nhận hoàn hàng do giao thất bại (đơn sẽ được hủy, kho chưa bị trừ nên không cộng lại).
                    </p>
                  )}
                </div>

                {/* Lý do */}
                <div>
                  <span className="text-sm font-semibold block mb-1.5">Lý do</span>
                  <div className="flex flex-wrap gap-1.5">
                    {allowedReasons(requestType).map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => changeReason(r)}
                          className={cn(
                            'px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all',
                            reasonCategory === r ? 'border-slate-800 bg-[#FEF08A]' : 'border-slate-200 bg-white hover:border-slate-400'
                          )}
                        >
                          {REASONS[r]}
                        </button>
                      ))}
                  </div>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Mô tả chi tiết: lỗi gì, khách phản ánh ra sao..."
                    className="mt-2 w-full px-3 py-2 rounded-xl border bg-background text-base sm:text-sm"
                  />
                </div>

                {/* Sản phẩm */}
                <div className="space-y-2">
                  <span className="text-sm font-semibold block">Sản phẩm {requestType === 'REPAIR' ? 'cần sửa' : 'khách trả'}</span>
                  {order.items.map(i => {
                    const l = lines[i.orderDetailId];
                    const max = maxFor(i);
                    return (
                      <div key={i.orderDetailId} className={cn('rounded-xl border p-2.5 space-y-2', l.quantity > 0 ? 'border-slate-800 bg-white' : 'border-slate-200 bg-slate-50/60')}>
                        <div className="flex items-center gap-2.5">
                          <ProductImage src={i.mainImageUrl} alt={i.productName} className="w-11 h-11 rounded-lg border shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold line-clamp-2 leading-snug">{i.productName}</div>
                            <div className="text-xs text-muted-foreground">
                              Đã mua {i.quantity} × {formatVND(i.unitPrice)}
                              {i.returnedQuantity > 0 && <span className="text-amber-700"> • đã đổi trả {i.returnedQuantity}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button type="button" aria-label="Giảm" disabled={l.quantity <= 0} onClick={() => updateLine(i.orderDetailId, { quantity: l.quantity - 1 })} className="w-8 h-8 rounded-lg border-1.5 border-slate-800 bg-white flex items-center justify-center disabled:opacity-30">
                              <Minus className="w-3.5 h-3.5" weight="bold" />
                            </button>
                            <span className="w-7 text-center font-black">{l.quantity}</span>
                            <button type="button" aria-label="Tăng" disabled={l.quantity >= max} onClick={() => updateLine(i.orderDetailId, { quantity: l.quantity + 1 })} className="w-8 h-8 rounded-lg border-1.5 border-slate-800 bg-[#FEF08A] flex items-center justify-center disabled:opacity-30">
                              <Plus className="w-3.5 h-3.5" weight="bold" />
                            </button>
                          </div>
                        </div>
                        {max === 0 && <p className="text-xs text-muted-foreground">Sản phẩm này đã đổi trả hết.</p>}

                        {l.quantity > 0 && requestType !== 'REPAIR' && (
                          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <span className="text-muted-foreground text-xs">
                              {l.condition === 'GOOD' ? 'Hàng còn tốt → nhập lại kho bán' : 'Hàng lỗi → không nhập lại kho'}
                            </span>
                            <ConditionToggle value={l.condition} onChange={c => updateLine(i.orderDetailId, { condition: c })} />
                          </div>
                        )}

                        {l.quantity > 0 && requestType === 'EXCHANGE' && (
                          <label className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-sm">
                            <span className="text-xs font-semibold text-muted-foreground shrink-0">Đổi sang:</span>
                            <select
                              value={l.exchangeProductId}
                              onChange={e => {
                                const productId = e.target.value;
                                updateLine(i.orderDetailId, { exchangeProductId: productId, exchangeVariantId: defaultExchangeVariant(i, productId) });
                              }}
                              className="sm:flex-1 min-w-0 h-9 text-base sm:text-sm"
                            >
                              <option value={i.productId}>Cùng mẫu: {products.find(p => p.id === i.productId)?.name ?? i.productName}</option>
                              {products.filter(p => p.id !== i.productId).map(p => (
                                <option key={p.id} value={p.id} disabled={sellableStock(p) < l.quantity}>
                                  {p.name} – {formatVND(p.salePrice)} (còn {sellableStock(p)})
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        {l.quantity > 0 && requestType === 'EXCHANGE' && (() => {
                          const ex = products.find(p => p.id === l.exchangeProductId);
                          if (!ex || !hasVariants(ex)) return null;
                          return (
                            <div className="space-y-1">
                              <span className="text-xs font-semibold text-muted-foreground">Màu giao cho khách:</span>
                              <VariantPicker
                                size="sm"
                                showStock
                                variants={sellableVariants(ex)}
                                value={l.exchangeVariantId}
                                onChange={id => updateLine(i.orderDetailId, { exchangeVariantId: id })}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>

                {/* Tiền */}
                {selected.length > 0 && (
                  <div className="rounded-xl border-2 border-dashed border-slate-300 p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {requestType !== 'REPAIR' && (
                      <label className="block">
                        <span className="text-sm font-semibold block mb-1">Hoàn tiền cho khách</span>
                        <Input type="number" inputMode="numeric" min={0} value={refund} onChange={e => setRefundOverride(Math.max(0, Number(e.target.value) || 0))} className={moneyInput} />
                      </label>
                    )}
                    {refund > 0 && requestType !== 'REPAIR' && (
                      <label className="block">
                        <span className="text-sm font-semibold block mb-1">Hình thức hoàn</span>
                        <select value={refundMethod} onChange={e => setRefundMethod(e.target.value)} className="w-full h-10 text-base sm:text-sm">
                          <option value="CASH">Tiền mặt</option>
                          <option value="BANK_TRANSFER">Chuyển khoản</option>
                        </select>
                      </label>
                    )}
                    {(requestType === 'EXCHANGE' || requestType === 'REPAIR') && (
                      <label className="block">
                        <span className="text-sm font-semibold block mb-1">{requestType === 'REPAIR' ? 'Phí sửa thu của khách' : 'Khách trả thêm (chênh lệch)'}</span>
                        <Input type="number" inputMode="numeric" min={0} value={extra} onChange={e => setExtraOverride(Math.max(0, Number(e.target.value) || 0))} className={moneyInput} />
                      </label>
                    )}
                    {requestType === 'REPAIR' && (
                      <label className="block">
                        <span className="text-sm font-semibold block mb-1">Chi phí sửa (shop chịu)</span>
                        <Input type="number" inputMode="numeric" min={0} value={repairCost} onChange={e => setRepairCost(Math.max(0, Number(e.target.value) || 0))} className={moneyInput} />
                      </label>
                    )}
                    <p className="sm:col-span-2 text-xs text-muted-foreground">
                      Số tiền được tính sẵn, bạn có thể sửa. Kho và tiền chỉ được ghi nhận khi phiếu được bấm <strong>Hoàn tất</strong>.
                    </p>
                  </div>
                )}

                {/* Ảnh chứng từ */}
                <div>
                  <span className="text-sm font-semibold block mb-1.5">Ảnh tình trạng hàng (tùy chọn)</span>
                  <div className="flex flex-wrap gap-2">
                    {photos.map((f, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                        <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                        <button type="button" aria-label="Bỏ ảnh" onClick={() => setPhotos(p => p.filter((_, i) => i !== idx))} className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full p-0.5">
                          <XCircle className="w-3.5 h-3.5" weight="bold" />
                        </button>
                      </div>
                    ))}
                    <PhotoPicker onFiles={files => setPhotos(p => [...p, ...files])} />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={onClose} className="h-10 rounded-xl">Hủy</Button>
                  <Button type="submit" disabled={createMutation.isPending || selected.length === 0} className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white">
                    {createMutation.isPending ? 'Đang tạo...' : 'Tạo phiếu'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ===================================================================================
// CHI TIẾT & XỬ LÝ PHIẾU
// ===================================================================================
function nextActions(r: ReturnRequest): { status: ReturnStatus; label: string; tone: 'primary' | 'neutral' | 'danger' }[] {
  const isRepair = r.requestType === 'REPAIR';
  switch (r.status) {
    case 'PENDING':
      return isRepair
        ? [{ status: 'REPAIRING', label: 'Nhận sửa', tone: 'primary' }, { status: 'REJECTED', label: 'Từ chối bảo hành', tone: 'danger' }]
        : [{ status: 'COMPLETED', label: 'Hoàn tất', tone: 'primary' }, { status: 'PROCESSING', label: 'Đang xử lý', tone: 'neutral' }, { status: 'REJECTED', label: 'Từ chối', tone: 'danger' }];
    case 'PROCESSING':
      return isRepair
        ? [{ status: 'REPAIRING', label: 'Bắt đầu sửa', tone: 'primary' }, { status: 'REJECTED', label: 'Từ chối', tone: 'danger' }]
        : [{ status: 'COMPLETED', label: 'Hoàn tất', tone: 'primary' }, { status: 'REJECTED', label: 'Từ chối', tone: 'danger' }];
    case 'REPAIRING':
      return [{ status: 'REPAIRED', label: 'Đã sửa xong', tone: 'primary' }, { status: 'REJECTED', label: 'Không sửa được', tone: 'danger' }];
    case 'REPAIRED':
      return [{ status: 'COMPLETED', label: 'Đã trả hàng cho khách', tone: 'primary' }];
    default:
      return [];
  }
}

function completionSummary(r: ReturnRequest, conditions: Record<string, ItemCondition>): string {
  if (r.requestType === 'REPAIR') {
    return `Xác nhận đã trả sản phẩm đã sửa cho khách.${r.extraCharge > 0 ? ` Thu phí sửa ${formatVND(r.extraCharge)}.` : ''} Kho không thay đổi.`;
  }
  const good = r.items.filter(i => (conditions[i.id] ?? i.itemCondition) === 'GOOD').reduce((a, i) => a + i.quantity, 0);
  const bad = r.items.filter(i => (conditions[i.id] ?? i.itemCondition) === 'DEFECTIVE').reduce((a, i) => a + i.quantity, 0);
  const parts = [];
  if (r.requestType === 'FAILED_DELIVERY') parts.push('Nếu đơn chưa hoàn tất, đơn sẽ bị hủy và kho không thay đổi.');
  if (good > 0) parts.push(`Nhập lại kho ${good} sản phẩm còn tốt.`);
  if (bad > 0) parts.push(`Ghi nhận ${bad} sản phẩm lỗi (không nhập lại kho).`);
  if (r.requestType === 'EXCHANGE') parts.push(`Xuất kho ${r.items.reduce((a, i) => a + i.exchangeQuantity, 0)} sản phẩm đổi cho khách.`);
  if (r.refundAmount > 0) parts.push(`Hoàn cho khách ${formatVND(r.refundAmount)}.`);
  if (r.extraCharge > 0) parts.push(`Thu thêm của khách ${formatVND(r.extraCharge)}.`);
  return parts.join(' ') + ' Thao tác này không thể hoàn tác.';
}

function ReturnDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [conditions, setConditions] = useState<Record<string, ItemCondition>>({});
  const [note, setNote] = useState('');
  const [refund, setRefund] = useState<number | null>(null);
  const [extra, setExtra] = useState<number | null>(null);
  const [repairCost, setRepairCost] = useState<number | null>(null);
  const [pendingStatus, setPendingStatus] = useState<ReturnStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['returnDetail', id],
    queryFn: () => returnApi.getById(id!),
    enabled: !!id,
  });
  const r = data?.data;

  const isFinal = r ? r.status === 'COMPLETED' || r.status === 'REJECTED' : true;

  const updateMutation = useMutation({
    mutationFn: (input: UpdateReturnStatusInput) => returnApi.updateStatus(id!, input),
    onSuccess: res => {
      toast.success(`Phiếu ${res.data.code}: ${STATUS_INFO[res.data.status].label}`);
      setPendingStatus(null);
      setConditions({});
      setRefund(null);
      setExtra(null);
      setRepairCost(null);
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['returnDetail', id] });
      if (res.data.status === 'COMPLETED') {
        ['ordersList', 'squishyProductsPaged', 'squishyActiveProducts', 'squishyActiveProductsAll', 'stockTransactions', 'reportSummary', 'reportChart']
          .forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
      }
    },
    onError: (err: any) => {
      setPendingStatus(null);
      toast.error(errorMessage(err, 'Không cập nhật được phiếu.'));
    },
  });

  const submitStatus = (status: ReturnStatus) => {
    if (!r) return;
    updateMutation.mutate({
      status,
      resolutionNote: note.trim() || undefined,
      refundAmount: refund ?? undefined,
      extraCharge: extra ?? undefined,
      repairCost: repairCost ?? undefined,
      items: Object.keys(conditions).length ? Object.entries(conditions).map(([itemId, c]) => ({ id: itemId, itemCondition: c })) : undefined,
    });
  };

  const uploadPhotos = async (files: File[]) => {
    if (!r || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const f of files) await mediaApi.uploadImage(f, 'RETURN_REQUEST', r.id);
      toast.success('Đã thêm ảnh vào phiếu');
      queryClient.invalidateQueries({ queryKey: ['returnDetail', id] });
    } catch {
      toast.error('Lỗi khi tải ảnh lên.');
    } finally {
      setIsUploading(false);
    }
  };

  // Hiển thị số tiền đang sửa (nếu có) để hộp xác nhận nói đúng con số
  const preview = r ? { ...r, refundAmount: refund ?? r.refundAmount, extraCharge: extra ?? r.extraCharge } : null;
  const moneyInput = 'h-9 rounded-lg text-right font-bold';

  return (
    <>
      <Dialog open={!!id} onOpenChange={o => !o && onClose()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 pr-8">
              Phiếu {r?.code}
              {r && <TypeBadge type={r.requestType} />}
              {r && <StatusBadge status={r.status} />}
            </DialogTitle>
          </DialogHeader>

          {isLoading || !r ? (
            <LoadingState text="Đang tải phiếu..." />
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/40 p-3 text-sm grid grid-cols-1 min-[460px]:grid-cols-2 gap-1.5">
                <div><span className="text-muted-foreground">Đơn hàng: </span><strong className="font-mono">{r.orderCode}</strong></div>
                <div><span className="text-muted-foreground">Ngày tạo: </span>{formatDateTime(r.createdAt)}</div>
                <div>
                  <span className="text-muted-foreground">Khách: </span><strong>{r.customerName || 'Khách lẻ'}</strong>
                  {r.customerPhone && <a href={`tel:${r.customerPhone}`} className="text-blue-600"> • {r.customerPhone}</a>}
                </div>
                {r.completedAt && <div><span className="text-muted-foreground">Hoàn tất: </span>{formatDateTime(r.completedAt)}</div>}
                <div className="min-[460px]:col-span-2">
                  <span className="text-muted-foreground">Lý do: </span><strong>{REASONS[r.reasonCategory]}</strong>
                  {r.reason && <span className="block text-slate-700 mt-0.5">{r.reason}</span>}
                </div>
              </div>

              {/* Tiến trình */}
              <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold print-hidden">
                {(r.requestType === 'REPAIR'
                  ? (['PENDING', 'REPAIRING', 'REPAIRED', 'COMPLETED'] as ReturnStatus[])
                  : (['PENDING', 'PROCESSING', 'COMPLETED'] as ReturnStatus[])
                ).map((s, idx, arr) => {
                  const order = arr.indexOf(r.status);
                  const done = r.status !== 'REJECTED' && order >= idx;
                  return (
                    <li key={s} className="flex items-center gap-1.5">
                      <span className={cn('px-2 py-0.5 rounded-full border', done ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : 'bg-white border-slate-200 text-slate-400')}>
                        {STATUS_INFO[s].label}
                      </span>
                      {idx < arr.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300" />}
                    </li>
                  );
                })}
                {r.status === 'REJECTED' && <li className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">Đã từ chối</li>}
              </ol>

              {/* Sản phẩm */}
              <div className="border rounded-xl divide-y">
                {r.items.map(i => {
                  const cond = conditions[i.id] ?? i.itemCondition;
                  return (
                    <div key={i.id} className="p-2.5 space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <ProductImage src={i.mainImageUrl} alt={i.productName} className="w-10 h-10 rounded-lg border shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold leading-snug">{i.productName}</div>
                          <div className="text-xs text-muted-foreground">{i.quantity} × {formatVND(i.unitPrice)}</div>
                        </div>
                        {r.requestType !== 'REPAIR' && (
                          isFinal ? (
                            <span className={cn('text-xs font-bold px-2 py-0.5 rounded-md', cond === 'GOOD' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}>
                              {cond === 'GOOD' ? 'Còn tốt' : 'Bị lỗi'}
                            </span>
                          ) : (
                            <ConditionToggle value={cond} onChange={c => setConditions(prev => ({ ...prev, [i.id]: c }))} />
                          )
                        )}
                      </div>
                      {r.requestType === 'EXCHANGE' && i.exchangeProductName && (
                        <div className="text-xs bg-sky-50 border border-sky-200 rounded-lg px-2 py-1">
                          🔁 Đổi sang: <strong>{i.exchangeProductName}</strong> × {i.exchangeQuantity} ({formatVND(i.exchangeUnitPrice)})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Tiền */}
              <div className="grid grid-cols-1 min-[460px]:grid-cols-2 gap-3 text-sm">
                {r.requestType !== 'REPAIR' && (
                  <label className="block">
                    <span className="text-muted-foreground block mb-1">Hoàn cho khách{r.refundMethod ? ` (${r.refundMethod === 'CASH' ? 'tiền mặt' : 'chuyển khoản'})` : ''}</span>
                    {isFinal ? <strong className="text-rose-600 text-base">{formatVND(r.refundAmount)}</strong> : (
                      <Input type="number" inputMode="numeric" min={0} value={refund ?? r.refundAmount} onChange={e => setRefund(Math.max(0, Number(e.target.value) || 0))} className={moneyInput} />
                    )}
                  </label>
                )}
                {(r.requestType === 'EXCHANGE' || r.requestType === 'REPAIR') && (
                  <label className="block">
                    <span className="text-muted-foreground block mb-1">{r.requestType === 'REPAIR' ? 'Phí sửa thu của khách' : 'Khách trả thêm'}</span>
                    {isFinal ? <strong className="text-emerald-600 text-base">{formatVND(r.extraCharge)}</strong> : (
                      <Input type="number" inputMode="numeric" min={0} value={extra ?? r.extraCharge} onChange={e => setExtra(Math.max(0, Number(e.target.value) || 0))} className={moneyInput} />
                    )}
                  </label>
                )}
                {r.requestType === 'REPAIR' && (
                  <label className="block">
                    <span className="text-muted-foreground block mb-1">Chi phí sửa (shop chịu)</span>
                    {isFinal ? <strong className="text-base">{formatVND(r.repairCost)}</strong> : (
                      <Input type="number" inputMode="numeric" min={0} value={repairCost ?? r.repairCost} onChange={e => setRepairCost(Math.max(0, Number(e.target.value) || 0))} className={moneyInput} />
                    )}
                  </label>
                )}
              </div>
              {r.status === 'COMPLETED' && r.requestType !== 'REPAIR' && (
                <p className="text-xs text-muted-foreground">
                  {r.stockRestored ? '✅ Hàng còn tốt đã được nhập lại kho.' : 'Không có hàng nào được nhập lại kho.'}
                </p>
              )}

              {/* Ảnh */}
              <div className="print-hidden">
                <span className="text-sm font-semibold flex items-center gap-1.5 mb-1.5"><ImageIcon className="w-4 h-4" /> Ảnh tình trạng hàng ({r.images.length})</span>
                <div className="flex flex-wrap gap-2">
                  {r.images.map(img => (
                    <button key={img.id} type="button" onClick={() => setPreviewUrl(getFileUrl(img.url))}>
                      <img src={getFileUrl(img.url)} alt="" className="w-16 h-16 rounded-lg object-cover border hover:opacity-90" />
                    </button>
                  ))}
                  <PhotoPicker disabled={isUploading} busyText="Đang tải" onFiles={uploadPhotos} />
                </div>
              </div>

              {/* Ghi chú xử lý */}
              {r.resolutionNote && (
                <div className="text-sm">
                  <span className="text-muted-foreground block">Ghi chú xử lý</span>
                  <p className="whitespace-pre-line">{r.resolutionNote}</p>
                </div>
              )}
              {!isFinal && (
                <textarea
                  rows={2}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder={r.requestType === 'REPAIR' ? 'Ghi chú sửa chữa: đã thay gì, hẹn ngày trả...' : 'Ghi chú xử lý (tùy chọn)...'}
                  className="w-full px-3 py-2 rounded-xl border bg-background text-base sm:text-sm print-hidden"
                />
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap sm:justify-end gap-2 pt-1 print-hidden">
                <Button variant="outline" onClick={() => window.print()} className="h-10 rounded-xl">
                  <Printer className="w-4 h-4 mr-1" /> In phiếu
                </Button>
                {nextActions(r).map(a => (
                  <Button
                    key={a.status}
                    variant={a.tone === 'primary' ? 'default' : 'outline'}
                    disabled={updateMutation.isPending}
                    onClick={() => (a.status === 'COMPLETED' || a.status === 'REJECTED' ? setPendingStatus(a.status) : submitStatus(a.status))}
                    className={cn(
                      'h-10 rounded-xl',
                      a.tone === 'primary' && 'bg-emerald-600 hover:bg-emerald-700 text-white',
                      a.tone === 'danger' && 'text-rose-600 hover:bg-rose-50'
                    )}
                  >
                    {a.status === 'COMPLETED' && <CheckCircle className="w-4 h-4 mr-1" weight="bold" />}
                    {a.status === 'REJECTED' && <XCircle className="w-4 h-4 mr-1" weight="bold" />}
                    {(a.status === 'REPAIRING' || a.status === 'REPAIRED') && <Wrench className="w-4 h-4 mr-1" weight="bold" />}
                    {a.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingStatus !== null}
        onOpenChange={o => !o && setPendingStatus(null)}
        title={pendingStatus === 'REJECTED' ? 'Từ chối phiếu' : 'Hoàn tất phiếu đổi trả'}
        description={
          pendingStatus === 'REJECTED'
            ? 'Phiếu sẽ bị từ chối, kho và tiền không thay đổi. Nên ghi chú lý do từ chối trước khi xác nhận.'
            : preview ? completionSummary(preview, conditions) : ''
        }
        isLoading={updateMutation.isPending}
        onConfirm={() => pendingStatus && submitStatus(pendingStatus)}
      />

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="sm:max-w-lg p-2">
          <DialogHeader className="sr-only"><DialogTitle>Ảnh tình trạng hàng</DialogTitle></DialogHeader>
          {previewUrl && <img src={previewUrl} alt="" className="w-full h-auto max-h-[80dvh] object-contain rounded-xl" />}
        </DialogContent>
      </Dialog>
    </>
  );
}

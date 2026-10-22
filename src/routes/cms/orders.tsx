import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MagnifyingGlass,
  Eye,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  Image as ImageIcon,
  Truck,
  Storefront,
  MapPin,
  ArrowUUpLeft,
  ShoppingCart
} from '@phosphor-icons/react';

import { orderApi, type Order } from '@/lib/api/squishy/orderApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader, EmptyState, LoadingState } from '@/components/shop/page-header';
import { EntityPhotos } from '@/components/shop/entity-photos';
import { cn, formatDateTime, formatVND, getFileUrl } from '@/lib/utils';

export const Route = createFileRoute('/cms/orders')({
  component: OrdersScreen,
});

const STATUS_TABS = [
  { id: '', label: 'Tất cả' },
  { id: 'PENDING', label: 'Chờ TT' },
  { id: 'PAID', label: 'Đã thanh toán' },
  { id: 'COMPLETED', label: 'Hoàn thành' },
  { id: 'RETURNED', label: 'Đã hoàn hàng' },
  { id: 'CANCELLED', label: 'Đã hủy' },
];

const PREP_LABELS: Record<string, { label: string; className: string }> = {
  SHIPPED: { label: 'Đã giao Shipper', className: 'bg-emerald-50 text-emerald-700' },
  PACKED: { label: 'Đã đóng hộp', className: 'bg-purple-50 text-purple-700' },
  PREPARING: { label: 'Đang chuẩn bị', className: 'bg-blue-50 text-blue-700' },
};

function paymentMethodLabel(method: string) {
  if (method === 'BANK_TRANSFER_QR') return 'Chuyển khoản QR';
  if (method === 'COD') return 'Thanh toán khi nhận (COD)';
  return 'Tiền mặt';
}

function PaymentBadge({ order }: { order: Order }) {
  const isPaid = order.paymentStatus === 'PAID';
  const isCancelled = order.orderStatus === 'CANCELLED';
  if (order.orderStatus === 'RETURNED') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md whitespace-nowrap bg-violet-100 text-violet-700">
        <ArrowUUpLeft className="w-3.5 h-3.5" weight="bold" /> Đã hoàn hàng
      </span>
    );
  }
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md whitespace-nowrap',
      isCancelled ? 'bg-slate-100 text-slate-700' : isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
    )}>
      {isCancelled ? <XCircle className="w-3.5 h-3.5" /> : isPaid ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
      {isCancelled ? 'Đã hủy' : isPaid ? 'Đã thanh toán' : 'Chờ thanh toán'}
    </span>
  );
}

function PrepBadge({ status }: { status?: string }) {
  const info = PREP_LABELS[status || ''] || { label: 'Chưa soạn', className: 'bg-muted text-muted-foreground' };
  return (
    <span className={cn('inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap', info.className)}>
      {info.label}
    </span>
  );
}

function TypeBadge({ order }: { order: Order }) {
  const isDelivery = order.orderType === 'DELIVERY' || order.orderType === 'ONLINE';
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md whitespace-nowrap',
      isDelivery ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-muted/60 text-foreground'
    )}>
      {isDelivery ? <Truck className="w-3.5 h-3.5 text-blue-500" /> : <Storefront className="w-3.5 h-3.5 text-rose-500" />}
      {isDelivery ? 'Giao tận nơi' : 'Tại quầy'}
    </span>
  );
}

function OrdersScreen() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  const { data: ordersRes, isLoading } = useQuery({
    queryKey: ['ordersList', statusFilter, debouncedKeyword, orderTypeFilter],
    queryFn: () => orderApi.getAll(
      statusFilter || undefined,
      debouncedKeyword || undefined,
      orderTypeFilter || undefined
    ),
    placeholderData: keepPreviousData,
  });
  const orders = ordersRes?.data || [];

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, paymentStatus }: { id: string; status: string; paymentStatus?: string }) =>
      orderApi.updateStatus(id, status, paymentStatus),
    onSuccess: (res) => {
      if (res.isSuccess) {
        toast.success('Cập nhật trạng thái đơn hàng thành công!');
        setIsDetailOpen(false);
        setIsCancelConfirmOpen(false);
        queryClient.invalidateQueries({ queryKey: ['ordersList'] });
        queryClient.invalidateQueries({ queryKey: ['fulfillmentOrders'] });
        queryClient.invalidateQueries({ queryKey: ['squishyProductsPaged'] });
        queryClient.invalidateQueries({ queryKey: ['squishyActiveProducts'] });
      } else {
        toast.error(res.message || 'Không cập nhật được đơn hàng.');
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Không cập nhật được đơn hàng.');
    }
  });

  const openOrderDetail = async (order: Order) => {
    setLoadingOrderId(order.id);
    try {
      const res = await orderApi.getById(order.id);
      if (res.isSuccess && res.data) {
        setSelectedOrder(res.data);
        setIsDetailOpen(true);
      }
    } catch {
      toast.error('Không tải được chi tiết đơn hàng.');
    } finally {
      setLoadingOrderId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-[1650px] mx-auto font-sans">
      <PageHeader
        emoji="🛍️"
        title="Đơn hàng & Giao hàng"
        description="Theo dõi đơn bán tại quầy POS và đơn giao hàng tận nơi."
      />

      {/* Bộ lọc */}
      <div className="doodle-card p-3 sm:p-4 space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black" weight="bold" />
            <Input
              type="search"
              placeholder="Mã đơn, tên khách, SĐT, mã vận đơn..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className="doodle-input pl-9 h-10 text-base sm:text-sm font-medium"
            />
          </div>
          <select
            value={orderTypeFilter}
            onChange={e => setOrderTypeFilter(e.target.value)}
            aria-label="Lọc hình thức"
            className="h-10 text-base sm:text-sm w-full sm:w-56"
          >
            <option value="">-- Tất cả hình thức --</option>
            <option value="POS">Mua tại quầy (POS)</option>
            <option value="DELIVERY">Giao hàng tận nơi</option>
            <option value="ONLINE">Đặt qua Website</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-sm font-bold transition-all shrink-0 cursor-pointer border-2 border-black',
                statusFilter === tab.id ? 'bg-[#FEF08A] text-black shadow-[2px_2px_0px_#000]' : 'bg-white hover:bg-slate-100 text-slate-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="doodle-card overflow-hidden">
        {isLoading ? (
          <LoadingState text="Đang tải danh sách đơn hàng..." />
        ) : orders.length === 0 ? (
          <EmptyState icon={<ShoppingCart className="w-10 h-10 text-slate-400" weight="bold" />} title="Không tìm thấy đơn hàng nào." />
        ) : (
          <>
            {/* Điện thoại: thẻ đơn hàng */}
            <div className="lg:hidden divide-y divide-slate-200">
              {orders.map(order => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => openOrderDetail(order)}
                  className="w-full text-left p-3 space-y-2 hover:bg-[#FAF7EE]/60 active:bg-[#FAF7EE]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono font-black text-sm text-foreground">{order.orderCode}</div>
                      <div className="text-[11px] text-muted-foreground">{formatDateTime(order.createdAt)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-rose-600">{formatVND(order.totalAmount)}</div>
                      {loadingOrderId === order.id && <span className="text-[10px] text-muted-foreground">Đang mở...</span>}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-foreground">
                    {order.customerName || 'Khách lẻ'}
                    {order.customerPhone && <span className="text-muted-foreground font-normal"> • {order.customerPhone}</span>}
                  </div>
                  {order.shippingAddress && (
                    <div className="text-[11px] text-rose-500 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-px" /> <span className="line-clamp-1">{order.shippingAddress}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <TypeBadge order={order} />
                    <PaymentBadge order={order} />
                    <PrepBadge status={order.preparationStatus} />
                    {order.paymentProofImageUrl && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600">
                        <ImageIcon className="w-3.5 h-3.5" /> Có ảnh bill
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Máy tính: bảng */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="table-sticky-last w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wide">
                  <tr>
                    <th className="py-3 px-3 xl:px-4 whitespace-nowrap">Mã đơn & Thời gian</th>
                    <th className="py-3 px-3 xl:px-4">Khách hàng & Nơi nhận</th>
                    <th className="py-3 px-3 xl:px-4 whitespace-nowrap">Hình thức</th>
                    <th className="py-3 px-3 xl:px-4 whitespace-nowrap">Tổng tiền</th>
                    <th className="py-3 px-3 xl:px-4 whitespace-nowrap">Thanh toán</th>
                    <th className="py-3 px-3 xl:px-4 whitespace-nowrap">Đóng gói</th>
                    <th className="py-3 px-3 xl:px-4 whitespace-nowrap hidden xl:table-cell">Ảnh bill</th>
                    <th className="py-3 px-3 xl:px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-[#FAF7EE]/60 transition-colors">
                      <td className="py-3 px-3 xl:px-4">
                        <div className="font-mono font-bold text-foreground whitespace-nowrap">{order.orderCode}</div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(order.createdAt)}</div>
                      </td>
                      <td className="py-3 px-3 xl:px-4 font-medium text-foreground">
                        <div>{order.customerName || 'Khách lẻ'}</div>
                        {order.customerPhone && <div className="text-xs text-muted-foreground">{order.customerPhone}</div>}
                        {order.shippingAddress && (
                          <div className="text-xs text-rose-500 font-normal truncate max-w-xs flex items-center gap-1 mt-0.5" title={order.shippingAddress}>
                            <MapPin className="w-3.5 h-3.5 shrink-0" /> {order.shippingAddress}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 xl:px-4"><TypeBadge order={order} /></td>
                      <td className="py-3 px-3 xl:px-4 font-bold text-rose-600 whitespace-nowrap">{formatVND(order.totalAmount)}</td>
                      <td className="py-3 px-3 xl:px-4"><PaymentBadge order={order} /></td>
                      <td className="py-3 px-3 xl:px-4"><PrepBadge status={order.preparationStatus} /></td>
                      <td className="py-3 px-3 xl:px-4 hidden xl:table-cell">
                        {order.paymentProofImageUrl ? (
                          <button
                            onClick={() => setPreviewProofUrl(getFileUrl(order.paymentProofImageUrl))}
                            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap"
                          >
                            <ImageIcon className="w-3.5 h-3.5" /> Xem ảnh
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 xl:px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openOrderDetail(order)}
                          disabled={loadingOrderId === order.id}
                          className="rounded-lg text-xs whitespace-nowrap"
                        >
                          <Eye className="w-4 h-4 mr-1" /> Chi tiết
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

      {/* CHI TIẾT ĐƠN */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center justify-between gap-2 pr-8">
              <span>Đơn hàng: {selectedOrder?.orderCode}</span>
              <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-lg text-xs print-hidden">
                <Printer className="w-4 h-4 mr-1" /> In hóa đơn
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/20 rounded-xl text-xs">
                <div>
                  <span className="text-muted-foreground block">Khách hàng</span>
                  <strong className="text-foreground">{selectedOrder.customerName || 'Khách lẻ'}</strong>
                  {selectedOrder.customerPhone && (
                    <a href={`tel:${selectedOrder.customerPhone}`} className="block text-blue-600 underline-offset-2 hover:underline">{selectedOrder.customerPhone}</a>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground block">Thời gian • Phương thức</span>
                  <strong className="text-foreground">{formatDateTime(selectedOrder.createdAt)}</strong>
                  <span className="block">{paymentMethodLabel(selectedOrder.paymentMethod)}</span>
                </div>

                {selectedOrder.shippingAddress && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block">Địa chỉ nhận hàng</span>
                    <strong className="text-rose-600">{selectedOrder.shippingAddress}</strong>
                  </div>
                )}

                {selectedOrder.trackingCode && (
                  <div>
                    <span className="text-muted-foreground block">Mã vận đơn ({selectedOrder.shippingProvider || 'ĐVVC'})</span>
                    <strong className="text-foreground font-mono">{selectedOrder.trackingCode}</strong>
                  </div>
                )}

                {selectedOrder.transferContent && (
                  <div>
                    <span className="text-muted-foreground block">Nội dung đối soát</span>
                    <strong className="text-rose-600 font-mono">{selectedOrder.transferContent}</strong>
                  </div>
                )}

                <div className="sm:col-span-2 flex flex-wrap gap-1.5">
                  <TypeBadge order={selectedOrder} />
                  <PaymentBadge order={selectedOrder} />
                  <PrepBadge status={selectedOrder.preparationStatus} />
                </div>

                {selectedOrder.note && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block">Ghi chú</span>
                    <span className="text-foreground">{selectedOrder.note}</span>
                  </div>
                )}
              </div>

              <div className="border rounded-xl divide-y overflow-hidden text-xs">
                <div className="p-2.5 bg-muted/60 font-bold text-muted-foreground flex justify-between">
                  <span>Sản phẩm</span>
                  <span>Thành tiền</span>
                </div>
                {selectedOrder.details?.map(d => (
                  <div key={d.id} className="p-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="text-foreground block">{d.productName}</strong>
                      <span className="text-muted-foreground">{d.quantity} x {formatVND(d.unitPrice)}</span>
                    </div>
                    <strong className="text-foreground shrink-0">{formatVND(d.totalPrice)}</strong>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-xs border-t pt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span>{formatVND(selectedOrder.subTotal)}</span>
                </div>
                {selectedOrder.shippingFee > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Phí vận chuyển</span>
                    <span>+{formatVND(selectedOrder.shippingFee)}</span>
                  </div>
                )}
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>Giảm giá</span>
                    <span>-{formatVND(selectedOrder.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t">
                  <span>Tổng thanh toán</span>
                  <span className="text-rose-600">{formatVND(selectedOrder.totalAmount)}</span>
                </div>
              </div>

              <div className="pt-3 border-t space-y-3 print-hidden">
                <EntityPhotos
                  key={`pay-${selectedOrder.id}`}
                  entityId={selectedOrder.id}
                  type="ORDER_PAYMENT"
                  title="Ảnh xác nhận thanh toán"
                  hint="Chụp bill chuyển khoản hoặc màn hình báo tiền về trước khi bấm xác nhận."
                  readOnly={selectedOrder.orderStatus === 'CANCELLED'}
                />
                {selectedOrder.orderType !== 'POS' && (
                  <EntityPhotos
                    key={`ship-${selectedOrder.id}`}
                    entityId={selectedOrder.id}
                    type="ORDER_SHIPPING"
                    title="Ảnh bàn giao shipper"
                    readOnly
                  />
                )}
              </div>

              {selectedOrder.orderStatus !== 'CANCELLED' && (
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-3 border-t print-hidden">
                  {selectedOrder.paymentStatus !== 'PAID' && selectedOrder.orderStatus !== 'RETURNED' && (
                    <Button
                      onClick={() => updateStatusMutation.mutate({ id: selectedOrder.id, status: 'COMPLETED', paymentStatus: 'PAID' })}
                      disabled={updateStatusMutation.isPending}
                      className="sm:flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Xác nhận đã nhận tiền
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => navigate({ to: '/cms/returns', search: { order: selectedOrder.orderCode } })}
                    className="h-10 rounded-xl"
                  >
                    <ArrowUUpLeft className="w-4 h-4 mr-1" weight="bold" />
                    {selectedOrder.orderStatus === 'COMPLETED' || selectedOrder.orderStatus === 'RETURNED' ? 'Đổi trả / Bảo hành' : 'Hoàn hàng (giao thất bại)'}
                  </Button>
                  {selectedOrder.orderStatus !== 'RETURNED' && (
                    <Button
                      variant="outline"
                      onClick={() => setIsCancelConfirmOpen(true)}
                      disabled={updateStatusMutation.isPending}
                      className="h-10 rounded-xl text-rose-600 hover:bg-rose-50"
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Hủy đơn & hoàn kho
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isCancelConfirmOpen}
        onOpenChange={setIsCancelConfirmOpen}
        title="Hủy đơn hàng"
        description={`Hủy đơn ${selectedOrder?.orderCode} và hoàn lại số lượng tồn kho? Hành động này không thể hoàn tác.`}
        isLoading={updateStatusMutation.isPending}
        onConfirm={() => selectedOrder && updateStatusMutation.mutate({ id: selectedOrder.id, status: 'CANCELLED' })}
      />

      {/* XEM ẢNH BILL */}
      <Dialog open={!!previewProofUrl} onOpenChange={() => setPreviewProofUrl(null)}>
        <DialogContent className="sm:max-w-md p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Ảnh xác nhận thanh toán</DialogTitle>
          </DialogHeader>
          {previewProofUrl && (
            <img src={previewProofUrl} alt="Ảnh bill chuyển khoản" className="w-full h-auto max-h-[80dvh] object-contain rounded-xl" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

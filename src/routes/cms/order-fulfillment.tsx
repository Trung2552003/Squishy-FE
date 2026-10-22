import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Package,
  Truck,
  Clock,
  Printer,
  Sparkle,
  MapPin,
  User
} from '@phosphor-icons/react';

import { orderApi, type Order, type UpdateFulfillmentInput } from '@/lib/api/squishy/orderApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader, LoadingState } from '@/components/shop/page-header';
import { Mascot } from '@/components/shop/mascot';
import { ProductImage } from '@/components/shop/product-image';
import { EntityPhotos } from '@/components/shop/entity-photos';
import { formatDateTime } from '@/lib/utils';

export const Route = createFileRoute('/cms/order-fulfillment')({
  component: OrderFulfillmentScreen,
});

const DEFAULT_CHECKLIST = [
  { id: 'item_check', label: 'Soát đúng số lượng & mẫu mã đồ chơi Squishy', checked: false },
  { id: 'quality_check', label: 'Kiểm tra độ phồng đàn hồi, không rách xước', checked: false },
  { id: 'bubble_wrap', label: 'Bọc màng xốp bóng khí chống bẹp méo khi vận chuyển', checked: false },
  { id: 'gift_sticker', label: 'Tặng kèm sticker hoạt hình Kawaii & thiệp cảm ơn', checked: false },
  { id: 'seal_box', label: 'Dán kín hộp carton & in dán phiếu vận đơn', checked: false },
];

function OrderFulfillmentScreen() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal packing & checklist
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [checklist, setChecklist] = useState<typeof DEFAULT_CHECKLIST>(DEFAULT_CHECKLIST);
  const [shippingProvider, setShippingProvider] = useState('GHTK');
  const [trackingCode, setTrackingCode] = useState('');
  const [preparationNote, setPreparationNote] = useState('');

  const { data: fulfillmentRes, isLoading } = useQuery({
    queryKey: ['fulfillmentOrders', selectedStatus],
    queryFn: () => orderApi.getFulfillment(selectedStatus === 'ALL' ? undefined : selectedStatus),
  });
  const orders = fulfillmentRes?.data || [];

  const updateFulfillmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFulfillmentInput }) =>
      orderApi.updateFulfillment(id, data),
    onSuccess: (res) => {
      if (res.isSuccess) {
        toast.success('Cập nhật khâu đóng gói & giao hàng thành công!');
        setIsChecklistModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['fulfillmentOrders'] });
        queryClient.invalidateQueries({ queryKey: ['ordersList'] });
      } else {
        toast.error(res.message || 'Không cập nhật được tiến trình.');
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Không cập nhật được tiến trình.');
    }
  });

  const openPackingModal = (order: Order) => {
    setActiveOrder(order);
    setShippingProvider(order.shippingProvider || 'GHTK');
    setTrackingCode(order.trackingCode || '');
    setPreparationNote(order.preparationNote || '');

    // Parse checklist if previously saved
    if (order.packingChecklistJson) {
      try {
        setChecklist(JSON.parse(order.packingChecklistJson));
      } catch {
        setChecklist(DEFAULT_CHECKLIST);
      }
    } else {
      setChecklist(DEFAULT_CHECKLIST);
    }

    setIsChecklistModalOpen(true);
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev =>
      prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item)
    );
  };

  const handleSaveProgress = (newStatus: string) => {
    if (!activeOrder) return;

    const payload: UpdateFulfillmentInput = {
      preparationStatus: newStatus,
      preparationNote: preparationNote.trim(),
      trackingCode: trackingCode.trim(),
      shippingProvider,
      packingChecklistJson: JSON.stringify(checklist),
    };

    updateFulfillmentMutation.mutate({ id: activeOrder.id, data: payload });
  };

  const handlePrintPackingSlip = () => {
    window.print();
  };

  const allChecked = checklist.every(c => c.checked);

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-[1650px] mx-auto font-sans">
      <PageHeader
        emoji="📋"
        title="Chuẩn bị & Đóng gói"
        description="Soát hàng, bọc xốp chống sốc, tặng kèm sticker Kawaii và giao Shipper."
      />

      {/* Tabs Filter */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'ALL', label: 'Tất cả đơn cần xử lý' },
          { id: 'PENDING', label: '1. Chờ soạn hàng' },
          { id: 'PREPARING', label: '2. Đang đóng gói' },
          { id: 'PACKED', label: '3. Đã đóng xong (Chờ Shipper)' },
          { id: 'SHIPPED', label: '4. Đã giao Shipper' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedStatus(tab.id)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-sm font-bold transition-all shrink-0 cursor-pointer ${
              selectedStatus === tab.id
                ? 'bg-[#FEF08A] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-2 border-black'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Danh sách đơn hàng dạng thẻ công việc (Task Cards) */}
      {isLoading ? (
        <LoadingState text="Đang tải danh sách công việc đóng hàng..." />
      ) : orders.length === 0 ? (
        <div className="py-14 px-4 text-center flex flex-col items-center justify-center gap-2 doodle-card">
          <Mascot mood="wink" size={84} color="#BBF7D0" />
          <p className="font-black text-base text-black">Không có đơn hàng nào cần đóng gói!</p>
          <p className="text-xs text-slate-600 font-medium">Tất cả các đơn đã được chuẩn bị và bàn giao xong xuôi ✨</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
          {orders.map(order => {
            const prep = order.preparationStatus || 'PENDING';
            let parsedChecklist: typeof DEFAULT_CHECKLIST = [];
            try {
              parsedChecklist = order.packingChecklistJson ? JSON.parse(order.packingChecklistJson) : [];
            } catch {
              // Dữ liệu checklist cũ bị lỗi: coi như chưa làm mục nào
            }
            const completedCount = parsedChecklist.filter(c => c.checked).length;

            return (
              <div
                key={order.id}
                className="doodle-card p-3.5 sm:p-5 doodle-card-hover flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* Top line: Code & Status */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b-2 border-dashed border-slate-200">
                    <div>
                      <span className="border-1.5 border-black rounded-md px-2 py-0.5 text-xs font-mono font-black bg-[#BAE6FD] text-slate-900 shadow-[1px_1px_0px_#000]">
                        {order.orderCode}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium block mt-1">
                        {formatDateTime(order.createdAt)}
                      </span>
                    </div>

                    <span className={`shrink-0 whitespace-nowrap text-xs font-black px-2.5 py-1 rounded-lg border-1.5 border-black shadow-[1px_1px_0px_#000] ${
                      prep === 'PENDING'
                        ? 'bg-[#FEF08A] text-black'
                        : prep === 'PREPARING'
                          ? 'bg-[#BAE6FD] text-black'
                          : prep === 'PACKED'
                            ? 'bg-[#DDD6FE] text-black'
                            : 'bg-[#BBF7D0] text-black'
                    }`}>
                      {prep === 'PENDING'
                        ? 'Chờ soạn hàng'
                        : prep === 'PREPARING'
                          ? 'Đang đóng gói'
                          : prep === 'PACKED'
                            ? 'Đã đóng xong'
                            : 'Đã giao Shipper'}
                    </span>
                  </div>

                  {/* Thông tin người nhận & Địa chỉ */}
                  <div className="py-2.5 space-y-1 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5 font-black text-slate-900">
                      <User className="w-3.5 h-3.5 text-black shrink-0" weight="bold" />
                      <span>{order.customerName || 'Khách lẻ'}</span>
                      {order.customerPhone && <span className="font-semibold text-slate-600">({order.customerPhone})</span>}
                    </div>

                    {order.shippingAddress ? (
                      <div className="flex items-start gap-1.5 text-slate-700 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" weight="bold" />
                        <span className="line-clamp-2">{order.shippingAddress}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic font-medium">Nhận tại quầy / Đơn POS</div>
                    )}
                  </div>

                  {/* Danh sách món Squishy cần đóng */}
                  <div className="bg-[#FAF7EE] border-2 border-black rounded-xl p-3 space-y-2 shadow-[1.5px_1.5px_0px_#000]">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                      Đồ chơi Squishy cần lấy ({order.details?.reduce((a, b) => a + b.quantity, 0) || 0} món):
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {order.details?.map(d => (
                        <div key={d.id} className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <ProductImage src={d.mainImageUrl} alt={d.productName} className="w-7 h-7 rounded-lg border-1.5 border-black shrink-0" />
                            <span className="truncate text-slate-900 font-bold">{d.productName}</span>
                          </div>
                          <span className="font-black text-black shrink-0 bg-[#FEF08A] px-2 py-0.5 rounded-md border-1.5 border-black text-[11px] shadow-[1px_1px_0px_#000]">
                            x{d.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Checklist Summary */}
                  {parsedChecklist.length > 0 && (
                    <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-700 bg-slate-100 rounded-lg p-2 border border-black/10">
                      <span>Đề mục kiểm tra đã xong:</span>
                      <span className="font-black text-black bg-[#BBF7D0] border-1.5 border-black rounded px-2 py-0.5 text-[11px]">
                        {completedCount} / {parsedChecklist.length} mục
                      </span>
                    </div>
                  )}
                </div>

                {/* Nút hành động mở checklist xử lý */}
                <button
                  onClick={() => openPackingModal(order)}
                  className="doodle-btn bg-[#FEF08A] hover:bg-[#FDE047] text-black w-full py-2.5 px-4 text-sm font-black flex items-center justify-center gap-2 mt-2"
                >
                  <Package className="w-4 h-4 text-black" weight="bold" />
                  Mở Checklist Chuẩn Bị & Đóng Hàng
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* POPUP ĐỀ MỤC CÔNG VIỆC ĐÓNG HÀNG & GIAO SHIPPER */}
      <Dialog open={isChecklistModalOpen} onOpenChange={setIsChecklistModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center justify-between gap-2 pr-8">
              <span className="flex items-center gap-2">
                <Package className="w-5 h-5 text-rose-500" /> Đóng Hàng Đơn: {activeOrder?.orderCode}
              </span>
              <Button variant="outline" size="sm" onClick={handlePrintPackingSlip} className="rounded-lg text-sm print-hidden">
                <Printer className="w-4 h-4 mr-1" /> In Phiếu Đóng Hàng
              </Button>
            </DialogTitle>
          </DialogHeader>

          {activeOrder && (
            <div className="space-y-4 text-sm">
              {/* Người nhận & Giao hàng */}
              <div className="p-3 bg-muted/30 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground shrink-0">Người nhận:</span>
                  <strong className="text-foreground text-right">{activeOrder.customerName} - {activeOrder.customerPhone || 'Chưa có SĐT'}</strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground shrink-0">Địa chỉ giao:</span>
                  <strong className="text-foreground text-right">{activeOrder.shippingAddress || 'Khách nhận tại quầy'}</strong>
                </div>
              </div>

              <div className="border rounded-xl divide-y text-xs">
                {activeOrder.details?.map(d => (
                  <div key={d.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
                    <span className="font-semibold min-w-0 truncate">{d.productName}</span>
                    <strong className="shrink-0">x{d.quantity}</strong>
                  </div>
                ))}
              </div>

              {/* ĐỀ MỤC CÔNG VIỆC / CHECKLIST KIỂM SOÁT */}
              <div className="border rounded-2xl p-3 sm:p-4 bg-rose-50/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <Sparkle className="w-4 h-4" /> Bảng Đề Mục Kiểm Soát Đóng Gói:
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {checklist.filter(c => c.checked).length} / {checklist.length} hoàn thành
                  </span>
                </div>

                <div className="space-y-2">
                  {checklist.map(item => (
                    <label
                      key={item.id}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                        item.checked
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                          : 'bg-background hover:bg-muted/40 border-border'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleChecklistItem(item.id)}
                        className="w-5 h-5 shrink-0 rounded text-rose-600 accent-rose-600 cursor-pointer"
                      />
                      <span className="text-sm font-medium leading-snug">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Thông tin đơn vị vận chuyển & Mã Tracking */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-1.5">Đơn vị vận chuyển</label>
                  <select
                    value={shippingProvider}
                    onChange={e => setShippingProvider(e.target.value)}
                    className="w-full h-10 text-base sm:text-sm"
                  >
                    <option value="GHTK">Giao Hàng Tiết Kiệm (GHTK)</option>
                    <option value="GHN">Giao Hàng Nhanh (GHN)</option>
                    <option value="ViettelPost">Viettel Post</option>
                    <option value="GrabExpress">Grab Express / Be</option>
                    <option value="ShipperNoiBo">Shipper riêng của shop</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-1.5">Mã Vận Đơn (Tracking Code)</label>
                  <Input
                    placeholder="VD: SQSGHTK123456"
                    value={trackingCode}
                    onChange={e => setTrackingCode(e.target.value)}
                    className="h-10 rounded-xl font-mono text-base sm:text-sm uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">Ghi chú đóng gói / giao hàng</label>
                <Input
                  placeholder="Ghi chú shipper hoặc lưu ý đặc biệt..."
                  value={preparationNote}
                  onChange={e => setPreparationNote(e.target.value)}
                  className="h-10 rounded-xl text-base sm:text-sm"
                />
              </div>

              {/* Ảnh chụp kiện hàng / lúc bàn giao cho shipper (mở camera điện thoại) */}
              <div className="rounded-xl border border-dashed p-3 print-hidden">
                <EntityPhotos
                  entityId={activeOrder.id}
                  type="ORDER_SHIPPING"
                  title="📸 Ảnh bàn giao shipper"
                  hint="Chụp kiện hàng đã dán vận đơn hoặc lúc giao cho shipper để làm bằng chứng."
                />
              </div>

              {/* Nút cập nhật tiến trình */}
              {!allChecked && (
                <p className="text-[11px] font-semibold text-amber-700 print-hidden">
                  Hoàn thành đủ {checklist.length} đề mục kiểm tra để bật nút "Giao Shipper".
                </p>
              )}
              <div className="grid grid-cols-1 min-[480px]:grid-cols-3 gap-2 pt-3 border-t print-hidden">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSaveProgress('PREPARING')}
                  disabled={updateFulfillmentMutation.isPending}
                  className="h-10 rounded-xl text-xs font-bold"
                >
                  <Clock className="w-3.5 h-3.5 mr-1 text-blue-500" /> Đang Chuẩn Bị
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSaveProgress('PACKED')}
                  disabled={updateFulfillmentMutation.isPending}
                  className="h-10 rounded-xl text-xs font-bold border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100"
                >
                  <Package className="w-3.5 h-3.5 mr-1" /> Đã Đóng Xong
                </Button>

                <Button
                  type="button"
                  onClick={() => handleSaveProgress('SHIPPED')}
                  disabled={!allChecked || updateFulfillmentMutation.isPending}
                  className="h-10 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Truck className="w-3.5 h-3.5 mr-1" /> Giao Shipper
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

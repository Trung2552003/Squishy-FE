import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Info } from '@phosphor-icons/react';

import { orderApi, type Order, type ShippingPayer } from '@/lib/api/squishy/orderApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn, formatVND, isValidVNPhone } from '@/lib/utils';

export const SHIPPING_PROVIDERS = [
  { value: 'GHTK', label: 'Giao Hàng Tiết Kiệm (GHTK)' },
  { value: 'GHN', label: 'Giao Hàng Nhanh (GHN)' },
  { value: 'ViettelPost', label: 'Viettel Post' },
  { value: 'SPX', label: 'SPX Express' },
  { value: 'GrabExpress', label: 'Grab Express / Be' },
  { value: 'ShipperNoiBo', label: 'Shipper riêng của shop' },
];

export const PAYER_LABELS: Record<ShippingPayer, string> = {
  RECEIVER: 'Người nhận trả',
  SENDER: 'Shop trả',
};

/** Số tiền nhập dạng "25.000" */
function MoneyInput({ id, value, onChange, disabled }: { id: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="numeric"
        placeholder="0"
        disabled={disabled}
        value={value ? value.toLocaleString('vi-VN') : ''}
        onChange={e => onChange(Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0))}
        className="h-10 rounded-xl pr-7 text-right font-semibold tabular-nums"
      />
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">đ</span>
    </div>
  );
}

/**
 * Sửa đơn khi nhập sai. Tổng khách trả = tiền hàng − giảm giá + (phí ship nếu người nhận trả).
 * Đơn đã thanh toán: không cho đổi các khoản làm thay đổi tổng tiền khách trả.
 */
export function EditOrderDialog({ order, onClose, onSaved }: { order: Order; onClose: () => void; onSaved?: (o: Order) => void }) {
  const queryClient = useQueryClient();
  const isDelivery = order.orderType !== 'POS';
  const isPaid = order.paymentStatus === 'PAID';

  const [customerName, setCustomerName] = useState(order.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone || '');
  const [address, setAddress] = useState(order.shippingAddress || '');
  const [note, setNote] = useState(order.note || '');
  const [provider, setProvider] = useState(order.shippingProvider || '');
  const [tracking, setTracking] = useState(order.trackingCode || '');
  const [shippingFee, setShippingFee] = useState(order.shippingFee || 0);
  const [payer, setPayer] = useState<ShippingPayer>(order.shippingPayer || 'RECEIVER');
  const [discount, setDiscount] = useState(order.discountAmount || 0);

  const customerShip = isDelivery && payer === 'RECEIVER' ? shippingFee : 0;
  const shopShip = isDelivery && payer === 'SENDER' ? shippingFee : 0;
  const newTotal = Math.max(0, order.subTotal - discount + customerShip);
  const totalChanged = newTotal !== order.totalAmount;
  const blocked = isPaid && totalChanged;

  const mutation = useMutation({
    mutationFn: () =>
      orderApi.updateInfo(order.id, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        shippingAddress: isDelivery ? address.trim() : undefined,
        note: note.trim() || undefined,
        shippingProvider: provider || undefined,
        trackingCode: tracking.trim() || undefined,
        shippingFee: isDelivery ? shippingFee : 0,
        shippingPayer: payer,
        discountAmount: discount,
      }),
    onSuccess: res => {
      toast.success(res.message || 'Đã cập nhật đơn hàng');
      ['ordersList', 'fulfillmentOrders', 'reportSummary', 'reportChart'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
      onSaved?.(res.data);
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Không cập nhật được đơn.'),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDelivery && !customerName.trim()) return toast.error('Vui lòng nhập tên người nhận.');
    if (customerPhone.trim() && !isValidVNPhone(customerPhone)) return toast.error('Số điện thoại chưa đúng (VD: 0912345678).');
    if (isDelivery && !address.trim()) return toast.error('Vui lòng nhập địa chỉ nhận hàng.');
    if (discount > order.subTotal) return toast.error('Giảm giá không được lớn hơn tiền hàng.');
    if (blocked) return toast.error('Đơn đã thanh toán nên không đổi được số tiền khách trả.');
    mutation.mutate();
  };

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sửa đơn {order.orderCode}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block" htmlFor="eo-name">
              <span className="text-sm font-semibold block mb-1.5">{isDelivery ? 'Người nhận *' : 'Tên khách'}</span>
              <Input id="eo-name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-10 rounded-xl" />
            </label>
            <label className="block" htmlFor="eo-phone">
              <span className="text-sm font-semibold block mb-1.5">Số điện thoại</span>
              <Input id="eo-phone" type="tel" inputMode="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="h-10 rounded-xl" />
            </label>
          </div>

          {isDelivery && (
            <>
              <label className="block" htmlFor="eo-address">
                <span className="text-sm font-semibold block mb-1.5">Địa chỉ nhận hàng *</span>
                <Input id="eo-address" value={address} onChange={e => setAddress(e.target.value)} className="h-10 rounded-xl" />
              </label>

              <div className="rounded-2xl border p-3 space-y-3 bg-muted/10">
                <span className="text-sm font-semibold block">Phí giao hàng</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block" htmlFor="eo-fee">
                    <span className="text-xs text-muted-foreground block mb-1">Phí trả cho đơn vị vận chuyển</span>
                    <MoneyInput id="eo-fee" value={shippingFee} onChange={setShippingFee} />
                  </label>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Ai trả phí ship?</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['RECEIVER', 'SENDER'] as ShippingPayer[]).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPayer(p)}
                          aria-pressed={payer === p}
                          className={cn('h-10 rounded-xl border-2 text-sm font-semibold', payer === p ? 'border-slate-900 bg-[#FEF08A]' : 'border-slate-200 bg-white')}
                        >
                          {PAYER_LABELS[p]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground flex gap-1.5">
                  <Info className="w-4 h-4 shrink-0" weight="bold" />
                  {payer === 'RECEIVER'
                    ? 'Khách trả thêm phí ship. Tiền này là thu hộ cho đơn vị vận chuyển, không tính vào doanh thu.'
                    : 'Khách chỉ trả tiền hàng. Phí ship là chi phí của shop, được trừ vào lợi nhuận.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block" htmlFor="eo-provider">
                    <span className="text-xs text-muted-foreground block mb-1">Đơn vị vận chuyển</span>
                    <select id="eo-provider" value={provider} onChange={e => setProvider(e.target.value)} className="h-10 w-full text-base sm:text-sm">
                      <option value="">-- Chưa chọn --</option>
                      {SHIPPING_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </label>
                  <label className="block" htmlFor="eo-tracking">
                    <span className="text-xs text-muted-foreground block mb-1">Mã vận đơn</span>
                    <Input id="eo-tracking" value={tracking} onChange={e => setTracking(e.target.value)} className="h-10 rounded-xl font-mono uppercase" />
                  </label>
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block" htmlFor="eo-discount">
              <span className="text-sm font-semibold block mb-1.5">Giảm giá</span>
              <MoneyInput id="eo-discount" value={discount} onChange={setDiscount} />
            </label>
            <label className="block" htmlFor="eo-note">
              <span className="text-sm font-semibold block mb-1.5">Ghi chú</span>
              <Input id="eo-note" value={note} onChange={e => setNote(e.target.value)} className="h-10 rounded-xl" />
            </label>
          </div>

          {/* Xem trước số tiền */}
          <div className="rounded-xl border divide-y text-sm">
            <div className="flex justify-between px-3 py-1.5"><span className="text-muted-foreground">Tiền hàng</span><span className="tabular-nums">{formatVND(order.subTotal)}</span></div>
            {discount > 0 && <div className="flex justify-between px-3 py-1.5"><span className="text-muted-foreground">Giảm giá</span><span className="tabular-nums">−{formatVND(discount)}</span></div>}
            {isDelivery && (
              <div className="flex justify-between px-3 py-1.5">
                <span className="text-muted-foreground">Phí ship khách trả</span>
                <span className="tabular-nums">{customerShip ? `+${formatVND(customerShip)}` : '0đ'}</span>
              </div>
            )}
            <div className="flex justify-between px-3 py-2 font-black">
              <span>Khách cần trả</span>
              <span className={cn('tabular-nums', blocked ? 'text-red-600' : 'text-rose-600')}>
                {formatVND(newTotal)}
                {totalChanged && <span className="ml-1.5 text-xs font-semibold text-muted-foreground line-through">{formatVND(order.totalAmount)}</span>}
              </span>
            </div>
            {shopShip > 0 && (
              <div className="flex justify-between px-3 py-1.5 text-xs">
                <span className="text-muted-foreground">Shop chịu phí ship (chi phí)</span>
                <span className="tabular-nums font-semibold">{formatVND(shopShip)}</span>
              </div>
            )}
          </div>
          {blocked && (
            <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              Đơn đã thanh toán {formatVND(order.totalAmount)} nên không đổi được số tiền khách trả. Bạn vẫn sửa được người nhận, địa chỉ,
              vận chuyển và phí ship khi shop trả. Khoản chênh lệch (nếu có) hãy ghi ở Thu chi khác.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="h-10 rounded-xl">Hủy</Button>
            <Button type="submit" disabled={mutation.isPending || blocked} className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white">
              {mutation.isPending ? 'Đang lưu...' : 'Cập nhật đơn'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

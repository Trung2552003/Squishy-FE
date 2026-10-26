import React, { useState, useEffect, useRef } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as signalR from '@microsoft/signalr';
import { toast } from 'sonner';
import {
  MagnifyingGlass,
  ShoppingCart,
  Trash,
  Plus,
  Minus,
  QrCode,
  Money,
  Printer,
  Camera,
  UploadSimple,
  CheckCircle,
  ArrowsClockwise,
  ArrowRight,
  User,
  Phone,
  Receipt,
  CaretUp
} from '@phosphor-icons/react';

import { productApi, type Product } from '@/lib/api/squishy/productApi';
import { categoryApi } from '@/lib/api/squishy/categoryApi';
import { orderApi, type CreateOrderInput, type Order } from '@/lib/api/squishy/orderApi';
import { mediaApi } from '@/lib/api/squishy/mediaApi';
import { Button } from '@/components/ui/button';
import { Mascot } from '@/components/shop/mascot';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ProductImage } from '@/components/shop/product-image';
import { cn, formatVND, getHubUrl } from '@/lib/utils';
import { cartKey, hasVariants, lineImage, lineName, sellableStock, sellableVariants, stockOf } from '@/lib/variants';

export const Route = createFileRoute('/cms/pos')({
  component: PosScreen,
});

interface CartItem {
  key: string; // mỗi màu là 1 dòng riêng
  product: Product;
  variantId?: string;
  quantity: number;
  unitPrice: number; // Có thể tùy chỉnh giá bán tại quầy
}

const QUICK_CASH = [50000, 100000, 200000, 500000];

function PosScreen() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pickingProduct, setPickingProduct] = useState<Product | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>('Khách lẻ');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [orderNote, setOrderNote] = useState<string>('');

  // Giỏ hàng dạng ngăn kéo trên điện thoại / máy tính bảng
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Modal checkout
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER_QR' | 'CASH'>('BANK_TRANSFER_QR');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderSignature, setOrderSignature] = useState<string>('');
  const [isPaymentSuccess, setIsPaymentSuccess] = useState(false);
  const [isConfirmingPaid, setIsConfirmingPaid] = useState(false);

  // Upload proof photo
  const [proofImagePreview, setProofImagePreview] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: categoriesRes } = useQuery({
    queryKey: ['squishyCategories'],
    queryFn: categoryApi.getAll,
  });
  const categories = categoriesRes?.data || [];

  const { data: productsRes, isLoading: isLoadingProducts, isFetching, refetch: refetchProducts } = useQuery({
    queryKey: ['squishyActiveProducts', selectedCategory],
    queryFn: () => productApi.getActive(selectedCategory === 'ALL' ? undefined : selectedCategory),
  });
  const products = productsRes?.data || [];

  const filteredProducts = products.filter(p => {
    if (!searchKeyword.trim()) return true;
    const kw = searchKeyword.toLowerCase();
    return p.name.toLowerCase().includes(kw) || p.sku.toLowerCase().includes(kw) || (p.squishyType && p.squishyType.toLowerCase().includes(kw));
  });

  // SignalR tự động khớp thanh toán SePay
  useEffect(() => {
    if (!currentOrder || isPaymentSuccess) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(getHubUrl(), { withCredentials: true })
      .withAutomaticReconnect()
      .build();

    connection.on('OrderPaid', (data: any) => {
      if (data.orderId === currentOrder.id || data.orderCode === currentOrder.orderCode) {
        setIsPaymentSuccess(true);
        toast.success(`🎉 Đã nhận thanh toán ${formatVND(data.totalAmount)} cho đơn ${data.orderCode}!`);
        queryClient.invalidateQueries({ queryKey: ['squishyActiveProducts'] });
      }
    });

    connection.start().catch(() => {});

    return () => {
      connection.stop();
    };
  }, [currentOrder, isPaymentSuccess, queryClient]);

  // Cart operations
  const addToCart = (product: Product, variantId?: string) => {
    // Sản phẩm có màu: mở bảng chọn màu trước
    if (hasVariants(product) && !variantId) {
      setPickingProduct(product);
      return;
    }
    const stock = stockOf(product, variantId);
    const name = lineName(product, variantId);
    if (stock <= 0) {
      toast.error(`"${name}" đã hết hàng!`);
      return;
    }
    const key = cartKey(product.id, variantId);
    const existing = cart.find(item => item.key === key);
    if (existing && existing.quantity >= stock) {
      toast.warning(`"${name}" chỉ còn ${stock} ${product.unit}!`);
      return;
    }
    setCart(prev =>
      prev.some(item => item.key === key)
        ? prev.map(item => item.key === key ? { ...item, quantity: item.quantity + 1 } : item)
        : [...prev, { key, product, variantId, quantity: 1, unitPrice: product.salePrice }]
    );
  };

  const updateQuantity = (key: string, delta: number) => {
    const item = cart.find(i => i.key === key);
    if (item && item.quantity + delta > stockOf(item.product, item.variantId)) {
      toast.warning(`Tồn kho chỉ còn ${stockOf(item.product, item.variantId)} ${item.product.unit}!`);
      return;
    }
    setCart(prev =>
      prev
        .map(i => i.key === key ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0)
    );
  };

  const updatePrice = (key: string, newPrice: number) => {
    setCart(prev =>
      prev.map(item =>
        item.key === key ? { ...item, unitPrice: Math.max(0, newPrice || 0) } : item
      )
    );
  };

  const removeFromCart = (key: string) => {
    setCart(prev => prev.filter(item => item.key !== key));
  };

  const resetForNewOrder = () => {
    setCart([]);
    setDiscountAmount(0);
    setCustomerName('Khách lẻ');
    setCustomerPhone('');
    setOrderNote('');
    setCurrentOrder(null);
    setOrderSignature('');
    setIsPaymentSuccess(false);
    setProofImagePreview(null);
    setIsMobileCartOpen(false);
  };

  // Calculations
  const subTotal = cart.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const totalAmount = Math.max(0, subTotal - discountAmount);
  const changeMoney = Math.max(0, cashGiven - totalAmount);
  const cartCount = cart.reduce((a, b) => a + b.quantity, 0);

  // "Chữ ký" giỏ hàng: nếu không đổi gì thì mở lại đơn đang chờ thay vì tạo đơn trùng
  const currentSignature = JSON.stringify({
    items: cart.map(i => [i.key, i.quantity, i.unitPrice]),
    discountAmount,
    paymentMethod,
    customerName,
    customerPhone,
    orderNote,
  });

  const createOrderMutation = useMutation({
    mutationFn: orderApi.create,
    onSuccess: (res) => {
      if (res.isSuccess && res.data) {
        setCurrentOrder(res.data);
        setOrderSignature(currentSignature);
        if (res.data.paymentMethod === 'CASH') {
          // Đơn tiền mặt được backend ghi nhận đã thanh toán & trừ kho ngay khi tạo
          setIsPaymentSuccess(true);
          toast.success(`Đã hoàn tất thanh toán tiền mặt đơn ${res.data.orderCode}!`);
          queryClient.invalidateQueries({ queryKey: ['squishyActiveProducts'] });
        } else {
          toast.info(`Đã tạo đơn ${res.data.orderCode}. Đang chờ khách quét mã QR...`);
        }
      } else {
        toast.error(res.message || 'Lỗi khi tạo đơn hàng');
        if (paymentMethod !== 'CASH') setIsCheckoutOpen(false);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể tạo đơn hàng');
      if (paymentMethod !== 'CASH') setIsCheckoutOpen(false);
    }
  });

  const buildPayload = (): CreateOrderInput => ({
    customerName: customerName.trim() || 'Khách lẻ',
    customerPhone: customerPhone.trim() || undefined,
    orderType: 'POS',
    discountAmount,
    paymentMethod,
    note: orderNote.trim() || undefined,
    items: cart.map(item => ({
      productId: item.product.id,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  });

  const handleStartCheckout = () => {
    if (cart.length === 0) {
      toast.error('Giỏ hàng đang trống!');
      return;
    }
    if (discountAmount > subTotal) {
      toast.error('Giảm giá không được lớn hơn tiền hàng.');
      return;
    }

    setIsMobileCartOpen(false);

    // Đơn đã tạo nhưng chưa thanh toán và giỏ không đổi → mở lại, không tạo trùng
    if (currentOrder && !isPaymentSuccess && orderSignature === currentSignature) {
      setIsCheckoutOpen(true);
      return;
    }

    setCashGiven(totalAmount);
    setIsPaymentSuccess(false);
    setCurrentOrder(null);
    setProofImagePreview(null);
    setIsCheckoutOpen(true);

    // Tiền mặt: nhập tiền khách đưa trước, chỉ tạo đơn khi thu ngân xác nhận
    if (paymentMethod === 'CASH') return;

    createOrderMutation.mutate(buildPayload());
  };

  const handleConfirmCash = () => {
    if (cashGiven < totalAmount) {
      toast.error('Tiền khách đưa chưa đủ.');
      return;
    }
    createOrderMutation.mutate(buildPayload());
  };

  const handleCheckoutOpenChange = (open: boolean) => {
    setIsCheckoutOpen(open);
    // Đóng hộp thoại sau khi đã thanh toán xong → sẵn sàng đơn mới
    if (!open && isPaymentSuccess) resetForNewOrder();
  };

  // Xác nhận thủ công đơn chuyển khoản (khi SePay chưa tự khớp)
  const handleConfirmPaid = async () => {
    if (!currentOrder) return;
    setIsConfirmingPaid(true);
    try {
      await orderApi.updateStatus(currentOrder.id, 'COMPLETED', 'PAID');
      setIsPaymentSuccess(true);
      toast.success(`Đã hoàn tất đơn ${currentOrder.orderCode}!`);
      queryClient.invalidateQueries({ queryKey: ['squishyActiveProducts'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không cập nhật được trạng thái đơn.');
    } finally {
      setIsConfirmingPaid(false);
    }
  };

  // Ảnh bằng chứng chuyển khoản → MediaImage
  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setProofImagePreview(URL.createObjectURL(file));

    if (currentOrder) {
      setIsUploadingProof(true);
      try {
        const uploadRes = await mediaApi.uploadImage(file, 'ORDER_PAYMENT', currentOrder.id, true);
        if (uploadRes.isSuccess && uploadRes.data) {
          await orderApi.uploadPaymentProof(currentOrder.id, uploadRes.data.url);
          toast.success('Đã lưu ảnh bằng chứng thanh toán!');
        }
      } catch {
        toast.error('Lỗi khi tải ảnh lên.');
      } finally {
        setIsUploadingProof(false);
      }
    }
  };

  const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  const chipClass = (active: boolean) =>
    cn(
      'px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-sm font-bold transition-all shrink-0 cursor-pointer border-2 border-black',
      active ? 'bg-[#FEF08A] text-black shadow-[2px_2px_0px_#000]' : 'bg-white hover:bg-slate-100 text-slate-700'
    );

  // Nội dung giỏ hàng dùng chung cho cột phải (máy tính) và ngăn kéo (điện thoại)
  const cartPanel = (
    <>
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-black" weight="bold" />
          <h3 className="font-black text-base text-black">Đơn hàng ({cartCount})</h3>
        </div>
        {cart.length > 0 && (
          <button
            onClick={resetForNewOrder}
            className="doodle-btn bg-[#FECDD3] hover:bg-[#FDA4AF] text-rose-900 text-sm px-2.5 py-1 flex items-center gap-1"
          >
            <Trash className="w-3.5 h-3.5" weight="bold" /> Xóa giỏ
          </button>
        )}
      </div>

      {/* Thông tin khách hàng nhanh */}
      <div className="grid grid-cols-2 gap-2 mt-2.5">
        <div className="relative">
          <User className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-black" weight="bold" />
          <Input
            placeholder="Tên khách"
            value={customerName}
            onFocus={selectOnFocus}
            onChange={e => setCustomerName(e.target.value)}
            className="doodle-input pl-8 h-9 text-base sm:text-sm font-medium"
          />
        </div>
        <div className="relative">
          <Phone className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-black" weight="bold" />
          <Input
            type="tel"
            inputMode="tel"
            placeholder="SĐT (tùy chọn)"
            value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)}
            className="doodle-input pl-8 h-9 text-base sm:text-sm font-medium"
          />
        </div>
      </div>

      <Input
        placeholder="Ghi chú đơn hàng (nếu có)..."
        value={orderNote}
        onChange={e => setOrderNote(e.target.value)}
        className="doodle-input h-9 text-base sm:text-sm font-medium mt-2 mb-2.5"
      />

      {/* Danh sách món */}
      <div className="flex-1 min-h-24 overflow-y-auto space-y-2 pr-1 py-1 scrollbar-thin">
        {cart.length === 0 ? (
          <div className="h-full min-h-40 flex flex-col items-center justify-center gap-2 text-center">
            <ShoppingCart className="w-12 h-12 text-slate-400" weight="bold" />
            <p className="text-sm font-bold text-slate-700">Chưa có sản phẩm nào trong giỏ</p>
            <p className="text-xs text-slate-500">Chạm vào sản phẩm để thêm vào đơn</p>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.key} className="flex items-center gap-2 p-2 rounded-xl border-2 border-black bg-white shadow-[2px_2px_0px_#000]">
              <ProductImage
                src={lineImage(item.product, item.variantId)}
                alt={lineName(item.product, item.variantId)}
                className="w-11 h-11 rounded-lg border-1.5 border-black shrink-0"
              />

              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-black truncate text-slate-900 leading-tight">{lineName(item.product, item.variantId)}</h5>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step="any"
                    value={item.unitPrice}
                    onFocus={selectOnFocus}
                    onChange={e => updatePrice(item.key, Number(e.target.value))}
                    aria-label="Đơn giá"
                    className="w-24 px-1.5 py-1 text-base sm:text-sm font-bold rounded-md border-1.5 border-black bg-[#FAF7EE] text-black"
                  />
                  <span className="text-[11px] font-bold text-slate-600">đ</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => updateQuantity(item.key, -1)}
                  aria-label="Giảm"
                  className="w-8 h-8 rounded-lg border-1.5 border-black bg-white shadow-[1px_1px_0px_#000] flex items-center justify-center hover:bg-slate-100"
                >
                  <Minus className="w-3.5 h-3.5" weight="bold" />
                </button>
                <span className="w-6 text-center font-black text-sm text-black">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.key, 1)}
                  aria-label="Tăng"
                  className="w-8 h-8 rounded-lg border-1.5 border-black bg-[#FEF08A] shadow-[1px_1px_0px_#000] flex items-center justify-center hover:bg-[#FDE047]"
                >
                  <Plus className="w-3.5 h-3.5" weight="bold" />
                </button>
              </div>

              <button onClick={() => removeFromCart(item.key)} aria-label="Xóa món" className="text-rose-600 hover:text-rose-800 p-1">
                <Trash className="w-4 h-4" weight="bold" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Tổng tiền & Chiết khấu */}
      <div className="pt-3 border-t border-slate-200 space-y-2 mt-2 shrink-0">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
          <span>Tạm tính</span>
          <span className="font-black text-black">{formatVND(subTotal)}</span>
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
          <span>Giảm giá</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={discountAmount}
              onFocus={selectOnFocus}
              onChange={e => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
              aria-label="Giảm giá"
              className={cn(
                'w-28 px-1.5 py-1 text-base sm:text-sm text-right font-bold rounded-md border-1.5 bg-white text-black',
                discountAmount > subTotal ? 'border-red-500' : 'border-black'
              )}
            />
            <span>đ</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-300 text-sm font-black text-black">
          <span>Tổng thanh toán</span>
          <span className="text-lg sm:text-xl font-black text-black bg-[#FEF08A] border-1.5 border-black px-2 py-0.5 rounded-lg shadow-[1.5px_1.5px_0px_#000]">
            {formatVND(totalAmount)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => setPaymentMethod('BANK_TRANSFER_QR')}
            aria-pressed={paymentMethod === 'BANK_TRANSFER_QR'}
            className={cn('doodle-btn flex items-center justify-center gap-1.5 py-2.5 text-sm font-black', paymentMethod === 'BANK_TRANSFER_QR' ? 'bg-[#BAE6FD] text-black' : 'bg-white text-slate-700 hover:bg-slate-50')}
          >
            <QrCode className="w-4 h-4" weight="bold" /> Quét QR
          </button>
          <button
            onClick={() => setPaymentMethod('CASH')}
            aria-pressed={paymentMethod === 'CASH'}
            className={cn('doodle-btn flex items-center justify-center gap-1.5 py-2.5 text-sm font-black', paymentMethod === 'CASH' ? 'bg-[#BBF7D0] text-black' : 'bg-white text-slate-700 hover:bg-slate-50')}
          >
            <Money className="w-4 h-4" weight="bold" /> Tiền mặt
          </button>
        </div>

        <button
          onClick={handleStartCheckout}
          disabled={cart.length === 0}
          className="doodle-btn w-full h-12 text-base font-black bg-[#FEF08A] hover:bg-[#FDE047] text-black disabled:bg-slate-200 disabled:text-slate-500"
        >
          Thanh Toán ({formatVND(totalAmount)})
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col lg:flex-row h-full w-full gap-3 lg:gap-4 font-sans">
      {/* CỘT TRÁI: DANH MỤC & SẢN PHẨM */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 doodle-card p-3 sm:p-4 overflow-hidden">
        <div className="space-y-2.5 pb-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-black w-4 h-4 sm:w-5 sm:h-5" weight="bold" />
              <Input
                type="search"
                placeholder="Tìm tên, mã SKU, đặc tính..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                className="doodle-input pl-9 sm:pl-11 h-10 sm:h-11 text-base sm:text-sm font-medium"
              />
            </div>
            <button
              onClick={() => refetchProducts()}
              className="doodle-btn bg-white hover:bg-slate-100 h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center shrink-0"
              title="Tải lại danh sách"
              aria-label="Tải lại danh sách"
            >
              <ArrowsClockwise className={cn('w-5 h-5 text-black', isFetching && 'animate-spin')} weight="bold" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setSelectedCategory('ALL')} className={chipClass(selectedCategory === 'ALL')}>
              ✨ Tất cả
            </button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={chipClass(selectedCategory === cat.id)}>
                {cat.name} ({cat.productCount})
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pt-3 pr-1 scrollbar-thin">
          {isLoadingProducts ? (
            <div className="h-64 flex items-center justify-center text-slate-500 font-bold">
              Đang tải danh sách sản phẩm...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-center">
              <Mascot mood="sleepy" size={80} color="#DDD6FE" />
              <p className="font-bold text-slate-600">Không tìm thấy sản phẩm nào phù hợp.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 min-[560px]:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 sm:gap-3 pb-20 lg:pb-1">
              {filteredProducts.map(product => {
                const available = sellableStock(product);
                const isOutOfStock = available <= 0;
                const inCartQty = cart.filter(i => i.product.id === product.id).reduce((a, i) => a + i.quantity, 0);
                const inCartItem = inCartQty > 0 ? { quantity: inCartQty } : null;

                return (
                  <button
                    type="button"
                    key={product.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(product)}
                    className={cn(
                      'doodle-card p-2 sm:p-2.5 doodle-card-hover text-left relative flex flex-col justify-between overflow-hidden select-none active:scale-[0.98] transition-transform',
                      isOutOfStock && 'opacity-50 cursor-not-allowed bg-slate-100',
                      inCartItem && 'ring-2 ring-offset-1 ring-[#FFB5B5]'
                    )}
                  >
                    {inCartItem && (
                      <span className="absolute top-1.5 right-1.5 z-10 bg-[#FFB5B5] text-black border-2 border-black text-xs font-black rounded-full w-7 h-7 flex items-center justify-center shadow-[1.5px_1.5px_0px_#000]">
                        {inCartItem.quantity}
                      </span>
                    )}

                    <div className="w-full aspect-square rounded-xl overflow-hidden border-2 border-black bg-rose-50 mb-2 relative">
                      <ProductImage src={product.mainImageUrl} alt={product.name} className="w-full h-full" />
                      <span className={cn(
                        'absolute bottom-1 left-1 text-[10px] font-black px-1.5 py-0.5 rounded-md border-1.5 border-black',
                        isOutOfStock ? 'bg-[#FECDD3]' : available <= product.minStockAlert ? 'bg-[#FEF08A]' : 'bg-[#BBF7D0]'
                      )}>
                        {isOutOfStock ? 'Hết hàng' : `Còn ${available}`}
                      </span>
                      {hasVariants(product) && (
                        <span className="absolute top-1 left-1 flex -space-x-1">
                          {sellableVariants(product).slice(0, 5).map(v => (
                            <span key={v.id} className="w-4 h-4 rounded-full border-1.5 border-white shadow" style={{ background: v.colorHex || '#e2e8f0' }} />
                          ))}
                        </span>
                      )}
                    </div>

                    <h4 className="font-black text-xs sm:text-sm line-clamp-2 leading-snug mb-1 text-slate-900" title={product.name}>
                      {product.name}
                    </h4>

                    <div className="mt-auto flex items-center justify-between gap-1 pt-1">
                      <span className="border-1.5 border-black rounded-md bg-[#FEF08A] px-1.5 py-0.5 text-xs font-black text-black">
                        {formatVND(product.salePrice)}
                      </span>
                      <span className="hidden sm:inline text-[10px] font-bold text-slate-500 truncate">#{product.sku}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CỘT PHẢI: GIỎ HÀNG (máy tính) */}
      <div className="hidden lg:flex w-[320px] xl:w-[380px] flex-col doodle-card p-4 overflow-hidden shrink-0">
        {cartPanel}
      </div>

      {/* THANH TÓM TẮT GIỎ HÀNG (điện thoại / máy tính bảng) */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 px-3 pt-2 pb-safe bg-gradient-to-t from-[#FAF7EE] via-[#FAF7EE] to-transparent">
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="doodle-btn w-full bg-[#FEF08A] text-black px-4 py-3 flex items-center justify-between gap-3"
        >
          <span className="flex items-center gap-2 text-sm font-black">
            <span className="relative">
              <ShoppingCart className="w-5 h-5" weight="bold" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2.5 bg-[#FFB5B5] border-1.5 border-black rounded-full min-w-5 h-5 px-1 text-[10px] flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </span>
            <span className="ml-1">Giỏ hàng</span>
          </span>
          <span className="flex items-center gap-1.5 text-base font-black">
            {formatVND(totalAmount)} <CaretUp className="w-4 h-4" weight="bold" />
          </span>
        </button>
      </div>

      <Sheet open={isMobileCartOpen} onOpenChange={setIsMobileCartOpen}>
        <SheetContent side="bottom" className="lg:hidden h-[88dvh] rounded-t-3xl border-t-[2.5px] border-black p-3.5 pb-safe flex flex-col bg-white">
          <SheetHeader className="sr-only">
            <SheetTitle>Giỏ hàng</SheetTitle>
          </SheetHeader>
          <div className="mx-auto w-12 h-1.5 rounded-full bg-slate-300 mb-2 shrink-0" />
          {/* chừa chỗ cho nút đóng (X) ở góc phải */}
          <div className="flex-1 min-h-0 flex flex-col [&>div:first-child]:pr-9">{cartPanel}</div>
        </SheetContent>
      </Sheet>

      {/* POPUP THANH TOÁN */}
      <Dialog open={isCheckoutOpen} onOpenChange={handleCheckoutOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2 pr-6">
              <Receipt className="w-5 h-5 text-rose-500" />
              {isPaymentSuccess ? 'Thanh Toán Thành Công!' : 'Xác Nhận & Thanh Toán'}
            </DialogTitle>
          </DialogHeader>

          {createOrderMutation.isPending ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <ArrowsClockwise className="w-8 h-8 animate-spin text-rose-500" />
              <p className="text-sm font-semibold">Đang khởi tạo đơn hàng & mã QR...</p>
            </div>
          ) : isPaymentSuccess ? (
            <div className="py-2 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center print-hidden">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-foreground">Giao Dịch Đã Hoàn Thành!</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Mã đơn: <strong className="text-foreground">{currentOrder?.orderCode}</strong> • {new Date().toLocaleString('vi-VN')}
                </p>
                <p className="text-xs text-muted-foreground">Khách hàng: {customerName || 'Khách lẻ'}</p>
              </div>

              {/* Hóa đơn tóm tắt (cũng là nội dung khi in) */}
              <div className="w-full border rounded-xl divide-y text-xs text-left">
                {cart.map(item => (
                  <div key={item.key} className="flex justify-between gap-2 px-3 py-1.5">
                    <span className="min-w-0">
                      <span className="font-semibold block truncate">{lineName(item.product, item.variantId)}</span>
                      <span className="text-muted-foreground">{item.quantity} x {formatVND(item.unitPrice)}</span>
                    </span>
                    <strong className="shrink-0">{formatVND(item.quantity * item.unitPrice)}</strong>
                  </div>
                ))}
                {discountAmount > 0 && (
                  <div className="flex justify-between px-3 py-1.5 text-rose-600">
                    <span>Giảm giá</span><span>-{formatVND(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between px-3 py-2 font-black text-sm">
                  <span>Tổng cộng</span><span className="text-emerald-600">{formatVND(currentOrder?.totalAmount ?? totalAmount)}</span>
                </div>
                {paymentMethod === 'CASH' && cashGiven > 0 && (
                  <div className="flex justify-between px-3 py-1.5 text-muted-foreground">
                    <span>Khách đưa / Tiền thối</span><span>{formatVND(cashGiven)} / {formatVND(changeMoney)}</span>
                  </div>
                )}
              </div>

              {proofImagePreview && (
                <div className="w-full max-w-xs border rounded-xl p-2 bg-muted/30 print-hidden">
                  <p className="text-xs font-semibold mb-1 text-muted-foreground">Ảnh xác nhận thanh toán:</p>
                  <img src={proofImagePreview} alt="Ảnh thanh toán" className="w-full max-h-40 object-cover rounded-lg" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 w-full pt-2 print-hidden">
                <Button variant="outline" onClick={() => window.print()} className="rounded-xl h-11">
                  <Printer className="w-4 h-4 mr-1.5" /> In hóa đơn
                </Button>
                <Button
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    resetForNewOrder();
                  }}
                  className="rounded-xl h-11 bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Đơn mới <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          ) : paymentMethod === 'CASH' ? (
            <div className="space-y-4">
              <div className="bg-muted/40 p-3 rounded-xl flex items-center justify-between gap-2 text-sm">
                <span className="text-xs text-muted-foreground">{cartCount} món • {customerName || 'Khách lẻ'}</span>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Cần thanh toán</span>
                  <strong className="text-rose-600 text-base">{formatVND(totalAmount)}</strong>
                </div>
              </div>

              <div className="space-y-3 bg-muted/20 p-3.5 rounded-xl border">
                <div>
                  <label htmlFor="cash-given" className="text-sm font-semibold text-muted-foreground block mb-1.5">
                    Tiền khách đưa
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="cash-given"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={cashGiven}
                      onFocus={selectOnFocus}
                      onChange={e => setCashGiven(Number(e.target.value) || 0)}
                      className="h-11 text-lg font-bold"
                    />
                    <span className="text-sm font-semibold">đ</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <button type="button" onClick={() => setCashGiven(totalAmount)} className="px-2.5 py-1 rounded-lg border-1.5 border-black text-xs font-bold bg-[#BBF7D0]">
                      Vừa đủ
                    </button>
                    {QUICK_CASH.filter(v => v >= totalAmount * 0.5).map(v => (
                      <button key={v} type="button" onClick={() => setCashGiven(v)} className="px-2.5 py-1 rounded-lg border-1.5 border-black text-xs font-bold bg-white">
                        {v / 1000}k
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Tiền thối lại</span>
                  <strong className={cn('text-lg', cashGiven < totalAmount ? 'text-red-600' : 'text-emerald-600')}>
                    {cashGiven < totalAmount ? `Thiếu ${formatVND(totalAmount - cashGiven)}` : formatVND(changeMoney)}
                  </strong>
                </div>
              </div>

              <Button
                onClick={handleConfirmCash}
                disabled={cashGiven < totalAmount}
                className="w-full h-11 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Xác Nhận Đã Nhận Tiền & Hoàn Tất
              </Button>
            </div>
          ) : currentOrder ? (
            <div className="space-y-4">
              <div className="bg-muted/40 p-3 rounded-xl flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <span className="text-xs text-muted-foreground block">Mã đơn hàng</span>
                  <strong className="text-foreground truncate block">{currentOrder.orderCode}</strong>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-muted-foreground block">Cần thanh toán</span>
                  <strong className="text-rose-600 text-base">{formatVND(currentOrder.totalAmount)}</strong>
                </div>
              </div>

                <div className="flex flex-col items-center p-3 bg-white border rounded-2xl">
                  {currentOrder.qrCodeUrl ? (
                    <div className="flex flex-col items-center">
                      <img src={currentOrder.qrCodeUrl} alt="VietQR" className="w-full max-w-56 h-auto rounded-xl shadow-md border" />
                      <div className="mt-2 text-center text-xs text-muted-foreground">
                        <p>Nội dung CK: <strong className="text-rose-600 text-sm">{currentOrder.transferContent}</strong></p>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Đang chờ SePay xác nhận tự động
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-xs text-muted-foreground text-center px-4">
                      Chưa có mã QR — kiểm tra lại cấu hình tài khoản ngân hàng trong "Cài đặt SePay".
                    </div>
                  )}

                  {/* Chụp / tải ảnh xác nhận chuyển khoản */}
                  <div className="w-full mt-4 pt-3 border-t">
                    <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-rose-500" /> Ảnh xác nhận chuyển khoản (tùy chọn)
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()} disabled={isUploadingProof} className="rounded-xl text-xs h-10">
                        <Camera className="w-4 h-4 mr-1" /> Chụp ảnh
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingProof} className="rounded-xl text-xs h-10">
                        <UploadSimple className="w-4 h-4 mr-1" /> Chọn ảnh
                      </Button>
                      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleProofFileChange} className="hidden" />
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProofFileChange} className="hidden" />
                    </div>

                    {proofImagePreview && (
                      <div className="mt-2 relative rounded-lg overflow-hidden border">
                        <img src={proofImagePreview} alt="Ảnh bill" className="w-full h-32 object-cover" />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
                          {isUploadingProof ? 'Đang tải lên...' : 'Đã đính kèm ảnh'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

              <Button
                onClick={handleConfirmPaid}
                disabled={isConfirmingPaid}
                className="w-full h-11 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" /> {isConfirmingPaid ? 'Đang xác nhận...' : 'Xác Nhận Đã Nhận Đủ Tiền'}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      {/* Chọn màu khi bấm sản phẩm có phân loại */}
      <Dialog open={!!pickingProduct} onOpenChange={o => !o && setPickingProduct(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="pr-8">Chọn màu: {pickingProduct?.name}</DialogTitle>
          </DialogHeader>
          {pickingProduct && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {sellableVariants(pickingProduct).map(v => (
                  <button
                    key={v.id}
                    type="button"
                    disabled={v.currentStock <= 0}
                    onClick={() => {
                      addToCart(pickingProduct, v.id);
                      setPickingProduct(null);
                    }}
                    className="rounded-xl border-2 border-slate-200 hover:border-slate-900 p-1.5 text-left disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ProductImage src={v.imageUrl || pickingProduct.mainImageUrl} alt={v.name} className="w-full aspect-square rounded-lg" />
                    <span className="flex items-center gap-1 mt-1 text-xs font-bold">
                      <span className="w-3 h-3 rounded-full border border-black/20 shrink-0" style={{ background: v.colorHex || '#e2e8f0' }} />
                      <span className="truncate">{v.name}</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">{v.currentStock > 0 ? `Còn ${v.currentStock}` : 'Hết hàng'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

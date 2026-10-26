import React, { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as signalR from '@microsoft/signalr';
import { toast } from 'sonner';
import {
  Sparkle,
  ShoppingCart,
  Video,
  Plus,
  Minus,
  QrCode,
  Money,
  CheckCircle,
  ArrowRight,
  MagnifyingGlass,
  Trash,
  Copy,
  Truck,
  X
} from '@phosphor-icons/react';

import { productApi, type Product } from '@/lib/api/squishy/productApi';
import { categoryApi } from '@/lib/api/squishy/categoryApi';
import { orderApi, type CreateOrderInput, type Order } from '@/lib/api/squishy/orderApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProductImage } from '@/components/shop/product-image';
import { VariantPicker } from '@/components/shop/variant-picker';
import { cartKey, findVariant, hasVariants, lineImage, lineName, sellableStock, sellableVariants, stockOf } from '@/lib/variants';
import { cn, formatVND, getFileUrl, getHubUrl, isValidVNPhone } from '@/lib/utils';

export const Route = createFileRoute('/_public/')({
  component: SquishyStorefront,
});

interface CartItem {
  product: Product;
  /** Màu đã chọn (sản phẩm có phân loại) */
  variantId?: string;
  quantity: number;
}

// Mỗi màu là 1 dòng riêng trong giỏ (giỏ cũ lưu trước khi có màu vẫn dùng được)
const itemKey = (i: CartItem) => cartKey(i.product.id, i.variantId);

const CART_STORAGE_KEY = 'squishy-cart';
const FREE_SHIP_THRESHOLD = 200000;
const SHIPPING_FEE = 25000;

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Bộ nhớ trình duyệt bị chặn (chế độ ẩn danh...) thì bỏ qua
  }
}

function SquishyStorefront() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [keyword, setKeyword] = useState<string>('');

  // Giỏ hàng được lưu lại trên trình duyệt để khách không mất khi tải lại trang
  const [cart, setCart] = useState<CartItem[]>(() => readStorage<CartItem[]>(CART_STORAGE_KEY, []));
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Thông tin nhận hàng (ghi nhớ cho lần mua sau)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER_QR' | 'COD'>('BANK_TRANSFER_QR');

  // Kết quả đặt hàng
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [isPaymentPaid, setIsPaymentPaid] = useState(false);

  // Xem video
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // Xem chi tiết sản phẩm
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [detailMediaTab, setDetailMediaTab] = useState<'IMAGES' | 'VIDEO'>('IMAGES');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [detailVariantId, setDetailVariantId] = useState<string | undefined>(undefined);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');

  const openProductDetail = (p: Product, initialTab: 'IMAGES' | 'VIDEO' = 'IMAGES') => {
    setSelectedProductForDetail(p);
    setDetailMediaTab(initialTab);
    setActiveImageIndex(0);
    setDetailQuantity(1);
    // Chọn sẵn màu đầu tiên còn hàng
    setDetailVariantId(sellableVariants(p).find(v => v.currentStock > 0)?.id);
  };

  useEffect(() => {
    writeStorage(CART_STORAGE_KEY, cart);
  }, [cart]);

  // Queries
  const { data: categoriesRes } = useQuery({
    queryKey: ['squishyPublicCategories'],
    queryFn: categoryApi.getAll,
  });
  const categories = categoriesRes?.data || [];
  const totalProductCount = categories.reduce((acc, c) => acc + (c.productCount || 0), 0);

  const { data: productsRes, isLoading } = useQuery({
    queryKey: ['squishyPublicProducts', selectedCategory],
    queryFn: () => productApi.getActive(selectedCategory === 'ALL' ? undefined : selectedCategory),
  });
  const products = productsRes?.data || [];

  const filteredProducts = products.filter(p => {
    if (selectedTypeFilter !== 'ALL') {
      if (!p.squishyType || !p.squishyType.toLowerCase().includes(selectedTypeFilter.toLowerCase())) {
        return false;
      }
    }
    if (!keyword.trim()) return true;
    const kw = keyword.toLowerCase();
    return p.name.toLowerCase().includes(kw) || (p.squishyType && p.squishyType.toLowerCase().includes(kw));
  });

  // Lắng nghe xác nhận thanh toán realtime từ SePay
  useEffect(() => {
    if (!placedOrder || placedOrder.paymentMethod !== 'BANK_TRANSFER_QR') return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(getHubUrl())
      .withAutomaticReconnect()
      .build();

    connection.on('OrderPaid', (data: any) => {
      if (data.orderId === placedOrder.id || data.orderCode === placedOrder.orderCode) {
        setIsPaymentPaid(true);
        toast.success(`🎉 Cảm ơn bạn! Hệ thống đã nhận thanh toán cho đơn ${data.orderCode}!`);
      }
    });

    connection.start().catch(() => {});

    return () => {
      connection.stop();
    };
  }, [placedOrder]);

  const cartCount = cart.reduce((a, b) => a + b.quantity, 0);

  // Cart operations
  const addToCart = (product: Product, variantId?: string, qty = 1) => {
    // Sản phẩm có nhiều màu: mở chi tiết để khách chọn màu
    if (hasVariants(product) && !variantId) {
      openProductDetail(product);
      return;
    }
    const stock = stockOf(product, variantId);
    if (stock <= 0) {
      toast.error('Sản phẩm này tạm thời hết hàng!');
      return;
    }

    const key = cartKey(product.id, variantId);
    const inCart = cart.find(i => itemKey(i) === key)?.quantity ?? 0;
    const addQty = Math.min(qty, stock - inCart);
    if (addQty <= 0) {
      toast.warning(`Kho chỉ còn ${stock} món!`);
      return;
    }

    setCart(prev =>
      prev.some(i => itemKey(i) === key)
        ? prev.map(i => itemKey(i) === key ? { ...i, quantity: i.quantity + addQty } : i)
        : [...prev, { product, variantId, quantity: addQty }]
    );
    if (addQty < qty) toast.warning(`Kho chỉ còn ${stock} món, đã thêm ${addQty}.`);
    toast.success(`Đã thêm "${lineName(product, variantId)}" vào giỏ hàng!`, {
      action: { label: 'Xem giỏ', onClick: () => setIsCartOpen(true) },
    });
  };

  const updateQuantity = (key: string, delta: number) => {
    const item = cart.find(i => itemKey(i) === key);
    if (item && item.quantity + delta > stockOf(item.product, item.variantId)) {
      toast.warning(`Kho chỉ còn ${stockOf(item.product, item.variantId)} món!`);
      return;
    }
    setCart(prev =>
      prev
        .map(i => itemKey(i) === key ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0)
    );
  };

  const removeFromCart = (key: string) => {
    setCart(prev => prev.filter(i => itemKey(i) !== key));
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.quantity * item.product.salePrice, 0);
  const shippingFee = cartTotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FEE;
  const grandTotal = cartTotal + shippingFee;
  const remainingForFreeShip = Math.max(0, FREE_SHIP_THRESHOLD - cartTotal);

  // Checkout Mutation
  const orderMutation = useMutation({
    mutationFn: orderApi.create,
    onSuccess: (res) => {
      if (res.isSuccess && res.data) {
        setPlacedOrder(res.data);
        setIsPaymentPaid(false);
        setIsCartOpen(false);
        setIsSuccessModalOpen(true);
        // Gửi xong thì xóa sạch form để đơn sau (hoặc người sau) nhập mới từ đầu
        setCart([]);
        setOrderNote('');
        setCustomerName('');
        setCustomerPhone('');
        setShippingAddress('');
        setPhoneError('');
        toast.success(`Đặt hàng thành công! Mã đơn: ${res.data.orderCode}`);
      } else {
        toast.error(res.message || 'Lỗi khi đặt hàng');
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể tạo đơn đặt hàng.');
    }
  });

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !shippingAddress.trim()) {
      toast.error('Vui lòng điền họ tên, số điện thoại và địa chỉ giao hàng.');
      return;
    }
    if (!isValidVNPhone(customerPhone)) {
      setPhoneError('Số điện thoại chưa đúng (VD: 0912345678)');
      return;
    }
    if (cart.length === 0) {
      toast.error('Giỏ hàng trống!');
      return;
    }

    const payload: CreateOrderInput = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      orderType: 'DELIVERY',
      shippingAddress: shippingAddress.trim(),
      shippingFee,
      // Đơn được miễn ship: shop trả phí ship (shop nhập phí thực tế khi gửi hàng)
      shippingPayer: shippingFee === 0 ? 'SENDER' : 'RECEIVER',
      discountAmount: 0,
      paymentMethod: paymentMethod === 'BANK_TRANSFER_QR' ? 'BANK_TRANSFER_QR' : 'COD',
      note: orderNote.trim(),
      items: cart.map(i => ({
        productId: i.product.id,
        variantId: i.variantId,
        quantity: i.quantity,
        unitPrice: i.product.salePrice,
      })),
    };

    orderMutation.mutate(payload);
  };

  const copyText = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error('Không sao chép được, vui lòng chép thủ công.');
    }
  };

  const chipClass = (active: boolean) =>
    cn(
      'px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl text-sm font-bold transition-all shrink-0 cursor-pointer border-2 border-black',
      active ? 'bg-[#FEF08A] text-black shadow-[2px_2px_0px_#000]' : 'bg-white hover:bg-slate-100 text-slate-800'
    );

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* 1. HERO */}
      <section className="container mx-auto max-w-6xl px-4 pt-6 pb-2 sm:py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-[#DDD6FE] border-2 border-black text-black text-[11px] sm:text-sm font-black shadow-[2px_2px_0px_#000]">
              <Sparkle className="w-4 h-4 text-black shrink-0" weight="fill" />
              <span>NƠI ƯƠM MẦM ĐỒ CHƠI KAWAII SÁNG TẠO</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-[1.75rem] leading-tight sm:text-5xl font-black text-black tracking-tight">
                Đánh thức sáng tạo
              </h1>
              <div className="inline-block bg-[#FEF08A] border-[3px] border-black rounded-2xl px-3 sm:px-4 py-1 shadow-[4px_4px_0px_#000] -rotate-1">
                <span className="text-xl sm:text-4xl font-black text-black">
                  cùng Squishy Pop!
                </span>
              </div>
            </div>

            <p className="text-slate-700 text-sm sm:text-base font-semibold leading-relaxed max-w-xl">
              Khám phá thế giới đồ chơi Squishy Slow-rising đầy niềm vui và sắc màu. Chất liệu bọt xốp PU dẻo mềm 100% an toàn giúp bé và bạn tự tin thỏa sức sáng tạo và giải tỏa căng thẳng học tập.
            </p>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 pt-1">
              <a
                href="#products-section"
                className="doodle-btn bg-[#FFB4B4] hover:bg-[#FFA0A0] text-black px-4 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-black flex items-center justify-center gap-2 shadow-[4px_4px_0px_#000]"
              >
                <span>Khám phá ngay</span>
                <ArrowRight className="w-5 h-5 text-black" weight="bold" />
              </a>

              <button
                onClick={() => setIsCartOpen(true)}
                className="doodle-btn bg-white hover:bg-slate-50 text-black px-4 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-black flex items-center justify-center gap-2 shadow-[4px_4px_0px_#000]"
              >
                <ShoppingCart className="w-5 h-5 text-black" weight="bold" />
                <span>Giỏ hàng ({cartCount})</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-sm font-bold text-slate-800">
              {['Bọt xốp an toàn 100%', 'Chậm tăng đàn hồi 8-10s', 'Giao hàng kiểm tra nhận'].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" weight="bold" />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ảnh minh họa */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="w-full max-w-[18rem] sm:max-w-md aspect-square sm:aspect-[4/4.2] rounded-3xl border-[3px] sm:border-[3.5px] border-black bg-white shadow-[6px_6px_0px_#000] sm:shadow-[8px_8px_0px_#000] overflow-hidden relative rotate-1">
              <img
                src="https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop&q=80"
                alt="Squishy bóp bóp mềm mềm"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 bg-[#FEF08A] border-2 border-black rounded-xl px-2.5 sm:px-3 py-1 shadow-[2px_2px_0px_#000]">
                <span className="text-[11px] sm:text-xs font-black text-black">⭐ Siêu đàn hồi 100%</span>
              </div>
              <div className="absolute bottom-3 left-3 bg-[#A7F3D0] border-2 border-black rounded-xl px-2.5 sm:px-3 py-1 shadow-[2px_2px_0px_#000]">
                <span className="text-[11px] sm:text-xs font-black text-black">🎨 Thỏa sức sáng tạo!</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. DANH SÁCH SẢN PHẨM */}
      <section id="products-section" className="container mx-auto max-w-6xl px-4 space-y-4 sm:space-y-6 scroll-mt-24">
        <div className="doodle-card p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-black flex items-center gap-2">
              <Sparkle className="w-5 h-5 sm:w-6 sm:h-6 text-black shrink-0" weight="fill" /> Bộ Sưu Tập Squishy
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-semibold">Chất liệu bọt xốp PU an toàn 100% cho mọi lứa tuổi</p>
          </div>

          <div className="relative w-full sm:w-72">
            <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black" weight="bold" />
            <Input
              type="search"
              placeholder="Tìm theo tên squishy..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className="doodle-input pl-9 h-10 text-base sm:text-sm font-medium"
            />
          </div>
        </div>

        {/* Danh mục: cuộn ngang trên điện thoại */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setSelectedCategory('ALL')} className={chipClass(selectedCategory === 'ALL')}>
              🌟 Tất cả danh mục ({totalProductCount || products.length})
            </button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={chipClass(selectedCategory === cat.id)}>
                ✨ {cat.name} ({cat.productCount})
              </button>
            ))}
          </div>

          {/* Lọc theo đặc tính Squishy */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="font-black text-slate-700 mr-1">Đặc tính:</span>
            {[
              { id: 'ALL', label: 'Tất cả loại' },
              { id: 'Slow-rising', label: '⏱️ Chậm tăng đàn hồi' },
              { id: 'Jumbo', label: '👑 Jumbo siêu to' },
              { id: 'Mochi', label: '🍮 Mochi dẻo dính' },
              { id: 'Scented', label: '🍓 Có mùi thơm' },
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTypeFilter(t.id)}
                className={cn(
                  "px-2.5 py-1 rounded-xl font-bold border-1.5 border-black transition-all text-xs cursor-pointer",
                  selectedTypeFilter === t.id
                    ? "bg-[#A7F3D0] text-black shadow-[1.5px_1.5px_0px_#000]"
                    : "bg-white text-slate-700 hover:bg-slate-50"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="doodle-card p-3 space-y-3 animate-pulse">
                <div className="aspect-square rounded-xl bg-slate-200" />
                <div className="h-3 rounded bg-slate-200 w-4/5" />
                <div className="h-3 rounded bg-slate-200 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-14 text-center doodle-card space-y-2 px-4">
            <Sparkle className="w-12 h-12 text-amber-500 mx-auto animate-bounce" weight="fill" />
            <p className="font-black text-base sm:text-lg text-black">Chưa tìm thấy mẫu squishy nào phù hợp.</p>
            {(keyword || selectedTypeFilter !== 'ALL') && (
              <button 
                onClick={() => { setKeyword(''); setSelectedTypeFilter('ALL'); }} 
                className="doodle-btn bg-white text-sm px-3 py-1.5 mt-2"
              >
                Xóa bộ lọc tìm kiếm
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {filteredProducts.map(product => {
              const isOut = sellableStock(product) <= 0;
              const hasVideo = product.videos && product.videos.length > 0;
              const inCartQty = cart.filter(i => i.product.id === product.id).reduce((a, i) => a + i.quantity, 0);
              const inCart = inCartQty > 0 ? { quantity: inCartQty } : null;

              return (
                <div
                  key={product.id}
                  onClick={() => openProductDetail(product)}
                  className="doodle-card p-2.5 sm:p-3.5 doodle-card-hover flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="w-full aspect-square rounded-xl sm:rounded-2xl overflow-hidden border-2 border-black bg-rose-50 relative mb-2.5 sm:mb-3 shadow-[1.5px_1.5px_0px_#000]">
                      <ProductImage
                        width={320}
                        src={product.mainImageUrl}
                        alt={product.name}
                        className={cn('w-full h-full group-hover:scale-105 transition-transform duration-300', isOut && 'grayscale opacity-70')}
                      />

                      {product.squishyType && (
                        <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 max-w-[calc(100%-1rem)] truncate bg-[#FEF08A] text-black border-1.5 border-black text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-md shadow-[1px_1px_0px_#000]">
                          ✨ {product.squishyType}
                        </span>
                      )}

                      {isOut && (
                        <span className="absolute inset-x-0 bottom-0 bg-black/75 text-white text-[11px] font-black text-center py-1">
                          TẠM HẾT HÀNG
                        </span>
                      )}

                      {/* Video Review badge / button */}
                      {hasVideo && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openProductDetail(product, 'VIDEO');
                          }}
                          className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 bg-black/90 hover:bg-black text-white border-1.5 border-white rounded-full px-2 py-1 shadow-[2px_2px_0px_#000] hover:scale-105 transition-transform flex items-center gap-1 z-10"
                          title="Xem clip bóp chậm tăng"
                        >
                          <Video className="w-3.5 h-3.5 text-purple-300" weight="fill" />
                          <span className="text-[10px] font-black tracking-wider">VIDEO</span>
                        </button>
                      )}

                      {/* Multi-images count */}
                      {product.images && product.images.length > 0 && (
                        <span className="absolute bottom-1.5 left-1.5 bg-white/90 text-black border border-black rounded-md px-1.5 py-0.5 text-[9px] font-black shadow-[1px_1px_0px_#000]">
                          📸 +{product.images.length} ảnh
                        </span>
                      )}

                      {inCart && (
                        <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-[#FFB5B5] text-black border-2 border-black text-[11px] font-black rounded-full w-6 h-6 flex items-center justify-center shadow-[1px_1px_0px_#000]">
                          {inCart.quantity}
                        </span>
                      )}
                    </div>

                    <h3 className="font-black text-[13px] sm:text-base text-slate-900 line-clamp-2 leading-snug mb-1 group-hover:text-rose-600 transition-colors">
                      {product.name}
                    </h3>

                    {product.description && (
                      <p className="hidden sm:block text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed mb-2">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 sm:pt-3 border-t border-slate-200/40 flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-2">
                    <span className="self-start border-1.5 border-black rounded-lg bg-[#FEF08A] px-2 py-0.5 text-sm sm:text-base font-black text-black shadow-[1px_1px_0px_#000]">
                      {formatVND(product.salePrice)}
                    </span>

                    <div className="flex items-center gap-1.5 w-full min-[420px]:w-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openProductDetail(product);
                        }}
                        className="doodle-btn bg-white hover:bg-slate-100 text-black text-xs px-2.5 py-1.5 font-bold flex-1 min-[420px]:flex-initial"
                        title="Xem ảnh chi tiết và clip test"
                      >
                        👁️ Chi tiết
                      </button>

                      <button
                        disabled={isOut}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                        className={cn(
                          'doodle-btn text-xs sm:text-sm px-3 py-1.5 font-black whitespace-nowrap flex-1 min-[420px]:flex-initial',
                          isOut ? 'bg-slate-200 text-slate-500' : 'bg-[#FFB4B4] hover:bg-[#FFA0A0] text-black'
                        )}
                      >
                        {isOut ? 'Hết' : hasVariants(product) ? 'Chọn màu' : '+ Giỏ'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. NÚT GIỎ HÀNG NỔI */}
      <div className="fixed bottom-safe right-4 sm:right-6 z-40">
        <button
          onClick={() => setIsCartOpen(true)}
          aria-label={`Mở giỏ hàng (${cartCount} món)`}
          className="relative bg-[#FFB4B4] hover:bg-[#FFA0A0] text-black border-[2.5px] border-black p-3.5 sm:p-4 rounded-full shadow-[3px_3px_0px_#000] hover:-translate-y-0.5 transition-transform flex items-center justify-center"
        >
          <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7" weight="bold" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#FEF08A] text-black text-xs font-black rounded-full min-w-6 h-6 px-1 flex items-center justify-center border-2 border-black">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* 4. GIỎ HÀNG & ĐẶT HÀNG */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-lg p-3.5 sm:p-5 gap-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              <ShoppingCart className="w-5 h-5 text-rose-500" weight="bold" /> Giỏ Hàng Của Bạn ({cartCount})
            </DialogTitle>
          </DialogHeader>

          {cart.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground space-y-2">
              <ShoppingCart className="w-14 h-14 mx-auto text-rose-200" />
              <p className="font-bold text-foreground">Giỏ hàng của bạn đang trống!</p>
              <p className="text-xs">Hãy chọn những bé squishy đáng yêu thêm vào giỏ nhé</p>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="doodle-btn bg-[#FEF08A] text-black text-sm px-4 py-2 mt-3"
              >
                Xem sản phẩm
              </button>
            </div>
          ) : (
            <form onSubmit={handlePlaceOrder} className="space-y-3.5">
              {/* Danh sách món */}
              <div className="divide-y border-2 border-black rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                {cart.map(item => (
                  <div key={itemKey(item)} className="p-2.5 flex items-center gap-2.5 bg-card">
                    <ProductImage
                      src={lineImage(item.product, item.variantId)}
                      alt={lineName(item.product, item.variantId)}
                      className="w-12 h-12 rounded-xl border bg-rose-50 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold line-clamp-2 text-foreground leading-snug">{lineName(item.product, item.variantId)}</h4>
                      <span className="text-xs font-black text-rose-600">
                        {formatVND(item.product.salePrice * item.quantity)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQuantity(itemKey(item), -1)}
                        aria-label="Giảm số lượng"
                        className="w-8 h-8 rounded-lg border-1.5 border-black bg-white flex items-center justify-center"
                      >
                        <Minus className="w-3.5 h-3.5" weight="bold" />
                      </button>
                      <span className="w-6 text-center text-sm font-black">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(itemKey(item), 1)}
                        aria-label="Tăng số lượng"
                        className="w-8 h-8 rounded-lg border-1.5 border-black bg-[#FEF08A] flex items-center justify-center"
                      >
                        <Plus className="w-3.5 h-3.5" weight="bold" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(itemKey(item))}
                        aria-label="Xóa khỏi giỏ"
                        className="w-8 h-8 flex items-center justify-center text-rose-500 hover:text-rose-700"
                      >
                        <Trash className="w-4 h-4" weight="bold" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Gợi ý miễn phí ship */}
              <div className="flex items-center gap-2 text-xs font-bold rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50 px-3 py-2 text-emerald-800">
                <Truck className="w-4 h-4 shrink-0" weight="bold" />
                {remainingForFreeShip > 0
                  ? <span>Mua thêm <strong>{formatVND(remainingForFreeShip)}</strong> để được miễn phí giao hàng!</span>
                  : <span>Đơn của bạn được <strong>miễn phí giao hàng</strong> 🎉</span>}
              </div>

              {/* Thông tin nhận hàng */}
              <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-100 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 block">
                  Thông tin giao hàng
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    required
                    autoComplete="name"
                    placeholder="Họ và tên của bạn *"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="h-10 text-base sm:text-sm rounded-xl bg-white"
                  />
                  <div>
                    <Input
                      required
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="Số điện thoại *"
                      value={customerPhone}
                      onChange={e => {
                        setCustomerPhone(e.target.value);
                        setPhoneError('');
                      }}
                      aria-invalid={!!phoneError}
                      className="h-10 text-base sm:text-sm rounded-xl bg-white"
                    />
                    {phoneError && <p className="text-[11px] text-red-600 font-semibold mt-1">{phoneError}</p>}
                  </div>
                </div>

                <Input
                  required
                  autoComplete="street-address"
                  placeholder="Địa chỉ nhận hàng (số nhà, đường...) *"
                  value={shippingAddress}
                  onChange={e => setShippingAddress(e.target.value)}
                  className="h-10 text-base sm:text-sm rounded-xl bg-white"
                />

                <Input
                  placeholder="Ghi chú (không bắt buộc)"
                  value={orderNote}
                  onChange={e => setOrderNote(e.target.value)}
                  className="h-10 text-base sm:text-sm rounded-xl bg-white"
                />
              </div>

              {/* Phương thức thanh toán */}
              <div>
                <span className="text-xs font-bold block mb-1.5 text-foreground">Hình thức thanh toán</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'BANK_TRANSFER_QR' as const, label: 'Quét QR', sub: 'Chuyển khoản', icon: <QrCode className="w-5 h-5 text-indigo-500" weight="bold" /> },
                    { id: 'COD' as const, label: 'COD', sub: 'Trả khi nhận hàng', icon: <Money className="w-5 h-5 text-emerald-500" weight="bold" /> },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      aria-pressed={paymentMethod === m.id}
                      className={cn(
                        'p-2.5 rounded-xl border-2 text-xs font-bold flex items-center gap-2 text-left transition-all',
                        paymentMethod === m.id ? 'bg-rose-50 border-black shadow-[2px_2px_0px_#000] text-black' : 'bg-background border-border text-muted-foreground'
                      )}
                    >
                      {m.icon}
                      <span className="leading-tight">
                        {m.label}
                        <span className="block text-[10px] font-semibold opacity-70">{m.sub}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tính tiền */}
              <div className="space-y-1 text-xs border-t pt-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Tiền hàng</span>
                  <span>{formatVND(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Phí giao hàng</span>
                  <span>{shippingFee === 0 ? <strong className="text-emerald-600">Miễn phí</strong> : formatVND(shippingFee)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-foreground pt-1 border-t">
                  <span>Tổng thanh toán</span>
                  <span className="text-rose-600">{formatVND(grandTotal)}</span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={orderMutation.isPending}
                className="w-full h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm sm:text-base border-2 border-black shadow-[3px_3px_0px_#000]"
              >
                {orderMutation.isPending ? 'Đang đặt hàng...' : `Đặt hàng • ${formatVND(grandTotal)}`}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 5. KẾT QUẢ ĐẶT HÀNG & QR */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-center text-foreground">
              {isPaymentPaid ? '🎉 Thanh Toán Thành Công!' : 'Đơn Hàng Đã Được Tạo!'}
            </DialogTitle>
          </DialogHeader>

          {placedOrder && (
            <div className="space-y-4 py-1">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-2 border-black">
                <CheckCircle className="w-10 h-10" weight="bold" />
              </div>

              <div>
                <p className="text-sm font-bold text-foreground">Mã đơn: <strong className="text-rose-600">{placedOrder.orderCode}</strong></p>
                <p className="text-lg font-black text-foreground">{formatVND(placedOrder.totalAmount)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Chúng mình đã nhận đơn và sẽ nhanh chóng đóng gói gửi bạn!</p>
              </div>

              {placedOrder.paymentMethod === 'BANK_TRANSFER_QR' && (
                <div className="p-3 sm:p-4 bg-rose-50/50 rounded-2xl border space-y-2">
                  <span className="text-xs font-bold text-rose-600 block">
                    {isPaymentPaid ? '✅ ĐÃ NHẬN THANH TOÁN' : 'Quét mã VietQR để thanh toán:'}
                  </span>

                  {!isPaymentPaid && placedOrder.qrCodeUrl && (
                    <div className="flex flex-col items-center">
                      <img src={placedOrder.qrCodeUrl} alt="QR thanh toán" className="w-full max-w-56 h-auto rounded-xl border shadow-md bg-white" />
                      {placedOrder.transferContent && (
                        <button
                          type="button"
                          onClick={() => copyText(placedOrder.transferContent!, 'Đã sao chép nội dung chuyển khoản')}
                          className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                        >
                          Nội dung CK: <strong className="text-rose-600 font-mono">{placedOrder.transferContent}</strong>
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Đang chờ thanh toán, trang sẽ tự cập nhật
                      </p>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={() => setIsSuccessModalOpen(false)}
                className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Tiếp Tục Mua Sắm
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 5.5. MODAL CHI TIẾT SẢN PHẨM & VIDEO REVIEW */}
      <Dialog open={!!selectedProductForDetail} onOpenChange={(open) => !open && setSelectedProductForDetail(null)}>
        <DialogContent className="sm:max-w-3xl p-4 sm:p-6 max-h-[90dvh] overflow-y-auto doodle-card border-[3px] border-black shadow-[6px_6px_0px_#000] bg-white">
          {selectedProductForDetail && (() => {
            const p = selectedProductForDetail;
            const allImages = [
              ...(p.mainImageUrl ? [p.mainImageUrl] : []),
              ...(p.images?.map(img => img.url) || [])
            ];
            const withVariants = hasVariants(p);
            const variant = findVariant(p, detailVariantId);
            // Ảnh của màu đang chọn đứng đầu danh sách ảnh
            const uniqueImages = Array.from(new Set([variant?.imageUrl, ...allImages].filter((x): x is string => !!x)));
            const currentImg = uniqueImages[activeImageIndex] || p.mainImageUrl;
            const hasVideo = p.videos && p.videos.length > 0;
            const stock = withVariants ? (variant ? variant.currentStock : 0) : p.currentStock;
            const isOut = withVariants ? sellableStock(p) <= 0 : stock <= 0;
            const needColor = withVariants && !variant;

            return (
              <div className="space-y-4">
                <DialogHeader className="pr-8 text-left">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span className="bg-[#FEF08A] text-black border-1.5 border-black text-xs font-black px-2.5 py-0.5 rounded-lg shadow-[1px_1px_0px_#000]">
                      🏷️ {p.categoryName || 'Squishy'}
                    </span>
                    {p.squishyType && (
                      <span className="bg-[#A7F3D0] text-black border-1.5 border-black text-xs font-black px-2.5 py-0.5 rounded-lg shadow-[1px_1px_0px_#000]">
                        ✨ {p.squishyType}
                      </span>
                    )}
                    <span className="bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold px-2 py-0.5 rounded-md">
                      Mã: {p.sku}
                    </span>
                  </div>
                  <DialogTitle className="text-xl sm:text-2xl font-black text-black leading-tight">
                    {p.name}
                  </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start text-left">
                  {/* Left Column: Media Gallery & Video */}
                  <div className="md:col-span-7 space-y-3">
                    {/* Media Tabs Switcher */}
                    <div className="flex items-center gap-2 p-1 bg-slate-100 border-2 border-black rounded-xl">
                      <button
                        type="button"
                        onClick={() => setDetailMediaTab('IMAGES')}
                        className={cn(
                          "flex-1 py-1.5 text-xs sm:text-sm font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                          detailMediaTab === 'IMAGES' 
                            ? "bg-white text-black border-1.5 border-black shadow-[1.5px_1.5px_0px_#000]" 
                            : "text-slate-600 hover:text-black"
                        )}
                      >
                        <span>📸 Ảnh chi tiết ({uniqueImages.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailMediaTab('VIDEO')}
                        className={cn(
                          "flex-1 py-1.5 text-xs sm:text-sm font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                          detailMediaTab === 'VIDEO' 
                            ? "bg-[#FEF08A] text-black border-1.5 border-black shadow-[1.5px_1.5px_0px_#000]" 
                            : "text-slate-600 hover:text-black"
                        )}
                      >
                        <Video className="w-4 h-4 text-purple-600" weight="bold" />
                        <span>🎥 Clip Review ({p.videos?.length || 0})</span>
                      </button>
                    </div>

                    {/* Media Display Area */}
                    {detailMediaTab === 'IMAGES' ? (
                      <div className="space-y-3">
                        {/* Main Big Photo */}
                        <div className="w-full aspect-square rounded-2xl border-2.5 border-black overflow-hidden bg-rose-50 shadow-[3px_3px_0px_#000] relative">
                          <ProductImage
                            width={640}
                            src={currentImg}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                          {isOut && (
                            <span className="absolute inset-x-0 bottom-0 bg-black/75 text-white text-xs font-black text-center py-1.5">
                              TẠM HẾT HÀNG
                            </span>
                          )}
                        </div>

                        {/* Thumbnails row */}
                        {uniqueImages.length > 1 && (
                          <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {uniqueImages.map((img, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveImageIndex(idx)}
                                className={cn(
                                  "w-16 h-16 rounded-xl border-2 overflow-hidden shrink-0 transition-transform cursor-pointer",
                                  activeImageIndex === idx
                                    ? "border-black shadow-[2px_2px_0px_#000] scale-105"
                                    : "border-slate-300 opacity-70 hover:opacity-100"
                                )}
                              >
                                <ProductImage src={img} alt={`Góc chụp ${idx + 1}`} className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Video Player Area */
                      <div className="space-y-2">
                        {hasVideo ? (
                          <div className="w-full aspect-video rounded-2xl border-2.5 border-black overflow-hidden bg-black shadow-[3px_3px_0px_#000]">
                            <video
                              src={getFileUrl(p.videos[0].url)}
                              controls
                              autoPlay
                              playsInline
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-full aspect-video rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-2">
                            <Video className="w-10 h-10 text-slate-400" />
                            <p className="font-bold text-sm text-slate-700">Mẫu này đang được quay video review</p>
                            <p className="text-xs text-slate-500">Shop sẽ sớm cập nhật clip bóp thử độ chậm tăng!</p>
                          </div>
                        )}
                        <p className="text-[11px] text-slate-600 font-semibold italic text-center">
                          💡 Clip quay bóp trực tiếp tại shop kiểm tra độ chậm tăng (slow-rising) 8-10s và độ mềm dẻo.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Info & Action */}
                  <div className="md:col-span-5 space-y-4">
                    {/* Price & Stock */}
                    <div className="bg-[#FAF7EE] border-2 border-black rounded-2xl p-4 shadow-[2px_2px_0px_#000] space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-rose-600">
                          {formatVND(p.salePrice)}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          / {p.unit || 'Chiếc'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200 text-xs font-bold">
                        {isOut ? (
                          <span className="text-rose-600 font-black flex items-center gap-1">
                            🔴 Tạm thời hết hàng
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-black flex items-center gap-1">
                            🟢 {needColor ? 'Chọn màu bạn thích bên dưới' : `Còn hàng: ${stock} ${p.unit || 'chiếc'} sẵn kho`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Highlights */}
                    <div className="space-y-2 text-xs font-bold text-slate-700 bg-white border-2 border-black rounded-2xl p-3.5 shadow-[2px_2px_0px_#000]">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-xs">✨</span>
                        <span>Chất liệu bọt xốp PU an toàn 100%, không độc hại</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-xs">⏱️</span>
                        <span>Độ đàn hồi phục hồi từ từ (Slow-rising 8-10 giây)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-xs">🚚</span>
                        <span>Giao hàng toàn quốc - Được kiểm tra hàng trước khi nhận</span>
                      </div>
                    </div>

                    {/* Description */}
                    {p.description && (
                      <div className="space-y-1">
                        <span className="text-xs font-black uppercase text-slate-400">Mô tả sản phẩm</span>
                        <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                          {p.description}
                        </p>
                      </div>
                    )}

                    {/* Chọn màu */}
                    {withVariants && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-black text-slate-800">Màu sắc{variant ? `: ${variant.name}` : ''}</span>
                        <VariantPicker
                          variants={sellableVariants(p)}
                          value={detailVariantId}
                          onChange={id => {
                            setDetailVariantId(id);
                            setActiveImageIndex(0);
                            setDetailQuantity(1);
                          }}
                        />
                      </div>
                    )}

                    {/* Quantity Selector */}
                    {!isOut && !needColor && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-800">Số lượng:</span>
                        <div className="flex items-center border-2 border-black rounded-xl bg-white shadow-[1.5px_1.5px_0px_#000]">
                          <button
                            type="button"
                            onClick={() => setDetailQuantity(Math.max(1, detailQuantity - 1))}
                            className="w-8 h-8 flex items-center justify-center text-black hover:bg-slate-100 font-black cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" weight="bold" />
                          </button>
                          <span className="w-10 text-center font-black text-sm">{detailQuantity}</span>
                          <button
                            type="button"
                            onClick={() => setDetailQuantity(Math.min(stock, detailQuantity + 1))}
                            className="w-8 h-8 flex items-center justify-center text-black hover:bg-slate-100 font-black cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" weight="bold" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2">
                      <button
                        disabled={isOut || needColor}
                        type="button"
                        onClick={() => {
                          addToCart(p, variant?.id, detailQuantity);
                          setSelectedProductForDetail(null);
                        }}
                        className={cn(
                          "w-full doodle-btn py-3 text-sm font-black flex items-center justify-center gap-2 shadow-[3px_3px_0px_#000]",
                          isOut ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-[#FFB4B4] hover:bg-[#FFA0A0] text-black"
                        )}
                      >
                        <ShoppingCart className="w-4 h-4" weight="bold" />
                        <span>{isOut ? 'Tạm hết hàng' : needColor ? 'Vui lòng chọn màu' : `Thêm ${detailQuantity} món vào giỏ`}</span>
                      </button>

                      {!isOut && !needColor && (
                        <button
                          type="button"
                          onClick={() => {
                            addToCart(p, variant?.id);
                            setSelectedProductForDetail(null);
                            setIsCartOpen(true);
                          }}
                          className="w-full doodle-btn py-3 text-sm font-black bg-[#FEF08A] hover:bg-[#FDE047] text-black flex items-center justify-center gap-2 shadow-[3px_3px_0px_#000]"
                        >
                          <span>⚡ Mua ngay</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* 6. XEM VIDEO */}
      <Dialog open={!!previewVideoUrl} onOpenChange={() => setPreviewVideoUrl(null)}>
        <DialogContent className="sm:max-w-lg p-2 bg-black" showCloseButton={false}>
          <DialogHeader className="sr-only">
            <DialogTitle>Video sản phẩm</DialogTitle>
          </DialogHeader>
          <button
            onClick={() => setPreviewVideoUrl(null)}
            aria-label="Đóng video"
            className="absolute top-3 right-3 z-10 bg-white/90 rounded-full p-1.5 border-2 border-black"
          >
            <X className="w-4 h-4" weight="bold" />
          </button>
          {previewVideoUrl && (
            <video src={previewVideoUrl} controls autoPlay playsInline className="w-full h-auto rounded-xl max-h-[80dvh]" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

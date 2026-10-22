import React, { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Check,
  Plus,
  Minus,
  MagnifyingGlassPlus,
  ArrowDown,
  CheckCircle,
  Gift,
  Fire,
  Sparkle,
  X,
  Clock
} from '@phosphor-icons/react';

import { preorderApi, type PreorderCampaignPage, type PreorderItem, type PreorderReceipt } from '@/lib/api/squishy/preorderApi';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProductImage } from '@/components/shop/product-image';
import { Mascot } from '@/components/shop/mascot';
import { cn, formatDateTime, formatVND, getFileUrl, isValidVNPhone } from '@/lib/utils';

// Trang riêng của một đợt đặt trước: không dùng khung cửa hàng để có thể gửi link
// hoặc đặt ở tên miền riêng mà khách chỉ thấy đúng các mẫu của đợt.
export const Route = createFileRoute('/dat-truoc/$slug')({
  component: CampaignPage,
});

const MAX_QTY = 99;

type Filter = 'ALL' | 'HOT' | 'NEW';

function TagBadge({ tag }: { tag: PreorderItem['tag'] }) {
  if (tag === 'NONE') return null;
  return (
    <span
      className={cn(
        'absolute top-2 left-2 inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-lg border-1.5 border-black shadow-[1px_1px_0_#000]',
        tag === 'HOT' ? 'bg-[#FFB4B4]' : 'bg-[#DDD6FE]'
      )}
    >
      {tag === 'HOT' ? <Fire className="w-3 h-3" weight="fill" /> : <Sparkle className="w-3 h-3" weight="fill" />}
      {tag === 'HOT' ? 'Hot' : 'Mới lạ'}
    </span>
  );
}

function StandaloneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen doodle-bg text-foreground flex flex-col font-sans">
      <header className="w-full max-w-6xl mx-auto px-3 sm:px-4 pt-3">
        <Link
          to="/dat-truoc"
          className="inline-flex items-center gap-2 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0_#000] px-3 py-2"
        >
          <span className="w-8 h-8 rounded-xl bg-[#FEF08A] border-2 border-black grid place-items-center">
            <Sparkle className="w-5 h-5" weight="fill" />
          </span>
          <span className="text-lg font-black tracking-tight leading-none">SQUISHY POP</span>
        </Link>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="text-center text-xs text-slate-500 py-6 px-4">© Squishy Pop • Đặt trước hàng sắp về</footer>
    </div>
  );
}

function CampaignPage() {
  const { slug } = Route.useParams();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['preorderCampaignPage', slug],
    queryFn: () => preorderApi.getCampaignPage(slug),
    retry: (count, err: any) => err?.response?.status !== 404 && count < 2,
  });

  if (isLoading) {
    return (
      <StandaloneShell>
        <div className="container mx-auto max-w-6xl px-4 py-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="doodle-card p-2.5 space-y-2 animate-pulse">
              <div className="aspect-[4/5] rounded-xl bg-slate-200" />
              <div className="h-3 rounded bg-slate-200 w-3/4" />
            </div>
          ))}
        </div>
      </StandaloneShell>
    );
  }

  if (isError || !data?.data) {
    const notFound = (error as any)?.response?.status === 404;
    return (
      <StandaloneShell>
        <section className="container mx-auto max-w-xl px-4 py-12">
          <div className="doodle-card p-6 sm:p-8 text-center space-y-3">
            <div className="flex justify-center"><Mascot mood="worried" size={100} color="#DDD6FE" /></div>
            <h1 className="text-xl font-black">{notFound ? 'Không tìm thấy đợt đặt trước này' : 'Không tải được trang'}</h1>
            <p className="text-sm text-slate-600">
              {notFound ? 'Link có thể đã bị đổi hoặc đợt đã kết thúc. Bạn nhắn shop để lấy link mới nhé.' : 'Kiểm tra kết nối mạng rồi thử lại giúp shop nhé.'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {!notFound && <button onClick={() => refetch()} className="doodle-btn bg-white px-4 py-2 text-sm">Thử lại</button>}
              <Link to="/dat-truoc" className="doodle-btn bg-[#FEF08A] px-4 py-2 text-sm">Xem các đợt đang mở</Link>
            </div>
          </div>
        </section>
      </StandaloneShell>
    );
  }

  return (
    <StandaloneShell>
      <CampaignOrderForm key={data.data.slug} campaign={data.data} onStale={() => refetch()} />
    </StandaloneShell>
  );
}

function CampaignOrderForm({ campaign, onStale }: { campaign: PreorderCampaignPage; onStale: () => void }) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [previewItem, setPreviewItem] = useState<PreorderItem | null>(null);
  const [receipt, setReceipt] = useState<(PreorderReceipt & { lines: { name: string; quantity: number }[] }) | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [social, setSocial] = useState('');
  const [instagram, setInstagram] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string; items?: string }>({});

  const isOpen = campaign.status === 'OPEN';
  const items = campaign.items;
  const visible = items.filter(i => filter === 'ALL' || i.tag === filter);
  const hasTags = items.some(i => i.tag !== 'NONE');

  const selected = items.filter(i => (quantities[i.id] ?? 0) > 0);
  const totalQty = selected.reduce((a, i) => a + quantities[i.id], 0);
  const totalAmount = selected.reduce((a, i) => a + quantities[i.id] * i.price, 0);

  const setQty = (id: string, qty: number) => {
    if (!isOpen) return;
    setQuantities(prev => ({ ...prev, [id]: Math.max(0, Math.min(MAX_QTY, qty)) }));
    setErrors(e => ({ ...e, items: undefined }));
  };
  const toggle = (id: string) => setQty(id, (quantities[id] ?? 0) > 0 ? 0 : 1);

  const scrollToForm = () => document.getElementById('thong-tin')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const mutation = useMutation({
    mutationFn: preorderApi.create,
    onSuccess: res => {
      setReceipt({ ...res.data, lines: selected.map(i => ({ name: i.name, quantity: quantities[i.id] })) });
      // Gửi xong thì xóa sạch form
      setQuantities({});
      setName('');
      setPhone('');
      setSocial('');
      setInstagram('');
      setAddress('');
      setNote('');
      setErrors({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Chưa gửi được đơn, bạn thử lại giúp shop nhé.');
      // Đợt vừa đóng hoặc mẫu vừa bị ẩn: tải lại để khách thấy tình trạng mới
      onStale();
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (selected.length === 0) next.items = 'Bạn chưa chọn mẫu nào.';
    if (name.trim().length < 2) next.name = 'Vui lòng nhập họ tên.';
    if (!isValidVNPhone(phone)) next.phone = 'Số điện thoại chưa đúng (VD: 0912345678).';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      if (next.items) document.getElementById('mau')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    mutation.mutate({
      campaignSlug: campaign.slug,
      customerName: name.trim(),
      customerPhone: phone.trim(),
      socialContact: social.trim() || undefined,
      instagramContact: instagram.trim().replace(/^@+/, '') || undefined,
      shippingAddress: address.trim() || undefined,
      note: note.trim() || undefined,
      lines: selected.map(i => ({ preorderItemId: i.id, quantity: quantities[i.id] })),
    });
  };

  // ===== Màn hình gửi thành công =====
  if (receipt) {
    return (
      <section className="container mx-auto max-w-xl px-4 py-10">
        <div className="doodle-card p-5 sm:p-7 text-center space-y-4">
          <div className="flex justify-center"><Mascot mood="wink" size={110} /></div>
          <h1 className="text-2xl font-black text-black">Đặt trước thành công! 🎉</h1>
          <p className="text-sm text-slate-700">
            Mã đơn của bạn là <strong className="font-mono text-base text-rose-600">{receipt.code}</strong> ({campaign.name}). Shop sẽ liên hệ qua số điện thoại bạn để lại khi hàng về.
          </p>
          <div className="text-left rounded-xl border-2 border-dashed border-slate-300 divide-y divide-slate-200 text-sm">
            {receipt.lines.map(l => (
              <div key={l.name} className="flex justify-between gap-3 px-3 py-2">
                <span>{l.name}</span>
                <strong>× {l.quantity}</strong>
              </div>
            ))}
            <div className="flex justify-between px-3 py-2 font-black">
              <span>Tạm tính ({receipt.totalQuantity} chiếc)</span>
              <span>{formatVND(receipt.totalAmount)}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">Chụp màn hình lại mã đơn để tiện đối chiếu nhé.</p>
          <button onClick={() => setReceipt(null)} className="doodle-btn bg-[#FEF08A] px-5 py-2.5 text-sm">
            Đặt thêm mẫu khác
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10 pb-28 pt-4 sm:pt-6">
      {/* Giới thiệu đợt */}
      <section className="container mx-auto max-w-6xl px-4">
        <div className="doodle-card p-5 sm:p-8 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 items-center bg-[#FFF7D6]">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border-2 border-black text-xs font-black shadow-[2px_2px_0_#000]">
              <Gift className="w-4 h-4" weight="fill" /> ĐẶT TRƯỚC
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-black leading-tight break-words">{campaign.name}</h1>
            <p className="text-sm sm:text-base text-slate-700 max-w-xl whitespace-pre-line">
              {campaign.description ||
                'Tích chọn mẫu bạn thích, chọn số lượng rồi để lại thông tin, shop sẽ giữ hàng và liên hệ bạn ngay khi hàng về. Bạn chưa cần thanh toán bây giờ.'}
            </p>
            {campaign.closeAt && isOpen && (
              <p className="inline-flex items-center gap-1.5 text-sm font-bold bg-white border-2 border-black rounded-full px-3 py-1">
                <Clock className="w-4 h-4" weight="bold" /> Nhận đơn đến {formatDateTime(campaign.closeAt)}
              </p>
            )}
            {isOpen && (
              <ol className="flex flex-wrap gap-2 text-xs sm:text-sm font-bold">
                {['Tích chọn mẫu', 'Chọn số lượng', 'Điền thông tin & gửi'].map((s, i) => (
                  <li key={s} className="flex items-center gap-1.5 bg-white border-2 border-black rounded-full pl-1 pr-3 py-0.5">
                    <span className="w-5 h-5 rounded-full bg-black text-white text-[11px] grid place-items-center">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="hidden md:block"><Mascot mood={isOpen ? 'happy' : 'sleepy'} size={150} /></div>
        </div>

        {!isOpen && (
          <div className="mt-4 doodle-card p-4 bg-[#DDD6FE] text-center font-bold text-sm sm:text-base">
            {campaign.status === 'UPCOMING'
              ? `⏰ Đợt này mở nhận đơn từ ${campaign.openAt ? formatDateTime(campaign.openAt) : 'sắp tới'}. Bạn xem trước mẫu và quay lại đặt nhé!`
              : '🔒 Đợt này đã đóng, shop không nhận thêm đơn. Cảm ơn bạn đã quan tâm!'}
          </div>
        )}
      </section>

      {/* Danh sách mẫu */}
      <section id="mau" className="container mx-auto max-w-6xl px-4 space-y-4 scroll-mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg sm:text-2xl font-black text-black">{isOpen ? 'Chọn mẫu bạn muốn đặt' : 'Các mẫu trong đợt'}</h2>
          {hasTags && (
            <div className="flex flex-wrap gap-2">
              {([['ALL', 'Tất cả'], ['HOT', '🔥 Bán chạy'], ['NEW', '✨ Mới lạ']] as [Filter, string][]).map(([f, label]) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={cn(
                    'px-3.5 py-1.5 rounded-2xl text-sm font-bold border-2 border-black transition-all',
                    filter === f ? 'bg-[#FEF08A] shadow-[2px_2px_0_#000]' : 'bg-white hover:bg-slate-100'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        {errors.items && <p className="text-sm font-bold text-red-600">{errors.items}</p>}

        {items.length === 0 ? (
          <div className="doodle-card p-8 text-center space-y-2">
            <div className="flex justify-center"><Mascot mood="sleepy" size={90} color="#DDD6FE" /></div>
            <p className="font-bold">Đợt này chưa có mẫu nào. Bạn quay lại sau nhé!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {visible.map(item => {
              const qty = quantities[item.id] ?? 0;
              const isSelected = qty > 0;
              return (
                <div
                  key={item.id}
                  className={cn(
                    'doodle-card p-2.5 sm:p-3 flex flex-col gap-2 transition-colors',
                    isSelected && 'bg-[#FFF7D6] ring-[3px] ring-[#FFB4B4] ring-offset-2 ring-offset-[#FAF7EE]'
                  )}
                >
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => (isOpen ? toggle(item.id) : setPreviewItem(item))}
                      aria-pressed={isOpen ? isSelected : undefined}
                      aria-label={isOpen ? `${isSelected ? 'Bỏ chọn' : 'Chọn'} ${item.name}` : `Xem ảnh lớn ${item.name}`}
                      className="block w-full aspect-[4/5] rounded-xl overflow-hidden border-2 border-black bg-white"
                    >
                      <ProductImage src={item.imageUrl} alt={item.name} className="w-full h-full" />
                    </button>
                    <TagBadge tag={item.tag} />
                    {isOpen && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'pointer-events-none absolute top-2 right-2 w-8 h-8 rounded-lg border-2 border-black grid place-items-center shadow-[1.5px_1.5px_0_#000] transition-colors',
                          isSelected ? 'bg-[#22c55e] text-white' : 'bg-white/90'
                        )}
                      >
                        {isSelected && <Check className="w-5 h-5" weight="bold" />}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      aria-label={`Xem ảnh lớn ${item.name}`}
                      className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white grid place-items-center hover:bg-black"
                    >
                      <MagnifyingGlassPlus className="w-4 h-4" weight="bold" />
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col gap-1.5">
                    <h3 className="font-black text-sm sm:text-base leading-snug text-black">{item.name}</h3>
                    {item.description && <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>}
                    <span className="self-start border-1.5 border-black rounded-lg bg-[#FEF08A] px-2 py-0.5 text-sm font-black">
                      {formatVND(item.price)}
                    </span>
                  </div>

                  {!isOpen ? null : isSelected ? (
                    <div className="flex items-center justify-between gap-1 rounded-xl border-2 border-black bg-white p-1">
                      <button type="button" onClick={() => setQty(item.id, qty - 1)} aria-label="Giảm" className="w-9 h-9 rounded-lg bg-slate-100 grid place-items-center hover:bg-slate-200">
                        <Minus className="w-4 h-4" weight="bold" />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={MAX_QTY}
                        value={qty}
                        onChange={e => setQty(item.id, Number(e.target.value) || 0)}
                        aria-label={`Số lượng ${item.name}`}
                        className="w-12 text-center font-black text-base bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button type="button" onClick={() => setQty(item.id, qty + 1)} aria-label="Tăng" className="w-9 h-9 rounded-lg bg-[#FEF08A] border-1.5 border-black grid place-items-center">
                        <Plus className="w-4 h-4" weight="bold" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => toggle(item.id)} className="doodle-btn bg-white hover:bg-[#FFF7D6] py-2 text-sm">
                      Chọn mẫu này
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Thông tin khách */}
      {isOpen && items.length > 0 && (
        <section id="thong-tin" className="container mx-auto max-w-2xl px-4 scroll-mt-4">
          <form onSubmit={submit} className="doodle-card p-4 sm:p-6 space-y-4" noValidate>
            <h2 className="text-lg sm:text-xl font-black text-black">Thông tin của bạn</h2>

            {selected.length > 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-300 divide-y divide-slate-200 text-sm">
                {selected.map(i => (
                  <div key={i.id} className="flex items-center gap-2.5 px-3 py-2">
                    <ProductImage src={i.imageUrl} alt={i.name} className="w-9 h-9 rounded-lg border shrink-0" />
                    <span className="flex-1 min-w-0 font-semibold">{i.name}</span>
                    <span className="text-slate-600 whitespace-nowrap">{quantities[i.id]} × {formatVND(i.price)}</span>
                    <button type="button" onClick={() => setQty(i.id, 0)} aria-label={`Bỏ ${i.name}`} className="p-1 text-slate-400 hover:text-red-600">
                      <X className="w-4 h-4" weight="bold" />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2 font-black">
                  <span>Tạm tính ({totalQty} chiếc)</span>
                  <span className="text-rose-600">{formatVND(totalAmount)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600 rounded-xl bg-slate-100 px-3 py-2">Bạn chưa chọn mẫu nào. Kéo lên trên để tích chọn nhé.</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block" htmlFor="po-name">
                <span className="text-sm font-semibold block mb-1.5">Họ và tên *</span>
                <Input id="po-name" autoComplete="name" value={name} onChange={e => { setName(e.target.value); setErrors(x => ({ ...x, name: undefined })); }} aria-invalid={!!errors.name} className="h-11 rounded-xl bg-white" />
                {errors.name && <span className="text-xs font-semibold text-red-600 mt-1 block">{errors.name}</span>}
              </label>
              <label className="block" htmlFor="po-phone">
                <span className="text-sm font-semibold block mb-1.5">Số điện thoại *</span>
                <Input id="po-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => { setPhone(e.target.value); setErrors(x => ({ ...x, phone: undefined })); }} aria-invalid={!!errors.phone} className="h-11 rounded-xl bg-white" />
                {errors.phone && <span className="text-xs font-semibold text-red-600 mt-1 block">{errors.phone}</span>}
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block" htmlFor="po-social">
                <span className="text-sm font-semibold block mb-1.5">Zalo / Facebook</span>
                <Input id="po-social" placeholder="Tên Zalo hoặc link Facebook" value={social} onChange={e => setSocial(e.target.value)} className="h-11 rounded-xl bg-white" />
              </label>
              <label className="block" htmlFor="po-instagram">
                <span className="text-sm font-semibold block mb-1.5">Instagram / Threads</span>
                <div className="flex items-center h-11 rounded-xl border bg-white focus-within:ring-1 focus-within:ring-ring/50 focus-within:border-ring">
                  <span className="pl-3 text-slate-400 font-semibold">@</span>
                  <input
                    id="po-instagram"
                    autoCapitalize="none"
                    autoCorrect="off"
                    maxLength={100}
                    placeholder="nick của bạn"
                    value={instagram}
                    onChange={e => setInstagram(e.target.value.replace(/^@+/, ''))}
                    className="flex-1 min-w-0 h-full pl-1 pr-3 bg-transparent outline-none text-base sm:text-sm"
                  />
                </div>
              </label>
            </div>
            <p className="-mt-2 text-xs text-slate-500">Để lại ít nhất một kênh (không bắt buộc) để shop nhắn tin cho bạn nhanh hơn.</p>
            <label className="block" htmlFor="po-address">
              <span className="text-sm font-semibold block mb-1.5">Địa chỉ nhận hàng (không bắt buộc)</span>
              <Input id="po-address" autoComplete="street-address" placeholder="Để trống nếu bạn qua shop lấy" value={address} onChange={e => setAddress(e.target.value)} className="h-11 rounded-xl bg-white" />
            </label>
            <label className="block" htmlFor="po-note">
              <span className="text-sm font-semibold block mb-1.5">Ghi chú</span>
              <textarea id="po-note" rows={2} maxLength={500} placeholder="VD: lấy màu hồng, cần gấp trước ngày 20..." value={note} onChange={e => setNote(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white text-base sm:text-sm" />
            </label>

            <button type="submit" disabled={mutation.isPending} className="doodle-btn w-full bg-[#FFB4B4] hover:bg-[#FFA0A0] py-3 text-base">
              {mutation.isPending ? 'Đang gửi...' : selected.length > 0 ? `Gửi đơn đặt trước • ${formatVND(totalAmount)}` : 'Gửi đơn đặt trước'}
            </button>
            <p className="text-xs text-slate-500 text-center">Thông tin của bạn chỉ dùng để shop liên hệ giao hàng.</p>
          </form>
        </section>
      )}

      {/* Thanh tóm tắt nổi */}
      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pt-2 pb-safe bg-gradient-to-t from-[#FAF7EE] via-[#FAF7EE]/95 to-transparent">
          <div className="mx-auto max-w-2xl doodle-card !rounded-2xl px-3 py-2.5 flex items-center justify-between gap-3">
            <div className="text-sm leading-tight min-w-0">
              <div className="font-black">Đã chọn {selected.length} mẫu • {totalQty} chiếc</div>
              <div className="text-rose-600 font-black">{formatVND(totalAmount)}</div>
            </div>
            <button onClick={scrollToForm} className="doodle-btn bg-[#FEF08A] px-4 py-2 text-sm flex items-center gap-1.5 shrink-0">
              Điền thông tin <ArrowDown className="w-4 h-4" weight="bold" />
            </button>
          </div>
        </div>
      )}

      {/* Xem ảnh lớn */}
      <Dialog open={!!previewItem} onOpenChange={o => !o && setPreviewItem(null)}>
        <DialogContent className="sm:max-w-lg p-3">
          <DialogHeader>
            <DialogTitle className="pr-8">{previewItem?.name}</DialogTitle>
          </DialogHeader>
          {previewItem && (
            <>
              <img src={getFileUrl(previewItem.imageUrl)} alt={previewItem.name} className="w-full h-auto max-h-[70dvh] object-contain rounded-xl bg-white" />
              <div className="flex items-center justify-between gap-3">
                <span className="text-lg font-black">{formatVND(previewItem.price)}</span>
                {isOpen && (
                  <button
                    onClick={() => {
                      if ((quantities[previewItem.id] ?? 0) === 0) setQty(previewItem.id, 1);
                      setPreviewItem(null);
                    }}
                    className="doodle-btn bg-[#FEF08A] px-4 py-2 text-sm flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" weight="bold" />
                    {(quantities[previewItem.id] ?? 0) > 0 ? 'Đã chọn' : 'Chọn mẫu này'}
                  </button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

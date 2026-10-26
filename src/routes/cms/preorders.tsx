import React, { useEffect, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MagnifyingGlass,
  Copy,
  Link as LinkIcon,
  Plus,
  PencilSimple,
  Trash,
  UploadSimple,
  MapPin,
  ChatCircleText,
  InstagramLogo,
  Phone,
  ArrowSquareOut,
  Lock,
  LockOpen,
  ListChecks,
  ChartBar
} from '@phosphor-icons/react';

import {
  preorderApi,
  preorderLink,
  type CampaignStatus,
  type PreorderCampaign,
  type SavePreorderCampaignInput,
  type Preorder,
  type PreorderItem,
  type PreorderStatus,
  type PreorderTag,
  type SavePreorderItemInput
} from '@/lib/api/squishy/preorderApi';
import { mediaApi } from '@/lib/api/squishy/mediaApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader, EmptyState, LoadingState } from '@/components/shop/page-header';
import { ProductImage } from '@/components/shop/product-image';
import { cn, formatDateTime, formatVND } from '@/lib/utils';

export const Route = createFileRoute('/cms/preorders')({
  component: PreordersScreen,
});

type Tab = 'CAMPAIGNS' | 'ORDERS' | 'SUMMARY' | 'ITEMS';

const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; className: string }> = {
  OPEN: { label: 'Đang nhận đơn', className: 'bg-emerald-100 text-emerald-800' },
  UPCOMING: { label: 'Chưa mở', className: 'bg-sky-100 text-sky-800' },
  CLOSED: { label: 'Đã đóng', className: 'bg-slate-200 text-slate-600' },
};

const STATUS_INFO: Record<PreorderStatus, { label: string; className: string }> = {
  NEW: { label: 'Mới', className: 'bg-amber-100 text-amber-800' },
  CONTACTED: { label: 'Đã liên hệ', className: 'bg-sky-100 text-sky-800' },
  CONFIRMED: { label: 'Đã chốt', className: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Đã hủy', className: 'bg-slate-200 text-slate-600' },
};

const TAG_LABELS: Record<PreorderTag, string> = { HOT: '🔥 Hot', NEW: '✨ Mới lạ', NONE: 'Không nhãn' };

const errorMessage = (err: any, fallback: string) => err?.response?.data?.message || fallback;

async function copyText(text: string, message: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  } catch {
    toast.error('Không sao chép được, vui lòng chép thủ công.');
  }
}

function PreordersScreen() {
  const [tab, setTab] = useState<Tab>('CAMPAIGNS');
  const [campaignId, setCampaignId] = useState('');
  const [editingCampaign, setEditingCampaign] = useState<PreorderCampaign | 'new' | null>(null);

  const { data: campaignsData } = useQuery({ queryKey: ['preorderCampaigns'], queryFn: preorderApi.getCampaigns });
  const campaigns = campaignsData?.data ?? [];

  const tabClass = (active: boolean) =>
    cn('px-3.5 py-2 rounded-xl text-sm font-bold border-2 border-black transition-all', active ? 'bg-[#FEF08A] shadow-[2px_2px_0_#000]' : 'bg-white hover:bg-slate-100');

  const openCampaignTab = (id: string, next: Tab) => {
    setCampaignId(id);
    setTab(next);
  };

  // Bộ lọc theo đợt dùng chung cho tab Đơn và Tổng hợp
  const campaignFilter = (
    <select
      value={campaignId}
      onChange={e => setCampaignId(e.target.value)}
      aria-label="Lọc theo đợt"
      className="h-10 text-base sm:text-sm w-full sm:w-auto sm:min-w-64"
    >
      <option value="">Tất cả các đợt</option>
      {campaigns.map(c => (
        <option key={c.id} value={c.id}>{c.name} ({CAMPAIGN_STATUS[c.status].label})</option>
      ))}
    </select>
  );

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-[1650px] mx-auto font-sans">
      <PageHeader
        emoji="🎁"
        title="Đặt trước hàng mới"
        description="Mỗi đợt có một link riêng chỉ gồm các mẫu của đợt đó. Gửi link cho khách, đơn sẽ hiện ở đây."
        actions={
          <button
            onClick={() => setEditingCampaign('new')}
            className="doodle-btn bg-[#FEF08A] hover:bg-[#FDE047] px-4 py-2.5 text-sm flex items-center justify-center gap-2 w-full md:w-auto"
          >
            <Plus className="w-4 h-4" weight="bold" /> Tạo đợt mới
          </button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTab('CAMPAIGNS')} className={tabClass(tab === 'CAMPAIGNS')}>Các đợt</button>
        <button onClick={() => setTab('ORDERS')} className={tabClass(tab === 'ORDERS')}>Đơn đặt trước</button>
        <button onClick={() => setTab('SUMMARY')} className={tabClass(tab === 'SUMMARY')}>Tổng hợp số lượng</button>
        <button onClick={() => setTab('ITEMS')} className={tabClass(tab === 'ITEMS')}>Kho mẫu</button>
      </div>

      {tab === 'CAMPAIGNS' && (
        <CampaignsTab
          onCreate={() => setEditingCampaign('new')}
          onEdit={c => setEditingCampaign(c)}
          onViewOrders={id => openCampaignTab(id, 'ORDERS')}
          onViewSummary={id => openCampaignTab(id, 'SUMMARY')}
        />
      )}
      {tab === 'ORDERS' && <OrdersTab campaignId={campaignId} campaignFilter={campaignFilter} />}
      {tab === 'SUMMARY' && <SummaryTab campaignId={campaignId} campaignFilter={campaignFilter} />}
      {tab === 'ITEMS' && <ItemsTab />}

      {editingCampaign !== null && (
        <CampaignDialog
          key={editingCampaign === 'new' ? 'new' : editingCampaign.id}
          campaign={editingCampaign === 'new' ? null : editingCampaign}
          onClose={() => setEditingCampaign(null)}
        />
      )}
    </div>
  );
}

const invalidateCampaignQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  ['preorderCampaigns', 'preorderOpenCampaigns', 'preorderCampaignPage', 'preorderSummary'].forEach(k =>
    queryClient.invalidateQueries({ queryKey: [k] })
  );
};

const toInputDateTime = (value?: string) => (value ? value.slice(0, 16) : '');

const toSaveInput = (c: PreorderCampaign): SavePreorderCampaignInput => ({
  name: c.name,
  slug: c.slug,
  description: c.description,
  openAt: c.openAt ?? null,
  closeAt: c.closeAt ?? null,
  isActive: c.isActive,
  itemIds: c.itemIds,
});

// ===================================================================================
// TAB 0: CÁC ĐỢT ĐẶT TRƯỚC
// ===================================================================================
function CampaignsTab({
  onCreate,
  onEdit,
  onViewOrders,
  onViewSummary,
}: {
  onCreate: () => void;
  onEdit: (c: PreorderCampaign) => void;
  onViewOrders: (id: string) => void;
  onViewSummary: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState<PreorderCampaign | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['preorderCampaigns'], queryFn: preorderApi.getCampaigns, refetchInterval: 60_000 });
  const { data: itemsData } = useQuery({ queryKey: ['preorderItemsAll'], queryFn: preorderApi.getAllItems });
  const campaigns = data?.data ?? [];
  const itemById = new Map((itemsData?.data ?? []).map(i => [i.id, i]));

  const toggleMutation = useMutation({
    mutationFn: (c: PreorderCampaign) => preorderApi.updateCampaign(c.id, { ...toSaveInput(c), isActive: !c.isActive }),
    onSuccess: res => {
      toast.success(res.data.isActive ? `Đã mở lại "${res.data.name}"` : `Đã đóng "${res.data.name}", khách không đặt thêm được`);
      invalidateCampaignQueries(queryClient);
    },
    onError: (err: any) => toast.error(errorMessage(err, 'Không cập nhật được đợt.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => preorderApi.deleteCampaign(id),
    onSuccess: () => {
      toast.success('Đã xóa đợt');
      setDeleting(null);
      invalidateCampaignQueries(queryClient);
    },
    onError: (err: any) => toast.error(errorMessage(err, 'Không xóa được đợt.')),
  });

  if (isLoading) return <div className="doodle-card"><LoadingState text="Đang tải các đợt..." /></div>;

  if (campaigns.length === 0) {
    return (
      <div className="doodle-card">
        <EmptyState title="Chưa có đợt đặt trước nào." description="Tạo đợt mới, chọn các mẫu sắp về rồi gửi link cho khách." />
        <div className="flex justify-center pb-6">
          <button onClick={onCreate} className="doodle-btn bg-[#FEF08A] px-4 py-2 text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" weight="bold" /> Tạo đợt mới
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
      {campaigns.map(c => {
        const link = preorderLink(c.slug);
        const thumbs = c.itemIds.flatMap(id => itemById.get(id) ?? []).slice(0, 7);
        return (
          <div key={c.id} className={cn('doodle-card p-4 flex flex-col gap-3', c.status === 'CLOSED' && 'bg-slate-50')}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-black text-base sm:text-lg leading-snug break-words">{c.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {c.openAt ? `Mở ${formatDateTime(c.openAt)}` : 'Mở ngay'} • {c.closeAt ? `Đóng ${formatDateTime(c.closeAt)}` : 'Không hẹn giờ đóng'}
                </p>
              </div>
              <span className={cn('text-xs font-bold px-2 py-0.5 rounded-md whitespace-nowrap', CAMPAIGN_STATUS[c.status].className)}>
                {CAMPAIGN_STATUS[c.status].label}
              </span>
            </div>

            {/* Link gửi khách */}
            <div className="flex items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-white pl-3 pr-1 py-1">
              <LinkIcon className="w-4 h-4 shrink-0 text-slate-500" weight="bold" />
              <span className="flex-1 min-w-0 truncate font-mono text-xs sm:text-sm" title={link}>{link}</span>
              <Button size="sm" variant="outline" onClick={() => copyText(link, 'Đã sao chép link, gửi cho khách thôi!')} className="rounded-lg shrink-0">
                <Copy className="w-3.5 h-3.5 mr-1" /> Sao chép
              </Button>
              <a href={link} target="_blank" rel="noreferrer" aria-label="Mở trang đợt" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-slate-100 shrink-0">
                <ArrowSquareOut className="w-4 h-4" weight="bold" />
              </a>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {thumbs.map(i => <ProductImage key={i.id} src={i.imageUrl} alt={i.name} className="w-10 h-10 rounded-lg border" />)}
              <span className="text-xs font-semibold text-slate-600 ml-1">{c.itemIds.length} mẫu</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Đơn', value: c.orderCount.toLocaleString('vi-VN') },
                { label: 'Chiếc', value: c.totalQuantity.toLocaleString('vi-VN') },
                { label: 'Tạm tính', value: formatVND(c.totalAmount) },
              ].map(k => (
                <div key={k.label} className="rounded-xl bg-slate-50 border px-2 py-1.5 min-w-0">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">{k.label}</div>
                  <div className="font-black text-sm sm:text-base tabular-nums break-words">{k.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onViewOrders(c.id)} className="rounded-lg">
                <ListChecks className="w-4 h-4 mr-1" /> Xem đơn
              </Button>
              <Button size="sm" variant="outline" onClick={() => onViewSummary(c.id)} className="rounded-lg">
                <ChartBar className="w-4 h-4 mr-1" /> Tổng hợp
              </Button>
              <Button size="sm" variant="outline" onClick={() => onEdit(c)} className="rounded-lg">
                <PencilSimple className="w-4 h-4 mr-1" /> Sửa
              </Button>
              <Button size="sm" variant="outline" disabled={toggleMutation.isPending} onClick={() => toggleMutation.mutate(c)} className="rounded-lg">
                {c.isActive ? <><Lock className="w-4 h-4 mr-1" /> Đóng đợt</> : <><LockOpen className="w-4 h-4 mr-1" /> Mở lại</>}
              </Button>
              <Button size="icon-sm" variant="outline" onClick={() => setDeleting(c)} aria-label="Xóa đợt" className="rounded-lg text-rose-600 ml-auto">
                <Trash className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      })}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={o => !o && setDeleting(null)}
        title="Xóa đợt đặt trước"
        description={`Xóa "${deleting?.name}"? Link của đợt sẽ ngừng hoạt động, các đơn khách đã đặt vẫn được giữ lại.`}
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}

function CampaignDialog({ campaign, onClose }: { campaign: PreorderCampaign | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: campaign?.name ?? '',
    slug: campaign?.slug ?? '',
    description: campaign?.description ?? '',
    openAt: toInputDateTime(campaign?.openAt),
    closeAt: toInputDateTime(campaign?.closeAt),
    isActive: campaign?.isActive ?? true,
  });
  const [itemIds, setItemIds] = useState<string[]>(campaign?.itemIds ?? []);
  const [created, setCreated] = useState<PreorderCampaign | null>(null);

  const { data: itemsData, isLoading: itemsLoading } = useQuery({ queryKey: ['preorderItemsAll'], queryFn: preorderApi.getAllItems });
  const items = itemsData?.data ?? [];
  const activeItems = items.filter(i => i.isActive);

  const toggleItem = (id: string) => setItemIds(ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]));

  const mutation = useMutation({
    mutationFn: () => {
      const payload: SavePreorderCampaignInput = {
        name: form.name.trim(),
        slug: form.slug.replace(/^-+|-+$/g, '') || undefined,
        description: form.description.trim() || undefined,
        openAt: form.openAt || null,
        closeAt: form.closeAt || null,
        isActive: form.isActive,
        itemIds,
      };
      return campaign ? preorderApi.updateCampaign(campaign.id, payload) : preorderApi.createCampaign(payload);
    },
    onSuccess: res => {
      invalidateCampaignQueries(queryClient);
      if (campaign) {
        toast.success('Đã lưu đợt');
        onClose();
      } else {
        setCreated(res.data);
      }
    },
    onError: (err: any) => toast.error(errorMessage(err, 'Không lưu được đợt.')),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemIds.length === 0) {
      toast.error('Hãy chọn ít nhất 1 mẫu cho đợt.');
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        {created ? (
          <div className="space-y-4 text-center py-2">
            <DialogHeader>
              <DialogTitle className="text-center">Đã tạo đợt "{created.name}" 🎉</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Gửi link này cho khách. Khách chỉ thấy {created.itemIds.length} mẫu của đợt này.</p>
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white px-3 py-2.5 font-mono text-sm break-all">{preorderLink(created.slug)}</div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => copyText(preorderLink(created.slug), 'Đã sao chép link')} className="rounded-xl">
                <Copy className="w-4 h-4 mr-1" /> Sao chép link
              </Button>
              <Button variant="outline" onClick={() => window.open(preorderLink(created.slug), '_blank', 'noopener')} className="rounded-xl">
                <ArrowSquareOut className="w-4 h-4 mr-1" /> Mở thử
              </Button>
              <Button variant="outline" onClick={onClose} className="rounded-xl">Xong</Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{campaign ? 'Sửa đợt đặt trước' : 'Tạo đợt đặt trước mới'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3.5">
              <label className="block" htmlFor="pc-name">
                <span className="text-sm font-semibold block mb-1.5">Tên đợt *</span>
                <Input id="pc-name" required maxLength={200} placeholder="VD: Đợt hàng tháng 11" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-10 rounded-xl" />
              </label>
              <label className="block" htmlFor="pc-slug">
                <span className="text-sm font-semibold block mb-1.5">Đuôi link</span>
                <div className="flex items-center rounded-xl border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                  <span className="pl-3 text-sm text-muted-foreground whitespace-nowrap">…/dat-truoc/</span>
                  <input
                    id="pc-slug"
                    maxLength={60}
                    placeholder="tự tạo từ tên"
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-') }))}
                    className="flex-1 min-w-0 h-10 px-1 bg-transparent outline-none text-base sm:text-sm font-mono"
                  />
                </div>
                {campaign && form.slug !== campaign.slug && (
                  <span className="text-xs font-semibold text-amber-700 mt-1 block">Đổi đuôi link thì link cũ đã gửi khách sẽ không mở được nữa.</span>
                )}
              </label>
              <label className="block" htmlFor="pc-desc">
                <span className="text-sm font-semibold block mb-1.5">Lời nhắn cho khách</span>
                <textarea
                  id="pc-desc"
                  rows={2}
                  maxLength={1000}
                  placeholder="VD: Hàng dự kiến về 25/11, đặt trước để shop giữ hàng cho bạn nhé!"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border bg-background text-base sm:text-sm"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block" htmlFor="pc-open">
                  <span className="text-sm font-semibold block mb-1.5">Mở nhận đơn từ</span>
                  <Input id="pc-open" type="datetime-local" value={form.openAt} onChange={e => setForm(f => ({ ...f, openAt: e.target.value }))} className="h-10 rounded-xl" />
                  <span className="text-xs text-muted-foreground mt-1 block">Để trống = mở ngay</span>
                </label>
                <label className="block" htmlFor="pc-close">
                  <span className="text-sm font-semibold block mb-1.5">Tự đóng lúc</span>
                  <Input id="pc-close" type="datetime-local" value={form.closeAt} onChange={e => setForm(f => ({ ...f, closeAt: e.target.value }))} className="h-10 rounded-xl" />
                  <span className="text-xs text-muted-foreground mt-1 block">Để trống = đóng thủ công</span>
                </label>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm font-semibold">Mẫu trong đợt * <span className="text-muted-foreground font-normal">({itemIds.length} đã chọn)</span></span>
                  <div className="flex gap-1.5">
                    <Button type="button" size="sm" variant="outline" onClick={() => setItemIds(activeItems.map(i => i.id))} className="rounded-lg">Chọn mẫu đang mở bán</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setItemIds([])} className="rounded-lg">Bỏ chọn</Button>
                  </div>
                </div>
                {itemsLoading ? (
                  <p className="text-sm text-muted-foreground">Đang tải mẫu...</p>
                ) : items.length === 0 ? (
                  <p className="text-sm text-muted-foreground rounded-xl bg-slate-100 px-3 py-2">Kho mẫu đang trống. Thêm mẫu ở tab "Kho mẫu" trước nhé.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[40dvh] overflow-y-auto p-0.5">
                    {items.map(i => {
                      const checked = itemIds.includes(i.id);
                      return (
                        <button
                          key={i.id}
                          type="button"
                          onClick={() => toggleItem(i.id)}
                          aria-pressed={checked}
                          className={cn('relative rounded-xl border-2 p-1 text-left transition-colors', checked ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-400')}
                        >
                          <ProductImage src={i.imageUrl} alt={i.name} className={cn('w-full aspect-square rounded-lg', !i.isActive && 'opacity-50')} />
                          <span className="block text-xs font-semibold leading-tight mt-1 line-clamp-2">{i.name}</span>
                          {!i.isActive && <span className="block text-[10px] font-bold text-amber-700">Đang ẩn: khách không thấy</span>}
                          <span className={cn('absolute top-1.5 right-1.5 w-5 h-5 rounded-md border-2 grid place-items-center text-white text-xs', checked ? 'bg-emerald-500 border-emerald-600' : 'bg-white/90 border-slate-300')}>
                            {checked && '✓'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold" htmlFor="pc-active">
                <input id="pc-active" type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-emerald-600" />
                Cho phép khách đặt (bỏ tích = đóng đợt)
              </label>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} className="h-10 rounded-xl">Hủy</Button>
                <Button type="submit" disabled={mutation.isPending} className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white">
                  {mutation.isPending ? 'Đang lưu...' : campaign ? 'Lưu' : 'Tạo đợt & lấy link'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ===================================================================================
// TAB 1: ĐƠN ĐẶT TRƯỚC
// ===================================================================================
function OrdersTab({ campaignId, campaignFilter }: { campaignId: string; campaignFilter: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'' | PreorderStatus>('');
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  const { data, isLoading } = useQuery({
    queryKey: ['preorders', status, debouncedKeyword, campaignId],
    queryFn: () => preorderApi.getAll(status || undefined, debouncedKeyword || undefined, campaignId || undefined),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const orders = data?.data ?? [];

  const mutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: PreorderStatus; note?: string }) => preorderApi.updateStatus(id, status, note),
    onSuccess: (res, vars) => {
      toast.success(`${res.data.code}: ${STATUS_INFO[vars.status].label}`);
      setNoteDrafts(d => {
        const next = { ...d };
        delete next[vars.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['preorders'] });
      queryClient.invalidateQueries({ queryKey: ['preorderSummary'] });
      queryClient.invalidateQueries({ queryKey: ['preorderCampaigns'] });
    },
    onError: (err: any) => toast.error(errorMessage(err, 'Không cập nhật được đơn.')),
  });

  const orderText = (o: Preorder) =>
    [
      `Đơn đặt trước ${o.code}${o.campaignName ? ` (${o.campaignName})` : ''}`,
      `Khách: ${o.customerName} - ${o.customerPhone}${o.instagramContact ? ` - IG/Threads @${o.instagramContact}` : ''}`,
      ...o.lines.map(l => `• ${l.itemName} x${l.quantity} (${formatVND(l.unitPrice)})`),
      `Tạm tính: ${formatVND(o.totalAmount)}`,
    ].join('\n');

  const tabs: { id: '' | PreorderStatus; label: string }[] = [
    { id: '', label: 'Tất cả' },
    { id: 'NEW', label: 'Mới' },
    { id: 'CONTACTED', label: 'Đã liên hệ' },
    { id: 'CONFIRMED', label: 'Đã chốt' },
    { id: 'CANCELLED', label: 'Đã hủy' },
  ];

  return (
    <div className="space-y-4">
      <div className="doodle-card p-3 sm:p-4 space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {campaignFilter}
          <div className="relative flex-1">
            <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" weight="bold" />
            <Input type="search" placeholder="Mã đơn, tên khách, SĐT, Zalo/FB, Instagram..." value={keyword} onChange={e => setKeyword(e.target.value)} className="doodle-input pl-9 h-10" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setStatus(t.id)}
              className={cn('px-3 py-1.5 rounded-xl text-sm font-bold border-2 border-black', status === t.id ? 'bg-[#FEF08A] shadow-[2px_2px_0_#000]' : 'bg-white hover:bg-slate-100')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="doodle-card"><LoadingState text="Đang tải đơn đặt trước..." /></div>
      ) : orders.length === 0 ? (
        <div className="doodle-card">
          <EmptyState title="Chưa có đơn đặt trước nào." description='Vào tab "Các đợt", sao chép link của đợt rồi gửi cho khách qua Zalo/Facebook.' />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4">
          {orders.map(o => {
            const draft = noteDrafts[o.id];
            return (
              <div key={o.id} className={cn('doodle-card p-3.5 sm:p-4 flex flex-col gap-3', o.status === 'CANCELLED' && 'opacity-60')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono font-black text-sm">{o.code}</div>
                    <div className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}{!campaignId && o.campaignName ? ` • ${o.campaignName}` : ''}</div>
                  </div>
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-md whitespace-nowrap', STATUS_INFO[o.status].className)}>
                    {STATUS_INFO[o.status].label}
                  </span>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="font-bold">{o.customerName}</div>
                  <button type="button" onClick={() => copyText(o.customerPhone, 'Đã sao chép số điện thoại')} className="flex items-center gap-1.5 text-blue-700 hover:underline">
                    <Phone className="w-4 h-4" weight="bold" /> {o.customerPhone} <Copy className="w-3.5 h-3.5" />
                  </button>
                  {o.socialContact && (
                    <div className="flex items-start gap-1.5 text-slate-700 break-all"><ChatCircleText className="w-4 h-4 shrink-0 mt-0.5" weight="bold" /> {o.socialContact}</div>
                  )}
                  {o.instagramContact && (
                    <a
                      href={`https://www.instagram.com/${encodeURIComponent(o.instagramContact)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-1.5 text-fuchsia-700 hover:underline break-all"
                    >
                      <InstagramLogo className="w-4 h-4 shrink-0 mt-0.5" weight="bold" /> @{o.instagramContact}
                    </a>
                  )}
                  {o.shippingAddress && (
                    <div className="flex items-start gap-1.5 text-slate-700"><MapPin className="w-4 h-4 shrink-0 mt-0.5" weight="bold" /> {o.shippingAddress}</div>
                  )}
                  {o.note && <div className="text-slate-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">📝 {o.note}</div>}
                </div>

                <div className="rounded-xl border divide-y text-sm">
                  {o.lines.map(l => (
                    <div key={l.id} className="flex items-center gap-2.5 px-2.5 py-1.5">
                      <ProductImage src={l.imageUrl} alt={l.itemName} className="w-8 h-8 rounded-md border shrink-0" />
                      <span className="flex-1 min-w-0">{l.itemName}</span>
                      <strong className="whitespace-nowrap">× {l.quantity}</strong>
                    </div>
                  ))}
                  <div className="flex justify-between px-2.5 py-1.5 font-black">
                    <span>{o.totalQuantity} chiếc</span>
                    <span className="text-rose-600">{formatVND(o.totalAmount)}</span>
                  </div>
                </div>

                {o.adminNote && draft === undefined && (
                  <p className="text-xs text-slate-600"><span className="font-semibold">Ghi chú shop:</span> {o.adminNote}</p>
                )}
                {draft !== undefined && (
                  <textarea
                    rows={2}
                    autoFocus
                    value={draft}
                    onChange={e => setNoteDrafts(d => ({ ...d, [o.id]: e.target.value }))}
                    placeholder="Ghi chú nội bộ: đã nhắn Zalo, hẹn ngày lấy..."
                    className="w-full px-3 py-2 rounded-xl border bg-background text-base sm:text-sm"
                  />
                )}

                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <select
                    value={o.status}
                    disabled={mutation.isPending}
                    onChange={e => mutation.mutate({ id: o.id, status: e.target.value as PreorderStatus, note: draft ?? o.adminNote })}
                    aria-label="Đổi trạng thái"
                    className="h-9 text-base sm:text-sm"
                  >
                    {(Object.keys(STATUS_INFO) as PreorderStatus[]).map(s => <option key={s} value={s}>{STATUS_INFO[s].label}</option>)}
                  </select>
                  {draft === undefined ? (
                    <Button variant="outline" size="sm" onClick={() => setNoteDrafts(d => ({ ...d, [o.id]: o.adminNote ?? '' }))} className="rounded-lg">
                      Ghi chú
                    </Button>
                  ) : (
                    <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: o.id, status: o.status, note: draft })} className="rounded-lg">
                      Lưu ghi chú
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => copyText(orderText(o), 'Đã sao chép nội dung đơn')} className="rounded-lg ml-auto">
                    <Copy className="w-3.5 h-3.5 mr-1" /> Sao chép đơn
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===================================================================================
// TAB 2: TỔNG HỢP SỐ LƯỢNG
// ===================================================================================
function SummaryTab({ campaignId, campaignFilter }: { campaignId: string; campaignFilter: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['preorderSummary', campaignId],
    queryFn: () => preorderApi.getSummary(campaignId || undefined),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const rows = data?.data ?? [];
  const totalQty = rows.reduce((a, r) => a + r.totalQuantity, 0);
  const totalConfirmed = rows.reduce((a, r) => a + r.confirmedQuantity, 0);
  const totalAmount = rows.reduce((a, r) => a + r.totalAmount, 0);

  const supplierText = () =>
    ['Tổng hợp đặt trước:', ...rows.filter(r => r.totalQuantity > 0).map(r => `• ${r.itemName}: ${r.totalQuantity} chiếc`), `Tổng: ${totalQty} chiếc`].join('\n');

  if (isLoading) return <div className="doodle-card"><LoadingState text="Đang tổng hợp..." /></div>;

  return (
    <div className="space-y-4">
      <div className="doodle-card p-3 sm:p-4">{campaignFilter}</div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Chiếc khách đặt', value: totalQty.toLocaleString('vi-VN') },
          { label: 'Chiếc đã chốt', value: totalConfirmed.toLocaleString('vi-VN') },
          { label: 'Giá trị tạm tính', value: formatVND(totalAmount) },
        ].map(k => (
          <div key={k.label} className="doodle-card p-3 sm:p-4 min-w-0">
            <div className="text-xs font-bold text-slate-600 uppercase">{k.label}</div>
            <div className="text-lg sm:text-2xl font-black mt-1 break-words tabular-nums">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="doodle-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-slate-200">
          <p className="text-sm text-slate-600">Không tính đơn đã hủy. Dùng để chốt số lượng nhập với nhà cung cấp.</p>
          <Button variant="outline" size="sm" onClick={() => copyText(supplierText(), 'Đã sao chép bảng tổng hợp')} className="rounded-lg" disabled={totalQty === 0}>
            <Copy className="w-3.5 h-3.5 mr-1" /> Sao chép bảng
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wide">
              <tr>
                <th className="py-2.5 px-3">Mẫu</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Khách đặt</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Đã chốt</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap hidden sm:table-cell">Số đơn</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap hidden sm:table-cell">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 tabular-nums">
              {rows.map(r => (
                <tr key={r.preorderItemId} className={cn(r.totalQuantity === 0 && 'text-slate-400')}>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2.5 min-w-40">
                      <ProductImage src={r.imageUrl} alt={r.itemName} className="w-9 h-9 rounded-md border shrink-0" />
                      <span className="font-semibold">{r.itemName}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right font-black text-base">{r.totalQuantity}</td>
                  <td className="py-2 px-3 text-right font-semibold text-emerald-700">{r.confirmedQuantity}</td>
                  <td className="py-2 px-3 text-right hidden sm:table-cell">{r.orderCount}</td>
                  <td className="py-2 px-3 text-right hidden sm:table-cell whitespace-nowrap">{formatVND(r.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===================================================================================
// TAB 3: QUẢN LÝ MẪU SẮP VỀ
// ===================================================================================
function ItemsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PreorderItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<PreorderItem | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['preorderItemsAll'], queryFn: preorderApi.getAllItems });
  const items = data?.data ?? [];

  const invalidate = () => {
    ['preorderItemsAll', 'preorderCampaignPage', 'preorderSummary', 'preorderCampaigns'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => preorderApi.deleteItem(id),
    onSuccess: () => {
      toast.success('Đã xóa mẫu');
      setDeleting(null);
      invalidate();
    },
    onError: (err: any) => toast.error(errorMessage(err, 'Không xóa được mẫu.')),
  });

  const toggleMutation = useMutation({
    mutationFn: (item: PreorderItem) =>
      preorderApi.updateItem(item.id, { ...item, isActive: !item.isActive }),
    onSuccess: res => {
      toast.success(res.data.isActive ? `Đã mở đặt trước "${res.data.name}"` : `Đã ẩn "${res.data.name}"`);
      invalidate();
    },
    onError: (err: any) => toast.error(errorMessage(err, 'Không cập nhật được mẫu.')),
  });

  if (isLoading) return <div className="doodle-card"><LoadingState text="Đang tải mẫu..." /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setEditing('new')} className="doodle-btn bg-[#FEF08A] px-4 py-2 text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" weight="bold" /> Thêm mẫu
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {items.map(item => (
          <div key={item.id} className={cn('doodle-card p-2.5 flex flex-col gap-2', !item.isActive && 'opacity-70')}>
            <div className="relative">
              <ProductImage src={item.imageUrl} alt={item.name} className="w-full aspect-[4/5] rounded-xl border" />
              {!item.isActive && <span className="absolute top-2 left-2 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-white">Đang ẩn</span>}
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm leading-snug">{item.name}</div>
              <div className="text-xs text-slate-600">{item.price > 0 ? formatVND(item.price) : 'Chưa có giá'} • {TAG_LABELS[item.tag]}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={toggleMutation.isPending}
                onClick={() => (item.price > 0 || item.isActive ? toggleMutation.mutate(item) : setEditing(item))}
                className="flex-1 rounded-lg"
              >
                {item.isActive ? 'Ẩn' : 'Mở bán'}
              </Button>
              <Button size="icon-sm" variant="outline" onClick={() => setEditing(item)} aria-label="Sửa mẫu" className="rounded-lg">
                <PencilSimple className="w-4 h-4" />
              </Button>
              <Button size="icon-sm" variant="outline" onClick={() => setDeleting(item)} aria-label="Xóa mẫu" className="rounded-lg text-rose-600">
                <Trash className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {editing !== null && (
        <ItemDialog
          key={editing === 'new' ? 'new' : editing.id}
          item={editing === 'new' ? null : editing}
          nextOrder={items.length + 1}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidate();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={o => !o && setDeleting(null)}
        title="Xóa mẫu đặt trước"
        description={`Xóa "${deleting?.name}"? Các đơn khách đã đặt mẫu này vẫn được giữ nguyên.`}
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}

function ItemDialog({ item, nextOrder, onClose, onSaved }: { item: PreorderItem | null; nextOrder: number; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<SavePreorderItemInput>({
    name: item?.name ?? '',
    price: item?.price ?? 0,
    imageUrl: item?.imageUrl ?? '',
    description: item?.description ?? '',
    tag: item?.tag ?? 'HOT',
    displayOrder: item?.displayOrder ?? nextOrder,
    // Mẫu chưa có giá (VD: Đá bào) mở form từ nút "Mở bán" thì bật sẵn
    isActive: item ? item.isActive || item.price <= 0 : true,
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: () => (item ? preorderApi.updateItem(item.id, form) : preorderApi.createItem(form)),
    onSuccess: () => {
      toast.success(item ? 'Đã lưu mẫu' : 'Đã thêm mẫu');
      onSaved();
    },
    onError: (err: any) => toast.error(errorMessage(err, 'Không lưu được mẫu.')),
  });

  const upload = async (file: File) => {
    setIsUploading(true);
    try {
      const res = await mediaApi.uploadImage(file, 'PREORDER');
      setForm(f => ({ ...f, imageUrl: res.data.url }));
    } catch {
      toast.error('Lỗi khi tải ảnh.');
    } finally {
      setIsUploading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? 'Sửa mẫu đặt trước' : 'Thêm mẫu đặt trước'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3.5">
          <div className="flex gap-3 items-start">
            <ProductImage src={form.imageUrl} alt={form.name} className="w-24 aspect-[4/5] rounded-xl border shrink-0" />
            <div className="space-y-2">
              <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => fileRef.current?.click()} className="rounded-lg">
                <UploadSimple className="w-4 h-4 mr-1" /> {isUploading ? 'Đang tải...' : form.imageUrl ? 'Đổi ảnh' : 'Tải ảnh lên'}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) upload(f);
                }}
              />
              <p className="text-xs text-muted-foreground">Ảnh dọc tỉ lệ 4:5 hiển thị đẹp nhất.</p>
            </div>
          </div>

          <label className="block" htmlFor="pi-name">
            <span className="text-sm font-semibold block mb-1.5">Tên mẫu *</span>
            <Input id="pi-name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-10 rounded-xl" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block" htmlFor="pi-price">
              <span className="text-sm font-semibold block mb-1.5">Giá (đ)</span>
              <Input id="pi-price" type="number" inputMode="numeric" min={0} step="any" value={form.price} onChange={e => setForm(f => ({ ...f, price: Math.max(0, Number(e.target.value) || 0) }))} className="h-10 rounded-xl" />
            </label>
            <label className="block" htmlFor="pi-order">
              <span className="text-sm font-semibold block mb-1.5">Thứ tự</span>
              <Input id="pi-order" type="number" inputMode="numeric" value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: Number(e.target.value) || 0 }))} className="h-10 rounded-xl" />
            </label>
          </div>
          <div>
            <span className="text-sm font-semibold block mb-1.5">Nhãn</span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TAG_LABELS) as PreorderTag[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, tag: t }))}
                  className={cn('px-3 py-1.5 rounded-xl text-sm font-semibold border-2', form.tag === t ? 'border-slate-800 bg-[#FEF08A]' : 'border-slate-200 bg-white')}
                >
                  {TAG_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <label className="block" htmlFor="pi-desc">
            <span className="text-sm font-semibold block mb-1.5">Mô tả ngắn</span>
            <textarea id="pi-desc" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 rounded-xl border bg-background text-base sm:text-sm" />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold" htmlFor="pi-active">
            <input id="pi-active" type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-emerald-600" />
            Cho phép khách đặt (bỏ tích = ẩn khỏi mọi đợt)
          </label>
          {form.isActive && form.price <= 0 && <p className="text-xs font-semibold text-amber-700">Cần nhập giá trước khi mở cho khách đặt.</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="h-10 rounded-xl">Hủy</Button>
            <Button type="submit" disabled={mutation.isPending || isUploading} className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white">
              {mutation.isPending ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

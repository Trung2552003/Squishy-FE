import React, { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowCircleDown, ArrowCircleUp, MagnifyingGlass, PencilSimple, Trash, Image as ImageIcon, Info } from '@phosphor-icons/react';

import { cashApi, type CashCategory, type CashMethod, type CashTransaction, type CashType, type SaveCashTransactionInput } from '@/lib/api/squishy/cashApi';
import { mediaApi } from '@/lib/api/squishy/mediaApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader, EmptyState, LoadingState } from '@/components/shop/page-header';
import { PeriodPicker, type PeriodValue } from '@/components/shop/period-picker';
import { PhotoPicker } from '@/components/shop/photo-picker';
import { EntityPhotos } from '@/components/shop/entity-photos';
import { periodRange, toDateInput } from '@/lib/period';
import { cn, formatDateTime, formatVND } from '@/lib/utils';

export const Route = createFileRoute('/cms/cashbook')({
  component: CashbookScreen,
});

const errorMessage = (err: any, fallback: string) => err?.response?.data?.message || fallback;

/** Giờ hiện tại dạng giá trị của input datetime-local */
const nowLocal = () => {
  const d = new Date();
  return `${toDateInput(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function CashbookScreen() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<PeriodValue>({ preset: 'THIS_MONTH', customFrom: '', customTo: '' });
  const [type, setType] = useState<'' | CashType>('');
  const [category, setCategory] = useState('');
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [editing, setEditing] = useState<CashTransaction | { new: CashType } | null>(null);
  const [deleting, setDeleting] = useState<CashTransaction | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 400);
    return () => clearTimeout(t);
  }, [keyword]);

  const range = periodRange(period.preset, period.customFrom, period.customTo);
  const { data: catRes } = useQuery({ queryKey: ['cashCategories'], queryFn: cashApi.getCategories, staleTime: Infinity });
  const categories = catRes?.data ?? [];
  const catByCode = new Map(categories.map(c => [c.code, c]));

  const { data, isLoading } = useQuery({
    queryKey: ['cashTransactions', range.from, range.to, type, category, debouncedKeyword],
    queryFn: () => cashApi.getAll({ ...range, type, category, keyword: debouncedKeyword }),
    placeholderData: keepPreviousData,
  });
  const list = data?.data;
  const items = list?.items ?? [];

  const invalidate = () => {
    ['cashTransactions', 'reportSummary', 'reportChart'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cashApi.delete(id),
    onSuccess: () => {
      toast.success('Đã xóa phiếu');
      setDeleting(null);
      invalidate();
    },
    onError: (err: any) => toast.error(errorMessage(err, 'Không xóa được phiếu.')),
  });

  const visibleCategories = categories.filter(c => !type || c.type === type);
  const totalIncome = (list?.totalOtherIncome ?? 0) + (list?.totalCapital ?? 0);

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-6xl mx-auto font-sans">
      <PageHeader
        emoji="👛"
        title="Thu chi khác"
        description="Ghi lại chi tiêu phát sinh (ship, bao bì, quảng cáo...) và các khoản tiền được cấp hoặc thu khác."
        actions={
          <>
            <button onClick={() => setEditing({ new: 'EXPENSE' })} className="doodle-btn bg-[#FECDD3] hover:bg-[#FDA4AF] px-4 py-2.5 text-sm flex items-center justify-center gap-1.5 flex-1 md:flex-none">
              <ArrowCircleUp className="w-4 h-4" weight="bold" /> Khoản chi
            </button>
            <button onClick={() => setEditing({ new: 'INCOME' })} className="doodle-btn bg-[#BBF7D0] hover:bg-[#86EFAC] px-4 py-2.5 text-sm flex items-center justify-center gap-1.5 flex-1 md:flex-none">
              <ArrowCircleDown className="w-4 h-4" weight="bold" /> Khoản thu
            </button>
          </>
        }
      />

      {/* Tổng kỳ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Tổng chi', value: list?.totalExpense ?? 0, cls: 'text-rose-600', note: 'Trừ vào lợi nhuận' },
          { label: 'Thu khác', value: list?.totalOtherIncome ?? 0, cls: 'text-emerald-700', note: 'Cộng vào lợi nhuận' },
          { label: 'Vốn được cấp', value: list?.totalCapital ?? 0, cls: 'text-sky-700', note: 'Tăng tiền, không tính lãi' },
          { label: 'Thu − Chi', value: totalIncome - (list?.totalExpense ?? 0), cls: totalIncome - (list?.totalExpense ?? 0) < 0 ? 'text-rose-600' : 'text-black', note: 'Chênh lệch tiền mặt' },
        ].map(k => (
          <div key={k.label} className="doodle-card p-3 sm:p-4 min-w-0">
            <div className="text-xs font-black text-slate-600 uppercase">{k.label}</div>
            <div className={cn('text-lg sm:text-2xl font-black mt-1 tabular-nums break-words', k.cls)}>{formatVND(k.value)}</div>
            <div className="text-[11px] font-semibold text-slate-500">{k.note}</div>
          </div>
        ))}
      </div>

      {/* Bộ lọc */}
      <div className="doodle-card p-3 sm:p-4 space-y-3">
        <PeriodPicker value={period} onChange={setPeriod} />
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex gap-1.5">
            {([['', 'Tất cả'], ['EXPENSE', 'Chi'], ['INCOME', 'Thu']] as const).map(([t, label]) => (
              <button
                key={t}
                onClick={() => {
                  setType(t);
                  setCategory('');
                }}
                className={cn('px-3 py-1.5 rounded-xl text-sm font-bold border-2 border-black', type === t ? 'bg-[#FEF08A] shadow-[2px_2px_0_#000]' : 'bg-white hover:bg-slate-100')}
              >
                {label}
              </button>
            ))}
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Lọc theo danh mục" className="h-10 text-base sm:text-sm w-full sm:w-60">
            <option value="">Mọi danh mục</option>
            {visibleCategories.map(c => <option key={c.code} value={c.code}>{c.emoji} {c.name}</option>)}
          </select>
          <div className="relative flex-1">
            <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" weight="bold" />
            <Input type="search" placeholder="Mã phiếu, nội dung, người nhận/nộp..." value={keyword} onChange={e => setKeyword(e.target.value)} className="doodle-input pl-9 h-10" />
          </div>
        </div>
      </div>

      {/* Danh sách */}
      {isLoading ? (
        <div className="doodle-card"><LoadingState text="Đang tải phiếu thu chi..." /></div>
      ) : items.length === 0 ? (
        <div className="doodle-card">
          <EmptyState title="Chưa có phiếu thu chi nào trong kỳ này." description='Bấm "Khoản chi" khi có chi tiêu phát sinh, hoặc "Khoản thu" khi được cấp tiền.' />
        </div>
      ) : (
        <div className="doodle-card divide-y overflow-hidden">
          {items.map(t => {
            const cat = catByCode.get(t.category);
            const isExpense = t.type === 'EXPENSE';
            return (
              <div key={t.id} className="flex items-start gap-3 p-3 sm:p-4">
                <span className={cn('w-10 h-10 rounded-xl border-2 border-black grid place-items-center text-lg shrink-0', isExpense ? 'bg-[#FFE4E6]' : 'bg-[#DCFCE7]')}>
                  {cat?.emoji ?? (isExpense ? '🧾' : '💰')}
                </span>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-bold text-sm">{t.categoryName}</span>
                    <span className={cn('font-black tabular-nums text-base', isExpense ? 'text-rose-600' : 'text-emerald-700')}>
                      {isExpense ? '−' : '+'}{formatVND(t.amount)}
                    </span>
                  </div>
                  {t.description && <p className="text-sm text-slate-700 break-words">{t.description}</p>}
                  <p className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                    <span className="font-mono">{t.code}</span>
                    <span>{formatDateTime(t.transactionDate)}</span>
                    <span>{t.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}</span>
                    {t.partyName && <span>{isExpense ? 'Trả cho' : 'Nhận từ'}: {t.partyName}</span>}
                    {!t.affectsProfit && <span className="text-sky-700 font-semibold">Không tính vào lãi</span>}
                    {t.imageCount > 0 && <span className="inline-flex items-center gap-0.5"><ImageIcon className="w-3.5 h-3.5" /> {t.imageCount} ảnh</span>}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon-sm" variant="outline" onClick={() => setEditing(t)} aria-label="Sửa phiếu" className="rounded-lg">
                    <PencilSimple className="w-4 h-4" />
                  </Button>
                  <Button size="icon-sm" variant="outline" onClick={() => setDeleting(t)} aria-label="Xóa phiếu" className="rounded-lg text-rose-600">
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <CashDialog
          key={'id' in editing ? editing.id : `new-${editing.new}`}
          transaction={'id' in editing ? editing : null}
          initialType={'id' in editing ? editing.type : editing.new}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidate();
          }}
          onPhotosChanged={invalidate}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={o => !o && setDeleting(null)}
        title="Xóa phiếu thu chi"
        description={`Xóa phiếu ${deleting?.code} (${formatVND(deleting?.amount)})? Báo cáo sẽ được tính lại.`}
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}

function CashDialog({
  transaction,
  initialType,
  categories,
  onClose,
  onSaved,
  onPhotosChanged,
}: {
  transaction: CashTransaction | null;
  initialType: CashType;
  categories: CashCategory[];
  onClose: () => void;
  onSaved: () => void;
  onPhotosChanged: () => void;
}) {
  const type = transaction?.type ?? initialType;
  const isExpense = type === 'EXPENSE';
  const options = categories.filter(c => c.type === type);
  const [category, setCategory] = useState(transaction?.category ?? options[0]?.code ?? '');
  const [amountText, setAmountText] = useState(transaction ? String(transaction.amount) : '');
  const [date, setDate] = useState(transaction ? transaction.transactionDate.slice(0, 16) : nowLocal());
  const [method, setMethod] = useState<CashMethod>(transaction?.paymentMethod ?? 'CASH');
  const [partyName, setPartyName] = useState(transaction?.partyName ?? '');
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [photos, setPhotos] = useState<File[]>([]);

  const amount = Number(amountText.replace(/\D/g, '')) || 0;
  const selectedCat = categories.find(c => c.code === category);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: SaveCashTransactionInput = {
        type,
        category,
        amount,
        transactionDate: `${date}:00`,
        paymentMethod: method,
        partyName: partyName.trim() || undefined,
        description: description.trim() || undefined,
      };
      const res = transaction ? await cashApi.update(transaction.id, payload) : await cashApi.create(payload);
      // Ảnh hóa đơn chụp lúc tạo phiếu: tải lên sau khi đã có mã phiếu
      let failed = 0;
      for (const file of photos) {
        try {
          await mediaApi.uploadImage(file, 'CASH_TXN', res.data.id);
        } catch {
          failed++;
        }
      }
      return { res, failed };
    },
    onSuccess: ({ res, failed }) => {
      toast.success(res.message || 'Đã lưu phiếu');
      if (failed > 0) toast.error(`${failed} ảnh chưa tải lên được, bạn mở phiếu để thêm lại.`);
      onSaved();
    },
    onError: (err: any) => toast.error(errorMessage(err, 'Không lưu được phiếu.')),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return toast.error('Vui lòng chọn danh mục.');
    if (amount <= 0) return toast.error('Vui lòng nhập số tiền.');
    mutation.mutate();
  };

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{transaction ? `Sửa phiếu ${transaction.code}` : isExpense ? 'Ghi khoản chi' : 'Ghi khoản thu'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <span className="text-sm font-semibold block mb-1.5">Danh mục *</span>
            <div className="grid grid-cols-2 gap-1.5">
              {options.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setCategory(c.code)}
                  aria-pressed={category === c.code}
                  className={cn('text-left rounded-xl border-2 px-2.5 py-2 text-sm font-semibold transition-colors', category === c.code ? 'border-slate-800 bg-[#FEF08A]/70' : 'border-slate-200 bg-white hover:border-slate-400')}
                >
                  {c.emoji} {c.name}
                </button>
              ))}
            </div>
            {selectedCat && !selectedCat.affectsProfit && (
              <p className="mt-1.5 text-xs text-sky-800 bg-sky-50 border border-sky-200 rounded-lg px-2.5 py-1.5 flex gap-1.5">
                <Info className="w-4 h-4 shrink-0" weight="bold" /> Vốn được cấp làm tăng tiền của shop nhưng không phải lợi nhuận, nên báo cáo chỉ tính vào dòng tiền.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block" htmlFor="ct-amount">
              <span className="text-sm font-semibold block mb-1.5">Số tiền *</span>
              <div className="relative">
                <Input
                  id="ct-amount"
                  inputMode="numeric"
                  autoFocus={!transaction}
                  placeholder="0"
                  value={amount ? amount.toLocaleString('vi-VN') : ''}
                  onChange={e => setAmountText(e.target.value)}
                  className={cn('h-11 rounded-xl pr-8 text-lg font-black tabular-nums', isExpense ? 'text-rose-600' : 'text-emerald-700')}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">đ</span>
              </div>
            </label>
            <label className="block" htmlFor="ct-date">
              <span className="text-sm font-semibold block mb-1.5">Ngày phát sinh *</span>
              <Input id="ct-date" type="datetime-local" required value={date} max={nowLocal()} onChange={e => setDate(e.target.value)} className="h-11 rounded-xl" />
            </label>
          </div>

          <div>
            <span className="text-sm font-semibold block mb-1.5">Hình thức</span>
            <div className="grid grid-cols-2 gap-1.5">
              {([['CASH', '💵 Tiền mặt'], ['BANK', '🏦 Chuyển khoản']] as const).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  aria-pressed={method === m}
                  className={cn('rounded-xl border-2 py-2 text-sm font-semibold', method === m ? 'border-slate-800 bg-[#FEF08A]/70' : 'border-slate-200 bg-white')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="block" htmlFor="ct-party">
            <span className="text-sm font-semibold block mb-1.5">{isExpense ? 'Trả cho (người nhận)' : 'Nhận từ (người nộp / đơn vị cấp)'}</span>
            <Input id="ct-party" maxLength={200} placeholder={isExpense ? 'VD: GHTK, Shopee Ads, chị Lan...' : 'VD: Anh Minh góp vốn, Quỹ CLB...'} value={partyName} onChange={e => setPartyName(e.target.value)} className="h-10 rounded-xl" />
          </label>

          <label className="block" htmlFor="ct-desc">
            <span className="text-sm font-semibold block mb-1.5">Nội dung</span>
            <textarea
              id="ct-desc"
              rows={2}
              maxLength={1000}
              placeholder={isExpense ? 'VD: Mua 200 hộp giấy đóng hàng' : 'VD: Được cấp tiền nhập đợt hàng tháng 11'}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border bg-background text-base sm:text-sm"
            />
          </label>

          {/* Ảnh hóa đơn / chứng từ */}
          {transaction ? (
            <EntityPhotos entityId={transaction.id} type="CASH_TXN" title="Ảnh hóa đơn / chứng từ" onChanged={onPhotosChanged} />
          ) : (
            <div className="space-y-1.5">
              <span className="text-sm font-semibold block">Ảnh hóa đơn / chứng từ</span>
              <div className="flex flex-wrap gap-2">
                {photos.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="relative">
                    <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 rounded-lg object-cover border" />
                    <button type="button" aria-label="Bỏ ảnh" onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-xs grid place-items-center">×</button>
                  </div>
                ))}
                <PhotoPicker onFiles={files => setPhotos(p => [...p, ...files])} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="h-10 rounded-xl">Hủy</Button>
            <Button type="submit" disabled={mutation.isPending} className={cn('h-10 rounded-xl text-white', isExpense ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700')}>
              {mutation.isPending ? 'Đang lưu...' : transaction ? 'Lưu' : isExpense ? `Ghi chi ${amount ? formatVND(amount) : ''}` : `Ghi thu ${amount ? formatVND(amount) : ''}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

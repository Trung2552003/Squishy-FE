import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  FloppyDisk,
  Link,
  Copy,
  ShieldCheck,
  Warning,
  ArrowsClockwise,
  CheckCircle,
  Bank
} from '@phosphor-icons/react';

import {
  paymentApi,
  sePayWebhookUrl,
  type PaymentSetting,
  type PaymentWebhookLog,
  type UpdatePaymentSettingInput,
  type WebhookLogStatus
} from '@/lib/api/squishy/paymentApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader, LoadingState } from '@/components/shop/page-header';
import { cn, formatDateTime, formatVND } from '@/lib/utils';

export const Route = createFileRoute('/cms/payment-settings')({
  component: PaymentSettingsScreen,
});

const POPULAR_BANKS = [
  { code: 'MB', name: 'MBBank (Quân Đội)' },
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'ACB', name: 'ACB (Á Châu)' },
  { code: 'TPB', name: 'TPBank (Tiên Phong)' },
  { code: 'ICB', name: 'VietinBank' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'OCB', name: 'OCB (Phương Đông)' },
  { code: 'MSB', name: 'MSB (Hàng Hải)' },
  { code: 'KLB', name: 'KienLongBank' },
];

// Số tài khoản mẫu từng được tạo sẵn khi cài đặt lần đầu: không phải tài khoản của shop
const DEMO_ACCOUNT = '0388889999';

const LOG_STATUS: Record<WebhookLogStatus, { label: string; className: string }> = {
  MATCHED: { label: 'Đã khớp đơn', className: 'bg-emerald-100 text-emerald-800' },
  UNMATCHED: { label: 'Chưa khớp', className: 'bg-amber-100 text-amber-800' },
  DUPLICATE: { label: 'Gửi lại', className: 'bg-slate-200 text-slate-700' },
  IGNORED: { label: 'Bỏ qua', className: 'bg-slate-200 text-slate-700' },
  REJECTED: { label: 'Từ chối', className: 'bg-rose-100 text-rose-800' },
};

async function copyText(text: string, message: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  } catch {
    toast.error('Không sao chép được, vui lòng chép thủ công.');
  }
}

function PaymentSettingsScreen() {
  const { data, isLoading } = useQuery({ queryKey: ['paymentSettings'], queryFn: paymentApi.getSettings });

  if (isLoading || !data?.data) {
    return <div className="doodle-card max-w-5xl mx-auto"><LoadingState text="Đang tải cài đặt thanh toán..." /></div>;
  }
  // key: tải lại form khi dữ liệu đã lưu thay đổi
  return <PaymentSettingsForm key={JSON.stringify(data.data)} setting={data.data} />;
}

function PaymentSettingsForm({ setting }: { setting: PaymentSetting }) {
  const queryClient = useQueryClient();
  const [bankCode, setBankCode] = useState(setting.bankCode || 'MB');
  const [accountNumber, setAccountNumber] = useState(setting.accountNumber || '');
  const [accountName, setAccountName] = useState(setting.accountName || '');
  const [qrTemplate, setQrTemplate] = useState(setting.qrTemplate || 'compact');
  const [authMode, setAuthMode] = useState<'HMAC' | 'APIKEY'>(setting.hasApiKey && !setting.hasWebhookSecret ? 'APIKEY' : 'HMAC');
  const [newSecret, setNewSecret] = useState('');
  const [newApiKey, setNewApiKey] = useState('');

  const webhookUrl = sePayWebhookUrl();
  const isLocalUrl = /\/\/(localhost|127\.|192\.168\.|10\.)/.test(webhookUrl);
  const isDemoAccount = accountNumber.trim() === DEMO_ACCOUNT;
  const authReady = setting.hasWebhookSecret || setting.hasApiKey;

  const mutation = useMutation({
    mutationFn: (payload: UpdatePaymentSettingInput) => paymentApi.updateSettings(payload),
    onSuccess: res => {
      toast.success(res.message || 'Đã lưu cài đặt thanh toán.');
      queryClient.invalidateQueries({ queryKey: ['paymentSettings'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Không lưu được cấu hình.'),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim() || !accountName.trim()) {
      toast.error('Vui lòng nhập số tài khoản và tên chủ tài khoản.');
      return;
    }
    const payload: UpdatePaymentSettingInput = {
      bankCode,
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim().toUpperCase(),
      qrTemplate,
    };
    // Chỉ gửi khóa khi người dùng nhập khóa mới; chọn một kiểu xác thực thì xóa kiểu còn lại cho rõ ràng
    if (authMode === 'HMAC') {
      if (newSecret.trim()) payload.sePayWebhookSecret = newSecret.trim();
      if ((newSecret.trim() || setting.hasWebhookSecret) && setting.hasApiKey) payload.sePayApiKey = '';
    } else {
      if (newApiKey.trim()) payload.sePayApiKey = newApiKey.trim();
      if ((newApiKey.trim() || setting.hasApiKey) && setting.hasWebhookSecret) payload.sePayWebhookSecret = '';
    }
    mutation.mutate(payload);
  };

  const previewQrUrl = accountNumber.trim()
    ? `https://qr.sepay.vn/img?acc=${encodeURIComponent(accountNumber.trim())}&bank=${encodeURIComponent(bankCode)}&amount=50000&des=SQS123456&template=${encodeURIComponent(qrTemplate)}`
    : '';

  const savedHint = authMode === 'HMAC' ? setting.webhookSecretHint : setting.apiKeyHint;

  return (
    <div className="space-y-4 sm:space-y-5 max-w-5xl mx-auto font-sans">
      <PageHeader
        emoji="💳"
        title="Cài đặt SePay & VietQR"
        description="Tài khoản nhận tiền, mã QR và webhook để SePay tự xác nhận đơn khi khách chuyển khoản."
      />

      <ChecklistCard
        items={[
          { ok: !!setting.accountNumber && setting.accountNumber !== DEMO_ACCOUNT, label: 'Đã nhập tài khoản nhận tiền của shop' },
          { ok: authReady, label: 'Đã lưu khóa xác thực webhook (Secret Key hoặc API Key)' },
          { ok: !isLocalUrl, label: 'Địa chỉ webhook truy cập được từ Internet' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-4 sm:space-y-5 order-2 lg:order-1">
          {/* 1. TÀI KHOẢN NHẬN TIỀN */}
          <section className="doodle-card p-4 sm:p-6 space-y-4">
            <h2 className="font-black text-base flex items-center gap-2"><Bank className="w-5 h-5" weight="bold" /> 1. Tài khoản nhận tiền</h2>
            <div>
              <label htmlFor="ps-bank" className="text-sm font-semibold block mb-1.5">Ngân hàng *</label>
              <select id="ps-bank" value={bankCode} onChange={e => setBankCode(e.target.value)} className="h-10 w-full text-base sm:text-sm">
                {POPULAR_BANKS.map(b => <option key={b.code} value={b.code}>{b.code} - {b.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="ps-acc" className="text-sm font-semibold block mb-1.5">Số tài khoản *</label>
                <Input
                  id="ps-acc"
                  required
                  autoComplete="off"
                  placeholder="VD: VQRQ... hoặc 0123456789"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  className="h-11 rounded-xl font-mono text-base font-bold"
                />
              </div>
              <div>
                <label htmlFor="ps-name" className="text-sm font-semibold block mb-1.5">Tên chủ tài khoản (không dấu) *</label>
                <Input
                  id="ps-name"
                  required
                  placeholder="NGUYEN VAN A"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value.toUpperCase())}
                  className="h-11 rounded-xl uppercase font-bold"
                />
              </div>
            </div>
            {isDemoAccount && (
              <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 flex gap-1.5">
                <Warning className="w-4 h-4 shrink-0" weight="bold" /> {DEMO_ACCOUNT} là số tài khoản mẫu, không phải của shop. Khách quét QR sẽ chuyển tiền vào tài khoản này — hãy thay bằng tài khoản thật.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Với MBBank, SePay cấp <strong>tài khoản ảo (VA)</strong> dạng <span className="font-mono">VQR…</span> trong my.sepay.vn → Ngân hàng. Nên nhập số VA đó để mã QR và webhook khớp đúng; tiền vẫn về tài khoản chính của bạn.
            </p>
            <div>
              <label htmlFor="ps-template" className="text-sm font-semibold block mb-1.5">Kiểu mã QR</label>
              <select id="ps-template" value={qrTemplate} onChange={e => setQrTemplate(e.target.value)} className="h-10 w-full text-base sm:text-sm">
                <option value="compact">Gọn nhẹ (Compact)</option>
                <option value="print">Bản in hóa đơn (Print)</option>
                <option value="qr_only">Chỉ mã QR (QR Only)</option>
              </select>
            </div>
          </section>

          {/* 2. WEBHOOK */}
          <section className="doodle-card p-4 sm:p-6 space-y-4">
            <h2 className="font-black text-base flex items-center gap-2"><Link className="w-5 h-5" weight="bold" /> 2. Webhook SePay (tự gạch nợ)</h2>

            <div>
              <span className="text-sm font-semibold block mb-1.5">Đường dẫn Webhook (URL)</span>
              <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white pl-3 pr-1 py-1">
                <span className="flex-1 min-w-0 font-mono text-xs sm:text-sm break-all">{webhookUrl}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => copyText(webhookUrl, 'Đã sao chép URL webhook')} className="rounded-lg shrink-0">
                  <Copy className="w-4 h-4 mr-1" /> Sao chép
                </Button>
              </div>
              {isLocalUrl && (
                <p className="mt-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Đây là địa chỉ trên máy bạn (localhost), SePay không gọi tới được. Khi đưa backend lên mạng (hoặc dùng Cloudflare Tunnel/ngrok), đặt <span className="font-mono">VITE_PUBLIC_API_URL</span> trong file .env để hiện đúng địa chỉ cần dán.
                </p>
              )}
            </div>

            <div>
              <span className="text-sm font-semibold block mb-1.5">Kiểu chứng thực (chọn giống trên SePay)</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {([
                  ['HMAC', 'HMAC-SHA256', 'Khuyên dùng: chống giả mạo và sửa nội dung'],
                  ['APIKEY', 'API Key', 'Đơn giản: SePay gửi kèm khóa trong header'],
                ] as const).map(([mode, title, desc]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAuthMode(mode)}
                    aria-pressed={authMode === mode}
                    className={cn('text-left rounded-xl border-2 p-3 transition-colors', authMode === mode ? 'border-slate-800 bg-[#FEF08A]/60' : 'border-slate-200 bg-white hover:border-slate-400')}
                  >
                    <div className="font-bold text-sm">{title}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="ps-key" className="text-sm font-semibold block mb-1.5">
                {authMode === 'HMAC' ? 'Webhook Secret Key' : 'API Key'}
                {savedHint && <span className="ml-2 text-xs font-semibold text-emerald-700">✓ Đã lưu {savedHint}</span>}
              </label>
              <Input
                id="ps-key"
                type="password"
                autoComplete="new-password"
                placeholder={savedHint ? 'Để trống nếu giữ khóa đã lưu' : authMode === 'HMAC' ? 'Dán Secret Key SePay tạo cho webhook' : 'Dán API Key bạn đặt trên SePay'}
                value={authMode === 'HMAC' ? newSecret : newApiKey}
                onChange={e => (authMode === 'HMAC' ? setNewSecret(e.target.value) : setNewApiKey(e.target.value))}
                className="h-11 rounded-xl font-mono text-base sm:text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Máy chủ chỉ chấp nhận webhook có {authMode === 'HMAC' ? 'chữ ký HMAC đúng' : 'API Key đúng'}; yêu cầu giả mạo bị từ chối. Khóa không bao giờ hiện lại sau khi lưu.
              </p>
            </div>

            <ol className="text-sm space-y-1.5 rounded-xl bg-slate-50 border p-3 list-decimal list-inside marker:font-bold">
              <li>Vào <strong>my.sepay.vn → Tích hợp Webhooks → Thêm webhook</strong>, sự kiện <strong>Có tiền vào</strong>, chọn đúng tài khoản ngân hàng ở trên.</li>
              <li>Dán <strong>URL webhook</strong> ở trên, kiểu gửi <strong>application/json</strong>.</li>
              <li>Chứng thực: chọn <strong>{authMode === 'HMAC' ? 'HMAC-SHA256' : 'API Key'}</strong>, {authMode === 'HMAC' ? 'sao chép Secret Key SePay tạo ra' : 'tự đặt một chuỗi khó đoán'} rồi dán vào ô bên trên và bấm Lưu.</li>
              <li>(Không bắt buộc) Trong phần <strong>Cấu trúc mã thanh toán</strong> của SePay, khai báo tiền tố <span className="font-mono font-bold">SQS</span> + 6 chữ số để SePay tự tách mã đơn.</li>
              <li>Chuyển thử một khoản nhỏ với nội dung là mã đơn, rồi xem mục <strong>Nhật ký webhook</strong> bên dưới.</li>
            </ol>
          </section>

          <Button type="submit" disabled={mutation.isPending} className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold">
            <FloppyDisk className="w-4 h-4 mr-2" /> {mutation.isPending ? 'Đang lưu...' : 'Lưu cài đặt'}
          </Button>

          <WebhookLogCard />
        </form>

        {/* XEM TRƯỚC MÃ QR */}
        <div className="doodle-card p-4 sm:p-6 flex flex-col items-center text-center space-y-3 order-1 lg:order-2 lg:self-start lg:sticky lg:top-0">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Xem trước mã VietQR</span>
          {previewQrUrl ? (
            <div className="p-3 bg-white rounded-2xl border shadow-sm">
              <img src={previewQrUrl} alt="Mã VietQR xem trước" className="w-48 sm:w-56 h-auto rounded-xl" loading="lazy" />
            </div>
          ) : (
            <div className="w-48 h-48 rounded-2xl border-2 border-dashed grid place-items-center text-xs text-muted-foreground p-4">Nhập số tài khoản để xem mã QR</div>
          )}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground font-mono">{bankCode} - {accountNumber || '…'}</p>
            <p className="font-bold text-rose-600">{accountName || '…'}</p>
            <p className="text-[11px] text-slate-400">Khi tạo đơn, hệ thống tự điền số tiền và mã chuyển khoản riêng của đơn (SQS + 6 số).</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChecklistCard({ items }: { items: { ok: boolean; label: string }[] }) {
  const allOk = items.every(i => i.ok);
  return (
    <div className={cn('doodle-card p-3 sm:p-4', allOk ? 'bg-emerald-50' : 'bg-amber-50')}>
      <div className="font-black text-sm flex items-center gap-1.5 mb-2">
        {allOk ? <ShieldCheck className="w-5 h-5 text-emerald-600" weight="fill" /> : <Warning className="w-5 h-5 text-amber-600" weight="fill" />}
        {allOk ? 'Đã sẵn sàng nhận thanh toán tự động' : 'Chưa sẵn sàng tự xác nhận chuyển khoản'}
      </div>
      <ul className="space-y-1 text-sm">
        {items.map(i => (
          <li key={i.label} className={cn('flex items-start gap-1.5', i.ok ? 'text-emerald-800' : 'text-amber-900')}>
            {i.ok ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" weight="fill" /> : <Warning className="w-4 h-4 shrink-0 mt-0.5" weight="bold" />}
            {i.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WebhookLogCard() {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ['paymentWebhookLogs'],
    queryFn: () => paymentApi.getWebhookLogs(15),
    refetchInterval: 30_000,
  });
  const logs: PaymentWebhookLog[] = data?.data ?? [];

  return (
    <section className="doodle-card p-4 sm:p-6 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-black text-base">Nhật ký webhook</h2>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="rounded-lg">
          <ArrowsClockwise className={cn('w-4 h-4 mr-1', isFetching && 'animate-spin')} /> Tải lại
        </Button>
      </div>
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-xl bg-slate-50 border px-3 py-3">
          Chưa nhận được webhook nào từ SePay. Sau khi cấu hình, chuyển thử một khoản nhỏ để kiểm tra.
        </p>
      ) : (
        <div className="divide-y rounded-xl border">
          {logs.map(l => {
            const st = l.status ? LOG_STATUS[l.status] : null;
            return (
              <div key={l.id} className="px-3 py-2.5 text-sm space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{formatDateTime(l.createdAt)}</span>
                  <div className="flex items-center gap-2">
                    {l.amountIn != null && <strong className="tabular-nums">{formatVND(l.amountIn)}</strong>}
                    {st && <span className={cn('text-xs font-bold px-2 py-0.5 rounded-md', st.className)}>{st.label}</span>}
                  </div>
                </div>
                {l.transactionContent && <div className="font-mono text-xs break-all text-slate-700">{l.transactionContent}</div>}
                {l.message && <div className="text-xs text-slate-600">{l.orderCode ? <strong>{l.orderCode}: </strong> : null}{l.message}</div>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

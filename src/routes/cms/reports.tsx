import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  CurrencyCircleDollar,
  TrendUp,
  Wallet,
  ArrowsLeftRight,
  Package,
  WarningCircle,
  Trophy,
  ChartBar,
  Info
} from '@phosphor-icons/react';

import { reportApi, type CategoryAmount, type DashboardSummary } from '@/lib/api/squishy/reportApi';
import { PageHeader, EmptyState, LoadingState } from '@/components/shop/page-header';
import { PeriodPicker, type PeriodValue } from '@/components/shop/period-picker';
import { ProductImage } from '@/components/shop/product-image';
import { periodDays, periodRange } from '@/lib/period';
import { cn, formatVND } from '@/lib/utils';

export const Route = createFileRoute('/cms/reports')({
  component: ReportsScreen,
});

const SERIES = [
  { key: 'revenue' as const, label: 'Doanh thu thuần', bar: 'bg-rose-500', dot: 'bg-rose-500' },
  { key: 'cost' as const, label: 'Tiền chi ra', bar: 'bg-blue-500', dot: 'bg-blue-500' },
  { key: 'profit' as const, label: 'Lợi nhuận ròng', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
];

// Kỳ dài hơn số ngày này thì biểu đồ chỉ vẽ 30 ngày gần nhất cho dễ đọc
const MAX_CHART_DAYS = 62;

// Rút gọn số tiền cho nhãn trục: 1.200.000 → 1,2tr
function compactVND(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k`;
  return `${value}`;
}

const signed = (v: number) => (v < 0 ? `−${formatVND(-v)}` : formatVND(v));

function ReportsScreen() {
  const [period, setPeriod] = useState<PeriodValue>({ preset: 'THIS_MONTH', customFrom: '', customTo: '' });
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const range = periodRange(period.preset, period.customFrom, period.customTo);
  const days = periodDays(range);
  const chartBounded = days !== null && days <= MAX_CHART_DAYS;
  const chartRange = chartBounded ? range : {};

  const { data: summaryRes, isLoading } = useQuery({
    queryKey: ['reportSummary', range.from, range.to],
    queryFn: () => reportApi.getSummary(range),
    placeholderData: keepPreviousData,
  });
  const s = summaryRes?.data;

  const { data: chartRes, isLoading: isLoadingChart } = useQuery({
    queryKey: ['reportChart', chartRange.from, chartRange.to],
    queryFn: () => reportApi.getChart(30, chartRange),
    placeholderData: keepPreviousData,
  });
  const chartPoints = chartRes?.data || [];

  const { data: topRes } = useQuery({
    queryKey: ['topSellingProducts', range.from, range.to],
    queryFn: () => reportApi.getTopProducts(6, range),
    placeholderData: keepPreviousData,
  });
  const topProducts = topRes?.data || [];

  const maxChartVal = Math.max(1, ...chartPoints.map(p => Math.max(p.revenue, p.cost, p.profit)));
  const selectedPoint = selectedIdx !== null ? chartPoints[selectedIdx] : null;
  const dense = chartPoints.length > 14;

  return (
    <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto font-sans">
      <PageHeader emoji="📊" title="Báo cáo thống kê" description="Doanh thu, chi phí, lợi nhuận và dòng tiền theo từng kỳ." />

      <div className="doodle-card p-3 sm:p-4">
        <PeriodPicker value={period} onChange={p => { setPeriod(p); setSelectedIdx(null); }} />
      </div>

      {isLoading || !s ? (
        <div className="doodle-card"><LoadingState text="Đang tổng hợp số liệu..." /></div>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: 'Doanh thu thuần', value: formatVND(s.totalRevenue), note: `${s.paidOrders} đơn đã thanh toán`, icon: CurrencyCircleDollar, bg: 'bg-[#FFE4E6]' },
              { label: 'Chi phí hoạt động', value: formatVND(s.operatingExpense), note: 'Từ Thu chi khác', icon: Wallet, bg: 'bg-[#DBEAFE]' },
              { label: 'Lợi nhuận ròng', value: signed(s.netProfit), note: `Gộp ${signed(s.grossProfit)}`, icon: TrendUp, bg: 'bg-[#D1FAE5]', warn: s.netProfit < 0 },
              { label: 'Dòng tiền ròng', value: signed(s.netCashFlow), note: 'Tiền vào − tiền ra', icon: ArrowsLeftRight, bg: 'bg-[#FEF3C7]', warn: s.netCashFlow < 0 },
            ].map(k => (
              <div key={k.label} className="doodle-card p-3 sm:p-4 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] sm:text-xs font-black text-slate-600 uppercase leading-tight">{k.label}</span>
                  <span className={cn('w-8 h-8 sm:w-9 sm:h-9 rounded-xl border-2 border-black flex items-center justify-center shrink-0', k.bg)}>
                    <k.icon className="w-5 h-5" weight="bold" />
                  </span>
                </div>
                <div className={cn('mt-1.5 text-base min-[400px]:text-lg sm:text-2xl font-black break-words tabular-nums', k.warn ? 'text-red-600' : 'text-black')}>{k.value}</div>
                <div className="text-[10px] sm:text-[11px] mt-0.5 font-semibold text-slate-500">{k.note}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            <ProfitLossCard s={s} />
            <CashFlowCard s={s} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            <BreakdownCard title="Chi phí theo danh mục" rows={s.expenseBreakdown} color="bg-rose-400" empty="Chưa có khoản chi nào trong kỳ." />
            <BreakdownCard title="Khoản thu khác" rows={s.incomeBreakdown} color="bg-emerald-400" empty="Chưa có khoản thu khác trong kỳ." />
          </div>

          {/* Tồn kho & đơn hàng */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Giá trị tồn kho', value: formatVND(s.totalInventoryValue), note: `${s.lowStockCount} sản phẩm sắp hết`, warn: s.lowStockCount > 0, icon: Package },
              { label: 'Đơn tạo trong kỳ', value: s.totalOrders.toLocaleString('vi-VN'), note: `${s.completedOrders} hoàn tất` },
              { label: 'Đơn đã hủy', value: s.cancelledOrders.toLocaleString('vi-VN'), note: 'Không tính doanh thu' },
              { label: 'Phí ship thu của khách', value: formatVND(s.shippingFeeCollected), note: 'Đã nằm trong doanh thu' },
            ].map(k => (
              <div key={k.label} className="doodle-card p-3 min-w-0">
                <div className="text-[10px] sm:text-xs font-black text-slate-600 uppercase">{k.label}</div>
                <div className="text-base sm:text-xl font-black mt-1 tabular-nums break-words">{k.value}</div>
                <div className={cn('text-[11px] font-semibold flex items-center gap-1', k.warn ? 'text-rose-600' : 'text-slate-500')}>
                  {k.warn && <WarningCircle className="w-3.5 h-3.5" weight="bold" />} {k.note}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Biểu đồ */}
      <div className="doodle-card p-3.5 sm:p-5 space-y-4">
        <div>
          <h3 className="text-sm sm:text-base font-black text-black">Theo từng ngày {chartBounded ? '' : '(30 ngày gần nhất)'}</h3>
          <p className="text-xs text-muted-foreground">Chạm vào một cột để xem số liệu của ngày đó.</p>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {SERIES.map(sr => (
            <span key={sr.key} className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <span className={cn('w-2.5 h-2.5 rounded-full', sr.dot)} /> {sr.label}
            </span>
          ))}
        </div>

        {isLoadingChart ? (
          <div className="h-56 rounded-xl bg-slate-100 animate-pulse" />
        ) : chartPoints.length === 0 ? (
          <EmptyState icon={<ChartBar className="w-10 h-10 text-slate-400" weight="bold" />} title="Chưa có dữ liệu trong khoảng thời gian này." />
        ) : (
          <div className="flex gap-2">
            <div className="hidden sm:flex flex-col justify-between h-48 pb-6 text-[10px] font-semibold text-muted-foreground text-right shrink-0">
              <span>{compactVND(maxChartVal)}</span>
              <span>{compactVND(maxChartVal / 2)}</span>
              <span>0</span>
            </div>
            <div className="flex-1 min-w-0 overflow-x-auto scrollbar-thin">
              <div className="h-48 flex items-end gap-1.5 sm:gap-2 border-b-2 border-black" style={{ minWidth: `${chartPoints.length * (dense ? 26 : 40)}px` }}>
                {chartPoints.map((pt, idx) => (
                  <button
                    key={pt.date}
                    type="button"
                    onClick={() => setSelectedIdx(idx === selectedIdx ? null : idx)}
                    className={cn('flex-1 h-full flex items-end justify-center gap-px sm:gap-0.5 rounded-t-md px-0.5 transition-colors', selectedIdx === idx ? 'bg-[#FEF08A]/60' : 'hover:bg-slate-100')}
                    aria-label={`${pt.label}: doanh thu ${formatVND(pt.revenue)}, chi ra ${formatVND(pt.cost)}, lợi nhuận ${signed(pt.profit)}`}
                  >
                    {SERIES.map(sr => (
                      <span
                        key={sr.key}
                        style={{ height: `${Math.max(2, (Math.max(0, pt[sr.key]) / maxChartVal) * 100)}%` }}
                        className={cn('w-full max-w-3.5 rounded-t-sm', sr.bar, sr.key === 'profit' && pt.profit < 0 && 'bg-red-300')}
                      />
                    ))}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 sm:gap-2 pt-1.5" style={{ minWidth: `${chartPoints.length * (dense ? 26 : 40)}px` }}>
                {chartPoints.map((pt, idx) => (
                  <span key={pt.date} className={cn('flex-1 text-center text-[10px] font-semibold text-muted-foreground whitespace-nowrap', dense && idx % 3 !== 0 && 'invisible')}>
                    {pt.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedPoint && (
          <div className="rounded-xl border-2 border-black bg-[#FAF7EE] p-3 text-xs grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div className="col-span-2 sm:col-span-1 font-black text-sm">📅 {selectedPoint.label}</div>
            <div><span className="text-muted-foreground block">Doanh thu</span><strong className="text-rose-600">{formatVND(selectedPoint.revenue)}</strong></div>
            <div><span className="text-muted-foreground block">Tiền chi ra</span><strong className="text-blue-600">{formatVND(selectedPoint.cost)}</strong></div>
            <div><span className="text-muted-foreground block">Chi phí hoạt động</span><strong>{formatVND(selectedPoint.expense)}</strong></div>
            <div><span className="text-muted-foreground block">Lợi nhuận ròng</span><strong className={selectedPoint.profit < 0 ? 'text-red-600' : 'text-emerald-600'}>{signed(selectedPoint.profit)}</strong></div>
          </div>
        )}
      </div>

      {/* Top bán chạy */}
      <div className="doodle-card p-3.5 sm:p-5 space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" weight="fill" /> Top squishy bán chạy
          </h3>
          <span className="text-xs text-muted-foreground">Trong kỳ, chỉ tính đơn đã thanh toán</span>
        </div>
        {topProducts.length === 0 ? (
          <EmptyState title="Chưa có dữ liệu bán hàng trong kỳ." className="py-8" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {topProducts.map((p, idx) => (
              <div key={p.productId} className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border-2 border-black bg-white">
                <span className={cn('w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 border-2 border-black', idx === 0 ? 'bg-amber-300' : idx === 1 ? 'bg-slate-200' : idx === 2 ? 'bg-orange-300' : 'bg-white')}>
                  {idx + 1}
                </span>
                <ProductImage src={p.mainImageUrl} alt={p.productName} className="w-11 h-11 rounded-lg border shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs truncate" title={p.productName}>{p.productName}</h4>
                  <div className="flex items-center justify-between gap-2 text-xs mt-1">
                    <span className="text-muted-foreground">Đã bán <strong className="text-foreground">{p.totalQuantitySold}</strong></span>
                    <span className="font-bold text-rose-600 truncate">{formatVND(p.totalRevenue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FormulaNote />
    </div>
  );
}

function Line({ label, value, sign, strong, muted, hint }: { label: string; value: number; sign?: '+' | '−'; strong?: boolean; muted?: boolean; hint?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 px-3 py-2', strong && 'bg-slate-50 font-black', muted && 'text-slate-500')}>
      <span className="min-w-0">
        {sign && <span className="inline-block w-4 font-bold">{sign}</span>}
        {label}
        {hint && <span className="block text-[11px] font-normal text-slate-500 pl-4">{hint}</span>}
      </span>
      <span className={cn('tabular-nums whitespace-nowrap', strong && value < 0 && 'text-red-600')}>{strong ? signed(value) : formatVND(value)}</span>
    </div>
  );
}

function ProfitLossCard({ s }: { s: DashboardSummary }) {
  const margin = s.totalRevenue > 0 ? Math.round((s.grossProfit / s.totalRevenue) * 100) : 0;
  return (
    <div className="doodle-card overflow-hidden">
      <h3 className="px-4 pt-4 pb-2 font-black text-sm sm:text-base">Kết quả kinh doanh (lãi / lỗ)</h3>
      <div className="divide-y text-sm">
        <Line label="Tiền bán hàng đã thu" value={s.salesRevenue} hint={`${s.paidOrders} đơn, gồm ${formatVND(s.shippingFeeCollected)} phí ship`} />
        <Line sign="−" label="Hoàn tiền đổi trả" value={s.returnRefunds} muted={!s.returnRefunds} />
        <Line sign="+" label="Thu thêm khi đổi trả / sửa" value={s.returnExtraCharges} muted={!s.returnExtraCharges} />
        <Line strong label="Doanh thu thuần" value={s.totalRevenue} />
        <Line sign="−" label="Giá vốn hàng bán" value={s.cogs} hint={s.repairCost ? `gồm ${formatVND(s.repairCost)} chi phí sửa hàng` : 'theo giá nhập lúc bán, đã trừ hàng trả về kho'} />
        <Line strong label={`Lợi nhuận gộp${margin ? ` (${margin}%)` : ''}`} value={s.grossProfit} />
        <Line sign="−" label="Chi phí hoạt động" value={s.operatingExpense} muted={!s.operatingExpense} />
        <Line sign="+" label="Thu nhập khác" value={s.otherIncome} muted={!s.otherIncome} />
        <Line strong label="Lợi nhuận ròng" value={s.netProfit} />
      </div>
    </div>
  );
}

function CashFlowCard({ s }: { s: DashboardSummary }) {
  return (
    <div className="doodle-card overflow-hidden">
      <h3 className="px-4 pt-4 pb-2 font-black text-sm sm:text-base">Dòng tiền (tiền thật vào / ra)</h3>
      <div className="divide-y text-sm">
        <div className="px-3 py-1.5 text-xs font-black uppercase text-emerald-700 bg-emerald-50">Tiền vào</div>
        <Line sign="+" label="Bán hàng" value={s.salesRevenue} />
        <Line sign="+" label="Thu thêm đổi trả" value={s.returnExtraCharges} muted={!s.returnExtraCharges} />
        <Line sign="+" label="Thu khác" value={s.otherIncome} muted={!s.otherIncome} />
        <Line sign="+" label="Vốn được cấp" value={s.capitalIn} muted={!s.capitalIn} />
        <Line strong label="Tổng tiền vào" value={s.cashIn} />
        <div className="px-3 py-1.5 text-xs font-black uppercase text-rose-700 bg-rose-50">Tiền ra</div>
        <Line sign="−" label="Nhập hàng" value={s.totalCost} hint="Theo phiếu nhập hoàn tất" />
        <Line sign="−" label="Chi phí hoạt động" value={s.operatingExpense} muted={!s.operatingExpense} />
        <Line sign="−" label="Hoàn tiền khách" value={s.returnRefunds} muted={!s.returnRefunds} />
        <Line sign="−" label="Chi phí sửa hàng" value={s.repairCost} muted={!s.repairCost} />
        <Line strong label="Tổng tiền ra" value={s.cashOut} />
        <Line strong label="Chênh lệch (tiền vào − ra)" value={s.netCashFlow} />
      </div>
    </div>
  );
}

function BreakdownCard({ title, rows, color, empty }: { title: string; rows: CategoryAmount[]; color: string; empty: string }) {
  const max = Math.max(1, ...rows.map(r => r.amount));
  const total = rows.reduce((a, r) => a + r.amount, 0);
  return (
    <div className="doodle-card p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-black text-sm sm:text-base">{title}</h3>
        <Link to="/cms/cashbook" className="text-xs font-bold text-blue-700 hover:underline">Mở Thu chi khác →</Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map(r => (
            <div key={r.category} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0">
                  {r.emoji} {r.name} <span className="text-xs text-muted-foreground">({r.count} phiếu{r.affectsProfit ? '' : ', không tính lãi'})</span>
                </span>
                <strong className="tabular-nums whitespace-nowrap">{formatVND(r.amount)}</strong>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className={cn('h-full rounded-full', color)} style={{ width: `${(r.amount / max) * 100}%` }} />
              </div>
            </div>
          ))}
          <div className="flex justify-between text-sm font-black pt-1 border-t">
            <span>Tổng</span>
            <span className="tabular-nums">{formatVND(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function FormulaNote() {
  return (
    <details className="doodle-card p-4 text-sm group">
      <summary className="font-black cursor-pointer flex items-center gap-1.5 list-none">
        <Info className="w-4 h-4" weight="bold" /> Cách tính các số liệu
      </summary>
      <ul className="mt-3 space-y-1.5 text-slate-700 list-disc pl-5">
        <li><strong>Doanh thu</strong> chỉ tính đơn đã thanh toán và không bị hủy, ghi nhận theo ngày khách trả tiền.</li>
        <li><strong>Giá vốn</strong> lấy theo giá nhập tại thời điểm bán; hàng tốt khách trả về kho được trừ lại, hàng lỗi vẫn tính là lỗ.</li>
        <li><strong>Tiền nhập hàng</strong> không trừ thẳng vào lợi nhuận (vì hàng còn trong kho), mà được tính dần qua giá vốn khi bán ra. Tiền này vẫn nằm trong <strong>Dòng tiền</strong>.</li>
        <li><strong>Chi phí hoạt động</strong> và <strong>Thu nhập khác</strong> lấy từ trang Thu chi khác theo ngày phát sinh.</li>
        <li><strong>Vốn được cấp</strong> làm tăng tiền nhưng không phải lợi nhuận, nên chỉ xuất hiện trong Dòng tiền.</li>
        <li>Đổi trả, bảo hành tính theo ngày hoàn tất phiếu.</li>
      </ul>
    </details>
  );
}

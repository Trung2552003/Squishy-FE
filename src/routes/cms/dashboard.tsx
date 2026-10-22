import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  CashRegister,
  Package,
  Receipt,
  ShoppingCart,
  ChartLineUp,
  CreditCard,
  Sparkle,
  ArrowRight,
  WarningCircle,
  TrendUp,
  Wallet
} from '@phosphor-icons/react';

import { reportApi } from '@/lib/api/squishy/reportApi';
import { periodRange } from '@/lib/period';
import { Mascot } from '@/components/shop/mascot';
import { cn, formatVND } from '@/lib/utils';

export const Route = createFileRoute('/cms/dashboard')({
  component: DashboardScreen,
});

const SHORTCUTS = [
  { to: '/cms/pos', title: 'Bán hàng POS', desc: 'Chọn squishy, quét QR tự động và in bill', icon: CashRegister, bg: 'bg-[#FFE4E6]' },
  { to: '/cms/products', title: 'Sản phẩm & Kho', desc: 'Quản lý kho, ảnh và video review', icon: Package, bg: 'bg-[#DBEAFE]' },
  { to: '/cms/goods-receipt', title: 'Phiếu nhập hàng', desc: 'Nhập hàng và tự động cộng tồn kho', icon: Receipt, bg: 'bg-[#EDE9FE]' },
  { to: '/cms/orders', title: 'Quản lý đơn hàng', desc: 'Lịch sử đơn, ảnh bill và in lại hóa đơn', icon: ShoppingCart, bg: 'bg-[#D1FAE5]' },
  { to: '/cms/reports', title: 'Báo cáo & Thống kê', desc: 'Doanh thu, chi phí, lợi nhuận và dòng tiền', icon: ChartLineUp, bg: 'bg-[#FEF3C7]' },
  { to: '/cms/cashbook', title: 'Thu chi khác', desc: 'Chi tiêu phát sinh, tiền được cấp', icon: Wallet, bg: 'bg-[#FCE7F3]' },
  { to: '/cms/payment-settings', title: 'Cài đặt SePay', desc: 'Tài khoản ngân hàng và webhook', icon: CreditCard, bg: 'bg-[#E0E7FF]' },
] as const;

function DashboardScreen() {
  // Số liệu tháng hiện tại (cùng công thức với trang Báo cáo)
  const month = periodRange('THIS_MONTH');
  const { data: summaryRes, isLoading } = useQuery({
    queryKey: ['reportSummary', month.from, month.to],
    queryFn: () => reportApi.getSummary(month),
  });
  const summary = summaryRes?.data;

  const stats = [
    { label: 'Doanh thu tháng này', value: formatVND(summary?.totalRevenue), icon: CashRegister, bg: 'bg-[#FFE4E6]' },
    { label: 'Tiền chi ra tháng này', value: formatVND(summary?.cashOut), icon: Receipt, bg: 'bg-[#DBEAFE]' },
    { label: 'Lợi nhuận ròng tháng này', value: formatVND(summary?.netProfit), icon: TrendUp, bg: 'bg-[#D1FAE5]' },
    { label: 'Tổng sản phẩm', value: `${summary?.totalProducts || 0} mẫu`, icon: Package, bg: 'bg-[#FEF3C7]' },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Chào buổi sáng' : hour < 14 ? 'Chào buổi trưa' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto font-sans">
      {/* Banner chào mừng */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#FFB4B4] border-2 sm:border-[2.5px] border-black shadow-[4px_4px_0px_#000] p-4 sm:p-7">
        <div className="relative z-10 max-w-2xl md:pr-44 lg:pr-0 space-y-2.5 sm:space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border-2 border-black text-[10px] sm:text-xs font-black uppercase tracking-wider">
            <Sparkle className="w-3.5 h-3.5" weight="fill" /> {greeting} 👋
          </div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-black leading-tight">
            Squishy Store POS
          </h1>
          <p className="text-slate-800 text-xs sm:text-sm font-semibold leading-relaxed">
            Bán lẻ đồ chơi squishy tích hợp thanh toán VietQR SePay, quản lý kho tự động và báo cáo lợi nhuận tức thì.
          </p>
          <div className="pt-1 grid grid-cols-1 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
            <Link to="/cms/pos" className="doodle-btn bg-[#FEF08A] hover:bg-[#FDE047] text-black px-4 py-2.5 text-sm flex items-center justify-center gap-2">
              <CashRegister className="w-5 h-5" weight="bold" /> Mở màn hình bán hàng
            </Link>
            <Link to="/cms/reports" className="doodle-btn bg-white hover:bg-slate-50 text-black px-4 py-2.5 text-sm flex items-center justify-center gap-2">
              <ChartLineUp className="w-5 h-5" weight="bold" /> Xem báo cáo
            </Link>
          </div>
        </div>
        <div className="absolute right-6 lg:right-12 bottom-3 hidden md:flex flex-col items-center pointer-events-none">
          <span className="mochi-bubble relative mb-3 rounded-2xl border-2 border-slate-800 bg-white px-3 py-1.5 text-sm font-bold text-slate-800 shadow-[2px_2px_0_#1e293b]">
            Bán đắt nha! ✨
          </span>
          <Mascot mood="wink" size={130} />
        </div>
      </div>

      {/* Cảnh báo tồn kho */}
      {(summary?.lowStockCount || 0) > 0 && (
        <Link
          to="/cms/products"
          className="flex items-center gap-3 rounded-2xl border-2 border-black bg-[#FEF08A] px-3.5 py-3 shadow-[3px_3px_0px_#000] hover:translate-x-px hover:translate-y-px transition-transform"
        >
          <WarningCircle className="w-6 h-6 text-rose-600 shrink-0" weight="bold" />
          <span className="text-xs sm:text-sm font-bold text-black flex-1">
            Có <strong>{summary?.lowStockCount}</strong> sản phẩm sắp hết hàng — kiểm tra và nhập thêm kho.
          </span>
          <ArrowRight className="w-4 h-4 shrink-0" weight="bold" />
        </Link>
      )}

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map(s => (
          <div key={s.label} className="doodle-card p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
            <div className="min-w-0 order-2 sm:order-1">
              <span className="text-[10px] sm:text-xs font-black text-slate-600 uppercase">{s.label}</span>
              <div className={cn('text-base min-[400px]:text-lg sm:text-2xl font-black text-black mt-0.5 break-words', isLoading && 'animate-pulse text-slate-300')}>
                {s.value}
              </div>
            </div>
            <div className={cn('w-9 h-9 sm:w-12 sm:h-12 rounded-xl border-2 border-black flex items-center justify-center shrink-0 order-1 sm:order-2', s.bg)}>
              <s.icon className="w-5 h-5 sm:w-6 sm:h-6" weight="bold" />
            </div>
          </div>
        ))}
      </div>

      {/* Lối tắt */}
      <div>
        <h3 className="text-sm sm:text-base font-black text-black mb-2.5 sm:mb-3">Lối tắt nghiệp vụ</h3>
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {SHORTCUTS.map(s => (
            <Link key={s.to} to={s.to} className="doodle-card doodle-card-hover p-3 sm:p-4 group flex items-start gap-3">
              <div className={cn('w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center shrink-0', s.bg)}>
                <s.icon className="w-5 h-5" weight="bold" />
              </div>
              <div className="min-w-0">
                <div className="font-black text-sm text-black flex items-center gap-1">
                  {s.title} <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" weight="bold" />
                </div>
                <p className="text-xs text-slate-600 font-medium mt-0.5">{s.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

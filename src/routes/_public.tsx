import { useState } from 'react';
import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import {
  Sparkle,
  Headset,
  ShieldCheck,
  Truck,
  List,
  X
} from '@phosphor-icons/react';

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
});

const NAV_LINKS = [
  { href: '/#products-section', label: 'Bộ sưu tập Squishy' },
  { href: '#commitments', label: 'Chất lượng & An toàn' },
];

function PublicLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen doodle-bg text-foreground flex flex-col font-sans">
      {/* Floating Header matching Reference Image 2 */}
      <header className="sticky top-2 sm:top-3 z-50 w-full max-w-6xl mx-auto px-3 sm:px-4 mt-2">
        <div className="bg-white border-2 sm:border-[2.5px] border-black rounded-2xl shadow-[3px_3px_0px_#000] sm:shadow-[4px_4px_0px_#000] px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-[#FEF08A] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000] group-hover:scale-105 transition-transform">
              <Sparkle className="w-5 h-5 sm:w-6 sm:h-6 text-black" weight="fill" />
            </div>
            <div className="min-w-0">
              <span className="text-lg sm:text-xl font-black text-black block leading-none tracking-tight">
                SQUISHY POP
              </span>
              <span className="hidden min-[380px]:block text-[10px] font-bold text-slate-500 leading-tight truncate">
                Đồ chơi bóp bóp mềm mềm 🎀
              </span>
            </div>
          </Link>

          {/* Navigation with cute cartoon doodle vibe */}
          <nav className="hidden md:flex items-center space-x-7 text-sm font-black text-slate-800">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              className="hover:text-black transition-colors pb-0.5"
              activeProps={{ className: 'text-black border-b-2 border-dashed border-black' }}
            >
              Trang chủ
            </Link>
            {NAV_LINKS.map(link => (
              <a key={link.href} href={link.href} className="hover:text-black transition-colors">
                {link.label}
              </a>
            ))}
            <Link
              to="/dat-truoc"
              className="hover:text-black transition-colors pb-0.5"
              activeProps={{ className: 'text-black border-b-2 border-dashed border-black' }}
            >
              🎁 Đặt trước
            </Link>
          </nav>

          {/* Nút mở menu trên điện thoại */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsMenuOpen(o => !o)}
              aria-label={isMenuOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={isMenuOpen}
              className="md:hidden doodle-btn bg-white h-9 w-9 flex items-center justify-center"
            >
              {isMenuOpen ? <X className="w-5 h-5" weight="bold" /> : <List className="w-5 h-5" weight="bold" />}
            </button>
          </div>
        </div>

        {/* Menu thả xuống trên điện thoại */}
        {isMenuOpen && (
          <nav className="md:hidden mt-2 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_#000] p-2 flex flex-col text-sm font-black animate-in fade-in-0 slide-in-from-top-2">
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="px-3 py-2.5 rounded-xl hover:bg-[#FAF7EE]">
              🏠 Trang chủ
            </Link>
            {NAV_LINKS.map(link => (
              <a key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)} className="px-3 py-2.5 rounded-xl hover:bg-[#FAF7EE]">
                ✨ {link.label}
              </a>
            ))}
            <Link to="/dat-truoc" onClick={() => setIsMenuOpen(false)} className="px-3 py-2.5 rounded-xl hover:bg-[#FAF7EE]">
              🎁 Đặt trước hàng sắp về
            </Link>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* Footer matching Doodle Pop style */}
      <footer id="commitments" className="mt-12 sm:mt-16 border-t-[3px] border-black bg-white py-8 sm:py-12 scroll-mt-24">
        <div className="container mx-auto max-w-6xl px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 text-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#A7F3D0] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
                <Sparkle className="w-5 h-5 text-black" weight="fill" />
              </div>
              <span className="font-black text-lg text-black">SQUISHY POP VN</span>
            </div>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              Thiên đường đồ chơi squishy chính hãng, mềm mịn, chậm tăng cực đỉnh giúp giảm căng thẳng học tập và khơi nguồn sáng tạo không giới hạn.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <h4 className="font-black text-black uppercase tracking-wider text-sm">Cam Kết Của Shop</h4>
            <ul className="space-y-2 text-slate-700 font-bold">
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-px" weight="bold" /> <span>Sản phẩm an toàn 100% không độc hại</span>
              </li>
              <li className="flex items-start gap-2">
                <Truck className="w-4 h-4 text-blue-600 shrink-0 mt-px" weight="bold" /> <span>Đóng gói cẩn thận, giao hàng tận nơi</span>
              </li>
              <li className="flex items-start gap-2">
                <Headset className="w-4 h-4 text-rose-600 shrink-0 mt-px" weight="bold" /> <span>Chăm sóc khách hàng mọi lúc mọi nơi</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2 text-xs sm:col-span-2 md:col-span-1">
            <h4 className="font-black text-black uppercase tracking-wider text-sm">Thanh Toán Tự Động</h4>
            <p className="text-slate-600 font-medium leading-relaxed">
              Quét mã VietQR chuyển khoản nhanh 24/7 tự động xác nhận đơn hàng hoặc chọn thanh toán khi nhận hàng (Ship COD).
            </p>
            <p className="font-black text-black pt-1">Hotline: <a href="tel:0961259164" className="underline decoration-dashed underline-offset-2">0961.259.164</a> (8:00 - 22:00)</p>
          </div>
        </div>
        <div className="container mx-auto max-w-6xl px-4 pt-6 sm:pt-8 mt-6 sm:mt-8 border-t-2 border-dashed border-slate-200 text-center text-xs font-bold text-slate-500 pb-16 sm:pb-0">
          © 2026 Squishy Pop Store • Đồ chơi squishy bóp bóp mềm mềm chính hãng.
        </div>
      </footer>
    </div>
  );
}

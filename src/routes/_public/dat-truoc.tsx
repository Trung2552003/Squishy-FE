import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock, Gift } from '@phosphor-icons/react';

import { preorderApi } from '@/lib/api/squishy/preorderApi';
import { Mascot } from '@/components/shop/mascot';
import { formatDateTime } from '@/lib/utils';

// Danh sách các đợt đặt trước đang mở; mỗi đợt có trang riêng tại /dat-truoc/{slug}
export const Route = createFileRoute('/_public/dat-truoc')({
  component: PreorderCampaignList,
});

const CARD_COLORS = ['#FFF7D6', '#FFE4E6', '#E0F2FE', '#DCFCE7', '#EDE9FE'];

function PreorderCampaignList() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['preorderOpenCampaigns'],
    queryFn: preorderApi.getOpenCampaigns,
  });
  const campaigns = data?.data ?? [];

  return (
    <section className="container mx-auto max-w-4xl px-4 py-8 sm:py-12 space-y-6">
      <div className="flex items-center gap-4">
        <div className="hidden sm:block"><Mascot mood="happy" size={90} /></div>
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-black leading-tight">Đặt trước hàng sắp về 🎁</h1>
          <p className="text-sm sm:text-base text-slate-700 mt-1">Chọn đợt hàng bạn muốn đặt. Shop giữ hàng và liên hệ bạn khi hàng về.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[0, 1].map(i => <div key={i} className="doodle-card h-28 animate-pulse bg-slate-100" />)}
        </div>
      ) : isError ? (
        <div className="doodle-card p-8 text-center space-y-3">
          <p className="font-bold">Không tải được danh sách đợt.</p>
          <button onClick={() => refetch()} className="doodle-btn bg-white px-4 py-2 text-sm">Thử lại</button>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="doodle-card p-8 text-center space-y-2">
          <div className="flex justify-center"><Mascot mood="sleepy" size={90} color="#DDD6FE" /></div>
          <p className="font-bold">Hiện chưa có đợt hàng nào mở đặt trước. Bạn quay lại sau nhé!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c, idx) => (
            <Link
              key={c.id}
              to="/dat-truoc/$slug"
              params={{ slug: c.slug }}
              className="doodle-card p-4 sm:p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform"
              style={{ backgroundColor: CARD_COLORS[idx % CARD_COLORS.length] }}
            >
              <span className="w-12 h-12 shrink-0 rounded-2xl bg-white border-2 border-black grid place-items-center shadow-[2px_2px_0_#000]">
                <Gift className="w-6 h-6" weight="fill" />
              </span>
              <div className="flex-1 min-w-0 space-y-1">
                <h2 className="text-lg sm:text-xl font-black text-black break-words">{c.name}</h2>
                {c.description && <p className="text-sm text-slate-700 line-clamp-2">{c.description}</p>}
                <p className="text-xs font-bold text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>{c.itemIds.length} mẫu</span>
                  {c.closeAt && (
                    <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" weight="bold" /> Đến {formatDateTime(c.closeAt)}</span>
                  )}
                </p>
              </div>
              <ArrowRight className="w-6 h-6 shrink-0" weight="bold" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

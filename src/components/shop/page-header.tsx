import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Mascot, SparkleDoodle, Squiggle } from './mascot'

interface PageHeaderProps {
  emoji?: string
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

const STICKER_COLORS = ['#FEF08A', '#FFD6E0', '#BAE6FD', '#BBF7D0', '#DDD6FE', '#FED7AA']
const UNDERLINE_COLORS = ['text-rose-400', 'text-sky-400', 'text-emerald-400', 'text-amber-400', 'text-violet-400']

// Chọn màu cố định theo tiêu đề để mỗi trang có "màu riêng" nhưng không đổi giữa các lần mở
function pickByText<T>(text: string, list: T[]): T {
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0
  return list[Math.abs(hash) % list.length]
}

// Tiêu đề trang kiểu sổ tay: emoji trong ô sticker nghiêng + nét gạch chân vẽ tay
export function PageHeader({ emoji, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4', className)}>
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {emoji && (
          <div
            className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl border-2 border-slate-800 shadow-[3px_3px_0_#1e293b] flex items-center justify-center text-2xl sm:text-3xl -rotate-6"
            style={{ backgroundColor: pickByText(title, STICKER_COLORS) }}
          >
            <span className="leading-none">{emoji}</span>
            <SparkleDoodle className="twinkle absolute -top-2.5 -right-2.5 w-4 h-4 text-white" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="relative inline-block text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight pb-1.5">
            {title}
            <Squiggle className={cn('absolute left-0 -bottom-1 w-full h-2.5', pickByText(title, UNDERLINE_COLORS))} />
          </h2>
          {description && <p className="text-sm text-slate-600 mt-1.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">{actions}</div>}
    </div>
  )
}

// Trạng thái rỗng: Mochi ngủ gật
export function EmptyState({ title, description, className }: { icon?: ReactNode; title: string; description?: string; className?: string }) {
  return (
    <div className={cn('py-10 px-4 flex flex-col items-center justify-center gap-2 text-center', className)}>
      <Mascot mood="sleepy" size={84} color="#DDD6FE" />
      <p className="font-bold text-base text-slate-900 mt-1">{title}</p>
      {description && <p className="text-sm text-slate-600 max-w-sm">{description}</p>}
    </div>
  )
}

// Đang tải: Mochi nhảy tưng tưng
export function LoadingState({ text = 'Đang tải dữ liệu...', className }: { text?: string; className?: string }) {
  return (
    <div className={cn('py-10 flex flex-col items-center justify-center gap-3 text-slate-500 font-semibold text-sm', className)} role="status">
      <Mascot mood="happy" size={64} className="mochi-hop" animated={false} />
      {text}
    </div>
  )
}

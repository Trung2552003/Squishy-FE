import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { orderApi } from '@/lib/api/squishy/orderApi'
import { reportApi } from '@/lib/api/squishy/reportApi'
import { Mascot, type MascotMood } from './mascot'

interface Tip {
  text: string
  to?: string
  mood: MascotMood
}

const ROTATE_MS = 7000

// Tài khoản không có quyền xem đơn/báo cáo thì bỏ qua lỗi, Mochi chỉ nói câu chào
async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch {
    return null
  }
}

export function MascotTip({ userName }: { userName: string }) {
  const [index, setIndex] = useState(0)
  const [isJumping, setIsJumping] = useState(false)

  const { data: pendingRes } = useQuery({
    queryKey: ['mascotPendingFulfillment'],
    queryFn: () => safe(() => orderApi.getFulfillment('PENDING')),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
  const { data: summaryRes } = useQuery({
    queryKey: ['reportSummary'],
    queryFn: () => safe(() => reportApi.getSummary()),
    staleTime: 60_000,
  })

  const pendingCount = pendingRes?.data?.length ?? 0
  const lowStockCount = summaryRes?.data?.lowStockCount ?? 0

  const hour = new Date().getHours()
  const isLate = hour >= 22 || hour < 6

  const tips = useMemo<Tip[]>(() => {
    const list: Tip[] = []
    if (pendingCount > 0) {
      list.push({ text: `Có ${pendingCount} đơn đang chờ đóng gói nè! 📦`, to: '/cms/order-fulfillment', mood: 'happy' })
    }
    if (lowStockCount > 0) {
      list.push({ text: `${lowStockCount} bé squishy sắp hết hàng rồi 🥺`, to: '/cms/products', mood: 'worried' })
    }
    if (isLate) {
      list.push({ text: `Khuya rồi đó ${userName}, nghỉ ngơi sớm nha 🌙`, mood: 'sleepy' })
    } else {
      list.push({ text: `Chào ${userName}! Chúc hôm nay bán đắt như tôm tươi ✨`, mood: 'happy' })
    }
    if (pendingCount === 0 && lowStockCount === 0) {
      list.push({ text: 'Mọi thứ đều ổn cả, tuyệt vời! 💖', mood: 'wink' })
    }
    list.push({ text: 'Mẹo: bấm Ctrl + B để thu gọn menu nhé!', mood: 'wink' })
    return list
  }, [pendingCount, lowStockCount, isLate, userName])

  useEffect(() => {
    const timer = setInterval(() => setIndex(i => i + 1), ROTATE_MS)
    return () => clearInterval(timer)
  }, [])

  const tip = tips[index % tips.length]

  const poke = () => {
    setIsJumping(true)
    setIndex(i => i + 1)
    setTimeout(() => setIsJumping(false), 600)
  }

  const bubbleClass =
    'mochi-bubble relative block w-full rounded-2xl border-2 border-slate-800 bg-white px-3 py-2 text-[13px] font-semibold leading-snug text-slate-800 shadow-[2px_2px_0_#1e293b] text-left'

  return (
    <div className="flex flex-col items-center gap-2 pt-2">
      {tip.to ? (
        <Link key={index} to={tip.to} className={`${bubbleClass} hover:bg-[#FFFBEB] transition-colors`}>
          {tip.text}
          <span className="block text-[11px] font-bold text-rose-500 mt-0.5">Xem ngay →</span>
        </Link>
      ) : (
        <span key={index} className={bubbleClass}>
          {tip.text}
        </span>
      )}
      <button
        type="button"
        onClick={poke}
        aria-label="Chọc Mochi"
        title="Chọc Mochi một cái!"
        className={isJumping ? 'mochi-jump' : undefined}
      >
        <Mascot mood={isJumping ? 'wink' : tip.mood} size={76} />
      </button>
    </div>
  )
}

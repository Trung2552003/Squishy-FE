import { useState } from 'react'
import { Sparkle } from '@phosphor-icons/react'
import { cn, getThumbSrcSet, getThumbUrl } from '@/lib/utils'

interface ProductImageProps {
  src?: string | null
  alt?: string
  className?: string
  iconClassName?: string
  /** Bề rộng hiển thị ước chừng (px) để lấy ảnh thu nhỏ vừa đủ: 160 ô nhỏ, 320 thẻ sản phẩm, 640 ảnh chi tiết */
  width?: number
}

// Ảnh sản phẩm: lấy bản thu nhỏ theo cỡ hiển thị, tự ghép domain backend và hiện ô thay thế khi thiếu/lỗi ảnh
export function ProductImage({ src, alt = '', className, iconClassName, width = 160 }: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const url = getThumbUrl(src, width)

  if (!url || failedSrc === url) {
    return (
      <div className={cn('flex items-center justify-center bg-rose-50 text-rose-300', className)} aria-label={alt}>
        <Sparkle className={cn('w-1/3 h-1/3 max-w-10 max-h-10', iconClassName)} weight="fill" />
      </div>
    )
  }

  return (
    <img
      src={url}
      srcSet={getThumbSrcSet(src, width)}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(url)}
      className={cn('object-cover', className)}
    />
  )
}

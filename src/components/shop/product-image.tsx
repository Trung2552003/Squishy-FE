import { useState } from 'react'
import { Sparkle } from '@phosphor-icons/react'
import { cn, getFileUrl } from '@/lib/utils'

interface ProductImageProps {
  src?: string | null
  alt?: string
  className?: string
  iconClassName?: string
}

// Ảnh sản phẩm: tự ghép domain backend cho đường dẫn /uploads và hiện ô thay thế khi thiếu/lỗi ảnh
export function ProductImage({ src, alt = '', className, iconClassName }: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const url = getFileUrl(src)

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
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(url)}
      className={cn('object-cover', className)}
    />
  )
}

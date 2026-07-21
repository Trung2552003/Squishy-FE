import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_public/about')({
  component: About,
})

function About() {
  return (
    <div className="p-8 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-out delay-150 fill-mode-both">
      <h3 className="text-4xl font-bold tracking-tight mb-4 text-foreground">About Us</h3>
      <p className="text-muted-foreground leading-relaxed max-w-2xl text-lg">
        Trang này dùng để demo routing cơ bản của TanStack Router. 
        Bạn có thể thêm các file mới vào thư mục <code>src/routes</code> để tự động tạo thêm các route mới nhờ vào TanStack Router plugin.
      </p>
    </div>
  )
}

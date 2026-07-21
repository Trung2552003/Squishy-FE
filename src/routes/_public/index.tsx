import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_public/')({
  component: Index,
})

function Index() {
  return (
    <div className="p-8 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-out">
      <h3 className="text-4xl font-bold tracking-tight mb-4 text-foreground">Welcome Home!</h3>
      <p className="text-muted-foreground leading-relaxed max-w-2xl text-lg">
        Bạn đã thiết lập thành công dự án React với Vite, Tailwind CSS và TanStack Router.
        Bây giờ bạn có thể bắt đầu xây dựng ứng dụng của mình.
      </p>
      <div className="mt-8 flex gap-4">
        <button className="px-6 py-3 bg-neutral-900 text-white font-semibold rounded-lg shadow-md hover:bg-neutral-800 transition-colors">
          Get Started
        </button>
        <button className="px-6 py-3 bg-card text-foreground font-semibold rounded-lg border border-border shadow-sm hover:bg-muted/50 transition-colors">
          Documentation
        </button>
      </div>
    </div>
  )
}

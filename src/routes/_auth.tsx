import { createFileRoute, Outlet, Link } from '@tanstack/react-router'
import { ArrowLeftIcon } from '@phosphor-icons/react'

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="min-h-screen bg-muted/50 flex flex-col font-sans relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-40"></div>
        <div className="absolute bottom-0 left-20 w-72 h-72 bg-rose-200 rounded-full blur-3xl opacity-40"></div>
      </div>

      <header className="p-6">
        <Link to="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Quay lại Trang chủ
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

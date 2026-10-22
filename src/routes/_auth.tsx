import { createFileRoute, Outlet, Link } from '@tanstack/react-router'
import { ArrowLeftIcon } from '@phosphor-icons/react'

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="min-h-svh doodle-bg flex flex-col font-sans relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-40"></div>
        <div className="absolute bottom-0 left-20 w-72 h-72 bg-rose-200 rounded-full blur-3xl opacity-40"></div>
      </div>

      <header className="px-4 pt-4 sm:p-6">
        <Link to="/" className="inline-flex items-center text-sm font-bold text-black bg-white border-2 border-black rounded-full px-3 py-1.5 shadow-[2px_2px_0px_#000] hover:translate-x-px hover:translate-y-px transition-transform">
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Quay lại Trang chủ
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-3 py-6 sm:p-4">
        <div className="w-full max-w-lg">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

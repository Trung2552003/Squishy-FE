import { createFileRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
})

function PublicLayout() {
  return (
    <div className="min-h-screen bg-muted/50 text-foreground flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto flex h-16 items-center px-4 space-x-6">
          <Link to="/" className="text-lg font-bold tracking-tight text-foreground transition-colors hover:text-muted-foreground">
            SystemBase
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link to="/" className="transition-colors hover:text-foreground text-muted-foreground [&.active]:text-foreground">
              Home
            </Link>
            <Link to="/about" className="transition-colors hover:text-foreground text-muted-foreground [&.active]:text-foreground">
              About
            </Link>
          </nav>
          <div className="flex-1" />
          <nav className="flex items-center space-x-4 text-sm font-medium">
            <Link to="/login" className="transition-colors hover:text-foreground text-muted-foreground">
              Login
            </Link>
            <Link to="/register" className="px-4 py-2 bg-neutral-900 text-white font-semibold rounded-md shadow-sm hover:bg-neutral-800 transition-colors">
              Register
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center p-8 container mx-auto">
        <Outlet />
      </main>
    </div>
  )
}

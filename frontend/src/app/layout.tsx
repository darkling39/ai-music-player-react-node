import { Music } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Music className="size-5 text-primary" />
            AI Music Teacher
          </Link>
          <span className="text-sm text-muted-foreground">пианино · MVP</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

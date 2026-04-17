import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogOut, ShoppingBag } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { signOut } from './actions'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? ''
  const initial = (fullName || user.email || '?').charAt(0).toUpperCase()
  const displayName = fullName || user.email

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--brand)] text-white">
              <ShoppingBag className="h-3.5 w-3.5" />
            </div>
            Storefront
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-soft)] text-sm font-semibold text-[var(--brand)]">
                {initial}
              </div>
              <span
                className="hidden max-w-[160px] truncate text-xs text-gray-600 sm:inline"
                title={user.email ?? undefined}
              >
                {displayName}
              </span>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="btn-ghost"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {children}
    </div>
  )
}

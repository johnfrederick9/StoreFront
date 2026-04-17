import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ChevronRight,
  Package,
  Plus,
  Receipt,
  Store,
  TrendingUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'
import { EmptyState, PageHeader } from '@/components/ui'
import { StatusPill } from './[slug]/orders/status-pill'

function formatRelative(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const fullName =
    (user.user_metadata?.full_name as string | undefined)?.trim() || null
  const firstName = fullName?.split(/\s+/)[0] ?? null

  const { data: stores } = await supabase
    .from('stores')
    .select('id, name, slug, logo_url, created_at')
    .order('created_at', { ascending: false })

  const storesList = stores ?? []
  const storeIds = storesList.map((s) => s.id)
  const storeMap = new Map(storesList.map((s) => [s.id, s]))

  let productsCount: number | null = null
  let ordersCount: number | null = null
  let revenueCents = 0
  let recentOrders: Array<{
    id: string
    total_cents: number
    status: string
    created_at: string
    customer_email: string
    customer_name: string | null
    store_id: string
  }> = []

  if (storeIds.length > 0) {
    const [
      { count: pc },
      { data: paidOrders, count: oc },
      { data: recent },
    ] = await Promise.all([
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .in('store_id', storeIds),
      supabase
        .from('orders')
        .select('total_cents', { count: 'exact' })
        .in('store_id', storeIds)
        .eq('status', 'paid'),
      supabase
        .from('orders')
        .select(
          'id, total_cents, status, created_at, customer_email, customer_name, store_id',
        )
        .in('store_id', storeIds)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    productsCount = pc
    ordersCount = oc
    revenueCents = (paidOrders ?? []).reduce(
      (sum, o) => sum + o.total_cents,
      0,
    )
    recentOrders = recent ?? []
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        title={firstName ? `Hi, ${firstName}` : 'Welcome back'}
        description="Here's what's happening across your stores."
        action={
          storesList.length > 0 ? (
            <Link href="/dashboard/new" className="btn-primary">
              <Plus className="h-4 w-4" />
              New store
            </Link>
          ) : undefined
        }
      />

      {storesList.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={<Store className="h-6 w-6" />}
            title="You haven't created a store yet"
            description="Spin one up in under a minute. You can add products right after."
            action={
              <Link href="/dashboard/new" className="btn-primary">
                <Plus className="h-4 w-4" />
                Create your first store
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <StatCard
              icon={<Store className="h-4 w-4" />}
              label="Stores"
              value={String(storesList.length)}
            />
            <StatCard
              icon={<Package className="h-4 w-4" />}
              label="Products"
              value={productsCount !== null ? String(productsCount) : '–'}
            />
            <StatCard
              icon={<Receipt className="h-4 w-4" />}
              label="Paid orders"
              value={ordersCount !== null ? String(ordersCount) : '–'}
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="All-time revenue"
              value={formatPrice(revenueCents, 'USD')}
            />
          </section>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">
                  Your stores
                </h2>
                <span className="text-xs text-gray-500">
                  {storesList.length} total
                </span>
              </div>
              <ul className="mt-4 grid gap-3">
                {storesList.map((store) => (
                  <li key={store.id}>
                    <Link
                      href={`/dashboard/${store.slug}`}
                      className="card group flex items-center gap-4 px-4 py-3 transition hover:border-gray-300 hover:shadow"
                    >
                      {store.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={store.logo_url}
                          alt=""
                          className="h-11 w-11 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-sm font-semibold text-[var(--brand)]">
                          {store.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {store.name}
                        </p>
                        <p className="truncate font-mono text-xs text-gray-500">
                          /s/{store.slug}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-600" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900">
                Recent activity
              </h2>
              {recentOrders.length === 0 ? (
                <div className="card mt-4 p-6 text-center">
                  <p className="text-sm text-gray-500">
                    No orders yet. When customers check out, you&apos;ll see
                    them here.
                  </p>
                </div>
              ) : (
                <ul className="card mt-4 divide-y divide-gray-200">
                  {recentOrders.map((o) => {
                    const store = storeMap.get(o.store_id)
                    return (
                      <li key={o.id}>
                        <Link
                          href={
                            store
                              ? `/dashboard/${store.slug}/orders/${o.id}`
                              : '#'
                          }
                          className="block px-4 py-3 transition hover:bg-gray-50"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-medium">
                              {o.customer_name ?? o.customer_email}
                            </p>
                            <StatusPill status={o.status} />
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                            <span className="truncate text-gray-500">
                              {store?.name ?? 'Store'} ·{' '}
                              {formatRelative(o.created_at)}
                            </span>
                            <span className="font-medium tabular-nums text-gray-900">
                              {formatPrice(o.total_cents, 'USD')}
                            </span>
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--brand-soft)] text-[var(--brand)]">
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  )
}

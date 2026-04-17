import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ChevronRight, Receipt } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'
import { parsePage, totalPages } from '@/lib/pagination'
import { Pagination } from '@/components/pagination'
import { EmptyState, PageHeader } from '@/components/ui'
import { StatusPill } from './status-pill'

const PAGE_SIZE = 50

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const { page, offset, rangeEnd } = parsePage(sp, PAGE_SIZE)

  const supabase = await createClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, currency')
    .eq('slug', slug)
    .maybeSingle()

  if (!store) notFound()

  const { data: orders, count } = await supabase
    .from('orders')
    .select(
      'id, customer_email, customer_name, total_cents, status, created_at',
      { count: 'exact' },
    )
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .range(offset, rangeEnd)

  const currency = store.currency ?? 'USD'
  const pages = totalPages(count, PAGE_SIZE)

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href={`/dashboard/${slug}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {store.name}
      </Link>

      <div className="mt-4">
        <PageHeader
          title="Orders"
          description={
            count !== null && count > 0
              ? `${count} total.`
              : undefined
          }
        />
      </div>

      {!orders || orders.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Receipt className="h-6 w-6" />}
            title={page > 1 ? 'No orders on this page' : 'No orders yet'}
            description={
              page > 1
                ? undefined
                : "They'll show up here as customers check out."
            }
          />
        </div>
      ) : (
        <>
          <div className="card mt-8 overflow-hidden">
            <div className="hidden border-b border-gray-200 bg-gray-50 px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:block">
              <div className="grid grid-cols-[160px_1fr_120px_120px_40px] gap-4">
                <div>Date</div>
                <div>Customer</div>
                <div>Total</div>
                <div>Status</div>
                <div />
              </div>
            </div>
            <ul className="divide-y divide-gray-200">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/dashboard/${slug}/orders/${o.id}`}
                    className="block px-4 py-3 transition hover:bg-gray-50"
                  >
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[160px_1fr_120px_120px_40px] sm:items-center sm:gap-4">
                      <div className="text-xs text-gray-500 sm:text-sm">
                        {formatDate(o.created_at)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {o.customer_name ?? o.customer_email}
                        </p>
                        {o.customer_name && (
                          <p className="truncate text-xs text-gray-500">
                            {o.customer_email}
                          </p>
                        )}
                      </div>
                      <div className="text-sm font-medium tabular-nums text-gray-900">
                        {formatPrice(o.total_cents, currency)}
                      </div>
                      <div>
                        <StatusPill status={o.status} />
                      </div>
                      <ChevronRight className="hidden h-4 w-4 text-gray-400 sm:block" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <Pagination
            basePath={`/dashboard/${slug}/orders`}
            page={page}
            totalPages={pages}
          />
        </>
      )}
    </main>
  )
}

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ImageIcon, Mail, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'
import { updateOrderStatus, type OrderStatus } from '../actions'
import { StatusPill } from '../status-pill'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['cancelled'],
  cancelled: [],
}

type OrderItemRow = {
  id: string
  quantity: number
  price_cents: number
  products: { name: string; image_url: string | null } | null
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>
}) {
  const { slug, orderId } = await params
  const supabase = await createClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, currency')
    .eq('slug', slug)
    .maybeSingle()

  if (!store) notFound()

  const { data: order } = await supabase
    .from('orders')
    .select(
      `
      id,
      customer_email,
      customer_name,
      total_cents,
      status,
      stripe_session_id,
      created_at,
      order_items (
        id,
        quantity,
        price_cents,
        products ( name, image_url )
      )
    `,
    )
    .eq('id', orderId)
    .eq('store_id', store.id)
    .maybeSingle<{
      id: string
      customer_email: string
      customer_name: string | null
      total_cents: number
      status: string
      stripe_session_id: string | null
      created_at: string
      order_items: OrderItemRow[]
    }>()

  if (!order) notFound()

  const currency = store.currency ?? 'USD'
  const current = order.status as OrderStatus
  const nextStates = TRANSITIONS[current] ?? []

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href={`/dashboard/${slug}/orders`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Orders
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Order #{order.id.slice(0, 8)}
            </h1>
            <StatusPill status={order.status} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {formatDate(order.created_at)}
          </p>
        </div>
      </div>

      <section className="card mt-6 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Customer
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-6">
          {order.customer_name && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{order.customer_name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-gray-400" />
            <a
              href={`mailto:${order.customer_email}`}
              className="text-[var(--brand)] hover:underline"
            >
              {order.customer_email}
            </a>
          </div>
        </div>
      </section>

      <section className="card mt-4 overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-4">
              {item.products?.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.products.image_url}
                  alt=""
                  className="h-14 w-14 rounded-lg object-cover ring-1 ring-gray-200"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                  <ImageIcon className="h-5 w-5" />
                </div>
              )}
              <div className="flex-1 text-sm">
                <p className="font-medium">
                  {item.products?.name ?? (
                    <span className="text-gray-400">(deleted product)</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  × {item.quantity} · {formatPrice(item.price_cents, currency)}
                </p>
              </div>
              <p className="text-sm font-medium tabular-nums">
                {formatPrice(item.price_cents * item.quantity, currency)}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <span className="font-medium text-gray-600">Total</span>
          <span className="text-base font-semibold tabular-nums">
            {formatPrice(order.total_cents, currency)}
          </span>
        </div>
      </section>

      {nextStates.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-gray-700">Update status</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {nextStates.map((next) => (
              <form
                key={next}
                action={async () => {
                  'use server'
                  await updateOrderStatus(slug, order.id, next)
                }}
              >
                <button
                  type="submit"
                  className={
                    next === 'cancelled' ? 'btn-danger' : 'btn-primary'
                  }
                >
                  Mark as {next}
                </button>
              </form>
            ))}
          </div>
        </section>
      )}

      {order.stripe_session_id && (
        <p className="mt-10 break-all text-xs text-gray-400">
          Stripe session: <code>{order.stripe_session_id}</code>
        </p>
      )}
    </main>
  )
}

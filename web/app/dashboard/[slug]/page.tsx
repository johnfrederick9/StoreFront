import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  ExternalLink,
  Package,
  Receipt,
  Settings,
  Store,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function StoreAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, slug, currency, logo_url')
    .eq('slug', slug)
    .maybeSingle()

  if (!store) notFound()

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        All stores
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-5">
        {store.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.logo_url}
            alt=""
            className="h-16 w-16 rounded-xl object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-2xl font-semibold text-[var(--brand)] shadow-sm">
            {store.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {store.name}
          </h1>
          <p className="text-sm text-gray-500">
            <span className="font-mono">/s/{store.slug}</span> · {store.currency}
          </p>
        </div>
        <Link
          href={`/s/${store.slug}`}
          target="_blank"
          className="btn-secondary"
        >
          <ExternalLink className="h-4 w-4" />
          View storefront
        </Link>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <AdminCard
          icon={<Package className="h-5 w-5" />}
          title="Products"
          description="Add and manage what you sell."
          href={`/dashboard/${store.slug}/products`}
          cta="Manage products"
        />
        <AdminCard
          icon={<Receipt className="h-5 w-5" />}
          title="Orders"
          description="View incoming orders and update status."
          href={`/dashboard/${store.slug}/orders`}
          cta="View orders"
        />
        <AdminCard
          icon={<Store className="h-5 w-5" />}
          title="Storefront"
          description="The public page where customers buy."
          href={`/s/${store.slug}`}
          cta="Open storefront"
          external
        />
        <AdminCard
          icon={<Settings className="h-5 w-5" />}
          title="Settings"
          description="Store name, currency, and logo."
          href={`/dashboard/${store.slug}/settings`}
          cta="Open settings"
          disabled
          comingSoon="Soon"
        />
      </div>
    </main>
  )
}

function AdminCard({
  icon,
  title,
  description,
  href,
  cta,
  disabled,
  external,
  comingSoon,
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
  cta: string
  disabled?: boolean
  external?: boolean
  comingSoon?: string
}) {
  return (
    <div className="card p-5 transition hover:border-gray-300 hover:shadow">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
          {icon}
        </div>
        {comingSoon && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            {comingSoon}
          </span>
        )}
      </div>
      <h2 className="mt-4 text-base font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
      {disabled ? (
        <button type="button" disabled className="btn-secondary mt-4">
          {cta}
        </button>
      ) : (
        <Link
          href={href}
          target={external ? '_blank' : undefined}
          className="btn-primary mt-4"
        >
          {cta}
          {external && <ExternalLink className="h-3.5 w-3.5" />}
        </Link>
      )}
    </div>
  )
}

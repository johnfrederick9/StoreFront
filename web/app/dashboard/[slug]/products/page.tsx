import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ImageIcon, Package, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'
import { parsePage, totalPages } from '@/lib/pagination'
import { Pagination } from '@/components/pagination'
import { Badge, EmptyState, PageHeader } from '@/components/ui'
import { toggleProductActive } from './actions'

const PAGE_SIZE = 24

export default async function ProductsPage({
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
    .select('id, name, slug, currency')
    .eq('slug', slug)
    .maybeSingle()

  if (!store) notFound()

  const { data: products, count } = await supabase
    .from('products')
    .select('id, name, price_cents, stock, active, image_url', {
      count: 'exact',
    })
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .range(offset, rangeEnd)

  const pages = totalPages(count, PAGE_SIZE)
  const currency = store.currency ?? 'USD'

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href={`/dashboard/${slug}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {store.name}
      </Link>

      <div className="mt-4">
        <PageHeader
          title="Products"
          description={
            count !== null && count > 0
              ? `${count} total in your catalog.`
              : undefined
          }
          action={
            products && products.length > 0 ? (
              <Link
                href={`/dashboard/${slug}/products/new`}
                className="btn-primary"
              >
                <Plus className="h-4 w-4" />
                New product
              </Link>
            ) : undefined
          }
        />
      </div>

      {!products || products.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Package className="h-6 w-6" />}
            title={page > 1 ? 'No products on this page' : 'No products yet'}
            description={
              page > 1
                ? undefined
                : 'Add your first product to start selling.'
            }
            action={
              page === 1 ? (
                <Link
                  href={`/dashboard/${slug}/products/new`}
                  className="btn-primary"
                >
                  <Plus className="h-4 w-4" />
                  Add your first product
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <ul className="card mt-8 divide-y divide-gray-200">
            {products.map((p) => (
              <li key={p.id}>
                <div className="flex items-center gap-4 px-4 py-3">
                  <Link
                    href={`/dashboard/${slug}/products/${p.id}`}
                    className="flex flex-1 items-center gap-4 min-w-0"
                  >
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_url}
                        alt=""
                        className="h-14 w-14 rounded-lg object-cover ring-1 ring-gray-200"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {p.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                        <span className="tabular-nums font-medium text-gray-700">
                          {formatPrice(p.price_cents, currency)}
                        </span>
                        <span>·</span>
                        <span
                          className={
                            p.stock === 0
                              ? 'font-medium text-red-700'
                              : 'text-gray-500'
                          }
                        >
                          {p.stock === 0 ? 'Out of stock' : `${p.stock} in stock`}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <form
                    action={async () => {
                      'use server'
                      await toggleProductActive(slug, p.id, !p.active)
                    }}
                  >
                    <button type="submit" className="transition hover:opacity-80">
                      {p.active ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge>Hidden</Badge>
                      )}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            basePath={`/dashboard/${slug}/products`}
            page={page}
            totalPages={pages}
          />
        </>
      )}
    </main>
  )
}

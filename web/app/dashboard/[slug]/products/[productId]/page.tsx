import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { deleteProduct, updateProduct } from '../actions'
import { ProductForm } from '../product-form'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ slug: string; productId: string }>
}) {
  const { slug, productId } = await params
  const supabase = await createClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (!store) notFound()

  const { data: product } = await supabase
    .from('products')
    .select('id, name, description, price_cents, stock, active, image_url')
    .eq('id', productId)
    .eq('store_id', store.id)
    .maybeSingle()

  if (!product) notFound()

  const updateAction = updateProduct.bind(null, slug, productId)
  const deleteAction = deleteProduct.bind(null, slug, productId)

  return (
    <main>
      <h1 className="sr-only">Edit product</h1>
      <ProductForm
        action={updateAction}
        deleteAction={deleteAction}
        initial={product}
        backHref={`/dashboard/${slug}/products`}
        submitLabel="Save changes"
      />
    </main>
  )
}

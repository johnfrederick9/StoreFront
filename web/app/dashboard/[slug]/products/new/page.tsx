import { createProduct } from '../actions'
import { ProductForm } from '../product-form'

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const action = createProduct.bind(null, slug)

  return (
    <main>
      <h1 className="sr-only">New product</h1>
      <ProductForm
        action={action}
        backHref={`/dashboard/${slug}/products`}
        submitLabel="Create product"
      />
    </main>
  )
}

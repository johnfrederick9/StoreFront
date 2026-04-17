'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ProductFormState = {
  error?: string
  fieldErrors?: {
    name?: string
    price?: string
    stock?: string
    image?: string
  }
} | null

const MAX_IMAGE_BYTES = 4 * 1024 * 1024 // 4 MB
const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
])

function parsePriceToCents(raw: string): number | null {
  const s = raw.trim()
  if (!s) return null
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  const [whole, frac = ''] = s.split('.')
  const cents = Number(whole) * 100 + Number((frac + '00').slice(0, 2))
  if (!Number.isFinite(cents) || cents < 0) return null
  return cents
}

async function loadStoreForOwner(slug: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, store: null }

  const { data: store } = await supabase
    .from('stores')
    .select('id, slug, owner_id')
    .eq('slug', slug)
    .maybeSingle()

  if (!store || store.owner_id !== user.id) {
    return { supabase, user, store: null }
  }
  return { supabase, user, store }
}

async function uploadImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  storeSlug: string,
  image: File,
): Promise<{ url?: string; error?: string }> {
  const ext = image.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${userId}/${storeSlug}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, image, { contentType: image.type, upsert: false })
  if (error) return { error: error.message }
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return { url: data.publicUrl }
}

function validate(formData: FormData): {
  fields?: {
    name: string
    description: string | null
    price_cents: number
    stock: number
    active: boolean
  }
  fieldErrors: NonNullable<ProductFormState>['fieldErrors']
} {
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim() || null
  const priceRaw = String(formData.get('price') ?? '').trim()
  const stockRaw = String(formData.get('stock') ?? '0').trim()
  const active = formData.get('active') === 'on'

  const fieldErrors: NonNullable<ProductFormState>['fieldErrors'] = {}
  if (!name) fieldErrors.name = 'Required'
  else if (name.length > 120) fieldErrors.name = 'At most 120 characters'

  const cents = parsePriceToCents(priceRaw)
  if (cents === null) fieldErrors.price = 'Enter a price like 19.99'

  const stock = Number(stockRaw)
  if (!Number.isInteger(stock) || stock < 0) {
    fieldErrors.stock = 'Whole number, 0 or more'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors }
  }

  return {
    fields: {
      name,
      description,
      price_cents: cents!,
      stock,
      active,
    },
    fieldErrors: {},
  }
}

export async function createProduct(
  storeSlug: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const { fields, fieldErrors } = validate(formData)
  const image = formData.get('image')
  if (image instanceof File && image.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      fieldErrors!.image = 'Must be PNG, JPEG, or WEBP'
    } else if (image.size > MAX_IMAGE_BYTES) {
      fieldErrors!.image = 'Must be under 4 MB'
    }
  }
  if (!fields || Object.keys(fieldErrors!).length > 0) {
    return { fieldErrors }
  }

  const { supabase, user, store } = await loadStoreForOwner(storeSlug)
  if (!user) return { error: 'You must be signed in' }
  if (!store) return { error: 'Store not found' }

  let imageUrl: string | null = null
  if (image instanceof File && image.size > 0) {
    const up = await uploadImage(supabase, user.id, store.slug, image)
    if (up.error) return { error: `Image upload failed: ${up.error}` }
    imageUrl = up.url ?? null
  }

  const { error } = await supabase.from('products').insert({
    store_id: store.id,
    ...fields,
    image_url: imageUrl,
  })

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/${storeSlug}/products`)
  redirect(`/dashboard/${storeSlug}/products`)
}

export async function updateProduct(
  storeSlug: string,
  productId: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const { fields, fieldErrors } = validate(formData)
  const image = formData.get('image')
  if (image instanceof File && image.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      fieldErrors!.image = 'Must be PNG, JPEG, or WEBP'
    } else if (image.size > MAX_IMAGE_BYTES) {
      fieldErrors!.image = 'Must be under 4 MB'
    }
  }
  if (!fields || Object.keys(fieldErrors!).length > 0) {
    return { fieldErrors }
  }

  const { supabase, user, store } = await loadStoreForOwner(storeSlug)
  if (!user) return { error: 'You must be signed in' }
  if (!store) return { error: 'Store not found' }

  const update: Record<string, unknown> = { ...fields }
  if (image instanceof File && image.size > 0) {
    const up = await uploadImage(supabase, user.id, store.slug, image)
    if (up.error) return { error: `Image upload failed: ${up.error}` }
    update.image_url = up.url
  }

  const { error } = await supabase
    .from('products')
    .update(update)
    .eq('id', productId)
    .eq('store_id', store.id)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/${storeSlug}/products`)
  revalidatePath(`/dashboard/${storeSlug}/products/${productId}`)
  redirect(`/dashboard/${storeSlug}/products`)
}

export async function deleteProduct(storeSlug: string, productId: string) {
  const { supabase, store } = await loadStoreForOwner(storeSlug)
  if (!store) return

  await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('store_id', store.id)

  revalidatePath(`/dashboard/${storeSlug}/products`)
  redirect(`/dashboard/${storeSlug}/products`)
}

export async function toggleProductActive(
  storeSlug: string,
  productId: string,
  active: boolean,
) {
  const { supabase, store } = await loadStoreForOwner(storeSlug)
  if (!store) return

  await supabase
    .from('products')
    .update({ active })
    .eq('id', productId)
    .eq('store_id', store.id)

  revalidatePath(`/dashboard/${storeSlug}/products`)
}

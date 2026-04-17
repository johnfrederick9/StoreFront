'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isValidSlug, slugError } from '@/lib/slug'

export type CreateStoreState = {
  error?: string
  fieldErrors?: { name?: string; slug?: string; logo?: string }
} | null

const MAX_LOGO_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_LOGO_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
])

export async function createStore(
  _prev: CreateStoreState,
  formData: FormData,
): Promise<CreateStoreState> {
  const name = String(formData.get('name') ?? '').trim()
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase()
  const logo = formData.get('logo')

  const fieldErrors: NonNullable<CreateStoreState>['fieldErrors'] = {}
  if (!name) fieldErrors.name = 'Required'
  else if (name.length > 60) fieldErrors.name = 'At most 60 characters'

  const slugErr = slugError(slug)
  if (slugErr) fieldErrors.slug = slugErr
  else if (!isValidSlug(slug)) fieldErrors.slug = 'Invalid slug'

  if (logo instanceof File && logo.size > 0) {
    if (!ALLOWED_LOGO_TYPES.has(logo.type)) {
      fieldErrors.logo = 'Must be PNG, JPEG, WEBP, or SVG'
    } else if (logo.size > MAX_LOGO_BYTES) {
      fieldErrors.logo = 'Must be under 2 MB'
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in' }
  }

  let logoUrl: string | null = null
  if (logo instanceof File && logo.size > 0) {
    const ext = logo.name.split('.').pop()?.toLowerCase() ?? 'png'
    const path = `${user.id}/${slug}-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('store-logos')
      .upload(path, logo, { contentType: logo.type, upsert: false })
    if (uploadError) {
      return { error: `Logo upload failed: ${uploadError.message}` }
    }
    const { data: publicUrl } = supabase.storage
      .from('store-logos')
      .getPublicUrl(path)
    logoUrl = publicUrl.publicUrl
  }

  const { error: insertError } = await supabase
    .from('stores')
    .insert({ owner_id: user.id, name, slug, logo_url: logoUrl })

  if (insertError) {
    if (insertError.code === '23505') {
      return { fieldErrors: { slug: 'This URL is already taken' } }
    }
    return { error: insertError.message }
  }

  redirect(`/dashboard/${slug}`)
}

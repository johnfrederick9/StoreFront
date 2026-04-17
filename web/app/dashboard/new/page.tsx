'use client'

import Link from 'next/link'
import { ArrowLeft, Store } from 'lucide-react'
import { useActionState, useEffect, useState } from 'react'
import { slugify } from '@/lib/slug'
import { createStore, type CreateStoreState } from './actions'

export default function NewStorePage() {
  const [state, formAction, pending] = useActionState<
    CreateStoreState,
    FormData
  >(createStore, null)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!slugEdited) setSlug(slugify(name))
  }, [name, slugEdited])

  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="mt-8 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create a store
          </h1>
          <p className="text-sm text-gray-600">
            Pick a name and a URL. You can change them later.
          </p>
        </div>
      </div>

      <form action={formAction} className="card mt-8 flex flex-col gap-5 p-6">
        <div>
          <label htmlFor="name" className="label">
            Store name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input mt-1.5"
            placeholder="Acme Goods"
          />
          {state?.fieldErrors?.name && (
            <p className="error-text">{state.fieldErrors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="slug" className="label">
            Store URL
          </label>
          <div className="mt-1.5 flex overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand)]/20">
            <span className="bg-gray-50 px-3 py-2 text-sm text-gray-500">
              /s/
            </span>
            <input
              id="slug"
              name="slug"
              type="text"
              required
              minLength={3}
              maxLength={40}
              value={slug}
              onChange={(e) => {
                setSlugEdited(true)
                setSlug(e.target.value.toLowerCase())
              }}
              className="flex-1 px-2 py-2 text-sm outline-none"
              placeholder="acme-goods"
            />
          </div>
          <p className="hint">Letters, numbers, and single dashes.</p>
          {state?.fieldErrors?.slug && (
            <p className="error-text">{state.fieldErrors.slug}</p>
          )}
        </div>

        <div>
          <label className="label">
            Logo <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <div className="mt-1.5 flex items-center gap-4">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPreview}
                alt=""
                className="h-14 w-14 rounded-lg object-cover ring-1 ring-gray-200"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                <Store className="h-5 w-5" />
              </div>
            )}
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setLogoPreview(URL.createObjectURL(file))
                else setLogoPreview(null)
              }}
              className="block flex-1 text-sm file:mr-3 file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-50"
            />
          </div>
          {state?.fieldErrors?.logo && (
            <p className="error-text">{state.fieldErrors.logo}</p>
          )}
        </div>

        {state?.error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="btn-primary mt-2 self-start"
        >
          {pending ? 'Creating…' : 'Create store'}
        </button>
      </form>
    </main>
  )
}

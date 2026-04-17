'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { ArrowLeft, ImageIcon, Trash2 } from 'lucide-react'
import type { ProductFormState } from './actions'

type ProductAction = (
  prev: ProductFormState,
  formData: FormData,
) => Promise<ProductFormState>

export type ProductInitial = {
  name: string
  description: string | null
  price_cents: number
  stock: number
  active: boolean
  image_url: string | null
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function ProductForm({
  action,
  deleteAction,
  initial,
  backHref,
  submitLabel,
}: {
  action: ProductAction
  deleteAction?: () => Promise<void>
  initial?: ProductInitial
  backHref: string
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState<
    ProductFormState,
    FormData
  >(action, null)

  const [imagePreview, setImagePreview] = useState<string | null>(
    initial?.image_url ?? null,
  )

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
        {initial ? 'Edit product' : 'New product'}
      </h1>

      <form action={formAction} className="card mt-6 flex flex-col gap-5 p-6">
        <div>
          <label htmlFor="name" className="label">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={120}
            defaultValue={initial?.name ?? ''}
            className="input mt-1.5"
          />
          {state?.fieldErrors?.name && (
            <p className="error-text">{state.fieldErrors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="label">
            Description <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={initial?.description ?? ''}
            className="input mt-1.5"
            placeholder="Tell customers what makes this product great."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="price" className="label">
              Price
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                $
              </span>
              <input
                id="price"
                name="price"
                type="text"
                inputMode="decimal"
                required
                defaultValue={
                  initial ? centsToDollars(initial.price_cents) : ''
                }
                placeholder="19.99"
                className="input pl-7"
              />
            </div>
            {state?.fieldErrors?.price && (
              <p className="error-text">{state.fieldErrors.price}</p>
            )}
          </div>
          <div>
            <label htmlFor="stock" className="label">
              Stock
            </label>
            <input
              id="stock"
              name="stock"
              type="number"
              min={0}
              step={1}
              defaultValue={initial?.stock ?? 0}
              className="input mt-1.5"
            />
            {state?.fieldErrors?.stock && (
              <p className="error-text">{state.fieldErrors.stock}</p>
            )}
          </div>
        </div>

        <div>
          <label className="label">
            Image{' '}
            <span className="font-normal text-gray-500">
              ({initial?.image_url ? 'replace' : 'optional'})
            </span>
          </label>
          <div className="mt-1.5 flex items-start gap-4">
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreview}
                alt=""
                className="h-20 w-20 rounded-lg object-cover ring-1 ring-gray-200"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
            <input
              id="image"
              name="image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setImagePreview(URL.createObjectURL(file))
              }}
              className="block flex-1 text-sm file:mr-3 file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-50"
            />
          </div>
          {state?.fieldErrors?.image && (
            <p className="error-text">{state.fieldErrors.image}</p>
          )}
        </div>

        <label className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={initial?.active ?? true}
            className="h-4 w-4 rounded border-gray-300 text-[var(--brand)] focus:ring-[var(--brand)]"
          />
          <span>Visible in storefront</span>
        </label>

        {state?.error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="btn-primary self-start"
        >
          {pending ? 'Saving…' : submitLabel}
        </button>
      </form>

      {deleteAction && (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50/30 p-6">
          <p className="text-sm font-semibold text-red-900">Danger zone</p>
          <p className="mt-1 text-xs text-red-900/70">
            Deleting a product is permanent and removes its image.
          </p>
          <div className="mt-4">
            <DeleteButton action={deleteAction} />
          </div>
        </div>
      )}
    </div>
  )
}

function DeleteButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm('Delete this product? This cannot be undone.')) {
          e.preventDefault()
        }
      }}
    >
      <button type="submit" className="btn-danger">
        <Trash2 className="h-4 w-4" />
        Delete product
      </button>
    </form>
  )
}

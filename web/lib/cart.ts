'use client'

import { useCallback, useSyncExternalStore } from 'react'

export type CartItem = {
  productId: string
  quantity: number
}

type Listener = () => void

const EMPTY: CartItem[] = []

const snapshots = new Map<string, CartItem[]>()
const listeners = new Map<string, Set<Listener>>()

function cartKey(storeSlug: string) {
  return `cart:${storeSlug}`
}

function readFromStorage(storeSlug: string): CartItem[] {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = localStorage.getItem(cartKey(storeSlug))
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return EMPTY
    const items = parsed.filter(
      (x): x is CartItem =>
        x &&
        typeof x.productId === 'string' &&
        typeof x.quantity === 'number' &&
        x.quantity > 0,
    )
    return items.length === 0 ? EMPTY : items
  } catch {
    return EMPTY
  }
}

function getSnapshot(storeSlug: string): CartItem[] {
  let current = snapshots.get(storeSlug)
  if (current === undefined) {
    current = readFromStorage(storeSlug)
    snapshots.set(storeSlug, current)
  }
  return current
}

function notify(storeSlug: string) {
  listeners.get(storeSlug)?.forEach((fn) => fn())
}

function refreshFromStorage(storeSlug: string) {
  snapshots.set(storeSlug, readFromStorage(storeSlug))
  notify(storeSlug)
}

function writeCart(storeSlug: string, items: CartItem[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(cartKey(storeSlug), JSON.stringify(items))
  snapshots.set(storeSlug, items.length === 0 ? EMPTY : items)
  notify(storeSlug)
}

function subscribe(storeSlug: string, listener: Listener) {
  let set = listeners.get(storeSlug)
  if (!set) {
    set = new Set()
    listeners.set(storeSlug, set)
  }
  set.add(listener)

  const onStorage = (e: StorageEvent) => {
    if (e.key === cartKey(storeSlug)) refreshFromStorage(storeSlug)
  }
  window.addEventListener('storage', onStorage)

  return () => {
    set!.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useCart(storeSlug: string) {
  const items = useSyncExternalStore(
    (l) => subscribe(storeSlug, l),
    () => getSnapshot(storeSlug),
    () => EMPTY,
  )

  const add = useCallback(
    (productId: string, quantity = 1) => {
      const current = getSnapshot(storeSlug)
      const existing = current.find((i) => i.productId === productId)
      const next = existing
        ? current.map((i) =>
            i.productId === productId
              ? { ...i, quantity: i.quantity + quantity }
              : i,
          )
        : [...current, { productId, quantity }]
      writeCart(storeSlug, next)
    },
    [storeSlug],
  )

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      const current = getSnapshot(storeSlug)
      if (quantity <= 0) {
        writeCart(
          storeSlug,
          current.filter((i) => i.productId !== productId),
        )
      } else {
        writeCart(
          storeSlug,
          current.map((i) =>
            i.productId === productId ? { ...i, quantity } : i,
          ),
        )
      }
    },
    [storeSlug],
  )

  const remove = useCallback(
    (productId: string) => setQuantity(productId, 0),
    [setQuantity],
  )

  const clear = useCallback(() => writeCart(storeSlug, []), [storeSlug])

  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return { items, count, add, setQuantity, remove, clear }
}

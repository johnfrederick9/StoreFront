'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'cancelled'

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['cancelled'],
  cancelled: [],
}

export async function updateOrderStatus(
  storeSlug: string,
  orderId: string,
  next: OrderStatus,
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', storeSlug)
    .maybeSingle()

  if (!store) return { error: 'Store not found' }

  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .eq('store_id', store.id)
    .maybeSingle()

  if (!order) return { error: 'Order not found' }

  const current = order.status as OrderStatus
  if (!ALLOWED_TRANSITIONS[current]?.includes(next)) {
    return { error: `Cannot change ${current} to ${next}` }
  }

  const { error } = await supabase
    .from('orders')
    .update({ status: next })
    .eq('id', orderId)
    .eq('store_id', store.id)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/${storeSlug}/orders`)
  revalidatePath(`/dashboard/${storeSlug}/orders/${orderId}`)
  return {}
}

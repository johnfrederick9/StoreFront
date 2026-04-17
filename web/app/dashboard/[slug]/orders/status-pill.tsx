import { CheckCircle2, Clock, Truck, XCircle } from 'lucide-react'
import type { OrderStatus } from './actions'

const config: Record<
  OrderStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-800 ring-amber-200',
    icon: <Clock className="h-3 w-3" />,
  },
  paid: {
    label: 'Paid',
    className: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  shipped: {
    label: 'Shipped',
    className: 'bg-blue-50 text-blue-800 ring-blue-200',
    icon: <Truck className="h-3 w-3" />,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-600 ring-gray-200',
    icon: <XCircle className="h-3 w-3" />,
  },
}

export function StatusPill({ status }: { status: string }) {
  const c =
    config[status as OrderStatus] ?? {
      label: status,
      className: 'bg-gray-100 text-gray-600 ring-gray-200',
      icon: null,
    }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${c.className}`}
    >
      {c.icon}
      {c.label}
    </span>
  )
}

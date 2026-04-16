import { Resend } from 'resend'

type OrderLine = {
  name: string
  quantity: number
  unitCents: number
}

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

export async function sendOrderConfirmation(opts: {
  to: string
  storeName: string
  orderId: string
  currency: string
  lines: OrderLine[]
  totalCents: number
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY missing — skipping send')
    return
  }

  const from = process.env.RESEND_FROM_EMAIL ?? 'orders@resend.dev'
  const resend = new Resend(apiKey)

  const rows = opts.lines
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.name)} × ${l.quantity}</td><td align="right">${formatPrice(l.unitCents * l.quantity, opts.currency)}</td></tr>`,
    )
    .join('')

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Thanks for your order!</h2>
      <p>Your order from <strong>${escapeHtml(opts.storeName)}</strong> has been received.</p>
      <table width="100%" cellpadding="6" style="border-collapse: collapse; margin-top: 16px;">
        ${rows}
        <tr style="border-top: 1px solid #ddd;">
          <td><strong>Total</strong></td>
          <td align="right"><strong>${formatPrice(opts.totalCents, opts.currency)}</strong></td>
        </tr>
      </table>
      <p style="color:#666; font-size: 12px; margin-top: 24px;">Order ID: ${opts.orderId}</p>
    </div>
  `

  try {
    await resend.emails.send({
      from,
      to: opts.to,
      subject: `Your order from ${opts.storeName}`,
      html,
    })
  } catch (err) {
    console.error('[email] send failed', err)
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

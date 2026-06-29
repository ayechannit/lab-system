import i18n from '../i18n'
import type { ApiOrderStatus } from '../services/orderService'
import type { ApiPaymentStatus } from '../services/paymentService'

export type PaymentDisplayKey =
  | 'unpaid'
  | 'failed'
  | 'received'
  | 'pending'
  | 'partialReceived'
  | 'verified'

export function orderStatusLabel(status: ApiOrderStatus | string): string {
  const key = `orders.status.${status}`
  const translated = i18n.t(key)
  return translated === key ? String(status) : translated
}

export function orderPriorityLabel(priority: 'urgent' | 'elective' | string): string {
  const key = `orders.priority.${priority}`
  const translated = i18n.t(key)
  return translated === key ? String(priority) : translated
}

export function paymentStatusLabel(status: ApiPaymentStatus | 'unpaid' | PaymentDisplayKey): string {
  const normalized =
    status === 'verified' ? 'received' : status === 'partialReceived' ? 'partialReceived' : status
  const key = `orders.payment.${normalized}`
  const translated = i18n.t(key)
  return translated === key ? String(status) : translated
}

export function paymentDisplayKeyLabel(key: PaymentDisplayKey): string {
  return paymentStatusLabel(key)
}

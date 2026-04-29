import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { INITIAL_ORDERS } from '../mock-data/orders'
import type { OrderRow } from '../mock-data/types'

export type OrderLabContextValue = {
  orders: OrderRow[]
  patchOrder: (orderId: string, patch: Partial<OrderRow>) => void
  addOrder: (order: OrderRow) => void
}

const OrderLabContext = createContext<OrderLabContextValue | null>(null)
const ORDERS_KEY = 'lab_admin_orders_v1'

function readStoredOrders(): OrderRow[] {
  if (typeof window === 'undefined') return INITIAL_ORDERS.map((o) => ({ ...o }))
  try {
    const raw = window.localStorage.getItem(ORDERS_KEY)
    if (!raw) return INITIAL_ORDERS.map((o) => ({ ...o }))
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return INITIAL_ORDERS.map((o) => ({ ...o }))
    return parsed as OrderRow[]
  } catch {
    return INITIAL_ORDERS.map((o) => ({ ...o }))
  }
}

export function OrderLabProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<OrderRow[]>(readStoredOrders)

  const patchOrder = useCallback((orderId: string, patch: Partial<OrderRow>) => {
    setOrders((prev) => prev.map((o) => (o.orderId === orderId ? { ...o, ...patch } : o)))
  }, [])

  const addOrder = useCallback((order: OrderRow) => {
    setOrders((prev) => [order, ...prev])
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
    } catch {
      /* ignore storage limitations */
    }
  }, [orders])

  const value = useMemo(() => ({ orders, patchOrder, addOrder }), [orders, patchOrder, addOrder])

  return <OrderLabContext.Provider value={value}>{children}</OrderLabContext.Provider>
}

export function useOrderLab() {
  const ctx = useContext(OrderLabContext)
  if (!ctx) throw new Error('useOrderLab must be used within OrderLabProvider')
  return ctx
}

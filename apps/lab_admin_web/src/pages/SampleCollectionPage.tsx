import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { TimeField } from '../components/common/TimeField'
import { ListFilterSearchField } from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { useAuth } from '../hooks/AuthContext'
import { useToast } from '../hooks/ToastContext'
import { useErrorToast } from '../hooks/usePageNotify'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { formatCoordPair } from '../components/users/LocationMapPicker'
import type { StaffListRow } from '../model/types'
import { isApiMode } from '../services/apiBase'
import {
  bulkUpdateOrderStatus,
  fetchOrders,
  type ApiOrderDetailItem,
  type ApiOrderListRow,
  type ApiOrderStatus,
  type FetchOrdersParams,
} from '../services/orderService'
import { fetchStaffList } from '../services/staffService'
import { upsertSchedule } from '../services/scheduleService'
import {
  planCollectionRouteWithAi,
  type CollectionRouteResult,
  type CollectionRouteStopDetail,
} from '../services/aiConversationService'
import { fetchSystemSettings } from '../services/systemSettingService'
import { suggestCollectionRoute } from '../services/aiDemo'
import { friendlyAiReviewErrorMessage } from '../hooks/usePageNotify'
import { collectorRoleStaffList } from '../utils/collectorStaff'
import { RouteCollectorPicker } from '../components/staff/RouteCollectorPicker'
import { StaffAvatar } from '../components/staff/StaffAvatar'
import { formatReportDeliveryMethod, priorityBadgeClass } from '../utils/orderDisplay'
import '../components/common/ui.css'

function ordersForCollectionTable(
  orders: ApiOrderListRow[],
  isScheduleMode: boolean,
  assignedOrderIds: ReadonlySet<string>,
): ApiOrderListRow[] {
  if (isScheduleMode) {
    return orders.filter((o) => o.status === 'scheduled' || o.status === 'collecting')
  }
  return orders.filter((o) => o.status === 'pending' && !assignedOrderIds.has(o.id))
}

function fmtWhen(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return iso
  return d.toLocaleString()
}

function formatRouteStartTime(date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function labStartLocation(settings: Awaited<ReturnType<typeof fetchSystemSettings>>): { lat: number; lng: number } | null {
  const lat = settings.latitude
  const lng = settings.longitude
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat === 0 && lng === 0) return null
  return { lat, lng }
}


function parseRouteCollectionDuration(value: number | ''): number | null {
  const minutes = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  if (!Number.isFinite(minutes) || minutes <= 0) return null
  return minutes
}

function parseRouteCollectorCount(value: number | '', max: number): number | null {
  const count = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  if (!Number.isFinite(count) || count < 1) return null
  if (count > max) return null
  return count
}

function splitOrdersAcrossCollectors(orders: ApiOrderListRow[], count: number): ApiOrderListRow[][] {
  const n = Math.max(1, count)
  const preferredBuckets = new Map<string, ApiOrderListRow[]>()
  const unassigned: ApiOrderListRow[] = []

  for (const order of orders) {
    const collectorId = order.collector_id?.trim()
    if (collectorId) {
      const bucket = preferredBuckets.get(collectorId) ?? []
      bucket.push(order)
      preferredBuckets.set(collectorId, bucket)
    } else {
      unassigned.push(order)
    }
  }

  const chunks: ApiOrderListRow[][] = []
  for (const bucket of preferredBuckets.values()) {
    if (chunks.length < n) {
      chunks.push([...bucket])
    } else {
      const smallest = chunks.reduce(
        (minIdx, chunk, idx, all) => (chunk.length < all[minIdx].length ? idx : minIdx),
        0,
      )
      chunks[smallest].push(...bucket)
    }
  }

  while (chunks.length < n) {
    chunks.push([])
  }

  unassigned.forEach((order, index) => {
    chunks[index % n].push(order)
  })

  return chunks.filter((chunk) => chunk.length > 0)
}

type RoutePlanSlice = {
  collectorIndex: number
  result: CollectionRouteResult
  orders: ApiOrderListRow[]
  editableStops: Record<string, EditableRouteStopTimes>
}

function staffIdKey(id: string | null | undefined): string {
  return (id ?? '').replace(/[{}]/g, '').trim().toLowerCase()
}

function resolvePreferredCollectorForSlice(
  slice: RoutePlanSlice,
  collectors: StaffListRow[],
): string {
  const preferredIds = slice.orders
    .map((order) => staffIdKey(order.collector_id))
    .filter(Boolean)
  if (preferredIds.length === 0) return collectors[0]?.id ?? ''

  const unique = new Set(preferredIds)
  if (unique.size === 1) {
    const id = preferredIds[0]
    const match = collectors.find((c) => staffIdKey(c.id) === id)
    if (match) return match.id
  }

  const counts = new Map<string, number>()
  for (const id of preferredIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  let bestId = ''
  let bestCount = 0
  for (const [id, count] of counts) {
    if (count > bestCount && collectors.some((c) => staffIdKey(c.id) === id)) {
      bestId = id
      bestCount = count
    }
  }
  if (bestId) {
    const match = collectors.find((c) => staffIdKey(c.id) === bestId)
    if (match) return match.id
  }
  return collectors[0]?.id ?? ''
}

function isSliceCollectorLocked(slice: RoutePlanSlice): boolean {
  const preferredIds = slice.orders
    .map((order) => staffIdKey(order.collector_id))
    .filter(Boolean)
  return preferredIds.length > 0 && preferredIds.length === slice.orders.length && new Set(preferredIds).size === 1
}

function buildInitialRouteAssignCollectors(
  slices: RoutePlanSlice[],
  collectorOptions: StaffListRow[],
): Record<number, string> {
  return Object.fromEntries(
    slices.map((slice) => [
      slice.collectorIndex,
      resolvePreferredCollectorForSlice(slice, collectorOptions),
    ]),
  )
}

function buildRoutePlanSlicesFromPlan(
  picked: ApiOrderListRow[],
  plan: Awaited<ReturnType<typeof planCollectionRouteWithAi>>,
  startTime: string,
  minutesPerStop: number,
): RoutePlanSlice[] {
  if (plan.routes.length > 1) {
    return plan.routes.map((routePlan) => {
      const orders = orderStopsFromRouteDetails(picked, routePlan.result.routeStops)
      const resolvedOrders =
        orders.length > 0
          ? orders
          : orderStopsInRouteOrder(picked, routePlan.result.orderedStops)
      return {
        collectorIndex: routePlan.collectorIndex,
        result: routePlan.result,
        orders: resolvedOrders,
        editableStops: buildEditableRouteStops(routePlan.result, resolvedOrders, startTime, minutesPerStop),
      }
    })
  }

  const single = plan.routes[0]?.result
  if (!single) return []

  const allOrders = orderStopsFromRouteDetails(picked, single.routeStops)
  const resolvedAll =
    allOrders.length > 0 ? allOrders : orderStopsInRouteOrder(picked, single.orderedStops)

  if (plan.collectorCount <= 1) {
    return [
      {
        collectorIndex: 1,
        result: single,
        orders: resolvedAll,
        editableStops: buildEditableRouteStops(single, resolvedAll, startTime, minutesPerStop),
      },
    ]
  }

  const chunks = splitOrdersAcrossCollectors(resolvedAll, plan.collectorCount)
  return chunks.map((orders, index) => ({
    collectorIndex: index + 1,
    result: {
      ...single,
      summary: `${orders.length} stop(s) · collector ${index + 1} of ${plan.collectorCount}`,
      routeStops: single.routeStops.filter((stop) =>
        orders.some((order) => order.id.toLowerCase() === stop.orderId.toLowerCase()),
      ),
    },
    orders,
    editableStops: buildEditableRouteStops(single, orders, startTime, minutesPerStop),
  }))
}

function parseRouteStartTimeInput(value: string): string | null {
  const trimmed = value.trim()
  if (!/^\d{1,2}:\d{2}$/.test(trimmed)) return null
  const [h, m] = trimmed.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Combine today's date with a route clock time (HH:MM) for schedule storage. */
function clockTimeOnTodayToIso(clock: string): string | null {
  const normalized = parseRouteStartTimeInput(clock)
  if (!normalized) return null
  const [h, m] = normalized.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  if (!Number.isFinite(d.getTime())) return null
  return d.toISOString()
}

/** Combine a calendar date (YYYY-MM-DD) with clock time (HH:MM) for schedule storage. */
function dateAndClockToIso(dateYmd: string, clock: string): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateYmd.trim())
  const clockNorm = parseRouteStartTimeInput(clock)
  if (!dateMatch || !clockNorm) return null
  const y = Number(dateMatch[1])
  const m = Number(dateMatch[2])
  const d = Number(dateMatch[3])
  const [h, min] = clockNorm.split(':').map(Number)
  const dt = new Date(y, m - 1, d, h, min, 0, 0)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
  if (!Number.isFinite(dt.getTime())) return null
  return dt.toISOString()
}

function isoToDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function scheduleToEditableStopTimes(
  iso: string | null | undefined,
  windowMinutes = 10,
): EditableRouteStopTimes {
  if (!iso) {
    const now = new Date()
    const clock = formatRouteStartTime(now)
    const end = formatRouteStartTime(new Date(now.getTime() + windowMinutes * 60_000))
    return { arrivalTime: clock, collectionStart: clock, collectionEnd: end }
  }
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) {
    return { arrivalTime: '', collectionStart: '', collectionEnd: '' }
  }
  const clock = formatRouteStartTime(date)
  const end = formatRouteStartTime(new Date(date.getTime() + windowMinutes * 60_000))
  return { arrivalTime: clock, collectionStart: clock, collectionEnd: end }
}

function stopCollectionIso(
  orderId: string,
  stopIndex: number,
  routeResult: CollectionRouteResult | null,
  baseIso: string,
  minutesPerStop: number,
  editableStops: Record<string, EditableRouteStopTimes>,
): string {
  const edited = editableStops[orderId]
  const editedClock = edited?.collectionStart?.trim() || edited?.arrivalTime?.trim()
  if (editedClock) {
    const iso = clockTimeOnTodayToIso(editedClock)
    if (iso) return iso
  }

  const stopDetail = routeResult ? routeStopDetailForOrder(routeResult.routeStops, orderId) : undefined
  const clock = stopDetail?.collectionStart ?? stopDetail?.arrivalTime
  if (clock) {
    const iso = clockTimeOnTodayToIso(clock)
    if (iso) return iso
  }
  const baseMs = new Date(baseIso).getTime()
  return new Date(baseMs + stopIndex * minutesPerStop * 60_000).toISOString()
}

const ORDER_STATUS_OPTIONS: { value: ApiOrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
]

function sortOrdersByCollectionTime(orders: ApiOrderListRow[]): ApiOrderListRow[] {
  return [...orders].sort((a, b) => {
    const ta = a.schedule?.collection_time
      ? new Date(a.schedule.collection_time).getTime()
      : Number.MAX_SAFE_INTEGER
    const tb = b.schedule?.collection_time
      ? new Date(b.schedule.collection_time).getTime()
      : Number.MAX_SAFE_INTEGER
    return ta - tb
  })
}

function scheduledCollectorSummary(orders: ApiOrderListRow[]): string {
  const names = [
    ...new Set(
      orders
        .map((o) => o.schedule?.collecting_person?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  ]
  if (names.length === 0) return 'Collector not assigned yet'
  if (names.length === 1) return names[0]
  return `${names.length} collectors`
}

function latestCollectionTimeLabel(orders: ApiOrderListRow[]): string {
  let latest: Date | null = null
  for (const order of orders) {
    const raw = order.schedule?.collection_time
    if (!raw) continue
    const d = new Date(raw)
    if (!Number.isFinite(d.getTime())) continue
    if (!latest || d.getTime() > latest.getTime()) latest = d
  }
  if (!latest) return '—'
  return latest.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function orderIdKey(id: string): string {
  return id.trim().toLowerCase()
}

function orderCoords(order: ApiOrderListRow): { lat: number; lng: number } | null {
  const lat = Number(order.latitude)
  const lng = Number(order.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat === 0 && lng === 0) return null
  return { lat, lng }
}

function orderStopsInRouteOrder(
  picked: ApiOrderListRow[],
  orderedStops: string[],
): ApiOrderListRow[] {
  const byId = new Map(picked.map((o) => [o.id.toLowerCase(), o]))
  const ordered: ApiOrderListRow[] = []
  for (const line of orderedStops) {
    const id = line.split(':')[0]?.trim()
    const o = id ? byId.get(id.toLowerCase()) : undefined
    if (o && !ordered.some((x) => x.id === o.id)) ordered.push(o)
  }
  for (const o of picked) {
    if (!ordered.some((x) => x.id === o.id)) ordered.push(o)
  }
  return ordered
}

function orderStopsFromRouteDetails(
  picked: ApiOrderListRow[],
  routeStops: CollectionRouteStopDetail[],
): ApiOrderListRow[] {
  if (routeStops.length === 0) return picked
  const byId = new Map(picked.map((o) => [o.id.toLowerCase(), o]))
  const ordered: ApiOrderListRow[] = []
  for (const stop of [...routeStops].sort((a, b) => a.sequence - b.sequence)) {
    const order = byId.get(stop.orderId.toLowerCase())
    if (order && !ordered.some((x) => x.id === order.id)) ordered.push(order)
  }
  for (const o of picked) {
    if (!ordered.some((x) => x.id === o.id)) ordered.push(o)
  }
  return ordered
}

function routeStopDetailForOrder(
  routeStops: CollectionRouteStopDetail[],
  orderId: string,
): CollectionRouteStopDetail | undefined {
  return routeStops.find((stop) => stop.orderId.toLowerCase() === orderId.toLowerCase())
}

type EditableRouteStopTimes = {
  arrivalTime: string
  collectionStart: string
  collectionEnd: string
}

function buildEditableRouteStops(
  result: CollectionRouteResult,
  orders: ApiOrderListRow[],
  startClock: string,
  minutesPerStop: number,
): Record<string, EditableRouteStopTimes> {
  const out: Record<string, EditableRouteStopTimes> = {}

  if (result.routeStops.length > 0) {
    for (const stop of result.routeStops) {
      out[stop.orderId] = {
        arrivalTime: stop.arrivalTime ?? '',
        collectionStart: stop.collectionStart ?? stop.arrivalTime ?? '',
        collectionEnd: stop.collectionEnd ?? '',
      }
    }
    return out
  }

  const baseIso = clockTimeOnTodayToIso(startClock)
  const baseMs = baseIso ? new Date(baseIso).getTime() : Date.now()
  const sortedOrders = orderStopsInRouteOrder(orders, result.orderedStops)
  for (let i = 0; i < sortedOrders.length; i++) {
    const arrivalMs = baseMs + i * minutesPerStop * 60_000
    const collectEndMs = arrivalMs + minutesPerStop * 60_000
    const arrival = formatRouteStartTime(new Date(arrivalMs))
    const end = formatRouteStartTime(new Date(collectEndMs))
    out[sortedOrders[i].id] = {
      arrivalTime: arrival,
      collectionStart: arrival,
      collectionEnd: end,
    }
  }
  return out
}

function latestClockTime(clocks: string[]): string | null {
  let latest: string | null = null
  let latestMin = -1
  for (const clock of clocks) {
    const norm = parseRouteStartTimeInput(clock)
    if (!norm) continue
    const [h, m] = norm.split(':').map(Number)
    const total = h * 60 + m
    if (total > latestMin) {
      latestMin = total
      latest = norm
    }
  }
  return latest
}

export function SampleCollectionPage() {
  const hasApi = isApiMode()
  const { account } = useAuth()
  const { showError, showSuccess } = useToast()
  const [orders, setOrders] = useState<ApiOrderListRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)

  useErrorToast(loadError)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [routePlanSlices, setRoutePlanSlices] = useState<RoutePlanSlice[]>([])
  const [routePlanning, setRoutePlanning] = useState(false)
  const [labRouteStart, setLabRouteStart] = useState<{
    lat: number
    lng: number
    address: string | null
  } | null>(null)
  const [routeStartTime, setRouteStartTime] = useState(() => formatRouteStartTime())
  const [routeCollectionDurationMinutes, setRouteCollectionDurationMinutes] = useState<number | ''>(10)
  const [routeCollectorCount, setRouteCollectorCount] = useState<number | ''>(1)
  const [patientInput, setPatientInput] = useState('')
  const [patientName, setPatientName] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApiOrderStatus>('pending')
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersPageSize, setOrdersPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)
  const [refreshTick, setRefreshTick] = useState(0)
  const [staff, setStaff] = useState<StaffListRow[]>([])
  const [collectionSubmitting, setCollectionSubmitting] = useState(false)

  const [routeAssignOpen, setRouteAssignOpen] = useState(false)
  const [routeAssignCollectors, setRouteAssignCollectors] = useState<Record<number, string>>({})
  const [routeAssignSubmitting, setRouteAssignSubmitting] = useState(false)
  const [routeAssignError, setRouteAssignError] = useState<string | null>(null)
  const [routeAssignments, setRouteAssignments] = useState<
    Record<string, { collectorName: string; collectionTime: string }>
  >({})

  const [scheduledEditOpen, setScheduledEditOpen] = useState(false)
  const [scheduledEditOrderId, setScheduledEditOrderId] = useState<string | null>(null)
  const [scheduledEditCollectorId, setScheduledEditCollectorId] = useState('')
  const [scheduledEditDate, setScheduledEditDate] = useState('')
  const [scheduledEditTimes, setScheduledEditTimes] = useState<EditableRouteStopTimes>({
    arrivalTime: '',
    collectionStart: '',
    collectionEnd: '',
  })
  const [scheduledEditSubmitting, setScheduledEditSubmitting] = useState(false)
  const [scheduledEditError, setScheduledEditError] = useState<string | null>(null)

  const isScheduleMode = statusFilter === 'scheduled'
  const routeCollectorOptions = useMemo(() => collectorRoleStaffList(staff), [staff])

  const routePlanOrders = useMemo(
    () => routePlanSlices.flatMap((slice) => slice.orders),
    [routePlanSlices],
  )

  const routeResult = routePlanSlices[0]?.result ?? null
  const editableRouteStops = useMemo(
    () =>
      routePlanSlices.reduce<Record<string, EditableRouteStopTimes>>((acc, slice) => {
        return { ...acc, ...slice.editableStops }
      }, {}),
    [routePlanSlices],
  )

  useEffect(() => {
    const id = window.setTimeout(() => setPatientName(patientInput.trim()), 350)
    return () => window.clearTimeout(id)
  }, [patientInput])

  const orderFetchParams = useMemo((): FetchOrdersParams => {
    const p: FetchOrdersParams = { status: statusFilter }
    if (patientName) p.patient_name = patientName
    return p
  }, [patientName, statusFilter])

  const ordersListQuery = useMemo(
    (): FetchOrdersParams => ({
      ...orderFetchParams,
      page: ordersPage,
      limit: ordersPageSize,
    }),
    [orderFetchParams, ordersPage, ordersPageSize],
  )

  useEffect(() => {
    queueMicrotask(() => setOrdersPage(1))
  }, [patientName, statusFilter])

  useEffect(() => {
    if (!hasApi) {
      setOrders([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void (async () => {
      try {
        const [list, staffRes] = await Promise.all([fetchOrders(ordersListQuery), fetchStaffList()])
        if (!cancelled) {
          setOrders(list)
          setStaff(staffRes.filter((s) => !s.is_deleted))
          if (list.length === 0 && ordersPage > 1) {
            setOrdersPage((p) => Math.max(1, p - 1))
          }
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load orders')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, ordersListQuery, refreshTick])

  useEffect(() => {
    if (!hasApi || isScheduleMode) return
    let cancelled = false
    void (async () => {
      try {
        const settings = await fetchSystemSettings()
        if (cancelled) return
        const loc = labStartLocation(settings)
        setLabRouteStart(
          loc
            ? {
                lat: loc.lat,
                lng: loc.lng,
                address: settings.address?.trim() || null,
              }
            : null,
        )
      } catch {
        /* optional prefill only */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, isScheduleMode])

  useEffect(() => {
    setSelectedIds(new Set())
    setRoutePlanSlices([])
    setRouteAssignCollectors({})
    setRouteAssignments({})
    setScheduledEditOpen(false)
    setScheduledEditOrderId(null)
  }, [ordersListQuery])

  const assignedOrderIds = useMemo(
    () => new Set(Object.keys(routeAssignments)),
    [routeAssignments],
  )

  const routable = useMemo(
    () => ordersForCollectionTable(orders, isScheduleMode, assignedOrderIds),
    [orders, isScheduleMode, assignedOrderIds],
  )

  const scheduledEditOrder = useMemo(() => {
    if (!scheduledEditOrderId) return null
    const key = orderIdKey(scheduledEditOrderId)
    return routable.find((o) => orderIdKey(o.id) === key) ?? null
  }, [scheduledEditOrderId, routable])

  const selectedScheduledEditCollector = useMemo(
    () => routeCollectorOptions.find((s) => s.id === scheduledEditCollectorId) ?? null,
    [routeCollectorOptions, scheduledEditCollectorId],
  )

  const selectedRoutableCount = useMemo(
    () => routable.filter((o) => selectedIds.has(o.id)).length,
    [routable, selectedIds],
  )

  const selectedScheduledOrder = useMemo(() => {
    if (!isScheduleMode || selectedRoutableCount !== 1) return null
    const selectedId = [...selectedIds][0]
    if (!selectedId) return null
    const key = orderIdKey(selectedId)
    return routable.find((o) => orderIdKey(o.id) === key) ?? null
  }, [isScheduleMode, selectedRoutableCount, selectedIds, routable])

  const displayRoutable = useMemo(() => {
    if (isScheduleMode) return sortOrdersByCollectionTime(routable)
    return routable
  }, [isScheduleMode, routable])

  const isOrderSelected = (id: string) => {
    if (selectedIds.size === 0) return false
    const key = orderIdKey(id)
    for (const selectedId of selectedIds) {
      if (orderIdKey(selectedId) === key) return true
    }
    return false
  }

  const routeSetupReady = useMemo(() => {
    if (labRouteStart == null) return false
    if (parseRouteStartTimeInput(routeStartTime) == null) return false
    if (parseRouteCollectionDuration(routeCollectionDurationMinutes) == null) return false
    if (parseRouteCollectorCount(routeCollectorCount, Math.max(1, selectedRoutableCount)) == null) {
      return false
    }
    return true
  }, [labRouteStart, routeStartTime, routeCollectionDurationMinutes, routeCollectorCount, selectedRoutableCount])

  const canPlanRoute =
    hasApi && !loading && !routePlanning && selectedRoutableCount >= 1 && routeSetupReady

  const canStartCollection = hasApi && !loading && !collectionSubmitting && selectedRoutableCount >= 1

  const scheduledRouteStops = useMemo(() => {
    if (!isScheduleMode) return []
    return sortOrdersByCollectionTime(routable.filter((o) => o.status === 'scheduled'))
  }, [isScheduleMode, routable])

  const scheduledRouteSummary = useMemo(() => {
    if (scheduledRouteStops.length === 0) return ''
    if (selectedScheduledOrder) {
      const schedule = selectedScheduledOrder.schedule
      const stopNo =
        scheduledRouteStops.findIndex((o) => orderIdKey(o.id) === orderIdKey(selectedScheduledOrder.id)) + 1
      const patient = selectedScheduledOrder.patient_name.trim() || 'Patient'
      const collector = schedule?.collecting_person?.trim() || 'Collector not assigned'
      const when = fmtWhen(schedule?.collection_time ?? undefined)
      return `Stop ${stopNo > 0 ? stopNo : '—'} of ${scheduledRouteStops.length} · ${patient} · ${collector} · ${when}`
    }
    const collectors = scheduledCollectorSummary(scheduledRouteStops)
    const finish = latestCollectionTimeLabel(scheduledRouteStops)
    return `${scheduledRouteStops.length} stop${scheduledRouteStops.length === 1 ? '' : 's'} · ${collectors} · last pickup ${finish}`
  }, [scheduledRouteStops, selectedScheduledOrder])

  const visibleScheduledStops = useMemo(() => {
    if (selectedScheduledOrder) {
      const stopIndex = scheduledRouteStops.findIndex(
        (o) => orderIdKey(o.id) === orderIdKey(selectedScheduledOrder.id),
      )
      return [{ order: selectedScheduledOrder, stopIndex: stopIndex >= 0 ? stopIndex : 0 }]
    }
    return scheduledRouteStops.map((order, stopIndex) => ({ order, stopIndex }))
  }, [scheduledRouteStops, selectedScheduledOrder])

  const displayEstimatedFinish = useMemo(() => {
    const ends = Object.values(editableRouteStops)
      .map((stop) => stop.collectionEnd.trim())
      .filter(Boolean)
    const latest = latestClockTime(ends)
    return latest ?? routeResult?.estimatedFinishTime ?? '—'
  }, [editableRouteStops, routeResult?.estimatedFinishTime])

  const allRouteCollectorsSelected = useMemo(() => {
    if (routePlanSlices.length === 0 || routeCollectorOptions.length === 0) return false
    return routePlanSlices.every((slice) =>
      Boolean(routeAssignCollectors[slice.collectorIndex]?.trim()),
    )
  }, [routePlanSlices, routeAssignCollectors, routeCollectorOptions])

  const allRouteStopsAssigned = useMemo(
    () => routePlanOrders.length > 0 && routePlanOrders.every((o) => Boolean(routeAssignments[o.id])),
    [routePlanOrders, routeAssignments],
  )

  function clearRoutePlan() {
    setRoutePlanSlices([])
    setRouteAssignCollectors({})
    setRouteAssignments({})
    setSelectedIds(new Set())
  }

  function initializeRoutePlan(slices: RoutePlanSlice[]) {
    setRoutePlanSlices(slices)
    setRouteAssignCollectors(buildInitialRouteAssignCollectors(slices, routeCollectorOptions))
    setRouteAssignments({})
  }

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectSingle = (id: string) => {
    setSelectedIds(new Set([id]))
  }

  function updateRouteStopTime(
    orderId: string,
    field: keyof EditableRouteStopTimes,
    value: string,
  ) {
    setRoutePlanSlices((prev) =>
      prev.map((slice) => {
        if (!slice.orders.some((order) => order.id === orderId)) return slice
        return {
          ...slice,
          editableStops: {
            ...slice.editableStops,
            [orderId]: {
              arrivalTime: slice.editableStops[orderId]?.arrivalTime ?? '',
              collectionStart: slice.editableStops[orderId]?.collectionStart ?? '',
              collectionEnd: slice.editableStops[orderId]?.collectionEnd ?? '',
              [field]: value,
            },
          },
        }
      }),
    )
  }

  function updateScheduledEditStopTime(field: keyof EditableRouteStopTimes, value: string) {
    setScheduledEditTimes((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  function openScheduledEdit(order: ApiOrderListRow) {
    const schedule = order.schedule
    const existingName = schedule?.collecting_person?.trim() ?? ''
    const matched = routeCollectorOptions.find(
      (s) => s.name.trim().toLowerCase() === existingName.toLowerCase(),
    )
    setScheduledEditOrderId(order.id)
    setScheduledEditCollectorId(matched?.id ?? routeCollectorOptions[0]?.id ?? '')
    setScheduledEditDate(
      isoToDateInputValue(schedule?.collection_time) || isoToDateInputValue(new Date().toISOString()),
    )
    setScheduledEditTimes(scheduleToEditableStopTimes(schedule?.collection_time))
    setScheduledEditError(null)
    setScheduledEditOpen(true)
    selectSingle(order.id)
  }

  async function submitScheduledEdit(e: FormEvent) {
    e.preventDefault()
    if (!scheduledEditOrder) return
    setScheduledEditError(null)

    const collector = routeCollectorOptions.find((s) => s.id === scheduledEditCollectorId)
    if (!collector) {
      setScheduledEditError('Select a collector staff member.')
      return
    }
    if (!scheduledEditDate.trim()) {
      setScheduledEditError('Pick a pickup date.')
      return
    }

    const clock =
      scheduledEditTimes.collectionStart.trim() || scheduledEditTimes.arrivalTime.trim()
    if (!clock) {
      setScheduledEditError('Set a collection time for this stop.')
      return
    }

    const collectionIso = dateAndClockToIso(scheduledEditDate, clock)
    if (!collectionIso) {
      setScheduledEditError('Pickup date or time is invalid.')
      return
    }

    setScheduledEditSubmitting(true)
    try {
      await upsertSchedule({
        order_id: scheduledEditOrder.id,
        collecting_person: collector.name.trim(),
        collection_time: collectionIso,
        running_time: scheduledEditOrder.schedule?.running_time ?? null,
        report_out_time: scheduledEditOrder.schedule?.report_out_time ?? null,
      })
      setScheduledEditOpen(false)
      setScheduledEditOrderId(null)
      setRefreshTick((t) => t + 1)
      showSuccess('Collector and stop time updated.')
    } catch (err) {
      setScheduledEditError(err instanceof Error ? err.message : 'Schedule update failed')
    } finally {
      setScheduledEditSubmitting(false)
    }
  }

  const runAiRoute = async () => {
    const picked = routable.filter((o) => selectedIds.has(o.id))
    if (picked.length < 1) {
      showError('Select at least one order to plan a collection route.')
      return
    }

    const startTime = parseRouteStartTimeInput(routeStartTime) ?? formatRouteStartTime()
    const minutesPerStop = parseRouteCollectionDuration(routeCollectionDurationMinutes) ?? 10
    const collectorCount =
      parseRouteCollectorCount(routeCollectorCount, Math.max(1, picked.length)) ?? 1

    if (!hasApi) {
      const addresses = picked.map(
        (o) => `${o.id}: ${o.patient_name} — ${o.address?.trim() || '—'}`,
      )
      const result = suggestCollectionRoute(addresses)
      const fullResult: CollectionRouteResult = {
        orderedStops: result.orderedStops,
        summary: result.summary,
        estimatedFinishTime: null,
        estimatedMinutes: result.estimatedMinutes,
        routeStops: [],
      }
      const plannedOrders = orderStopsInRouteOrder(picked, result.orderedStops)
      const plan = {
        collectorCount,
        routes: [{ collectorIndex: 1, result: fullResult }],
      }
      initializeRoutePlan(buildRoutePlanSlicesFromPlan(picked, plan, startTime, minutesPerStop))
      showSuccess('Collection route generated.')
      return
    }

    const missingCoords = picked.filter((o) => !orderCoords(o))
    if (missingCoords.length > 0) {
      showError(
        `${missingCoords.length} selected order(s) are missing map coordinates. Add latitude/longitude on the order before planning a route.`,
      )
      return
    }

    if (!labRouteStart) {
      showError('Configure the lab location in System settings before planning a route.')
      return
    }

    if (!parseRouteStartTimeInput(routeStartTime)) {
      showError('Enter a valid route start time.')
      return
    }

    const collectionDurationMinutes = parseRouteCollectionDuration(routeCollectionDurationMinutes)
    if (collectionDurationMinutes == null) {
      showError('Enter collection duration per stop (minutes).')
      return
    }

    setRoutePlanning(true)
    try {
      const plan = await planCollectionRouteWithAi({
        startLocation: { lat: labRouteStart.lat, lng: labRouteStart.lng },
        startTime,
        collectionDurationMinutes,
        collectorCount,
        stops: picked.map((o) => {
          const coords = orderCoords(o)!
          return {
            orderId: o.id,
            patientName: o.patient_name,
            address: o.address?.trim() || '—',
            lat: coords.lat,
            lng: coords.lng,
          }
        }),
      })
      initializeRoutePlan(
        buildRoutePlanSlicesFromPlan(picked, plan, startTime, collectionDurationMinutes),
      )
      showSuccess(
        plan.routes.length > 1 || collectorCount > 1
          ? `Collection routes generated for ${plan.routes.length > 1 ? plan.routes.length : collectorCount} collector(s).`
          : 'Collection route generated.',
      )
    } catch (err) {
      showError(friendlyAiReviewErrorMessage(err, 'Route planning failed.'))
    } finally {
      setRoutePlanning(false)
    }
  }

  function openRouteAssign() {
    if (routePlanSlices.length === 0) return
    if (!allRouteCollectorsSelected) {
      showError('Select a collector for each route before assigning.')
      return
    }
    setRouteAssignError(null)
    setRouteAssignOpen(true)
  }

  async function submitRouteAssign(e: FormEvent) {
    e.preventDefault()
    if (routePlanSlices.length === 0) return
    setRouteAssignError(null)

    const startClock = parseRouteStartTimeInput(routeStartTime)
    if (!startClock) {
      setRouteAssignError('Set a valid start time in Route setup before assigning a collector.')
      return
    }
    const baseIso = clockTimeOnTodayToIso(startClock)
    if (!baseIso) {
      setRouteAssignError('Route start time from Route setup is invalid.')
      return
    }

    for (const slice of routePlanSlices) {
      const collectorId = routeAssignCollectors[slice.collectorIndex]?.trim()
      if (!collectorId) {
        setRouteAssignError(`Select a collector for route ${slice.collectorIndex}.`)
        return
      }
    }

    const actingStaffId = account?.id ?? routeCollectorOptions[0]?.id
    if (!actingStaffId) {
      setRouteAssignError('Sign in with a staff account to assign collectors.')
      return
    }

    setRouteAssignSubmitting(true)
    const nextAssignments: Record<string, { collectorName: string; collectionTime: string }> = {}
    const pendingToSchedule: string[] = []
    let totalStops = 0
    try {
      for (const slice of routePlanSlices) {
        const collector = routeCollectorOptions.find(
          (s) => s.id === routeAssignCollectors[slice.collectorIndex],
        )
        if (!collector) {
          setRouteAssignError(`Select a collector for route ${slice.collectorIndex}.`)
          return
        }

        const minutesPerStop =
          slice.result.estimatedMinutes != null && slice.orders.length > 1
            ? Math.max(8, Math.round(slice.result.estimatedMinutes / slice.orders.length))
            : parseRouteCollectionDuration(routeCollectionDurationMinutes) ?? 10

        for (let i = 0; i < slice.orders.length; i++) {
          const order = slice.orders[i]
          const stopIso = stopCollectionIso(
            order.id,
            i,
            slice.result,
            baseIso,
            minutesPerStop,
            slice.editableStops,
          )
          await upsertSchedule({
            order_id: order.id,
            collector_id: collector.id,
            collecting_person: collector.name.trim(),
            collection_time: stopIso,
            running_time: null,
            report_out_time: null,
            accepted_by_user: false,
          })
          if (order.status === 'pending') {
            pendingToSchedule.push(order.id)
          }
          nextAssignments[order.id] = {
            collectorName: collector.name.trim(),
            collectionTime: stopIso,
          }
          totalStops += 1
        }
      }

      if (pendingToSchedule.length > 0) {
        await bulkUpdateOrderStatus({
          order_ids: pendingToSchedule,
          status: 'scheduled',
          staff_id: actingStaffId,
          note: `Route assigned (${routePlanSlices.length} collector route(s))`,
        })
      }
      setRouteAssignments(nextAssignments)
      setRouteAssignOpen(false)
      const assignedIds = Object.keys(nextAssignments)
      setOrders((prev) => prev.filter((o) => !assignedIds.includes(o.id)))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const id of assignedIds) next.delete(id)
        return next
      })
      setRefreshTick((t) => t + 1)
      showSuccess(
        pendingToSchedule.length > 0
          ? `Assigned ${routePlanSlices.length} collector route(s) covering ${totalStops} stop(s). Orders moved to Scheduled.`
          : `Assigned ${routePlanSlices.length} collector route(s) covering ${totalStops} stop(s).`,
      )
      if (pendingToSchedule.length > 0) {
        setStatusFilter('scheduled')
      }
      clearRoutePlan()
    } catch (err) {
      setRouteAssignError(err instanceof Error ? err.message : 'Route assignment failed')
    } finally {
      setRouteAssignSubmitting(false)
    }
  }

  async function startCollectionForSelected() {
    const picked = routable.filter((o) => selectedIds.has(o.id))
    if (picked.length === 0) {
      showError(
        isScheduleMode
          ? 'Select one scheduled order to start collection.'
          : 'Select at least one order to start collection.',
      )
      return
    }
    const staffId = account?.id
    if (!staffId) {
      showError('Sign in with a staff account to update order status.')
      return
    }

    setCollectionSubmitting(true)
    try {
      await bulkUpdateOrderStatus({
        order_ids: picked.map((o) => o.id),
        status: 'collecting',
        staff_id: staffId,
        note: 'Sample collection started',
      })
      setSelectedIds(new Set())
      setRefreshTick((t) => t + 1)
      showSuccess(
        picked.length === 1
          ? 'Order status updated to collecting.'
          : `${picked.length} orders updated to collecting.`,
      )
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Status update failed')
    } finally {
      setCollectionSubmitting(false)
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title="Collection & routing"
        description={
          isScheduleMode
            ? 'Review scheduled pickups and mark one order at a time as collecting when sample collection begins.'
            : 'Choose orders that need a sample pickup, then plan an efficient collection route.'
        }
      />

      {!hasApi ? (
        <div className="card card--muted">
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Set <code>VITE_API_BASE_URL</code> and sign in to load orders from the backend.
          </p>
        </div>
      ) : null}

      <div className="list-tools-row">
        <div className="list-filters-bar" aria-label="Filter orders for collection">
          <ListFilterSearchField
            id="collection-patient"
            label="Patient"
            value={patientInput}
            onChange={(e) => setPatientInput(e.target.value)}
            disabled={!hasApi || loading}
          />
          <div className="list-filters-bar__group">
            <label className="list-filters-bar__label" htmlFor="collection-status">
              Status
            </label>
            <select
              id="collection-status"
              className="list-filters-bar__select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ApiOrderStatus)}
              disabled={!hasApi || loading}
            >
              {ORDER_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm list-filters-bar__clear"
            onClick={() => {
              setPatientInput('')
              setPatientName('')
              setStatusFilter('pending')
              setOrdersPage(1)
            }}
            disabled={!hasApi || loading}
          >
            Clear filters
          </button>
        </div>
        <div className="list-tools-row__actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setRefreshTick((t) => t + 1)}
            disabled={!hasApi || loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">
          {isScheduleMode ? 'Scheduled collections' : 'Orders ready for pickup routing'}
        </h3>
        <p style={{ margin: '0 0 0.75rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
          {          isScheduleMode
            ? 'Select one scheduled order, then mark it as collecting when pickup starts.'
            : 'Select one or more orders below, then set route start details and plan a collection route with AI.'}
        </p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }} />
                <th>Order</th>
                <th>Patient</th>
                <th>Address</th>
                <th>Priority</th>
                <th>Report delivery</th>
                {isScheduleMode ? (
                  <>
                    <th>Collector</th>
                    <th>Collection time</th>
                  </>
                ) : null}
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isScheduleMode ? 10 : 8} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label="Loading samples" />
                  </td>
                </tr>
              ) : routable.length === 0 ? (
                <tr>
                  <td colSpan={isScheduleMode ? 10 : 8} className="data-table__state">
                    {orders.length === 0
                      ? patientName || statusFilter
                        ? 'No orders match these filters.'
                        : 'No orders returned from the server.'
                      : isScheduleMode
                        ? 'No scheduled orders in this list.'
                        : 'No pending orders ready for pickup routing.'}
                  </td>
                </tr>
              ) : (
                displayRoutable.map((o) => (
                  <tr
                    key={o.id}
                    className={isScheduleMode && isOrderSelected(o.id) ? 'data-table__row--selected' : undefined}
                    onClick={isScheduleMode ? () => selectSingle(o.id) : undefined}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type={isScheduleMode ? 'radio' : 'checkbox'}
                        name={isScheduleMode ? 'collection-scheduled-order' : undefined}
                        checked={isOrderSelected(o.id)}
                        onChange={() => (isScheduleMode ? selectSingle(o.id) : toggle(o.id))}
                        aria-label={
                          isScheduleMode
                            ? `Select ${o.patient_name} to start collecting`
                            : `Select ${o.patient_name}`
                        }
                      />
                    </td>
                    <td>
                      <code style={{ fontSize: '0.72rem', wordBreak: 'break-all' }}>{o.id}</code>
                    </td>
                    <td>{o.patient_name}</td>
                    <td>{o.address?.trim() || '—'}</td>
                    <td>
                      <span className={priorityBadgeClass(o.priority)}>{o.priority}</span>
                    </td>
                    <td>{formatReportDeliveryMethod(o.report_delivery_method)}</td>
                    {isScheduleMode ? (
                      <>
                        <td>{o.schedule?.collecting_person?.trim() || '—'}</td>
                        <td>{fmtWhen(o.schedule?.collection_time ?? undefined)}</td>
                      </>
                    ) : null}
                    <td>{o.status}</td>
                    <td>{fmtWhen(o.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && hasApi ? (
          <TablePagination
            mode="server"
            page={ordersPage}
            pageSize={ordersPageSize}
            itemsOnPage={orders.length}
            onPageChange={setOrdersPage}
            onPageSizeChange={(n) => {
              setOrdersPageSize(n)
              setOrdersPage(1)
            }}
          />
        ) : null}
        {!isScheduleMode && hasApi && !loading ? (
          selectedRoutableCount >= 1 ? (
            <div className="route-setup">
              <h4 className="route-setup__title">Route setup</h4>
              <p className="route-setup__hint">
                {selectedRoutableCount === 1
                  ? '1 order selected'
                  : `${selectedRoutableCount} orders selected`}{' '}
                — routes start from your lab location in System settings. Set departure time and on-site minutes per
                stop, then click Plan route.
              </p>
              <div className="route-setup__location" aria-live="polite">
                <p className="route-setup__location-label">Route start (lab location)</p>
                {labRouteStart ? (
                  <div className="route-setup__location-info">
                    {labRouteStart.address ? <p>{labRouteStart.address}</p> : null}
                    <p className="route-setup__coords">{formatCoordPair(labRouteStart.lat, labRouteStart.lng)}</p>
                  </div>
                ) : (
                  <p className="route-setup__location-missing">
                    No lab location configured. Set it under{' '}
                    <Link to="/system-settings">System settings</Link> → Location &amp; contact.
                  </p>
                )}
              </div>
              <div className="route-setup__grid">
                <div className="field">
                  <label htmlFor="route-start-time">Start time</label>
                  <TimeField
                    id="route-start-time"
                    value={routeStartTime}
                    onChange={setRouteStartTime}
                    disabled={routePlanning}
                    placeholder="Select start time"
                  />
                </div>
                <div className="field">
                  <label htmlFor="route-duration">Collection duration (min per stop)</label>
                  <input
                    id="route-duration"
                    type="number"
                    min={1}
                    step={1}
                    value={routeCollectionDurationMinutes === '' ? '' : routeCollectionDurationMinutes}
                    onChange={(e) =>
                      setRouteCollectionDurationMinutes(
                        e.target.value === '' ? '' : Number(e.target.value),
                      )
                    }
                    disabled={routePlanning}
                  />
                </div>
                <div className="field">
                  <label htmlFor="route-collector-count">Number of collectors</label>
                  <input
                    id="route-collector-count"
                    type="number"
                    min={1}
                    max={Math.max(1, selectedRoutableCount)}
                    step={1}
                    value={routeCollectorCount === '' ? '' : routeCollectorCount}
                    onChange={(e) =>
                      setRouteCollectorCount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    disabled={routePlanning}
                  />
                  <p className="field-hint" style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: 'var(--muted)' }}>
                    Split stops across up to {Math.max(1, selectedRoutableCount)} collector
                    {Math.max(1, selectedRoutableCount) === 1 ? '' : 's'} for this route plan.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ margin: '1rem 0 0', fontSize: '0.875rem', color: 'var(--muted)' }}>
              Select at least one order in the table above to set up a collection route.
            </p>
          )
        ) : null}
        <div className="row-actions" style={{ marginTop: '1rem', alignItems: 'center' }}>
          {isScheduleMode ? (
            selectedScheduledOrder ? (
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--muted)' }}>
                <strong>{selectedScheduledOrder.patient_name.trim() || 'Patient'}</strong> selected — use Start
                collecting below the route.
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--muted)' }}>
                Select one scheduled order in the table above, then start collecting when pickup begins.
              </p>
            )
          ) : selectedRoutableCount >= 1 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void runAiRoute()}
              disabled={!canPlanRoute}
              aria-busy={routePlanning}
            >
              <span className="btn-busy-content">
                {routePlanning ? (
                  <span className="loading-spinner loading-spinner--sm btn-busy-content__spinner" aria-hidden />
                ) : null}
                {routePlanning ? 'Planning route…' : 'Plan route'}
              </span>
            </button>
          ) : null}
        </div>
      </div>

      {!isScheduleMode && routePlanSlices.length > 0 && !allRouteStopsAssigned ? (
        <div className="route-plan-results">
          <div className="route-plan-results__header">
            <div className="route-plan-results__intro">
              <h3 className="route-plan-results__title">
                {routePlanSlices.length > 1 ? 'Planned routes' : 'Planned collection route'}
              </h3>
              <p className="route-plan-results__meta">
                {routePlanSlices.length > 1
                  ? `${routePlanSlices.length} routes · ${routePlanOrders.length} stops total`
                  : `${routePlanOrders.length} stop${routePlanOrders.length === 1 ? '' : 's'}`}
                {displayEstimatedFinish !== '—' ? ` · est. finish ${displayEstimatedFinish}` : ''}
              </p>
            </div>
            <div className="route-plan-results__actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={clearRoutePlan}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={openRouteAssign}
                disabled={!hasApi || routeAssignSubmitting || !allRouteCollectorsSelected}
              >
                {routePlanSlices.length > 1 ? 'Assign all routes' : 'Assign route'}
              </button>
            </div>
          </div>

          {routeCollectorOptions.length === 0 ? (
            <p className="route-plan-results__alert">
              No staff with role <strong>Collector</strong> yet. Add one under <strong>Staff</strong>, then assign
              routes.
            </p>
          ) : (
            <p className="route-plan-results__hint">
              {routePlanSlices.length > 1
                ? 'Pick a collector for each route, adjust stop times if needed, then assign all routes.'
                : 'Pick a collector, adjust stop times if needed, then assign the route.'}
            </p>
          )}

          <div
            className="route-plan-results__list"
          >
            {routePlanSlices.map((slice) => {
              const sliceFinish = (() => {
                const ends = Object.values(slice.editableStops)
                  .map((stop) => stop.collectionEnd.trim())
                  .filter(Boolean)
                const latest = latestClockTime(ends)
                return latest ?? slice.result.estimatedFinishTime ?? '—'
              })()
              const multiCollectorPlan = routePlanSlices.length > 1
              const sliceCollectorId = routeAssignCollectors[slice.collectorIndex] ?? ''

              return (
                <article
                  key={`route-${slice.collectorIndex}`}
                  className="route-panel route-panel--plan-slice"
                >
                  {multiCollectorPlan ? (
                    <div className="route-panel__slice-head">
                      <div className="route-panel__slice-title">
                        <span className="route-panel__route-badge">Route {slice.collectorIndex}</span>
                        <span className="route-panel__slice-stops">
                          {slice.orders.length} stop{slice.orders.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="route-panel__eta-chip">
                        <span>Est. finish</span>
                        <strong>{sliceFinish}</strong>
                      </div>
                    </div>
                  ) : null}

                  {routeCollectorOptions.length > 0 ? (
                    <RouteCollectorPicker
                      id={
                        multiCollectorPlan
                          ? `route-panel-collector-${slice.collectorIndex}`
                          : 'route-panel-collector'
                      }
                      routeLabel={
                        multiCollectorPlan
                          ? `Collector for route ${slice.collectorIndex}`
                          : 'Assigned collector'
                      }
                      collectorId={sliceCollectorId}
                      collectors={routeCollectorOptions}
                      locked={isSliceCollectorLocked(slice)}
                      onChange={(collectorId) =>
                        setRouteAssignCollectors((prev) => ({
                          ...prev,
                          [slice.collectorIndex]: collectorId,
                        }))
                      }
                      disabled={routeAssignSubmitting}
                    />
                  ) : null}

                  <ol
                    className="route-stops"
                    aria-label={
                      multiCollectorPlan
                        ? `Stops for route ${slice.collectorIndex}`
                        : 'Collection stops in route order'
                    }
                  >
                    {slice.orders.map((order, stopIndex) => {
                      const items: ApiOrderDetailItem[] = order.items ?? []
                      const stop = stopIndex + 1
                      const stopTimes = slice.editableStops[order.id]
                      return (
                        <li key={order.id} className="route-stop-card">
                          <div className="route-stop-card__marker" aria-hidden>
                            <span className="route-stop-card__badge">{stop}</span>
                            {stopIndex < slice.orders.length - 1 ? (
                              <span className="route-stop-card__line" />
                            ) : null}
                          </div>
                          <div className="route-stop-card__body">
                            <div className="route-stop-card__meta">
                              <span className="route-stop-card__patient">{order.patient_name}</span>
                              <span className="route-stop-card__address">
                                {order.address?.trim() || 'No address on file'}
                              </span>
                            </div>
                            {stopTimes ? (
                              <div className="route-stop-card__schedule-edit">
                                <p className="route-stop-card__schedule-label">Stop schedule</p>
                                <div className="route-stop-card__schedule-grid">
                                  <div className="field">
                                    <label htmlFor={`stop-${order.id}-arrive`}>Arrive</label>
                                    <TimeField
                                      id={`stop-${order.id}-arrive`}
                                      value={stopTimes.arrivalTime}
                                      onChange={(value) =>
                                        updateRouteStopTime(order.id, 'arrivalTime', value)
                                      }
                                      disabled={routeAssignSubmitting}
                                      placeholder="Arrive"
                                    />
                                  </div>
                                  <div className="field">
                                    <label htmlFor={`stop-${order.id}-collect-start`}>From</label>
                                    <TimeField
                                      id={`stop-${order.id}-collect-start`}
                                      value={stopTimes.collectionStart}
                                      onChange={(value) =>
                                        updateRouteStopTime(order.id, 'collectionStart', value)
                                      }
                                      disabled={routeAssignSubmitting}
                                      placeholder="Start"
                                    />
                                  </div>
                                  <div className="field">
                                    <label htmlFor={`stop-${order.id}-collect-end`}>Until</label>
                                    <TimeField
                                      id={`stop-${order.id}-collect-end`}
                                      value={stopTimes.collectionEnd}
                                      onChange={(value) =>
                                        updateRouteStopTime(order.id, 'collectionEnd', value)
                                      }
                                      disabled={routeAssignSubmitting}
                                      placeholder="End"
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : null}
                            {items.length === 0 ? (
                              <p className="route-stop-card__empty">No tests assigned on this order</p>
                            ) : (
                              <ul className="route-stop-card__tests">
                                {items.map((it, idx) => (
                                  <li
                                    key={`${order.id}-${it.test_id}-${idx}`}
                                    className="route-stop-card__test"
                                  >
                                    <span className="route-stop-card__test-name">
                                      {it.test_name?.trim() || it.test_id}
                                    </span>
                                    {it.test_code?.trim() ? (
                                      <span className="route-stop-card__test-code">{it.test_code.trim()}</span>
                                    ) : null}
                                    <span className="route-stop-card__test-qty">×{it.quantity}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </article>
              )
            })}
          </div>
        </div>
      ) : null}

      {isScheduleMode && !loading && selectedScheduledOrder ? (
        <div className="route-panel route-panel--assigned">
          <div className="route-panel__head">
            <div>
              <h3 className="route-panel__title">Selected pickup stop</h3>
              <p className="route-panel__summary">{scheduledRouteSummary}</p>
            </div>
            <div className="route-panel__head-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => openScheduledEdit(selectedScheduledOrder)}
                disabled={scheduledEditSubmitting}
              >
                Update schedule
              </button>
              {canStartCollection ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => void startCollectionForSelected()}
                  disabled={collectionSubmitting}
                  aria-busy={collectionSubmitting}
                >
                  {collectionSubmitting ? 'Updating…' : 'Start collecting'}
                </button>
              ) : null}
            </div>
          </div>
          <p className="route-panel__hint">
            This is the stop you selected in the table. Update collector or stop times, then start collecting when
            pickup begins.
          </p>
          <ol className="route-stops" aria-label="Scheduled collection stops">
            {visibleScheduledStops.map(({ order, stopIndex }) => {
              const selected = isOrderSelected(order.id)
              const schedule = order.schedule
              return (
                <li
                  key={order.id}
                  className={`route-stop-card route-stop-card--assigned${selected ? ' route-stop-card--selected' : ''}`}
                  onClick={() => selectSingle(order.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      selectSingle(order.id)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="route-stop-card__marker" aria-hidden>
                    <span className="route-stop-card__badge">{stopIndex + 1}</span>
                  </div>
                  <div className="route-stop-card__body">
                    <div className="route-stop-card__meta">
                      <span className="route-stop-card__patient">{order.patient_name}</span>
                      <span className="route-stop-card__address">
                        {order.address?.trim() || 'No address on file'}
                      </span>
                    </div>
                    <p className="route-stop-card__assigned route-stop-card__assigned--prominent">
                      <span className="material-symbols-outlined route-stop-card__assigned-icon" aria-hidden>
                        person
                      </span>
                      <span>
                        <strong>{schedule?.collecting_person?.trim() || 'Collector not assigned'}</strong>
                        <span className="route-stop-card__assigned-time">
                          {' '}
                          · {fmtWhen(schedule?.collection_time ?? undefined)}
                        </span>
                      </span>
                    </p>
                    {selected ? (
                      <p className="route-stop-card__selected-note">Selected for collection start</p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      ) : null}

      {routeAssignOpen
        ? createPortal(
            <div
              className="modal-backdrop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="route-assign-title"
              onMouseDown={(e) =>
                e.target === e.currentTarget && !routeAssignSubmitting && setRouteAssignOpen(false)
              }
            >
              <div className="modal-card modal-card--status-update" onMouseDown={(e) => e.stopPropagation()}>
                <div className="modal-head">
                  <h2 className="modal-title" id="route-assign-title">
                    {routePlanSlices.length > 1 ? 'Assign collectors to routes' : 'Assign collector to route'}
                  </h2>
                  <button
                    type="button"
                    className="btn btn-ghost modal-close"
                    onClick={() => !routeAssignSubmitting && setRouteAssignOpen(false)}
                    aria-label="Close"
                    disabled={routeAssignSubmitting}
                  >
                    ×
                  </button>
                </div>
                <div className="modal-card--status-update__body">
                  <form className="form-grid status-update-form" onSubmit={(e) => void submitRouteAssign(e)}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
                      {routePlanSlices.length > 1 ? (
                        <>
                          Confirm assignment for <strong>{routePlanSlices.length}</strong> routes (
                          {routePlanOrders.length} stops total). Pending orders move to{' '}
                          <strong>scheduled</strong>.
                        </>
                      ) : (
                        <>
                          Confirm assignment for all <strong>{routePlanOrders.length}</strong> stops using the
                          edited per-stop times above. Pending orders move to <strong>scheduled</strong>.
                        </>
                      )}
                    </p>
                    {routeCollectorOptions.length === 0 ? (
                      <div className="form-alert form-alert--error" role="alert">
                        No collectors available. Go to <strong>Staff</strong> → add or edit a staff member and set role
                        to <strong>Collector</strong>, then try again.
                      </div>
                    ) : (
                      <ul className="route-assign-summary" aria-label="Selected collectors">
                        {routePlanSlices.map((slice) => {
                          const collectorId = routeAssignCollectors[slice.collectorIndex] ?? ''
                          const selectedCollector =
                            routeCollectorOptions.find((s) => s.id === collectorId) ?? null
                          return (
                            <li key={`assign-summary-${slice.collectorIndex}`}>
                              {routePlanSlices.length > 1 ? (
                                <>
                                  <strong>Route {slice.collectorIndex}</strong> ({slice.orders.length} stop
                                  {slice.orders.length === 1 ? '' : 's'}):{' '}
                                </>
                              ) : null}
                              {selectedCollector?.name.trim() || 'Collector not selected'}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    {routeAssignError ? (
                      <div className="form-alert form-alert--error" role="alert">
                        {routeAssignError}
                      </div>
                    ) : null}
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setRouteAssignOpen(false)}
                        disabled={routeAssignSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={routeAssignSubmitting || routeCollectorOptions.length === 0}
                      >
                        {routeAssignSubmitting ? 'Assigning…' : routePlanSlices.length > 1 ? 'Assign routes' : 'Assign to route'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {scheduledEditOpen && scheduledEditOrder
        ? createPortal(
            <div
              className="modal-backdrop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="scheduled-edit-title"
              onMouseDown={(e) =>
                e.target === e.currentTarget && !scheduledEditSubmitting && setScheduledEditOpen(false)
              }
            >
              <div className="modal-card modal-card--status-update" onMouseDown={(e) => e.stopPropagation()}>
                <div className="modal-head">
                  <h2 className="modal-title" id="scheduled-edit-title">
                    Update schedule
                  </h2>
                  <button
                    type="button"
                    className="btn btn-ghost modal-close"
                    onClick={() => !scheduledEditSubmitting && setScheduledEditOpen(false)}
                    aria-label="Close"
                    disabled={scheduledEditSubmitting}
                  >
                    ×
                  </button>
                </div>
                <div className="modal-card--status-update__body">
                  <form className="form-grid status-update-form" onSubmit={(e) => void submitScheduledEdit(e)}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
                      Update collector and pickup times for{' '}
                      <strong>{scheduledEditOrder.patient_name.trim() || 'this patient'}</strong>
                      {scheduledEditOrder.address?.trim() ? (
                        <>
                          {' '}
                          at <strong>{scheduledEditOrder.address.trim()}</strong>
                        </>
                      ) : null}
                      .
                    </p>
                    {routeCollectorOptions.length === 0 ? (
                      <div className="form-alert form-alert--error" role="alert">
                        No collectors available. Go to <strong>Staff</strong> → add or edit a staff member and set role
                        to <strong>Collector</strong>, then try again.
                      </div>
                    ) : (
                      <div className="field">
                        <label htmlFor="scheduled-edit-collector">Collector</label>
                        <select
                          id="scheduled-edit-collector"
                          className="select-chevron-left"
                          value={scheduledEditCollectorId}
                          onChange={(e) => setScheduledEditCollectorId(e.target.value)}
                          disabled={scheduledEditSubmitting}
                        >
                          <option value="">Select collector…</option>
                          {routeCollectorOptions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        {selectedScheduledEditCollector ? (
                          <div className="route-collector-preview" aria-live="polite">
                            <StaffAvatar
                              name={selectedScheduledEditCollector.name}
                              profileImageUrl={selectedScheduledEditCollector.profile_image_url}
                              className="route-collector-preview__avatar"
                            />
                            <div className="route-collector-preview__meta">
                              <span className="route-collector-preview__name">
                                {selectedScheduledEditCollector.name}
                              </span>
                              <span className="route-collector-preview__email">
                                {selectedScheduledEditCollector.email}
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                    <div className="field">
                      <label htmlFor="scheduled-edit-date">Pickup date</label>
                      <input
                        id="scheduled-edit-date"
                        type="date"
                        value={scheduledEditDate}
                        onChange={(e) => setScheduledEditDate(e.target.value)}
                        disabled={scheduledEditSubmitting}
                      />
                    </div>
                    <div className="route-stop-card__schedule-edit">
                      <p className="route-stop-card__schedule-label">Stop times</p>
                      <div className="route-stop-card__schedule-grid">
                        <div className="field">
                          <label htmlFor="scheduled-edit-arrive">Arrive</label>
                          <TimeField
                            id="scheduled-edit-arrive"
                            value={scheduledEditTimes.arrivalTime}
                            onChange={(value) => updateScheduledEditStopTime('arrivalTime', value)}
                            disabled={scheduledEditSubmitting}
                            placeholder="Arrive"
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="scheduled-edit-collect-start">Collect from</label>
                          <TimeField
                            id="scheduled-edit-collect-start"
                            value={scheduledEditTimes.collectionStart}
                            onChange={(value) => updateScheduledEditStopTime('collectionStart', value)}
                            disabled={scheduledEditSubmitting}
                            placeholder="Start"
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="scheduled-edit-collect-end">Collect until</label>
                          <TimeField
                            id="scheduled-edit-collect-end"
                            value={scheduledEditTimes.collectionEnd}
                            onChange={(value) => updateScheduledEditStopTime('collectionEnd', value)}
                            disabled={scheduledEditSubmitting}
                            placeholder="End"
                          />
                        </div>
                      </div>
                      <p className="route-stop-card__schedule-hint">
                        Saved pickup time uses <strong>Collect from</strong>, or <strong>Arrive</strong> if empty
                      </p>
                    </div>
                    {scheduledEditError ? (
                      <div className="form-alert form-alert--error" role="alert">
                        {scheduledEditError}
                      </div>
                    ) : null}
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setScheduledEditOpen(false)}
                        disabled={scheduledEditSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={scheduledEditSubmitting || routeCollectorOptions.length === 0}
                      >
                        {scheduledEditSubmitting ? 'Updating…' : 'Update schedule'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

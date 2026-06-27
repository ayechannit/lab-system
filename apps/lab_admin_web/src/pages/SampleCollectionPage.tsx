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
  const [routeResult, setRouteResult] = useState<CollectionRouteResult | null>(null)
  const [routePlanOrders, setRoutePlanOrders] = useState<ApiOrderListRow[]>([])
  const [routePlanning, setRoutePlanning] = useState(false)
  const [labRouteStart, setLabRouteStart] = useState<{
    lat: number
    lng: number
    address: string | null
  } | null>(null)
  const [routeStartTime, setRouteStartTime] = useState(() => formatRouteStartTime())
  const [routeCollectionDurationMinutes, setRouteCollectionDurationMinutes] = useState<number | ''>(10)
  const [patientInput, setPatientInput] = useState('')
  const [patientName, setPatientName] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApiOrderStatus>('pending')
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersPageSize, setOrdersPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)
  const [refreshTick, setRefreshTick] = useState(0)
  const [staff, setStaff] = useState<StaffListRow[]>([])
  const [collectionSubmitting, setCollectionSubmitting] = useState(false)

  const [routeAssignOpen, setRouteAssignOpen] = useState(false)
  const [routeCollectorId, setRouteCollectorId] = useState('')
  const [routeAssignSubmitting, setRouteAssignSubmitting] = useState(false)
  const [routeAssignError, setRouteAssignError] = useState<string | null>(null)
  const [routeAssignments, setRouteAssignments] = useState<
    Record<string, { collectorName: string; collectionTime: string }>
  >({})
  const [editableRouteStops, setEditableRouteStops] = useState<Record<string, EditableRouteStopTimes>>({})

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
  const selectedRouteCollector = useMemo(
    () => routeCollectorOptions.find((s) => s.id === routeCollectorId) ?? null,
    [routeCollectorOptions, routeCollectorId],
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
    setRouteResult(null)
    setRoutePlanOrders([])
    setEditableRouteStops({})
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
    return true
  }, [labRouteStart, routeStartTime, routeCollectionDurationMinutes])

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

  const allRouteStopsAssigned = useMemo(
    () => routePlanOrders.length > 0 && routePlanOrders.every((o) => Boolean(routeAssignments[o.id])),
    [routePlanOrders, routeAssignments],
  )

  function clearRoutePlan() {
    setRouteResult(null)
    setRoutePlanOrders([])
    setEditableRouteStops({})
    setRouteAssignments({})
    setSelectedIds(new Set())
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
    setEditableRouteStops((prev) => ({
      ...prev,
      [orderId]: {
        arrivalTime: prev[orderId]?.arrivalTime ?? '',
        collectionStart: prev[orderId]?.collectionStart ?? '',
        collectionEnd: prev[orderId]?.collectionEnd ?? '',
        [field]: value,
      },
    }))
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

    if (!hasApi) {
      const addresses = picked.map(
        (o) => `${o.id}: ${o.patient_name} — ${o.address?.trim() || '—'}`,
      )
      const result = suggestCollectionRoute(addresses)
      const startTime = parseRouteStartTimeInput(routeStartTime) ?? formatRouteStartTime()
      const minutesPerStop = parseRouteCollectionDuration(routeCollectionDurationMinutes) ?? 10
      const fullResult: CollectionRouteResult = {
        orderedStops: result.orderedStops,
        summary: result.summary,
        estimatedFinishTime: null,
        estimatedMinutes: result.estimatedMinutes,
        routeStops: [],
      }
      setRouteResult(fullResult)
      const plannedOrders = orderStopsInRouteOrder(picked, result.orderedStops)
      setRoutePlanOrders(plannedOrders)
      setEditableRouteStops(buildEditableRouteStops(fullResult, plannedOrders, startTime, minutesPerStop))
      setRouteAssignments({})
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

    const startTime = parseRouteStartTimeInput(routeStartTime)
    if (!startTime) {
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
      const result = await planCollectionRouteWithAi({
        startLocation: { lat: labRouteStart.lat, lng: labRouteStart.lng },
        startTime,
        collectionDurationMinutes,
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
      setRouteResult(result)
      const plannedOrders = orderStopsFromRouteDetails(picked, result.routeStops)
      setRoutePlanOrders(plannedOrders)
      setEditableRouteStops(
        buildEditableRouteStops(result, plannedOrders, startTime, collectionDurationMinutes),
      )
      setRouteAssignments({})
      showSuccess('Collection route generated.')
    } catch (err) {
      showError(friendlyAiReviewErrorMessage(err, 'Route planning failed.'))
    } finally {
      setRoutePlanning(false)
    }
  }

  function openRouteAssign() {
    if (routePlanOrders.length === 0) return
    setRouteAssignError(null)
    setRouteCollectorId(routeCollectorOptions[0]?.id ?? '')
    setRouteAssignOpen(true)
  }

  async function submitRouteAssign(e: FormEvent) {
    e.preventDefault()
    if (routePlanOrders.length === 0) return
    setRouteAssignError(null)

    const collector = routeCollectorOptions.find((s) => s.id === routeCollectorId)
    if (!collector) {
      setRouteAssignError('Select a collector staff member.')
      return
    }

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

    const actingStaffId = account?.id ?? collector.id
    const minutesPerStop =
      routeResult?.estimatedMinutes != null && routePlanOrders.length > 1
        ? Math.max(8, Math.round(routeResult.estimatedMinutes / routePlanOrders.length))
        : parseRouteCollectionDuration(routeCollectionDurationMinutes) ?? 10

    setRouteAssignSubmitting(true)
    const nextAssignments: Record<string, { collectorName: string; collectionTime: string }> = {}
    const pendingToSchedule: string[] = []
    try {
      for (let i = 0; i < routePlanOrders.length; i++) {
        const order = routePlanOrders[i]
        const stopIso = stopCollectionIso(
          order.id,
          i,
          routeResult,
          baseIso,
          minutesPerStop,
          editableRouteStops,
        )
        await upsertSchedule({
          order_id: order.id,
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
      }
      if (pendingToSchedule.length > 0) {
        await bulkUpdateOrderStatus({
          order_ids: pendingToSchedule,
          status: 'scheduled',
          staff_id: actingStaffId,
          note: `Route assigned to ${collector.name.trim()}`,
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
          ? `Assigned ${collector.name.trim()} to ${routePlanOrders.length} stop(s). Orders moved to Scheduled.`
          : `Assigned ${collector.name.trim()} to ${routePlanOrders.length} route stop(s).`,
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

      {!isScheduleMode && routeResult && routePlanOrders.length > 0 && !allRouteStopsAssigned ? (
        <div className="route-panel">
          <div className="route-panel__head">
            <div>
              <h3 className="route-panel__title">Planned collection route</h3>
              <p className="route-panel__summary">{routeResult.summary}</p>
            </div>
            <div className="route-panel__head-actions">
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
                disabled={!hasApi || routeAssignSubmitting}
              >
                Assign collector
              </button>
              <div className="route-panel__eta">
                <span className="route-panel__eta-label">Est. finish</span>
                <span className="route-panel__eta-value">{displayEstimatedFinish}</span>
              </div>
            </div>
          </div>
          {routeCollectorOptions.length === 0 ? (
            <p className="route-panel__hint">
              No staff with role <strong>Collector</strong> yet. Add one under <strong>Staff</strong>, then assign
              this route.
            </p>
          ) : null}

          <p className="route-panel__hint">
            Adjust arrival and collection times below before assigning a collector.
          </p>

          <ol className="route-stops" aria-label="Collection stops in route order">
            {routePlanOrders.map((order, stopIndex) => {
              const items: ApiOrderDetailItem[] = order.items ?? []
              const stop = stopIndex + 1
              const stopTimes = editableRouteStops[order.id]
              return (
                <li key={order.id} className="route-stop-card">
                  <div className="route-stop-card__marker" aria-hidden>
                    <span className="route-stop-card__badge">{stop}</span>
                    {stopIndex < routePlanOrders.length - 1 ? <span className="route-stop-card__line" /> : null}
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
                              onChange={(value) => updateRouteStopTime(order.id, 'arrivalTime', value)}
                              disabled={routeAssignSubmitting}
                              placeholder="Arrive"
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`stop-${order.id}-collect-start`}>Collect from</label>
                            <TimeField
                              id={`stop-${order.id}-collect-start`}
                              value={stopTimes.collectionStart}
                              onChange={(value) => updateRouteStopTime(order.id, 'collectionStart', value)}
                              disabled={routeAssignSubmitting}
                              placeholder="Start"
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`stop-${order.id}-collect-end`}>Collect until</label>
                            <TimeField
                              id={`stop-${order.id}-collect-end`}
                              value={stopTimes.collectionEnd}
                              onChange={(value) => updateRouteStopTime(order.id, 'collectionEnd', value)}
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
                          <li key={`${order.id}-${it.test_id}-${idx}`} className="route-stop-card__test">
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
                    Assign collector to route
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
                      Assigns a staff member with role <strong>Collector</strong> to all{' '}
                      <strong>{routePlanOrders.length}</strong> stops using the edited per-stop times above.
                      Pending orders move to <strong>scheduled</strong>.
                    </p>
                    {routeCollectorOptions.length === 0 ? (
                      <div className="form-alert form-alert--error" role="alert">
                        No collectors available. Go to <strong>Staff</strong> → add or edit a staff member and set role
                        to <strong>Collector</strong>, then try again.
                      </div>
                    ) : (
                      <div className="field">
                        <label htmlFor="route-collector">Collector</label>
                        <select
                          id="route-collector"
                          className="select-chevron-left"
                          value={routeCollectorId}
                          onChange={(e) => setRouteCollectorId(e.target.value)}
                          disabled={routeAssignSubmitting}
                        >
                          <option value="">Select collector…</option>
                          {routeCollectorOptions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        {selectedRouteCollector ? (
                          <div className="route-collector-preview" aria-live="polite">
                            <StaffAvatar
                              name={selectedRouteCollector.name}
                              profileImageUrl={selectedRouteCollector.profile_image_url}
                              className="route-collector-preview__avatar"
                            />
                            <div className="route-collector-preview__meta">
                              <span className="route-collector-preview__name">
                                {selectedRouteCollector.name}
                              </span>
                              <span className="route-collector-preview__email">
                                {selectedRouteCollector.email}
                              </span>
                              {!selectedRouteCollector.profile_image_url ? (
                                <span className="route-collector-preview__hint">
                                  No profile photo — add one under Staff → Edit staff.
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
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
                        {routeAssignSubmitting ? 'Assigning…' : 'Assign to route'}
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

import { normalizeLabTestCatalogRow, normalizeLabTestCatalogRows } from '../mock-data/labTestCatalogApi'
import type { LabTestCatalogRow } from '../mock-data/types'
import { getApiBaseUrl } from './apiBase'
import { readApiErrorBody } from './readApiError'

function testsBasePath(): string {
  const base = getApiBaseUrl()
  if (!base) throw new Error('VITE_API_BASE_URL is not set')
  return `${base}/api/tests`
}

/** Body for `POST /api/tests` and `PUT /api/tests/:id` per Joi `testSchema`. */
export type LabTestWriteBody = {
  test_name: string
  test_code: string
  description?: string | null
  base_price_mmk: number
  category?: string | null
  is_active: boolean
}

/** Role passed as `GET /api/tests?role=` so the API joins `test_specific_discounts` and returns discount fields (see Swagger). */
export type CatalogPricingRole = 'clinic' | 'doctor' | 'patient'

export async function fetchLabTestCatalog(
  pricingRole: CatalogPricingRole = 'clinic',
): Promise<LabTestCatalogRow[]> {
  const url = `${testsBasePath()}?role=${encodeURIComponent(pricingRole)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeLabTestCatalogRows(await res.json())
}

/** Catalog list without per-role discount join (GET /api/tests). Use for pickers. */
export async function fetchLabTestsList(): Promise<LabTestCatalogRow[]> {
  const res = await fetch(testsBasePath())
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeLabTestCatalogRows(await res.json())
}

export async function createLabTest(body: LabTestWriteBody): Promise<LabTestCatalogRow> {
  const res = await fetch(testsBasePath(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const row = normalizeLabTestCatalogRow(await res.json())
  if (!row) throw new Error('Invalid lab test response from server')
  return row
}

export async function updateLabTest(id: string, body: LabTestWriteBody): Promise<LabTestCatalogRow> {
  const res = await fetch(`${testsBasePath()}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const row = normalizeLabTestCatalogRow(await res.json())
  if (!row) throw new Error('Invalid lab test response from server')
  return row
}

export async function deleteLabTest(id: string): Promise<void> {
  const res = await fetch(`${testsBasePath()}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}

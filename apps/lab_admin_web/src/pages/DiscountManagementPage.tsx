import { useState } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import { discountRules } from '../mock-data/discounts'
import type { DiscountAppliesTo } from '../mock-data/types'
import '../components/common/ui.css'
const DISCOUNT_RULES_KEY = 'lab_admin_discount_rules_v1'

function roleTitle(r: DiscountAppliesTo) {
  const map: Record<DiscountAppliesTo, string> = {
    doctor: 'Doctor',
    clinic: 'Clinic',
    patient: 'Patient',
    reception: 'Reception',
  }
  return map[r]
}

export function DiscountManagementPage() {
  const [rules, setRules] = useState(() => {
    try {
      const raw = window.localStorage.getItem(DISCOUNT_RULES_KEY)
      if (!raw) return discountRules
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : discountRules
    } catch {
      return discountRules
    }
  })

  return (
    <div className="stack">
      <PageHeader
        title="Discount by user role"
        description="Set percentage off billing by role (patient, doctor, clinic, reception). Applied at checkout when backend is connected."
      />
      <div className="card">
        <h3 className="card-title">Active percentage rules</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>User role</th>
                <th>Discount (%)</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td>{r.label}</td>
                  <td>{roleTitle(r.appliesTo)}</td>
                  <td className="discount-cell">
                    <label className="discount-percent-field">
                      <input
                        className="discount-percent-input"
                        type="number"
                        value={r.percent}
                        min={0}
                        max={100}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          setRules((prev) => {
                            const next = prev.map((x) => (x.id === r.id ? { ...x, percent: v } : x))
                            try {
                              window.localStorage.setItem(DISCOUNT_RULES_KEY, JSON.stringify(next))
                            } catch {
                              /* ignore storage failures */
                            }
                            return next
                          })
                        }}
                      />
                      <span className="discount-percent-suffix">%</span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: '0.75rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
          Example: 100,000 MMK bill with 10% doctor role discount → 90,000 MMK (before loyalty points).
        </p>
      </div>
    </div>
  )
}

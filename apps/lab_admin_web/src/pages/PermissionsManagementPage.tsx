import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiConfigBanner } from '../components/common/ApiConfigBanner'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { PageHeader } from '../components/common/PageHeader'
import { useToast } from '../hooks/ToastContext'
import { usePermissions } from '../hooks/PermissionsContext'
import { messageFromError, useErrorToast } from '../hooks/usePageNotify'
import { isApiMode } from '../services/apiBase'
import {
  fetchPermissionMatrix,
  updatePermissionMatrix,
  type ConfigurableStaffRole,
  type PermissionMatrix,
} from '../services/permissionService'
import { roleLabel } from '../utils/roleLabels'
import '../components/common/ui.css'

export function PermissionsManagementPage() {
  const { t } = useTranslation()
  const hasApi = isApiMode()
  const { showSuccess, showError } = useToast()
  const { refresh: refreshMyPermissions } = usePermissions()

  const [modules, setModules] = useState<string[]>([])
  const [roles, setRoles] = useState<ConfigurableStaffRole[]>([])
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null)
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useErrorToast(loadError)

  useEffect(() => {
    if (!hasApi) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void (async () => {
      try {
        const res = await fetchPermissionMatrix()
        if (!cancelled) {
          setModules(res.modules)
          setRoles(res.roles)
          setMatrix(res.matrix)
          setDirty(false)
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t('permissions.loadFailed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, t])

  const moduleLabel = useMemo(
    () => (moduleKey: string) => t(`nav.${moduleKeyToLabelSuffix(moduleKey)}`, { defaultValue: moduleKey }),
    [t],
  )

  function toggle(role: ConfigurableStaffRole, moduleKey: string) {
    setMatrix((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [role]: { ...prev[role], [moduleKey]: !prev[role]?.[moduleKey] },
      }
    })
    setDirty(true)
  }

  async function handleSave() {
    if (!matrix) return
    setSaving(true)
    try {
      const entries = roles.flatMap((role) =>
        modules.map((module_key) => ({
          role,
          module_key,
          is_allowed: !!matrix[role]?.[module_key],
        })),
      )
      const res = await updatePermissionMatrix(entries)
      setModules(res.modules)
      setRoles(res.roles)
      setMatrix(res.matrix)
      setDirty(false)
      showSuccess(t('permissions.toasts.saved'))
      void refreshMyPermissions()
    } catch (e) {
      showError(messageFromError(e, t('permissions.toasts.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="stack">
      <PageHeader title={t('pages.permissions.title')} description={t('pages.permissions.description')} />

      {!hasApi ? <ApiConfigBanner /> : null}

      <div className="card">
        <div className="list-tools-row">
          <h3 className="card-title" style={{ margin: 0 }}>
            {t('permissions.matrixTitle')}
          </h3>
          <div className="list-tools-row__actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleSave()}
              disabled={loading || saving || !dirty || !hasApi}
            >
              {saving ? t('common.saving') : t('permissions.actions.save')}
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner label={t('permissions.loading')} />
        ) : !matrix ? null : (
          <div className="table-wrap">
            <table className="data-table data-table--align-center">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>{t('permissions.table.module')}</th>
                  <th>{roleLabel('admin')}</th>
                  {roles.map((role) => (
                    <th key={role}>{roleLabel(role)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map((moduleKey) => (
                  <tr key={moduleKey}>
                    <td style={{ textAlign: 'left' }}>{moduleLabel(moduleKey)}</td>
                    <td>
                      <input type="checkbox" checked disabled aria-label={t('permissions.adminAlwaysAllowed')} />
                    </td>
                    {roles.map((role) => (
                      <td key={role}>
                        <input
                          type="checkbox"
                          checked={!!matrix[role]?.[moduleKey]}
                          onChange={() => toggle(role, moduleKey)}
                          disabled={saving}
                          aria-label={`${roleLabel(role)} — ${moduleLabel(moduleKey)}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ marginTop: '0.75rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
          {t('permissions.adminHint')}
        </p>
      </div>
    </div>
  )
}

/** Module keys are kebab-case route segments; nav labels are camelCase i18n keys (e.g. 'lab-tests' -> 'labTests'). */
function moduleKeyToLabelSuffix(moduleKey: string): string {
  return moduleKey.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

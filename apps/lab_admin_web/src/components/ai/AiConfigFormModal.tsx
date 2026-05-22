import { type FormEvent, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  createAiConfig,
  type AiConfigRow,
  type AiConfigUpsertBody,
  type AiProviderType,
  updateAiConfig,
} from '../../services/aiConfigService'
import '../common/ui.css'

type AiConfigFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  initial: AiConfigRow | null
  onClose: () => void
  onSuccess: () => void
}

const PROVIDER_OPTIONS: { value: AiProviderType; label: string; modelHint: string }[] = [
  { value: 'gemini', label: 'Google Gemini', modelHint: 'e.g. gemini-2.0-flash' },
  { value: 'openai', label: 'OpenAI', modelHint: 'e.g. gpt-4o-mini' },
]

export function AiConfigFormModal({
  open,
  mode,
  initial,
  onClose,
  onSuccess,
}: AiConfigFormModalProps) {
  const titleId = useId()
  const [modelName, setModelName] = useState(() => initial?.model_name ?? '')
  const [apiKey, setApiKey] = useState(() => initial?.api_key ?? '')
  const [provider, setProvider] = useState<AiProviderType>(() => initial?.type ?? 'gemini')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setModelName(initial?.model_name ?? '')
    setApiKey(initial?.api_key ?? '')
    setProvider(initial?.type ?? 'gemini')
    setFormError(null)
  }, [open, initial])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, submitting])

  const modelHint = PROVIDER_OPTIONS.find((o) => o.value === provider)?.modelHint ?? ''

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const modelTrim = modelName.trim()
    const keyTrim = apiKey.trim()
    if (!modelTrim) {
      setFormError('Enter the model name your provider expects.')
      return
    }
    if (!keyTrim) {
      setFormError('Enter an API key for this provider.')
      return
    }
    const body: AiConfigUpsertBody = {
      model_name: modelTrim,
      api_key: keyTrim,
      type: provider,
    }
    setSubmitting(true)
    try {
      if (mode === 'edit' && initial) {
        await updateAiConfig(initial.id, body)
      } else {
        await createAiConfig(body)
      }
      onSuccess()
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const title = mode === 'edit' ? 'Edit AI configuration' : 'Add AI configuration'

  const modal = (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose()
      }}
    >
      <div className="modal-card modal-card--discount-form" onMouseDown={(e) => e.stopPropagation()}>
        <div className="discount-form-modal__head">
          <div className="modal-head">
            <h2 id={titleId} className="modal-title">
              {title}
            </h2>
            <button
              type="button"
              className="btn btn-ghost modal-close"
              onClick={() => !submitting && onClose()}
              aria-label="Close"
              disabled={submitting}
            >
              ×
            </button>
          </div>
        </div>

        <form className="discount-form-modal__form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="discount-form-modal__body">
            <div className="discount-form-modal__stack">
              <div className="field">
                <label htmlFor="ai-provider">Provider</label>
                <select
                  id="ai-provider"
                  className="select-chevron-left"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as AiProviderType)}
                  disabled={submitting}
                >
                  {PROVIDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="ai-model">Model name</label>
                <input
                  id="ai-model"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder={modelHint}
                  autoComplete="off"
                  disabled={submitting}
                />
                <p className="field-hint" style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#5c6678' }}>
                  Used when calling <code>POST /api/conversations</code> with this configuration.
                </p>
              </div>
              <div className="field">
                <label htmlFor="ai-key">API key</label>
                <input
                  id="ai-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  autoComplete="off"
                  disabled={submitting}
                  placeholder={mode === 'edit' ? 'Re-enter key to update' : 'Paste provider API key'}
                />
                <p className="field-hint" style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#5c6678' }}>
                  Stored on the server for patient AI summaries. Keys are masked in the list view.
                </p>
              </div>
            </div>
          </div>

          <div className="discount-form-modal__footer">
            {formError ? (
              <div className="form-alert form-alert--error" role="alert">
                {formError}
              </div>
            ) : null}
            <div className="discount-form-modal__footer-actions">
              <div className="row-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => !submitting && onClose()}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create configuration'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

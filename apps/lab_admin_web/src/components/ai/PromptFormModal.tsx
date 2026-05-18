import { type FormEvent, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  createPrompt,
  type PromptRow,
  type PromptUpsertBody,
  updatePrompt,
} from '../../services/promptService'
import '../common/ui.css'

type PromptFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  initial: PromptRow | null
  onClose: () => void
  onSuccess: () => void
}

export function PromptFormModal({
  open,
  mode,
  initial,
  onClose,
  onSuccess,
}: PromptFormModalProps) {
  const titleId = useId()
  const [name, setName] = useState(() => initial?.name ?? '')
  const [promptText, setPromptText] = useState(() => initial?.prompt_text ?? '')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? '')
    setPromptText(initial?.prompt_text ?? '')
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const nameTrim = name.trim()
    const textTrim = promptText.trim()
    if (!nameTrim) {
      setFormError('Enter a name for this prompt.')
      return
    }
    if (!textTrim) {
      setFormError('Enter the system prompt text.')
      return
    }
    const body: PromptUpsertBody = { name: nameTrim, prompt_text: textTrim }
    setSubmitting(true)
    try {
      if (mode === 'edit' && initial) {
        await updatePrompt(initial.id, body)
      } else {
        await createPrompt(body)
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

  const title = mode === 'edit' ? 'Edit AI prompt' : 'Add AI prompt'

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
              <PromptFields
                name={name}
                setName={setName}
                promptText={promptText}
                setPromptText={setPromptText}
                submitting={submitting}
              />
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
                  {submitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create prompt'}
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

function PromptFields(props: {
  name: string
  setName: (v: string) => void
  promptText: string
  setPromptText: (v: string) => void
  submitting: boolean
}) {
  return (
    <>
      <div className="field">
        <label htmlFor="prompt-name">Name</label>
        <input
          id="prompt-name"
          value={props.name}
          onChange={(e) => props.setName(e.target.value)}
          placeholder="e.g. Patient result summary"
          autoComplete="off"
          disabled={props.submitting}
        />
      </div>
      <div className="field">
        <label htmlFor="prompt-text">System prompt</label>
        <textarea
          id="prompt-text"
          value={props.promptText}
          onChange={(e) => props.setPromptText(e.target.value)}
          rows={10}
          placeholder="Instructions used when prompt_id is sent to POST /api/conversations"
          disabled={props.submitting}
          style={{ resize: 'vertical', minHeight: '10rem' }}
        />
      </div>
    </>
  )
}

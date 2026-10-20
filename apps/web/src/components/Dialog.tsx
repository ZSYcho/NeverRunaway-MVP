import { type ReactNode, useEffect, useId, useRef } from 'react'
import { useI18n } from '../i18n/useI18n.ts'

/**
 * Native <dialog>: focus trapping, Escape and top-layer stacking come from the browser.
 * A bottom sheet on phones, a centered card from the `sm` breakpoint up.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const { t } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // The dialog element itself only receives clicks that land on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="mx-0 mt-auto mb-0 max-h-[85vh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-900 p-0 text-slate-50 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-md sm:rounded-3xl"
    >
      <div className="space-y-5 p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-xl font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <svg viewBox="0 0 20 20" aria-hidden className="size-5" fill="currentColor">
              <path d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}

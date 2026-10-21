import { useState } from 'react'
import { useI18n } from '../i18n/useI18n.ts'

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be blocked (insecure context, permissions); the value stays selectable.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-slate-800"
    >
      {copied ? t('copied') : (label ?? t('copyAddress'))}
    </button>
  )
}

import { type InputHTMLAttributes, useId } from 'react'

type TextFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  /** Shown in place of the hint, and marks the input invalid. */
  error?: string
  hint?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>

/** A labeled input whose hint or error is announced with it. */
export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  className,
  ...input
}: TextFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs text-slate-400">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        autoComplete="off"
        className={`w-full rounded-xl border bg-slate-900/70 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 ${
          error ? 'border-rose-400/60' : 'border-white/10'
        }`}
        {...input}
      />
      {message && (
        <p id={messageId} className={`mt-1 text-xs ${error ? 'text-rose-300' : 'text-slate-500'}`}>
          {message}
        </p>
      )}
    </div>
  )
}

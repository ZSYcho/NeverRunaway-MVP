import type { ReactNode } from 'react'

export function Notice({
  tone = 'muted',
  children,
}: {
  tone?: 'muted' | 'error'
  children: ReactNode
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`glass-card px-6 py-10 text-center ${tone === 'error' ? 'text-rose-300' : 'text-slate-400'}`}
    >
      {children}
    </div>
  )
}

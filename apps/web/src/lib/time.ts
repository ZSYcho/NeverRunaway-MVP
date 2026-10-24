import type { Lang } from '../i18n/messages.ts'

/** Formats a unix timestamp in seconds as a calendar date in the UI language. */
export function formatDate(seconds: bigint, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en', { dateStyle: 'medium' }).format(
    new Date(Number(seconds) * 1000),
  )
}

/** Formats a unix timestamp in seconds as a time of day in the UI language. */
export function formatTime(seconds: bigint, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en', { timeStyle: 'short' }).format(
    new Date(Number(seconds) * 1000),
  )
}

/** Seconds left as m:ss, held at 0:00 once the time is up. */
export function formatCountdown(seconds: number): string {
  const left = Math.max(0, seconds)
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
}

export function nowInSeconds(): bigint {
  return BigInt(Math.floor(Date.now() / 1000))
}

/** A date as the YYYY-MM-DD value of an <input type="date">, in the local time zone. */
export function toDateInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

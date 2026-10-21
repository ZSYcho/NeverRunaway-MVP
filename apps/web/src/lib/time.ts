import type { Lang } from '../i18n/messages.ts'

/** Formats a unix timestamp in seconds as a calendar date in the UI language. */
export function formatDate(seconds: bigint, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en', { dateStyle: 'medium' }).format(
    new Date(Number(seconds) * 1000),
  )
}

export function nowInSeconds(): bigint {
  return BigInt(Math.floor(Date.now() / 1000))
}

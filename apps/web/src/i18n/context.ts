import { createContext } from 'react'
import { type Lang, type MessageKey, messages } from './messages.ts'

export type Translate = (key: MessageKey, vars?: Record<string, string>) => string

export type I18nValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Translate
}

export const I18nContext = createContext<I18nValue | null>(null)

export const LANG_STORAGE_KEY = 'nr_lang'

/** A saved choice wins; otherwise follow the browser's preferred language. */
export function detectLang(saved: string | null, browserLanguages: readonly string[]): Lang {
  if (saved === 'zh' || saved === 'en') return saved
  return browserLanguages[0]?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function translate(lang: Lang, key: MessageKey, vars?: Record<string, string>): string {
  const template = messages[lang][key]
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match)
}

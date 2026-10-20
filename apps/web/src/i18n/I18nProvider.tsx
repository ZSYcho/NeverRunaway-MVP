import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { detectLang, I18nContext, type I18nValue, LANG_STORAGE_KEY, translate } from './context.ts'
import type { Lang } from './messages.ts'

function readSavedLang(): string | null {
  try {
    return localStorage.getItem(LANG_STORAGE_KEY)
  } catch {
    return null // storage can be unavailable (private mode, blocked site data)
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() =>
    detectLang(readSavedLang(), navigator.languages),
  )

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
    document.title = translate(lang, 'documentTitle')
  }, [lang])

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang: (next) => {
        setLangState(next)
        try {
          localStorage.setItem(LANG_STORAGE_KEY, next)
        } catch {
          // Not persisting the choice is fine.
        }
      },
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang],
  )

  return <I18nContext value={value}>{children}</I18nContext>
}

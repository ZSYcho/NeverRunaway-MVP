import { StoreList } from '../features/stores/StoreList.tsx'
import { useI18n } from '../i18n/useI18n.ts'

export function HomePage() {
  const { t } = useI18n()

  return (
    <div className="space-y-12">
      <section className="space-y-4 py-6 text-center md:py-10">
        <h1 className="text-4xl font-bold md:text-5xl">
          {t('heroTitleBefore')} <span className="gradient-text">{t('heroTitleHighlight')}</span>{' '}
          {t('heroTitleAfter')}
        </h1>
        <p className="mx-auto max-w-3xl text-lg text-slate-400">{t('heroDescription')}</p>
      </section>

      <section>
        <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold">
          <span aria-hidden className="h-6 w-2 rounded-full bg-indigo-500" />
          {t('discoverStores')}
        </h2>
        <StoreList />
      </section>
    </div>
  )
}

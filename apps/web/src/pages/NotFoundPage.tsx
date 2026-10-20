import { Link } from 'react-router'
import { useI18n } from '../i18n/useI18n.ts'

export function NotFoundPage() {
  const { t } = useI18n()

  return (
    <div className="glass-card mx-auto max-w-md space-y-4 p-10 text-center">
      <h1 className="text-2xl font-bold">{t('notFoundTitle')}</h1>
      <Link to="/" className="inline-block text-indigo-300 hover:text-indigo-200">
        {t('backHome')}
      </Link>
    </div>
  )
}

import { decodePayCode } from '@neverrunaway/shared'
import { Link, useLocation } from 'react-router'
import { Notice } from '../components/Notice.tsx'
import { ChargeCard } from '../features/cashier/ChargeCard.tsx'
import { PayLinkForm } from '../features/cashier/PayLinkForm.tsx'
import { useI18n } from '../i18n/useI18n.ts'

/**
 * Where a customer's pay code opens: its QR holds a link to this page with the code in the URL
 * fragment. Scanning it with the merchant's wallet app opens it in the wallet's browser.
 */
export function CashierPage() {
  const { t } = useI18n()
  const { hash } = useLocation()
  const code = hash ? decodePayCode(hash) : undefined

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link to="/merchant" className="inline-block text-sm text-slate-400 hover:text-slate-200">
        ← {t('merchantTitle')}
      </Link>
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">{t('cashierTitle')}</h1>
        <p className="text-slate-400">{t('cashierIntro')}</p>
      </section>

      {code ? (
        // A new code gets a fresh card, flow included.
        <ChargeCard key={hash} code={code} />
      ) : (
        hash && <Notice tone="error">{t('payLinkInvalid')}</Notice>
      )}
      <PayLinkForm autoFocus={!code} />
    </div>
  )
}

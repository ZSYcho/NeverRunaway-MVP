import { type Address, getAddress, isAddress } from 'viem'
import { Link, useParams } from 'react-router'
import { deployment, explorerUrl, targetChain } from '../chain.ts'
import { Notice } from '../components/Notice.tsx'
import { FundsPanel } from '../features/stores/FundsPanel.tsx'
import { MyCredit } from '../features/stores/MyCredit.tsx'
import { StoreStatusBadge } from '../features/stores/StoreStatusBadge.tsx'
import { TierList } from '../features/stores/TierList.tsx'
import { useStore } from '../features/stores/useStore.ts'
import { useUsdcDecimals } from '../hooks/useUsdcDecimals.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { shortAddress } from '../lib/format.ts'
import { formatDate } from '../lib/time.ts'

export function StorePage() {
  const { t } = useI18n()
  const { address } = useParams()

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-block text-sm text-slate-400 hover:text-slate-200">
        ← {t('discoverStores')}
      </Link>
      {address && isAddress(address) ? (
        <StoreDetail store={getAddress(address)} />
      ) : (
        <Notice tone="error">{t('invalidStoreAddress')}</Notice>
      )}
    </div>
  )
}

function StoreDetail({ store }: { store: Address }) {
  const { t, lang } = useI18n()
  const decimals = useUsdcDecimals()
  const { isFactoryStore, isError, state, user } = useStore(store)

  if (!deployment) return <Notice>{t('notDeployed', { chain: targetChain.name })}</Notice>
  if (isError) return <Notice tone="error">{t('readFailed')}</Notice>
  if (isFactoryStore === false) return <Notice tone="error">{t('notFactoryStore')}</Notice>
  if (!state || decimals === undefined) return <Notice>{t('loadingStore')}</Notice>

  const contractLink = explorerUrl('address', store)

  return (
    <div className="space-y-6">
      <header className="glass-card space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">
            {t('storeTitle', { address: shortAddress(store) })}
          </h1>
          <StoreStatusBadge isActive={state.isActive} closed={state.closed} />
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">{t('merchant')}</dt>
            <dd className="font-mono">{shortAddress(state.merchant)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('contractAddress')}</dt>
            <dd className="font-mono">
              {contractLink ? (
                <a href={contractLink} target="_blank" rel="noreferrer" className="text-indigo-300">
                  {shortAddress(store)}
                </a>
              ) : (
                shortAddress(store)
              )}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('validUntilLabel')}</dt>
            <dd>{formatDate(state.expireTime, lang)}</dd>
          </div>
        </dl>
        <p className="text-sm leading-relaxed text-slate-300">{t('storeTrustNote')}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <TierList store={store} state={state} user={user} decimals={decimals} />
        <aside className="space-y-6">
          {user && <MyCredit store={store} state={state} user={user} decimals={decimals} />}
          <FundsPanel state={state} decimals={decimals} />
        </aside>
      </div>
    </div>
  )
}

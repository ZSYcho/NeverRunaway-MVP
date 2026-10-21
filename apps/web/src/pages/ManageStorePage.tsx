import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { type Address, getAddress, isAddress, isAddressEqual } from 'viem'
import { useConnection } from 'wagmi'
import { deployment, explorerUrl, targetChain } from '../chain.ts'
import { secondaryButton } from '../components/buttons.ts'
import { CopyButton } from '../components/CopyButton.tsx'
import { Notice } from '../components/Notice.tsx'
import { BonusPoolPanel } from '../features/merchant/BonusPoolPanel.tsx'
import { CloseStoreCard } from '../features/merchant/CloseStoreCard.tsx'
import { EarningsCard } from '../features/merchant/EarningsCard.tsx'
import { StorePosterDialog } from '../features/merchant/StorePosterDialog.tsx'
import { TierManager } from '../features/merchant/TierManager.tsx'
import { FundsPanel } from '../features/stores/FundsPanel.tsx'
import { StoreStatusBadge } from '../features/stores/StoreStatusBadge.tsx'
import { useStore } from '../features/stores/useStore.ts'
import { useUsdcDecimals } from '../hooks/useUsdcDecimals.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { shortAddress } from '../lib/format.ts'
import { formatDate } from '../lib/time.ts'

export function ManageStorePage() {
  const { t } = useI18n()
  const { address } = useParams()

  return (
    <div className="space-y-6">
      <Link to="/merchant" className="inline-block text-sm text-slate-400 hover:text-slate-200">
        ← {t('merchantTitle')}
      </Link>
      {address && isAddress(address) ? (
        <ManageStore store={getAddress(address)} />
      ) : (
        <Notice tone="error">{t('invalidStoreAddress')}</Notice>
      )}
    </div>
  )
}

/**
 * The page only offers what the contract allows: anything but the merchant's own wallet gets a
 * pointer to the right account instead of forms whose transactions would revert with OnlyMerchant.
 */
function ManageStore({ store }: { store: Address }) {
  const { t, lang } = useI18n()
  const decimals = useUsdcDecimals()
  const { address: account, chainId } = useConnection()
  const location = useLocation()
  const [posterOpen, setPosterOpen] = useState(false)
  const { isFactoryStore, isError, state, user } = useStore(store)

  if (!deployment) return <Notice>{t('notDeployed', { chain: targetChain.name })}</Notice>
  if (isError) return <Notice tone="error">{t('readFailed')}</Notice>
  if (isFactoryStore === false) return <Notice tone="error">{t('notOurStore')}</Notice>
  if (!state || decimals === undefined) return <Notice>{t('loadingStore')}</Notice>
  if (!account) return <Notice>{t('connectToManage')}</Notice>
  if (!isAddressEqual(account, state.merchant)) {
    return (
      <Notice tone="error">
        {t('notYourStore', { merchant: shortAddress(state.merchant) })}{' '}
        <Link to={`/stores/${store}`} className="text-indigo-300 underline">
          {t('customerView')}
        </Link>
      </Notice>
    )
  }
  if (!user) return <Notice>{t('loadingStore')}</Notice>

  const canWrite = chainId === targetChain.id
  const justCreated = (location.state as { created?: boolean } | null)?.created === true
  const contractLink = explorerUrl('address', store)

  return (
    <div className="space-y-6">
      <header className="glass-card space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">
            {t('manageStoreTitle', { address: shortAddress(store) })}
          </h1>
          <StoreStatusBadge isActive={state.isActive} closed={state.closed} />
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">{t('contractAddress')}</dt>
            <dd className="flex items-center gap-2 font-mono">
              {contractLink ? (
                <a href={contractLink} target="_blank" rel="noreferrer" className="text-indigo-300">
                  {shortAddress(store)}
                </a>
              ) : (
                shortAddress(store)
              )}
              <CopyButton value={store} />
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('validUntilLabel')}</dt>
            <dd>{formatDate(state.expireTime, lang)}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Link to={`/stores/${store}`} className={secondaryButton}>
            {t('customerView')}
          </Link>
          <button type="button" onClick={() => setPosterOpen(true)} className={secondaryButton}>
            {t('showPoster')}
          </button>
        </div>
      </header>

      {justCreated && (
        <p
          role="status"
          className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          {t('storeCreatedNotice')}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <BonusPoolPanel
            store={store}
            state={state}
            user={user}
            decimals={decimals}
            canWrite={canWrite}
          />
          <TierManager
            store={store}
            account={account}
            state={state}
            decimals={decimals}
            canWrite={canWrite}
          />
        </div>
        <aside className="space-y-6">
          <EarningsCard
            store={store}
            account={account}
            earnings={state.merchantWithdrawable}
            decimals={decimals}
            canWrite={canWrite}
          />
          <FundsPanel state={state} decimals={decimals} />
          <CloseStoreCard
            store={store}
            account={account}
            isActive={state.isActive}
            canWrite={canWrite}
          />
        </aside>
      </div>

      {posterOpen && <StorePosterDialog store={store} onClose={() => setPosterOpen(false)} />}
    </div>
  )
}

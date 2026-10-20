import { storeDepositContractAbi, storeDepositFactoryAbi } from '@neverrunaway/shared'
import type { Address } from 'viem'
import { useReadContract, useReadContracts } from 'wagmi'
import { deployment, targetChain } from '../../chain.ts'
import { Notice } from '../../components/Notice.tsx'
import { useI18n } from '../../i18n/useI18n.ts'
import { shortAddress } from '../../lib/format.ts'

/** Stores come straight from the factory on chain; nothing here depends on the backend. */
export function StoreList() {
  const { t } = useI18n()
  const stores = useReadContract({
    chainId: targetChain.id,
    address: deployment?.factory,
    abi: storeDepositFactoryAbi,
    functionName: 'getAllStoreContracts',
    query: { enabled: deployment !== undefined },
  })

  if (!deployment) return <Notice>{t('notDeployed', { chain: targetChain.name })}</Notice>
  if (stores.isPending) return <Notice>{t('loadingStores')}</Notice>
  if (stores.isError) return <Notice tone="error">{t('readFailed')}</Notice>
  if (stores.data.length === 0) return <Notice>{t('noStores')}</Notice>

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {stores.data.map((address) => (
        <StoreCard key={address} address={address} />
      ))}
    </div>
  )
}

function StoreCard({ address }: { address: Address }) {
  const { t } = useI18n()
  const store = { chainId: targetChain.id, address, abi: storeDepositContractAbi } as const
  const { data } = useReadContracts({
    allowFailure: false,
    contracts: [
      { ...store, functionName: 'merchant' },
      { ...store, functionName: 'tierCount' },
      { ...store, functionName: 'isActive' },
    ],
  })
  const [merchant, tierCount, isActive] = data ?? []

  return (
    <article className="glass-card flex flex-col gap-4 p-6 transition hover:-translate-y-0.5 hover:border-indigo-400/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-wider text-slate-500 uppercase">{t('storeContract')}</p>
          <h3 className="font-mono text-lg font-semibold">{shortAddress(address)}</h3>
        </div>
        {isActive !== undefined && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs ${
              isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700/60 text-slate-400'
            }`}
          >
            {isActive ? t('statusActive') : t('statusInactive')}
          </span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">{t('merchant')}</dt>
          <dd className="font-mono">{merchant ? shortAddress(merchant) : '…'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{t('tiers')}</dt>
          <dd>{tierCount?.toString() ?? '…'}</dd>
        </div>
      </dl>
    </article>
  )
}

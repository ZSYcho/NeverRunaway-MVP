import { storeDepositContractAbi, storeDepositFactoryAbi } from '@neverrunaway/shared'
import { Link } from 'react-router'
import type { Address } from 'viem'
import { useReadContract, useReadContracts } from 'wagmi'
import { deployment, targetChain } from '../../chain.ts'
import { Notice } from '../../components/Notice.tsx'
import { useUsdcDecimals } from '../../hooks/useUsdcDecimals.ts'
import { useI18n } from '../../i18n/useI18n.ts'
import { formatAmount } from '../../lib/amount.ts'
import { shortAddress } from '../../lib/format.ts'
import { StoreStatusBadge } from '../stores/StoreStatusBadge.tsx'

/** The stores this wallet opened, newest first, as the factory indexes them by merchant. */
export function MyStores({ merchant }: { merchant: Address }) {
  const { t } = useI18n()
  const stores = useReadContract({
    chainId: targetChain.id,
    address: deployment?.factory,
    abi: storeDepositFactoryAbi,
    functionName: 'getMerchantContracts',
    args: [merchant],
    query: { enabled: deployment !== undefined },
  })

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{t('myStores')}</h2>
      {stores.isPending ? (
        <Notice>{t('loadingStores')}</Notice>
      ) : stores.isError ? (
        <Notice tone="error">{t('readFailed')}</Notice>
      ) : stores.data.length === 0 ? (
        <p className="text-sm text-slate-400">{t('noMyStores')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...stores.data].reverse().map((address) => (
            <MerchantStoreCard key={address} address={address} />
          ))}
        </div>
      )}
    </section>
  )
}

function MerchantStoreCard({ address }: { address: Address }) {
  const { t } = useI18n()
  const decimals = useUsdcDecimals()
  const store = { chainId: targetChain.id, address, abi: storeDepositContractAbi } as const
  const { data } = useReadContracts({
    allowFailure: false,
    contracts: [
      { ...store, functionName: 'isActive' },
      { ...store, functionName: 'closed' },
      { ...store, functionName: 'merchantWithdrawable' },
      { ...store, functionName: 'bonusPool' },
      { ...store, functionName: 'totalLocked' },
    ],
  })
  const [isActive, closed, earnings, bonusPool, totalLocked] = data ?? []
  const amount = (value: bigint | undefined) =>
    value === undefined || decimals === undefined ? '…' : formatAmount(value, decimals)

  const figures: Array<[string, bigint | undefined]> = [
    [t('storeEarnings'), earnings],
    [t('bonusPoolTitle'), bonusPool],
    [t('fundsOwedToCustomers'), totalLocked],
  ]

  return (
    <Link
      to={`/merchant/stores/${address}`}
      className="glass-card flex flex-col gap-4 p-6 transition hover:-translate-y-0.5 hover:border-indigo-400/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-wider text-slate-500 uppercase">{t('storeContract')}</p>
          <h3 className="font-mono text-lg font-semibold">{shortAddress(address)}</h3>
        </div>
        {isActive !== undefined && <StoreStatusBadge isActive={isActive} closed={closed} />}
      </div>
      <dl className="grid grid-cols-3 gap-3 text-sm">
        {figures.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="font-mono">{amount(value)}</dd>
          </div>
        ))}
      </dl>
    </Link>
  )
}

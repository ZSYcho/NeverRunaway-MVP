import { useConnection, useSwitchChain } from 'wagmi'
import { targetChain } from '../../chain.ts'
import { useI18n } from '../../i18n/useI18n.ts'
import { walletErrorKey } from '../../wallet/errors.ts'
import { CopyButton } from '../CopyButton.tsx'

/**
 * Shown while the wallet is on another chain. wagmi asks the wallet to switch (EIP-3326) and, when
 * the wallet doesn't know the chain, to add it (EIP-3085). Wallets that can't do either get the
 * details to add the network by hand.
 */
export function WrongNetworkBanner() {
  const { t } = useI18n()
  const { status, chainId } = useConnection()
  const switchChain = useSwitchChain()

  // While a session is being restored wagmi can report a connection without a chain yet.
  if (status !== 'connected' || typeof chainId !== 'number' || chainId === targetChain.id) {
    return null
  }

  const errorKey = switchChain.error ? walletErrorKey(switchChain.error) : undefined
  const showManualSetup =
    errorKey !== undefined && errorKey !== 'walletRejected' && errorKey !== 'walletRequestPending'

  return (
    <div role="alert" className="border-b border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm">
      <div className="mx-auto max-w-6xl space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-amber-100">
            {t('wrongNetwork', {
              current: `${t('otherNetwork')} (#${chainId})`,
              target: targetChain.name,
            })}
          </p>
          <button
            type="button"
            onClick={() => switchChain.mutate({ chainId: targetChain.id })}
            disabled={switchChain.isPending}
            className="rounded-lg bg-amber-400 px-3 py-1.5 font-semibold text-slate-900 transition hover:bg-amber-300 disabled:opacity-60"
          >
            {switchChain.isPending
              ? t('confirmInWallet')
              : t('switchNetwork', { target: targetChain.name })}
          </button>
        </div>
        {errorKey && <p className="text-amber-200">{t(errorKey)}</p>}
        {showManualSetup && <NetworkDetails />}
      </div>
    </div>
  )
}

function NetworkDetails() {
  const { t } = useI18n()
  const rows: Array<[string, string | undefined]> = [
    [t('networkName'), targetChain.name],
    [t('rpcUrl'), targetChain.rpcUrls.default.http[0]],
    [t('chainIdLabel'), String(targetChain.id)],
    [t('currencySymbol'), targetChain.nativeCurrency.symbol],
    [t('blockExplorer'), targetChain.blockExplorers?.default.url],
  ]

  return (
    <div className="space-y-2 rounded-xl border border-amber-400/20 bg-slate-950/40 p-3">
      <p className="text-amber-100">{t('addNetworkManually')}</p>
      <dl className="space-y-1.5">
        {rows.map(
          ([label, value]) =>
            value && (
              <div key={label} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <dt className="w-28 text-slate-400">{label}</dt>
                <dd className="min-w-0 flex-1 font-mono break-all text-slate-200">{value}</dd>
                <CopyButton value={value} label={t('copy')} />
              </div>
            ),
        )}
      </dl>
    </div>
  )
}

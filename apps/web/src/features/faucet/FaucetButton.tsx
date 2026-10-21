import type { Address } from 'viem'
import { useBalance, useConfig } from 'wagmi'
import { deployment, gasFaucetUrl, isLocalChain, targetChain } from '../../chain.ts'
import { useTxFlow } from '../../hooks/useTxFlow.ts'
import { useUsdcDecimals } from '../../hooks/useUsdcDecimals.ts'
import { useI18n } from '../../i18n/useI18n.ts'
import { txErrorKey } from '../../lib/txErrors.ts'
import { fundOnAnvil, mintTestUsdc } from '../../tx/faucet.ts'

const buttonClass =
  'rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-800 disabled:opacity-60'

/** Test funds for whoever is connected: anvil's dev RPC locally, an open-mint token on testnets. */
export function FaucetButton({ account }: { account: Address }) {
  const { t } = useI18n()
  const config = useConfig()
  const decimals = useUsdcDecimals()
  const flow = useTxFlow<'mint'>()
  const gas = useBalance({
    chainId: targetChain.id,
    address: account,
    query: { enabled: !isLocalChain },
  })

  if (!deployment?.usdcFaucet || decimals === undefined) return null
  const usdc = deployment.usdc
  const amount = 1_000n * 10n ** BigInt(decimals)
  const busy = flow.status === 'running'
  const feedback = (
    <>
      {flow.status === 'success' && (
        <span className="text-xs text-emerald-300">{t('faucetDone')}</span>
      )}
      {flow.error !== undefined && (
        <span role="alert" className="text-xs text-rose-300">
          {t(txErrorKey(flow.error))}
        </span>
      )}
    </>
  )

  if (isLocalChain) {
    return (
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              flow.run(() => fundOnAnvil({ chain: targetChain, account, usdc, usdcAmount: amount }))
            }
            className={buttonClass}
          >
            {t('faucetLocal')}
          </button>
          {feedback}
        </div>
        <p className="text-xs text-slate-500">{t('faucetLocalHint')}</p>
      </div>
    )
  }

  if (gas.data?.value === 0n) {
    return (
      <p className="text-xs text-slate-400">
        {t('faucetNeedsGas', { symbol: targetChain.nativeCurrency.symbol })}{' '}
        {gasFaucetUrl && (
          <a href={gasFaucetUrl} target="_blank" rel="noreferrer" className="text-indigo-300">
            {t('xLayerFaucet')}
          </a>
        )}
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          flow.run((onProgress) =>
            mintTestUsdc(config, { chainId: targetChain.id, account, usdc, amount }, onProgress),
          )
        }
        className={buttonClass}
      >
        {busy ? t('phaseConfirm') : t('faucetTestnet')}
      </button>
      {feedback}
    </div>
  )
}

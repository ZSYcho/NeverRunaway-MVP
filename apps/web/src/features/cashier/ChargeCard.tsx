import { encodePayCode, type PayCode } from '@neverrunaway/shared'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { isAddressEqual } from 'viem'
import { useConfig, useConnection } from 'wagmi'
import { explorerUrl, targetChain } from '../../chain.ts'
import { primaryButton } from '../../components/buttons.ts'
import { FlowFeedback } from '../../components/FlowFeedback.tsx'
import { Notice } from '../../components/Notice.tsx'
import { useSecondsLeft } from '../../hooks/useSecondsLeft.ts'
import { useTxFlow } from '../../hooks/useTxFlow.ts'
import { useUsdcDecimals } from '../../hooks/useUsdcDecimals.ts'
import { useI18n } from '../../i18n/useI18n.ts'
import type { MessageKey } from '../../i18n/messages.ts'
import { formatAmount } from '../../lib/amount.ts'
import { shortAddress } from '../../lib/format.ts'
import { formatCountdown } from '../../lib/time.ts'
import { type Charge, chargePayCode, checkPayCode } from '../../tx/payCode.ts'
import { CASHIER_PATH, type PayCodeStatus } from '../pay/codes.ts'
import { useStore } from '../stores/useStore.ts'

/** How often an open code is checked again, in case it expires or is charged elsewhere. */
const RECHECK_INTERVAL = 4_000

const statusLines: Record<PayCodeStatus, { key: MessageKey; tone: string }> = {
  ready: { key: 'codeReady', tone: 'text-emerald-300' },
  charged: { key: 'codeCharged', tone: 'text-amber-200' },
  expired: { key: 'codeExpired', tone: 'text-amber-200' },
  storeInactive: { key: 'codeStoreInactive', tone: 'text-rose-300' },
  insufficientCredit: { key: 'codeInsufficientCredit', tone: 'text-rose-300' },
  invalid: { key: 'codeInvalid', tone: 'text-rose-300' },
}

/** A scanned pay code: what it charges, whether the merchant can charge it now, and the charge. */
export function ChargeCard({ code }: { code: PayCode }) {
  const { t } = useI18n()
  // The app runs on one chain, and the code's signature is only valid on the chain it names.
  if (code.chainId !== targetChain.id) {
    return (
      <Notice tone="error">
        {t('codeOtherChain', { chainId: String(code.chainId), target: targetChain.name })}
      </Notice>
    )
  }
  return <ChargeOnChain code={code} />
}

function ChargeOnChain({ code }: { code: PayCode }) {
  const { t } = useI18n()
  const config = useConfig()
  const navigate = useNavigate()
  const decimals = useUsdcDecimals()
  const { address: account, chainId } = useConnection()
  // Anyone can make a link that names a look-alike contract: only factory stores get charged.
  const { isFactoryStore, isError, state } = useStore(code.store)
  const flow = useTxFlow<'charge'>()
  const [charge, setCharge] = useState<Charge>()

  const merchant = state?.merchant
  const check = useQuery({
    queryKey: ['payCodeCheck', encodePayCode(code)],
    queryFn: () => checkPayCode(config, code, merchant!),
    // Paused during the merchant's own charge, which would otherwise read as "already charged"
    // between the transaction being mined and its receipt arriving.
    enabled: merchant !== undefined && flow.status !== 'running' && flow.status !== 'success',
    refetchInterval: RECHECK_INTERVAL,
  })
  const secondsLeft = useSecondsLeft(code.deadline, check.data?.clockOffset)

  if (isError) return <Notice tone="error">{t('readFailed')}</Notice>
  if (isFactoryStore === false) return <Notice tone="error">{t('notOurStore')}</Notice>
  if (!state || decimals === undefined) return <Notice>{t('loadingStore')}</Notice>

  const format = (value: bigint) => formatAmount(value, decimals)
  // The countdown can run out between two checks.
  const status = check.data?.status === 'ready' && secondsLeft < 0 ? 'expired' : check.data?.status
  const isMerchant = account !== undefined && isAddressEqual(account, state.merchant)
  const charged = flow.status === 'success' && charge !== undefined

  const start = () => {
    if (!account) return
    void flow.run(async (onProgress) =>
      setCharge(await chargePayCode(config, { account, code }, onProgress)),
    )
  }

  return (
    <section className="glass-card space-y-5 p-6">
      <div>
        <p className="text-sm text-slate-400">{t('chargeHeading')}</p>
        <p className="font-mono text-4xl font-bold">
          {format(code.amount)} <span className="text-base font-normal text-slate-400">USDC</span>
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">{t('chargeCustomer')}</dt>
          <dd className="font-mono">{shortAddress(code.user)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{t('chargeStore')}</dt>
          <dd className="font-mono">
            {isMerchant ? (
              <Link to={`/merchant/stores/${code.store}`} className="text-indigo-300">
                {shortAddress(code.store)}
              </Link>
            ) : (
              shortAddress(code.store)
            )}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">{t('chargeTimeLeft')}</dt>
          <dd
            className={`font-mono tabular-nums ${secondsLeft < 30 && !charged ? 'text-amber-300' : ''}`}
          >
            {charged || status === 'charged' ? '—' : formatCountdown(secondsLeft)}
          </dd>
        </div>
      </dl>

      {charged ? (
        <ChargeDone charge={charge} format={format} onNext={() => void navigate(CASHIER_PATH)} />
      ) : (
        <div className="space-y-4">
          {check.isError ? (
            <p role="alert" className="text-sm text-rose-300">
              {t('readFailed')}
            </p>
          ) : status === undefined ? (
            <p className="text-sm text-slate-400">{t('codeChecking')}</p>
          ) : (
            <p role="status" className={`text-sm ${statusLines[status].tone}`}>
              {t(statusLines[status].key)}
              {status === 'insufficientCredit' &&
                check.data &&
                ` ${t('codeCreditLeft', { credit: format(check.data.credit) })}`}
            </p>
          )}

          {!account ? (
            <p className="text-sm text-slate-400">{t('connectToCharge')}</p>
          ) : (
            !isMerchant && (
              <p role="alert" className="text-sm text-rose-300">
                {t('codeNotYourStore', { merchant: shortAddress(state.merchant) })}
              </p>
            )
          )}

          {status === 'ready' && isMerchant && (
            <button
              type="button"
              onClick={start}
              disabled={chainId !== targetChain.id || flow.status === 'running'}
              className={`w-full ${primaryButton}`}
            >
              {t('chargeAction', { amount: format(code.amount) })}
            </button>
          )}
          <FlowFeedback
            flow={flow}
            steps={[{ key: 'charge', label: t('stepCharge') }]}
            done={t('chargeDone', { amount: format(code.amount) })}
          />
        </div>
      )}
    </section>
  )
}

function ChargeDone({
  charge,
  format,
  onNext,
}: {
  charge: Charge
  format: (value: bigint) => string
  onNext: () => void
}) {
  const { t } = useI18n()
  const transaction = explorerUrl('tx', charge.hash)

  return (
    <div className="space-y-4">
      <div
        role="status"
        className="space-y-1 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4"
      >
        <p className="text-lg font-semibold text-emerald-200">
          {t('chargeDone', { amount: format(charge.amount) })}
        </p>
        <p className="text-sm text-emerald-100/80">
          {t('chargeSplit', {
            principal: format(charge.principalPart),
            bonus: format(charge.bonusPart),
          })}
        </p>
        {transaction && (
          <a
            href={transaction}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm text-indigo-300 hover:text-indigo-200"
          >
            {t('viewTransaction')}
          </a>
        )}
      </div>
      <button type="button" onClick={onNext} className={`w-full ${primaryButton}`}>
        {t('nextCustomer')}
      </button>
    </div>
  )
}

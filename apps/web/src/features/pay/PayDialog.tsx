import { QRCodeSVG } from 'qrcode.react'
import { type FormEvent, useState } from 'react'
import type { Address } from 'viem'
import { useConfig } from 'wagmi'
import { explorerUrl, targetChain } from '../../chain.ts'
import { primaryButton, secondaryButton } from '../../components/buttons.ts'
import { CopyButton } from '../../components/CopyButton.tsx'
import { Dialog } from '../../components/Dialog.tsx'
import { TextField } from '../../components/TextField.tsx'
import { TxSteps } from '../../components/TxSteps.tsx'
import { useSecondsLeft } from '../../hooks/useSecondsLeft.ts'
import { useTxFlow } from '../../hooks/useTxFlow.ts'
import { useWakeLock } from '../../hooks/useWakeLock.ts'
import { useI18n } from '../../i18n/useI18n.ts'
import { formatAmount, parseAmount } from '../../lib/amount.ts'
import { shortAddress } from '../../lib/format.ts'
import { isServedLocally } from '../../lib/origin.ts'
import { formatCountdown, formatTime } from '../../lib/time.ts'
import { txErrorKey } from '../../lib/txErrors.ts'
import { type SignedPayCode, signPayCode } from '../../tx/payCode.ts'
import type { UserState } from '../stores/useStore.ts'
import { cashierLink, PAY_CODE_TTL } from './codes.ts'
import { usePayCodeStatus } from './usePayCodeStatus.ts'

/**
 * Pay at the counter: the customer signs a code for an amount and shows it to the cashier as a QR.
 * Loaded on demand, with the QR renderer, which most visits to a store page never need.
 */
export function PayDialog({
  store,
  user,
  decimals,
  onClose,
}: {
  store: Address
  user: UserState
  decimals: number
  onClose: () => void
}) {
  const { t } = useI18n()
  // Kept across codes, so a new code starts from the last amount.
  const [input, setInput] = useState('')
  const [signed, setSigned] = useState<SignedPayCode>()

  return (
    <Dialog open onClose={onClose} title={t('payTitle')}>
      {signed ? (
        <PayCodeView
          key={signed.code.signature}
          signed={signed}
          decimals={decimals}
          onBack={() => setSigned(undefined)}
          onClose={onClose}
        />
      ) : (
        <PayAmountForm
          store={store}
          user={user}
          decimals={decimals}
          input={input}
          onInput={setInput}
          onSigned={setSigned}
        />
      )}
    </Dialog>
  )
}

function PayAmountForm({
  store,
  user,
  decimals,
  input,
  onInput,
  onSigned,
}: {
  store: Address
  user: UserState
  decimals: number
  input: string
  onInput: (input: string) => void
  onSigned: (signed: SignedPayCode) => void
}) {
  const { t } = useI18n()
  const config = useConfig()
  const flow = useTxFlow<'sign'>()
  const [submitted, setSubmitted] = useState(false)

  const format = (value: bigint) => formatAmount(value, decimals)
  const credit = user.principal + user.bonus
  const amount = parseAmount(input, decimals)
  const errorKey = !amount ? 'formAmountInvalid' : amount > credit ? 'payExceedsCredit' : undefined

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (errorKey || !amount) return
    void flow.run(async (onProgress) =>
      onSigned(
        await signPayCode(
          config,
          { chainId: targetChain.id, account: user.account, store, amount },
          onProgress,
        ),
      ),
    )
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <TextField
        label={t('payAmountLabel')}
        value={input}
        onChange={onInput}
        inputMode="decimal"
        autoFocus
        error={submitted && errorKey ? t(errorKey, { credit: format(credit) }) : undefined}
        hint={t('payAvailable', { credit: format(credit) })}
      />
      <p className="text-sm leading-relaxed text-slate-300">
        {t('paySignHint', { minutes: String(PAY_CODE_TTL / 60n) })}
      </p>
      {/* EIP-712 has no notion of decimals, so wallets show the raw uint256. */}
      {amount && !errorKey && (
        <p className="text-xs leading-relaxed text-slate-500">
          {t('payWalletUnits', { raw: amount.toString(), amount: format(amount) })}
        </p>
      )}
      {flow.status !== 'idle' && (
        <TxSteps steps={[{ key: 'sign', label: t('stepSignPayment'), state: flow.steps.sign }]} />
      )}
      {flow.error !== undefined && (
        <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {t(txErrorKey(flow.error))}
        </p>
      )}
      <button
        type="submit"
        disabled={flow.status === 'running'}
        className={`w-full ${primaryButton}`}
      >
        {t('createPayCode')}
      </button>
    </form>
  )
}

/** The code until it is charged or runs out, then how it ended. */
function PayCodeView({
  signed,
  decimals,
  onBack,
  onClose,
}: {
  signed: SignedPayCode
  decimals: number
  onBack: () => void
  onClose: () => void
}) {
  const { t, lang } = useI18n()
  const { code, clockOffset } = signed
  const secondsLeft = useSecondsLeft(code.deadline, clockOffset)
  const { charged, charge } = usePayCodeStatus(signed)
  const expired = !charged && secondsLeft < 0
  useWakeLock(!charged && !expired)
  const format = (value: bigint) => formatAmount(value, decimals)

  if (charged) {
    const transaction = charge && explorerUrl('tx', charge.hash)
    return (
      <div className="space-y-4 text-center">
        <span
          aria-hidden
          className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500 text-2xl font-bold text-slate-950"
        >
          ✓
        </span>
        <div role="status" className="space-y-1">
          {/* The charge's own amount: it may come from another code signed with the same nonce. */}
          <p className="text-2xl font-semibold">
            {charge ? t('payCodePaid', { amount: format(charge.amount) }) : t('payCodeCharged')}
          </p>
          {charge && (
            <p className="text-sm text-slate-400">
              {t('chargeSplit', {
                principal: format(charge.principalPart),
                bonus: format(charge.bonusPart),
              })}
            </p>
          )}
        </div>
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
        <button type="button" onClick={onClose} className={`w-full ${primaryButton}`}>
          {t('done')}
        </button>
      </div>
    )
  }

  if (expired) {
    return (
      <div className="space-y-4">
        <p role="status" className="text-slate-300">
          {t('payCodeExpired')}
        </p>
        <button type="button" onClick={onBack} className={`w-full ${primaryButton}`}>
          {t('newPayCode')}
        </button>
      </div>
    )
  }

  const link = cashierLink(code, window.location.origin)
  return (
    <div className="space-y-4">
      <figure className="space-y-2 rounded-2xl bg-white p-5 text-center text-slate-900">
        <p className="text-sm font-medium text-slate-500">{t('payCodeHeading')}</p>
        <p className="font-display text-3xl font-bold">{format(code.amount)} USDC</p>
        <QRCodeSVG
          value={link}
          size={288}
          level="M"
          marginSize={2}
          title={link}
          className="mx-auto h-auto w-full max-w-72"
        />
        <figcaption className="font-mono text-xs text-slate-500">
          {targetChain.name} · {shortAddress(code.store)}
        </figcaption>
      </figure>

      <div className="flex items-center justify-between gap-3 text-sm">
        <p role="status" className="text-slate-300">
          {t('payCodeWaiting')}
        </p>
        <p
          className={`shrink-0 font-mono tabular-nums ${secondsLeft < 60 ? 'text-amber-300' : 'text-slate-400'}`}
        >
          {t('payCodeExpiresIn', { time: formatCountdown(secondsLeft) })}
        </p>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        {t('payCodeOnce', { time: formatTime(code.deadline, lang) })}
      </p>
      {isServedLocally() && (
        <p className="rounded-xl bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
          {t('localLinkNote')}
        </p>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-400">{link}</span>
        <CopyButton value={link} label={t('copyLink')} />
      </div>
      <button type="button" onClick={onBack} className={`w-full ${secondaryButton}`}>
        {t('changeAmount')}
      </button>
    </div>
  )
}

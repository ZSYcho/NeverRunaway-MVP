import { type FormEvent, useState } from 'react'
import type { Address } from 'viem'
import { useConfig } from 'wagmi'
import { targetChain } from '../../chain.ts'
import { primaryButton } from '../../components/buttons.ts'
import { FlowFeedback } from '../../components/FlowFeedback.tsx'
import { TextField } from '../../components/TextField.tsx'
import { useTxFlow } from '../../hooks/useTxFlow.ts'
import { useI18n } from '../../i18n/useI18n.ts'
import { formatAmount } from '../../lib/amount.ts'
import { nowInSeconds, toDateInputValue } from '../../lib/time.ts'
import { addTier } from '../../tx/merchant.ts'
import { parseTierInput, type TierInput } from './forms.ts'

const emptyTier: TierInput = {
  deposit: '',
  credit: '',
  validUntil: '',
  requiredLevel: '',
  grantsLevel: '',
}

/** A new tier, with a promotion deadline and member levels the opening tiers can't have. */
export function AddTierForm({
  store,
  account,
  bonusPool,
  decimals,
  canWrite,
}: {
  store: Address
  account: Address
  bonusPool: bigint
  decimals: number
  canWrite: boolean
}) {
  const { t } = useI18n()
  const config = useConfig()
  const flow = useTxFlow<'addTier'>()
  const [input, setInput] = useState(emptyTier)
  const [submitted, setSubmitted] = useState(false)
  // The earliest end date the picker offers; read once, as rendering must not depend on the clock.
  const [today] = useState(() => toDateInputValue(new Date()))

  const parsed = parseTierInput(input, { decimals, now: nowInSeconds() })
  const errors = submitted && !parsed.ok ? parsed.errors : {}
  const message = (field: keyof TierInput) => {
    const key = errors[field]
    return key && t(key)
  }
  const field = (name: keyof TierInput) => ({
    value: input[name],
    onChange: (value: string) => setInput((current) => ({ ...current, [name]: value })),
    error: message(name),
  })

  const preview = parsed.ok ? parsed.value : undefined
  const bonus = preview && preview.creditAmount - preview.depositAmount

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (!parsed.ok) return
    flow.reset()
    void flow.run(async (onProgress) => {
      await addTier(
        config,
        { chainId: targetChain.id, account, store, tier: parsed.value },
        onProgress,
      )
      setInput(emptyTier)
      setSubmitted(false)
    })
  }

  return (
    <form onSubmit={submit} noValidate className="glass-card space-y-4 p-5">
      <h3 className="text-lg font-semibold">{t('addTierTitle')}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label={t('tierDepositLabel')}
          inputMode="decimal"
          placeholder="100"
          {...field('deposit')}
        />
        <TextField
          label={t('tierCreditLabel')}
          inputMode="decimal"
          placeholder="200"
          {...field('credit')}
        />
        <TextField label={t('validUntilInput')} type="date" min={today} {...field('validUntil')} />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label={t('requiredLevelInput')}
            inputMode="numeric"
            placeholder="0"
            {...field('requiredLevel')}
          />
          <TextField
            label={t('grantsLevelInput')}
            inputMode="numeric"
            placeholder="0"
            {...field('grantsLevel')}
          />
        </div>
      </div>

      {preview && bonus !== undefined && (
        <p className="text-sm text-slate-300">
          {t('tierDeposit', {
            deposit: formatAmount(preview.depositAmount, decimals),
            credit: formatAmount(preview.creditAmount, decimals),
          })}
          {' · '}
          {bonus > 0n
            ? t('tierPreviewCapacity', { count: formatAmount(bonusPool / bonus, 0) })
            : t('tierPreviewNoBonus')}
        </p>
      )}

      <FlowFeedback
        flow={flow}
        steps={[{ key: 'addTier', label: t('stepAddTier') }]}
        done={t('tierAddedDone')}
      />
      <button
        type="submit"
        disabled={!canWrite || flow.status === 'running'}
        className={`w-full ${primaryButton}`}
      >
        {t('addTierAction')}
      </button>
    </form>
  )
}

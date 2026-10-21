import { type FormEvent, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { Address } from 'viem'
import { useConfig } from 'wagmi'
import { deployment, targetChain } from '../../chain.ts'
import { primaryButton } from '../../components/buttons.ts'
import { FlowFeedback } from '../../components/FlowFeedback.tsx'
import { TextField } from '../../components/TextField.tsx'
import { useTxFlow } from '../../hooks/useTxFlow.ts'
import { useUsdcDecimals } from '../../hooks/useUsdcDecimals.ts'
import { useI18n } from '../../i18n/useI18n.ts'
import { formatAmount, parseAmount } from '../../lib/amount.ts'
import { createStore } from '../../tx/merchant.ts'
import { parseStoreInput } from './forms.ts'

type TierRow = { key: number; deposit: string; credit: string }

/** Opens a store with its first tiers, then continues on the new store's management page. */
export function CreateStoreForm({ account, canWrite }: { account: Address; canWrite: boolean }) {
  const { t } = useI18n()
  const config = useConfig()
  const navigate = useNavigate()
  const decimals = useUsdcDecimals()
  const flow = useTxFlow<'create'>()
  const nextKey = useRef(1)
  const [expireDays, setExpireDays] = useState('365')
  const [rows, setRows] = useState<TierRow[]>([{ key: 0, deposit: '', credit: '' }])
  // Errors show once the merchant first tries to submit, then update as they type.
  const [submitted, setSubmitted] = useState(false)

  if (!deployment || decimals === undefined) return null
  const factory = deployment.factory
  const parsed = parseStoreInput({ expireDays, tiers: rows }, { decimals })
  const errors = submitted && !parsed.ok ? parsed.errors : undefined

  const updateRow = (key: number, change: Partial<TierRow>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)))
  const addRow = () => {
    const key = nextKey.current++
    setRows((current) => [...current, { key, deposit: '', credit: '' }])
  }
  const removeRow = (key: number) => setRows((current) => current.filter((row) => row.key !== key))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (!parsed.ok) return
    flow.reset()
    void flow.run(async (onProgress) => {
      const store = await createStore(
        config,
        { chainId: targetChain.id, account, factory, ...parsed.value },
        onProgress,
      )
      void navigate(`/merchant/stores/${store}`, { state: { created: true } })
    })
  }

  return (
    <form onSubmit={submit} noValidate className="glass-card space-y-5 p-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{t('createStoreTitle')}</h2>
        <p className="text-sm text-slate-400">{t('createStoreHint')}</p>
      </div>

      <TextField
        label={t('expireDaysLabel')}
        value={expireDays}
        onChange={setExpireDays}
        inputMode="numeric"
        hint={t('expireDaysHint')}
        error={errors?.expireDays && t(errors.expireDays)}
        className="max-w-xs"
      />

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-medium">{t('tiers')}</legend>
        {rows.map((row, index) => {
          const rowErrors = errors?.rows[index]
          const n = String(index + 1)
          const deposit = parseAmount(row.deposit, decimals)
          const credit = parseAmount(row.credit, decimals)
          const bonus = deposit && credit && credit > deposit ? credit - deposit : undefined
          return (
            <div key={row.key} className="space-y-3 rounded-2xl border border-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-300">{t('tierRowLabel', { n })}</span>
                <div className="flex items-center gap-3">
                  {bonus !== undefined && (
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-300">
                      {t('tierBonus', { bonus: formatAmount(bonus, decimals) })}
                    </span>
                  )}
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      aria-label={t('removeTierRow', { n })}
                      className="rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-rose-300"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label={t('tierDepositLabel')}
                  value={row.deposit}
                  onChange={(value) => updateRow(row.key, { deposit: value })}
                  inputMode="decimal"
                  placeholder="100"
                  error={rowErrors?.deposit && t(rowErrors.deposit)}
                />
                <TextField
                  label={t('tierCreditLabel')}
                  value={row.credit}
                  onChange={(value) => updateRow(row.key, { credit: value })}
                  inputMode="decimal"
                  placeholder="110"
                  error={rowErrors?.credit && t(rowErrors.credit)}
                />
              </div>
            </div>
          )
        })}
        {errors?.tiers && <p className="text-xs text-rose-300">{t(errors.tiers)}</p>}
        <button
          type="button"
          onClick={addRow}
          className="text-sm text-indigo-300 transition hover:text-indigo-200"
        >
          + {t('addTierRow')}
        </button>
      </fieldset>

      <FlowFeedback
        flow={flow}
        steps={[{ key: 'create', label: t('stepCreateStore') }]}
        done={t('storeCreatedNotice')}
      />
      <button
        type="submit"
        disabled={!canWrite || flow.status === 'running'}
        className={`w-full ${primaryButton}`}
      >
        {t('createStoreAction')}
      </button>
    </form>
  )
}

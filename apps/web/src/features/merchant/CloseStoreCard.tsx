import { useState } from 'react'
import type { Address } from 'viem'
import { useConfig } from 'wagmi'
import { targetChain } from '../../chain.ts'
import { dangerButton } from '../../components/buttons.ts'
import { Dialog } from '../../components/Dialog.tsx'
import { FlowFeedback } from '../../components/FlowFeedback.tsx'
import { TextField } from '../../components/TextField.tsx'
import { useTxFlow } from '../../hooks/useTxFlow.ts'
import { useI18n } from '../../i18n/useI18n.ts'
import { closeStore } from '../../tx/merchant.ts'

/** Closing is permanent, so it takes a typed confirmation on top of the wallet's own prompt. */
export function CloseStoreCard({
  store,
  account,
  isActive,
  canWrite,
}: {
  store: Address
  account: Address
  isActive: boolean
  canWrite: boolean
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <>
      {isActive ? (
        <section className="space-y-3 rounded-3xl border border-rose-500/30 bg-rose-500/5 p-5">
          <h2 className="text-lg font-semibold text-rose-200">{t('closeStoreTitle')}</h2>
          <p className="text-sm leading-relaxed text-slate-400">{t('closeStoreHint')}</p>
          <button
            type="button"
            disabled={!canWrite}
            onClick={() => setOpen(true)}
            className="rounded-xl border border-rose-400/40 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/10 disabled:opacity-50"
          >
            {t('closeStoreAction')}
          </button>
        </section>
      ) : (
        <p className="glass-card p-5 text-sm leading-relaxed text-slate-400">
          {t('storeEndedNote')}
        </p>
      )}
      {/* Outside the branch above: the dialog stays up after the store reads back as closed. */}
      {open && <CloseStoreDialog store={store} account={account} onClose={() => setOpen(false)} />}
    </>
  )
}

function CloseStoreDialog({
  store,
  account,
  onClose,
}: {
  store: Address
  account: Address
  onClose: () => void
}) {
  const { t } = useI18n()
  const config = useConfig()
  const flow = useTxFlow<'close'>()
  const [typed, setTyped] = useState('')
  const phrase = t('closeConfirmPhrase')
  const confirmed = typed.trim().toLowerCase() === phrase.toLowerCase()

  const start = () =>
    void flow.run((onProgress) =>
      closeStore(config, { chainId: targetChain.id, account, store }, onProgress),
    )

  return (
    <Dialog open onClose={onClose} title={t('closeStoreDialogTitle')}>
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-300">
        <li>{t('closeNoMore')}</li>
        <li>{t('closeRefunds')}</li>
        <li>{t('closeKeeps')}</li>
        <li className="text-rose-300">{t('closeForever')}</li>
      </ul>
      {flow.status !== 'success' && (
        <TextField
          label={t('closeConfirmLabel', { phrase })}
          value={typed}
          onChange={setTyped}
          placeholder={phrase}
        />
      )}
      <FlowFeedback
        flow={flow}
        steps={[{ key: 'close', label: t('stepCloseStore') }]}
        done={t('storeClosedDone')}
      />
      {flow.status === 'success' ? (
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-slate-800 px-4 py-2.5 font-medium"
        >
          {t('done')}
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={!confirmed || flow.status === 'running'}
          className={`w-full ${dangerButton}`}
        >
          {flow.status === 'error' ? t('retry') : t('stepCloseStore')}
        </button>
      )}
    </Dialog>
  )
}

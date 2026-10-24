import { decodePayCode, encodePayCode } from '@neverrunaway/shared'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router'
import { secondaryButton } from '../../components/buttons.ts'
import { TextField } from '../../components/TextField.tsx'
import { useI18n } from '../../i18n/useI18n.ts'
import { CASHIER_PATH } from '../pay/codes.ts'

/**
 * Opens a pay code from its link, for what a wallet's scanner doesn't cover: a link copied from a
 * chat, or one typed in by a USB barcode scanner, which ends it with Enter.
 */
export function PayLinkForm({ autoFocus }: { autoFocus: boolean }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)

  const open = (event: FormEvent) => {
    event.preventDefault()
    const code = decodePayCode(value)
    if (!code) {
      setInvalid(true)
      return
    }
    setValue('')
    // Whatever host the link named, the code opens on this cashier.
    void navigate({ pathname: CASHIER_PATH, hash: encodePayCode(code) })
  }

  return (
    <form onSubmit={open} noValidate className="glass-card space-y-3 p-5">
      <TextField
        label={t('payLinkLabel')}
        value={value}
        onChange={(next) => {
          setValue(next)
          setInvalid(false)
        }}
        error={invalid ? t('payLinkInvalid') : undefined}
        hint={t('payLinkHint')}
        autoFocus={autoFocus}
        spellCheck={false}
        autoCapitalize="off"
      />
      <button type="submit" disabled={value.trim() === ''} className={secondaryButton}>
        {t('openPayLink')}
      </button>
    </form>
  )
}

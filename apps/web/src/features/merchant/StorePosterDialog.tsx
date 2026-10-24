import { QRCodeSVG } from 'qrcode.react'
import { useRef, useState } from 'react'
import type { Address } from 'viem'
import { targetChain } from '../../chain.ts'
import { primaryButton } from '../../components/buttons.ts'
import { CopyButton } from '../../components/CopyButton.tsx'
import { Dialog } from '../../components/Dialog.tsx'
import { useI18n } from '../../i18n/useI18n.ts'
import { shortAddress } from '../../lib/format.ts'
import { isServedLocally } from '../../lib/origin.ts'
import { renderPoster } from './poster.ts'

/**
 * A QR code of the store's public page for the counter. It is a plain https link: a wallet app's
 * scanner opens it in the wallet's browser, and a phone camera opens it in a browser that can hand
 * over to a wallet app.
 */
export function StorePosterDialog({ store, onClose }: { store: Address; onClose: () => void }) {
  const { t } = useI18n()
  const qrRef = useRef<SVGSVGElement>(null)
  const [failed, setFailed] = useState(false)
  const link = new URL(`/stores/${store}`, window.location.origin).href
  const footer = `${targetChain.name} · ${shortAddress(store)}`
  const text = { heading: t('posterHeading'), hint: t('posterHint'), footer }

  const download = async () => {
    if (!qrRef.current) return
    setFailed(false)
    let poster: Blob
    try {
      poster = await renderPoster(qrRef.current, text)
    } catch {
      // Older browsers refuse to export a canvas that an SVG image was drawn on.
      setFailed(true)
      return
    }
    const url = URL.createObjectURL(poster)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `neverrunaway-store-${store.slice(2, 8).toLowerCase()}.png`
    anchor.click()
    // Revoking right away can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  return (
    <Dialog open onClose={onClose} title={t('posterTitle')}>
      <figure className="space-y-3 rounded-2xl bg-white p-5 text-center text-slate-900">
        <p className="font-display text-2xl font-bold">{text.heading}</p>
        <QRCodeSVG
          ref={qrRef}
          value={link}
          size={220}
          level="M"
          marginSize={2}
          title={link}
          className="mx-auto"
        />
        <figcaption className="space-y-1">
          <p className="text-sm text-slate-700">{text.hint}</p>
          <p className="font-mono text-xs text-slate-500">{footer}</p>
        </figcaption>
      </figure>

      {isServedLocally() && (
        <p className="rounded-xl bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
          {t('localLinkNote')}
        </p>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-400">{link}</span>
        <CopyButton value={link} label={t('copyLink')} />
      </div>
      <button type="button" onClick={() => void download()} className={`w-full ${primaryButton}`}>
        {t('downloadPoster')}
      </button>
      {failed && (
        <p role="alert" className="text-sm text-rose-300">
          {t('posterFailed')}
        </p>
      )}
    </Dialog>
  )
}

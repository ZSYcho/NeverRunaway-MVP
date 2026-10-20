import { Link, Outlet } from 'react-router'
import { useI18n } from '../i18n/useI18n.ts'
import { useWalletBootstrap } from '../wallet/useWalletBootstrap.ts'
import { NetworkStatus } from './NetworkStatus.tsx'
import { ConnectButton } from './wallet/ConnectButton.tsx'
import { WrongNetworkBanner } from './wallet/WrongNetworkBanner.tsx'

export function Layout() {
  const { lang, setLang } = useI18n()
  useWalletBootstrap()

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-50">
        <header className="glass flex items-center justify-between gap-2 px-4 py-3 md:px-12">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 font-display text-xl font-bold shadow-lg">
              NR
            </span>
            <span className="hidden font-display text-xl font-bold tracking-wide sm:block">
              NeverRunaway
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <NetworkStatus />
            <ConnectButton />
            <button
              type="button"
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="rounded-lg px-2 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              中 / EN
            </button>
          </div>
        </header>
        <WrongNetworkBanner />
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <Outlet />
      </main>
    </div>
  )
}

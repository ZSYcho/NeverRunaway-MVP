import { Suspense } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { useI18n } from '../i18n/useI18n.ts'
import { useWalletBootstrap } from '../wallet/useWalletBootstrap.ts'
import { NetworkStatus } from './NetworkStatus.tsx'
import { Notice } from './Notice.tsx'
import { ConnectButton } from './wallet/ConnectButton.tsx'
import { WrongNetworkBanner } from './wallet/WrongNetworkBanner.tsx'

export function Layout() {
  const { t, lang, setLang } = useI18n()
  useWalletBootstrap()

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-50">
        <header className="glass flex items-center justify-between gap-2 px-4 py-3 md:px-12">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 font-display text-xl font-bold shadow-lg">
                NR
              </span>
              <span className="hidden font-display text-xl font-bold tracking-wide sm:block">
                NeverRunaway
              </span>
            </Link>
            <RoleTabs className="hidden gap-1 md:flex" />
          </div>
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
        {/* Phones have no room next to the wallet button, so the tabs get their own row. */}
        <RoleTabs className="glass flex gap-1 border-t-0 px-4 py-2 md:hidden" />
        <WrongNetworkBanner />
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <Suspense fallback={<Notice>{t('loadingPage')}</Notice>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}

/** Customers and merchants use the same app; the tabs switch between their sides of it. */
function RoleTabs({ className }: { className: string }) {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const merchant = pathname === '/merchant' || pathname.startsWith('/merchant/')
  const tabs = [
    { to: '/', label: t('navStores'), active: !merchant },
    { to: '/merchant', label: t('navMerchant'), active: merchant },
  ]

  return (
    <nav className={className}>
      {tabs.map(({ to, label, active }) => (
        <Link
          key={to}
          to={to}
          aria-current={active ? 'page' : undefined}
          className={`rounded-lg px-3 py-1.5 text-sm transition ${
            active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}

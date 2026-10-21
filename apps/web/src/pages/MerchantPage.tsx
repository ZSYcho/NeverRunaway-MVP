import { useConnection } from 'wagmi'
import { deployment, targetChain } from '../chain.ts'
import { Notice } from '../components/Notice.tsx'
import { FaucetButton } from '../features/faucet/FaucetButton.tsx'
import { CreateStoreForm } from '../features/merchant/CreateStoreForm.tsx'
import { MyStores } from '../features/merchant/MyStores.tsx'
import { useI18n } from '../i18n/useI18n.ts'

export function MerchantPage() {
  const { t } = useI18n()
  const { address: account, chainId } = useConnection()

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">{t('merchantTitle')}</h1>
        <p className="max-w-3xl text-slate-400">{t('merchantIntro')}</p>
        {/* Opening a store costs gas, and funding a bonus pool takes USDC. */}
        {account && <FaucetButton account={account} />}
      </section>

      {!deployment ? (
        <Notice>{t('notDeployed', { chain: targetChain.name })}</Notice>
      ) : !account ? (
        <Notice>{t('connectToManage')}</Notice>
      ) : (
        <>
          <MyStores merchant={account} />
          <CreateStoreForm account={account} canWrite={chainId === targetChain.id} />
        </>
      )}
    </div>
  )
}

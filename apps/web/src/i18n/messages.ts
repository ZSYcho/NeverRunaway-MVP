export const zh = {
  documentTitle: 'NeverRunaway · 链上储值，永不跑路',
  heroTitleBefore: '资金由',
  heroTitleHighlight: '智能合约',
  heroTitleAfter: '守护',
  heroDescription:
    '储值金锁在不可篡改的链上合约里：商家关店或到期后，未消费的本金一键退回。即日起，安心享受储值优惠。',
  discoverStores: '发现门店',
  loadingStores: '正在从链上读取门店…',
  noStores: '这条链上还没有门店',
  notDeployed: '合约尚未部署到 {chain}',
  readFailed: '读取链上数据失败',
  storeContract: '门店合约',
  merchant: '商家',
  tiers: '储值档位',
  statusActive: '营业中',
  statusInactive: '已关店或到期',
  rpcUnreachable: '无法连接 RPC',
  notFoundTitle: '页面不存在',
  backHome: '返回首页',
}

export type MessageKey = keyof typeof zh

export const en: Record<MessageKey, string> = {
  documentTitle: "NeverRunaway · Prepaid credit that can't run away",
  heroTitleBefore: 'Funds guarded by',
  heroTitleHighlight: 'smart contracts',
  heroTitleAfter: '',
  heroDescription:
    'Your deposit sits in an immutable on-chain contract. If the store closes or its term ends, your unspent deposit comes back in one click.',
  discoverStores: 'Discover stores',
  loadingStores: 'Reading stores from the chain…',
  noStores: 'No stores on this chain yet',
  notDeployed: 'Contracts are not deployed on {chain} yet',
  readFailed: 'Could not read on-chain data',
  storeContract: 'Store contract',
  merchant: 'Merchant',
  tiers: 'Deposit tiers',
  statusActive: 'Open',
  statusInactive: 'Closed or expired',
  rpcUnreachable: 'RPC unreachable',
  notFoundTitle: 'Page not found',
  backHome: 'Back to home',
}

export const messages = { zh, en }

export type Lang = keyof typeof messages

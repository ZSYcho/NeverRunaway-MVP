# Wallet access

Most people reach a dApp from inside a wallet, especially on mobile. The connect flow is therefore
built around **entry points**, not a fixed list of wallets: any wallet that follows the standards
works, and a short list of featured wallets gets extra polish.

## Entry points

| Entry point                  | How users arrive                                                  | How the app connects                                                                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wallet app browser (primary) | They open the app inside OKX, Bitget, TokenPocket, imToken, …     | The injected provider. One tap, no picker; a site the user approved before reconnects silently, since `eth_accounts` never prompts.                                                     |
| Wallet app scanner           | They scan a link (for example a store poster) with the wallet app | The scanner opens the https link in the wallet's browser, which is the case above.                                                                                                      |
| Desktop extension            | Any browser extension                                             | [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) discovery: every compliant wallet appears with its own name and icon. `window.ethereum` is the fallback when none announces itself. |
| Browser without a wallet     | Safari or Chrome on a phone, a desktop browser without extensions | "Open in wallet app" links on phones, and WalletConnect v2: a QR code on desktop, an app switch on mobile.                                                                              |

## Featured wallets

Ordered for X Layer users, many of whom use Asian mobile wallets. EIP-6963 rdns names and
WalletConnect ids come from the [WalletConnect registry](https://walletguide.walletconnect.com).

| Wallet         | EIP-6963 rdns         | Opens the dApp in the wallet app                                                     | Source                                                                                                                                    |
| -------------- | --------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| OKX Wallet     | `com.okex.wallet`     | `https://www.okx.com/download?deeplink=` + `okx://wallet/dapp/url?dappUrl=<encoded>` | Former OKX app-universal-link docs, as used by [Tron's OKX adapter](https://www.npmjs.com/package/@tronweb3/tronwallet-adapter-okxwallet) |
| Bitget Wallet  | `com.bitget.web3`     | `https://bkcode.vip?action=dapp&url=<encoded>` (Android only supports this form)     | [Bitget deeplink docs](https://web3.bitget.com/en/docs/configuration/deeplink)                                                            |
| MetaMask       | `io.metamask`         | `https://link.metamask.io/dapp/<url without protocol>`                               | [MetaMask deeplinks](https://docs.metamask.io/metamask-connect/evm/guides/metamask-exclusive/use-deeplinks/)                              |
| Trust Wallet   | `com.trustwallet.app` | `https://link.trustwallet.com/open_url?coin_id=60&url=<encoded>`                     | [Trust deep linking](https://developer.trustwallet.com/developer/develop-for-trust/deeplinking)                                           |
| TokenPocket    | `pro.tokenpocket`     | `tpdapp://open?params=<encoded JSON with url>`                                       | [TokenPocket deeplink](https://help.tokenpocket.pro/developer-en/wallet/pull-up-wallet-with-deeplink)                                     |
| imToken        | (no extension)        | `imtokenv2://navigate?screen=DappView&url=<encoded>`                                 | [imToken DApp SDK](https://docs.token.im/dapp-sdk/en)                                                                                     |
| Binance Wallet | `com.binance.wallet`  | None documented; WalletConnect lists it                                              | [Binance Web3 Wallet docs](https://developers.binance.com/en/docs/products/web3-connect/evm-compatible-provider)                          |

`apps/web/src/wallet/featuredWallets.test.ts` pins every format, including dApp URLs with
characters such as `%` and `+` that broke unencoded OKX links.

## Design decisions

- **Own picker, WalletConnect for the long tail.** In a wallet's own browser a kit adds nothing:
  the wallet is already chosen. Extensions are covered by EIP-6963 without configuration. Only
  browsers without a wallet need WalletConnect, and there the standard WalletConnect modal (built
  on Reown AppKit) lists 600+ wallets. RainbowKit 2.2 and ConnectKit 1.9 still require wagmi 2.
- **WalletConnect loads on demand.** A connector in the wagmi config is set up, and loads its SDK,
  on page load. The WalletConnect connector is instead passed to `connect` when chosen and to
  `reconnect` when the last session used it. Built output: about 260 KB of gzipped JavaScript on
  first load; the WalletConnect SDK and its modal (about 410 KB gzipped) load only when used. The
  connector is created once, so retries reuse one WalletConnect client.
- **Wrong network.** wagmi asks the wallet to switch ([EIP-3326](https://eips.ethereum.org/EIPS/eip-3326))
  and, if the wallet doesn't know the chain (error 4902), to add it
  ([EIP-3085](https://eips.ethereum.org/EIPS/eip-3085)). If both fail, the banner lists the network
  details to add by hand.
- **Wallet icons.** EIP-6963 requires data URIs. Anything else falls back to a monogram, and icons
  are only rendered as `<img src>`, never as markup.
- **Errors by code.** Wallet errors map to messages by EIP-1193 code (4001 rejected, -32002
  already pending, 4902 unknown chain), however deeply viem and wagmi wrap them.

## Testing on a phone

A phone can't reach anvil on your machine, so phone testing uses X Layer testnet, and the app needs
an https URL that wallet browsers will open.

```sh
VITE_CHAIN_ID=1952 pnpm --filter @neverrunaway/web dev
# in another terminal: a temporary public https URL (https://<random>.trycloudflare.com)
cloudflared tunnel --url http://localhost:5173
```

Vite accepts `*.trycloudflare.com` hosts. Open the URL inside a wallet app, or scan it with the
wallet's scanner.

## To verify on devices

- The OKX link format comes from documentation OKX has since removed.
- TokenPocket and imToken links use custom schemes, which do nothing when the app is missing.
- Binance documents its in-app provider at `window.binancew3w.ethereum`; check that it also
  announces itself or sets `window.ethereum`.
- WalletConnect needs Reown's relay and wallet registry, whose reachability varies by network,
  including in mainland China. The primary entry points don't depend on them.

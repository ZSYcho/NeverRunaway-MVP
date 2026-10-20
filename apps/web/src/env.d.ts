interface ImportMetaEnv {
  /** Chain the app operates on; see .env.example. */
  readonly VITE_CHAIN_ID?: string
  /** Reown (WalletConnect) project ID. Without it the WalletConnect option is hidden. */
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string
}

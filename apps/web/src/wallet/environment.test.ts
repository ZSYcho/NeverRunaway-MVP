import { describe, expect, it } from 'vitest'
import { identifyInjectedWallet, isMobileDevice } from './environment.ts'

const userAgents = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
}

describe('isMobileDevice', () => {
  it('recognizes phones', () => {
    expect(isMobileDevice(userAgents.iphoneSafari, 5)).toBe(true)
    expect(isMobileDevice(userAgents.androidChrome, 5)).toBe(true)
  })

  it('treats an iPad in desktop mode (Mac user agent with touch) as mobile', () => {
    expect(isMobileDevice(userAgents.macSafari, 5)).toBe(true)
  })

  it('treats desktop browsers as desktop', () => {
    expect(isMobileDevice(userAgents.macSafari, 0)).toBe(false)
    expect(isMobileDevice(userAgents.windowsChrome, 0)).toBe(false)
  })
})

describe('identifyInjectedWallet', () => {
  it('checks specific flags before isMetaMask, which many wallets also set', () => {
    expect(identifyInjectedWallet({ isMetaMask: true, isOkxWallet: true })).toBe('okx')
    expect(identifyInjectedWallet({ isMetaMask: true, isBitKeep: true })).toBe('bitget')
    expect(identifyInjectedWallet({ isMetaMask: true, isTokenPocket: true })).toBe('tokenpocket')
    expect(identifyInjectedWallet({ isMetaMask: true, isTrust: true })).toBe('trust')
  })

  it('recognizes each featured wallet by its own flag', () => {
    expect(identifyInjectedWallet({ isOKExWallet: true })).toBe('okx')
    expect(identifyInjectedWallet({ isTrustWallet: true })).toBe('trust')
    expect(identifyInjectedWallet({ isImToken: true })).toBe('imtoken')
    expect(identifyInjectedWallet({ isBinance: true })).toBe('binance')
    expect(identifyInjectedWallet({ isMetaMask: true })).toBe('metamask')
  })

  it('returns undefined for unknown or missing providers', () => {
    expect(identifyInjectedWallet({})).toBeUndefined()
    expect(identifyInjectedWallet(undefined)).toBeUndefined()
  })
})

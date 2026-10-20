import { describe, expect, it } from 'vitest'
import { detectLang, translate } from './context.ts'

describe('detectLang', () => {
  it('prefers a saved choice', () => {
    expect(detectLang('en', ['zh-CN'])).toBe('en')
  })

  it('follows the first browser language when nothing is saved', () => {
    expect(detectLang(null, ['zh-TW', 'en'])).toBe('zh')
    expect(detectLang(null, ['en-US', 'zh-CN'])).toBe('en')
  })

  it('ignores unknown saved values', () => {
    expect(detectLang('fr', ['zh-CN'])).toBe('zh')
  })
})

describe('translate', () => {
  it('fills placeholders', () => {
    expect(translate('en', 'notDeployed', { chain: 'X Layer Testnet' })).toBe(
      'Contracts are not deployed on X Layer Testnet yet',
    )
  })
})

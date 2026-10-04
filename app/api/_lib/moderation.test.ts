import { afterEach, describe, expect, it } from 'vitest'
import { moderateComment, moderatePhoto, ruleCheck } from './moderation.js'

describe('ruleCheck', () => {
  it('blocks links, e-mail addresses and phone numbers', () => {
    expect(ruleCheck('zobacz www.example.com')).toBe('links')
    expect(ruleCheck('https://x.y')).toBe('links')
    expect(ruleCheck('pisz na jan@example.pl')).toBe('email')
    expect(ruleCheck('tel. +48 600 700 800')).toBe('phone')
  })

  it('lets ordinary comments with small numbers through', () => {
    expect(ruleCheck('Wejście ma 2 stopnie, winda na 3. piętro, drzwi 90 cm')).toBeNull()
  })
})

describe('without an API key', () => {
  const key = process.env.ANTHROPIC_API_KEY
  afterEach(() => {
    if (key === undefined) delete process.env.ANTHROPIC_API_KEY
    else process.env.ANTHROPIC_API_KEY = key
  })

  it('never publishes: content waits for moderation', async () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(await moderateComment('Bardzo wygodny podjazd', '', 'pl')).toEqual({ status: 'pending', by: 'none' })
    expect(await moderatePhoto('AAAA', { placeName: 'X', category: 'museum', caption: '', lang: 'pl' })).toEqual({
      status: 'pending',
      by: 'none',
    })
  })
})

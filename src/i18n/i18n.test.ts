import { describe, it, expect } from 'vitest'
import en from './en.json'
import de from './de.json'
import ko from './ko.json'

describe('i18n', () => {
  it.each([['de', de], ['ko', ko]])('%s has every key that en has', (_, dict) => {
    const missing = Object.keys(en).filter(k => !(k in dict))
    expect(missing).toEqual([])
  })
})

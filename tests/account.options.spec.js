// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect } from 'vitest'
import { createAccountOptions, estimateSelectWidth } from '@/helpers/account.options.js'

describe('account.options helpers', () => {
  it('returns empty options without user or accounts', () => {
    expect(createAccountOptions([], null)).toEqual([])
    expect(createAccountOptions(null, { roles: [] })).toEqual([])
  })

  it('returns all accounts for administrator', () => {
    const accounts = [
      { id: 1, name: 'One' },
      { id: 2, name: 'Two' }
    ]
    const user = { roles: [1], accountIds: [] }
    expect(createAccountOptions(accounts, user)).toEqual([
      { value: 1, title: 'One' },
      { value: 2, title: 'Two' }
    ])
  })

  it('filters accounts for non-admin user', () => {
    const accounts = [
      { id: 1, name: 'One' },
      { id: 2, name: 'Two' }
    ]
    const user = { roles: [], accountIds: [2] }
    expect(createAccountOptions(accounts, user)).toEqual([{ value: 2, title: 'Two' }])
  })

  it('includes common option when requested', () => {
    const accounts = [{ id: 3, name: 'Three' }]
    const user = { roles: [1], accountIds: [] }
    expect(createAccountOptions(accounts, user, { includeCommon: true })).toEqual([
      { value: 3, title: 'Three' },
      { value: 0, title: 'Общие видеофайлы' }
    ])
  })

  it('estimates select width based on options', () => {
    expect(estimateSelectWidth([])).toBe('auto')
    const width = estimateSelectWidth([{ title: 'Longer name' }], { minWidth: 100, charWidth: 10, padding: 20 })
    expect(width).toBe('130px')
  })
})

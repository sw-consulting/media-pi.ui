// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

import { describe, expect, it } from 'vitest'
import {
  CATEGORY_NONE_SCOPE,
  COMMON_ALL_SCOPE,
  createCategoryOptions,
  createVideoScopeOptions,
  getCategoryTitle,
  parseVideoScope
} from '@/helpers/video.scope.helpers.js'

describe('video.scope.helpers', () => {
  it('builds account and common category scopes for administrator', () => {
    const options = createVideoScopeOptions(
      [{ id: 1, name: 'Account 1' }],
      [{ id: 9, title: 'News' }],
      { roles: [1], accountIds: [] }
    )

    expect(options.map(option => option.value)).toEqual([
      'account:1',
      COMMON_ALL_SCOPE,
      CATEGORY_NONE_SCOPE,
      'category:9'
    ])
  })

  it('filters account scopes for manager but keeps common category scopes', () => {
    const options = createVideoScopeOptions(
      [{ id: 1, name: 'One' }, { id: 2, name: 'Two' }],
      [{ id: 9, title: 'News' }],
      { roles: [11], accountIds: [2] }
    )

    expect(options.map(option => option.value)).toEqual([
      'account:2',
      COMMON_ALL_SCOPE,
      CATEGORY_NONE_SCOPE,
      'category:9'
    ])
  })

  it('parses all supported scope values', () => {
    expect(parseVideoScope('account:5')).toEqual({ type: 'account', accountId: 5, categoryId: undefined })
    expect(parseVideoScope(COMMON_ALL_SCOPE)).toEqual({ type: 'common', accountId: 0, categoryId: undefined })
    expect(parseVideoScope(CATEGORY_NONE_SCOPE)).toEqual({ type: 'category', accountId: 0, categoryId: 0 })
    expect(parseVideoScope('category:7')).toEqual({ type: 'category', accountId: 0, categoryId: 7 })
  })

  it('creates category options and titles with uncategorized fallback', () => {
    const categories = [{ id: 7, title: 'Sport' }]

    expect(createCategoryOptions(categories)).toEqual([
      { value: 0, title: 'Без категории' },
      { value: 7, title: 'Sport' }
    ])
    expect(getCategoryTitle(0, categories)).toBe('Без категории')
    expect(getCategoryTitle(7, categories)).toBe('Sport')
    expect(getCategoryTitle(8, categories)).toBe('Категория #8')
  })
})

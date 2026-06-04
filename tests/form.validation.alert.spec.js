/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

import { describe, expect, it, vi } from 'vitest'
import { getFormValidationMessage, showFormValidationErrors } from '@/helpers/form.validation.alert.js'

describe('form.validation.alert', () => {
  it('collects nested validation messages into a single alert string', () => {
    expect(getFormValidationMessage({
      errors: {
        title: '  Required  ',
        category: ['  Pick one  ', '', null],
        nested: {
          count: 3,
          flags: [true, '  ']
        }
      }
    })).toBe('Required; Pick one; 3; true')
  })

  it('returns an empty message for falsy validation values', () => {
    expect(getFormValidationMessage()).toBe('')
    expect(getFormValidationMessage({ errors: null })).toBe('')
    expect(getFormValidationMessage({ errors: [] })).toBe('')
  })

  it('shows a single validation alert when a message is available', () => {
    const alertStore = { error: vi.fn() }

    expect(showFormValidationErrors(alertStore, { errors: { title: 'Required' } })).toBe(false)
    expect(alertStore.error).toHaveBeenCalledWith('Required')
  })

  it('does not show an alert when validation errors are empty', () => {
    const alertStore = { error: vi.fn() }

    expect(showFormValidationErrors(alertStore, { errors: { title: '   ' } })).toBe(false)
    expect(alertStore.error).not.toHaveBeenCalled()
  })
})

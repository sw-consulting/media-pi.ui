// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

import { describe, expect, it } from 'vitest'

import { formatRuDate, formatRuDateTime } from '@/helpers/date.format.js'

describe('date.format helper', () => {
  it('formats date-only values with Russian day-month-year order', () => {
    expect(formatRuDate('2026-06-01')).toBe('01.06.2026')
  })

  it('formats date-time values with Russian date and time', () => {
    const formatted = formatRuDateTime(new Date(2025, 11, 13, 10, 30, 0))

    expect(formatted).toContain('13.12.2025')
    expect(formatted).toContain('10:30:00')
  })

  it('handles empty and invalid values like the device formatter did', () => {
    expect(formatRuDateTime(null)).toBe('—')
    expect(formatRuDateTime(undefined)).toBe('—')
    expect(formatRuDateTime('')).toBe('—')
    expect(formatRuDateTime('completely-invalid')).toBe('completely-invalid')
  })
})

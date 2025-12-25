// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect } from 'vitest'
import { formatDuration, formatFileSize } from '@/helpers/media.format.js'

describe('media.format helpers', () => {
  it('formats file size values', () => {
    expect(formatFileSize(0)).toBe('0 Б')
    expect(formatFileSize(1024)).toBe('1.0 КБ')
    expect(formatFileSize(1048576)).toBe('1.0 МБ')
  })

  it('formats duration values', () => {
    expect(formatDuration(59)).toBe('0:59')
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(3601)).toBe('1:00:01')
  })

  it('handles invalid values', () => {
    expect(formatFileSize(null)).toBe('—')
    expect(formatDuration(undefined)).toBe('—')
    expect(formatDuration('oops')).toBe('—')
  })
})

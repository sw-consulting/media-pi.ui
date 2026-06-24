// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect } from 'vitest'
import {
  compareMediaInfo,
  createFileSizeSearchTokens,
  formatDuration,
  formatFileSize,
  toSortableMediaNumber
} from '@/helpers/media.format.js'

describe('media.format helpers', () => {
  it('formats file size values', () => {
    expect(formatFileSize(0)).toBe('0 Б')
    expect(formatFileSize(128)).toBe('128 Б')
    expect(formatFileSize(1024)).toBe('1.0 КБ')
    expect(formatFileSize(1048576)).toBe('1.0 МБ')
    expect(formatFileSize(5 * 1024 * 1024 * 1024)).toBe('5.0 ГБ')
  })

  it('formats duration values', () => {
    expect(formatDuration(59)).toBe('0:59')
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(3601)).toBe('1:00:01')
  })

  it('handles invalid values', () => {
    expect(formatFileSize(null)).toBe('—')
    expect(formatFileSize(undefined)).toBe('—')
    expect(formatFileSize('oops')).toBe('—')
    expect(formatFileSize(-1)).toBe('—')
    expect(formatDuration(undefined)).toBe('—')
    expect(formatDuration('oops')).toBe('—')
  })

  it('creates file size search tokens from raw and formatted values', () => {
    expect(createFileSizeSearchTokens(1024)).toEqual(['1024', '1.0 КБ', '1.0КБ'])
    expect(createFileSizeSearchTokens(null, 'legacy size')).toEqual(['legacy size'])
  })

  it('compares media info by file size first and duration second', () => {
    expect(compareMediaInfo({ fileSize: 100, duration: 60 }, { fileSize: 200, duration: 10 })).toBeLessThan(0)
    expect(compareMediaInfo({ fileSize: 100, duration: 60 }, { fileSize: 100, duration: 10 })).toBeGreaterThan(0)
    expect(compareMediaInfo({ fileSize: 100, duration: 60 }, { fileSize: 100, duration: 60 })).toBe(0)
  })

  it('treats non-numeric media sort values as zero', () => {
    expect(toSortableMediaNumber('unknown')).toBe(0)
    expect(compareMediaInfo({ fileSize: 'unknown', duration: 20 }, { fileSize: 0, duration: 30 })).toBeLessThan(0)
  })
})

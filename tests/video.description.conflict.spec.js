import { describe, expect, it } from 'vitest'
import {
  duplicateVideoDescriptionFallbackMessage,
  duplicateVideoDescriptionReason,
  getDuplicateVideoDescriptionMessage,
  isDuplicateVideoDescriptionError
} from '@/helpers/video.description.conflict.js'

describe('video.description.conflict', () => {
  it('detects duplicate video description 409 responses', () => {
    expect(isDuplicateVideoDescriptionError({
      status: 409,
      data: { reason: duplicateVideoDescriptionReason }
    })).toBe(true)
  })

  it('rejects unrelated errors', () => {
    expect(isDuplicateVideoDescriptionError({
      status: 409,
      data: { reason: 'duplicateOriginalFilename' }
    })).toBe(false)
    expect(isDuplicateVideoDescriptionError({ status: 400 })).toBe(false)
  })

  it('prefers thrown message over response data and fallback', () => {
    expect(getDuplicateVideoDescriptionMessage({
      message: 'Custom message',
      data: { msg: 'Response message' }
    })).toBe('Custom message')
    expect(getDuplicateVideoDescriptionMessage({
      data: { msg: 'Response message' }
    })).toBe('Response message')
    expect(getDuplicateVideoDescriptionMessage({})).toBe(duplicateVideoDescriptionFallbackMessage)
  })
})

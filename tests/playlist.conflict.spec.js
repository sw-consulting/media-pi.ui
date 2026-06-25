import { describe, expect, it } from 'vitest'
import {
  duplicatePlaylistDescriptionFallbackMessage,
  duplicatePlaylistFilenameFallbackMessage,
  getDuplicatePlaylistDescriptionMessage,
  getDuplicatePlaylistFilenameMessage,
  isDuplicatePlaylistDescriptionError,
  isDuplicatePlaylistFilenameError
} from '@/helpers/playlist.conflict.js'

describe('playlist conflict helpers', () => {
  it('detects duplicate playlist description conflicts', () => {
    expect(isDuplicatePlaylistDescriptionError({
      status: 409,
      data: { reason: 'duplicatePlaylistDescription' }
    })).toBe(true)

    expect(isDuplicatePlaylistDescriptionError({
      status: 409,
      data: { reason: 'duplicatePlaylistFilename' }
    })).toBe(false)
  })

  it('detects duplicate playlist filename conflicts', () => {
    expect(isDuplicatePlaylistFilenameError({
      status: 409,
      data: { reason: 'duplicatePlaylistFilename' }
    })).toBe(true)

    expect(isDuplicatePlaylistFilenameError({
      status: 409,
      data: { reason: 'duplicatePlaylistDescription' }
    })).toBe(false)
  })

  it('uses backend messages before fallback messages', () => {
    expect(getDuplicatePlaylistDescriptionMessage({
      data: { msg: 'Backend description conflict' }
    })).toBe('Backend description conflict')
    expect(getDuplicatePlaylistFilenameMessage({
      data: { msg: 'Backend filename conflict' }
    })).toBe('Backend filename conflict')
  })

  it('falls back to default Russian messages', () => {
    expect(getDuplicatePlaylistDescriptionMessage({})).toBe(duplicatePlaylistDescriptionFallbackMessage)
    expect(getDuplicatePlaylistFilenameMessage({})).toBe(duplicatePlaylistFilenameFallbackMessage)
  })
})

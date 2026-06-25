// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

export const duplicatePlaylistDescriptionReason = 'duplicatePlaylistDescription'
export const duplicatePlaylistFilenameReason = 'duplicatePlaylistFilename'

export const duplicatePlaylistDescriptionFallbackMessage = 'Плейлист с таким описанием уже существует'
export const duplicatePlaylistFilenameFallbackMessage = 'Плейлист с таким именем файла уже существует'

export function isDuplicatePlaylistDescriptionError(err) {
  return err?.status === 409 && err?.data?.reason === duplicatePlaylistDescriptionReason
}

export function isDuplicatePlaylistFilenameError(err) {
  return err?.status === 409 && err?.data?.reason === duplicatePlaylistFilenameReason
}

export function getDuplicatePlaylistDescriptionMessage(err) {
  return err?.data?.msg || err?.message || duplicatePlaylistDescriptionFallbackMessage
}

export function getDuplicatePlaylistFilenameMessage(err) {
  return err?.data?.msg || err?.message || duplicatePlaylistFilenameFallbackMessage
}

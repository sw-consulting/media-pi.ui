// Copyright (c) 2026 sw.consulting
// This file is a part of Media Pi frontend application

export const duplicateOriginalFilenameReason = 'duplicateOriginalFilename'

const duplicateOriginalFilenameFallbackMessage = 'В выбранном разделе уже есть видеофайл с именем'

export function isDuplicateOriginalFilenameError(err) {
  return err?.status === 409 && err?.data?.reason === duplicateOriginalFilenameReason
}

export function getDuplicateOriginalFilenameMessage(err) {
  return err?.message || err?.data?.msg || duplicateOriginalFilenameFallbackMessage
}

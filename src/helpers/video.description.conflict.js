// Copyright (c) 2026 sw.consulting
// This file is a part of Media Pi frontend application

export const duplicateVideoDescriptionReason = 'duplicateVideoDescription'

export const duplicateVideoDescriptionFallbackMessage = 'В выбранном разделе уже есть видеофайл с таким описанием'

export function isDuplicateVideoDescriptionError(err) {
  return err?.status === 409 && err?.data?.reason === duplicateVideoDescriptionReason
}

export function getDuplicateVideoDescriptionMessage(err) {
  return err?.message || err?.data?.msg || duplicateVideoDescriptionFallbackMessage
}

// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

function collectValidationMessages(value) {
  if (!value) return []
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectValidationMessages)
  if (typeof value === 'object') return Object.values(value).flatMap(collectValidationMessages)
  return [String(value)]
}

export function getFormValidationMessage(validationContext) {
  const errors = validationContext?.errors || validationContext
  return collectValidationMessages(errors)
    .map(message => message.trim())
    .filter(Boolean)
    .join('; ')
}

export function showFormValidationErrors(alertStore, validationContext) {
  const message = getFormValidationMessage(validationContext)
  if (!message) return false
  alertStore.error(message)
  return false
}

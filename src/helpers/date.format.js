// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

const emptyDatePlaceholder = '—'

const russianDateOptions = Object.freeze({
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

const russianDateTimeOptions = Object.freeze({
  ...russianDateOptions,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
})

function parseDate(value) {
  const dateOnlyMatch = typeof value === 'string'
    ? value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    : null

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  return new Date(value)
}

export function formatRuDate(value) {
  return formatRuDateValue(value, russianDateOptions)
}

export function formatRuDateTime(value) {
  return formatRuDateValue(value, russianDateTimeOptions)
}

function formatRuDateValue(value, options) {
  if (!value) return emptyDatePlaceholder
  try {
    const date = parseDate(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toLocaleString('ru-RU', options)
  } catch {
    return String(value)
  }
}

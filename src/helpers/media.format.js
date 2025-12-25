// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

export function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined) return '—'
  const size = Number(bytes)
  if (Number.isNaN(size)) return '—'
  const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']
  if (size === 0) return '0 Б'
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  const value = size / (1024 ** index)
  const formatted = value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)
  return `${formatted} ${units[index]}`
}

export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '—'
  const total = Number(seconds)
  if (Number.isNaN(total)) return '—'
  const hrs = Math.floor(total / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = Math.floor(total % 60)
  const paddedMins = hrs > 0 ? String(mins).padStart(2, '0') : String(mins)
  const paddedSecs = String(secs).padStart(2, '0')
  return hrs > 0 ? `${hrs}:${paddedMins}:${paddedSecs}` : `${paddedMins}:${paddedSecs}`
}

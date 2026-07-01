// Copyright (c) 2025-2026 sw.consulting
// This file is a part of Media Pi frontend application

const getField = (item, camelName, pascalName) => item?.[camelName] ?? item?.[pascalName] ?? null

const terminalStates = new Set(['succeeded', 'failed', 'canceled'])

export const normalizePlaylistActivation = (item) => {
  if (!item || typeof item !== 'object') return null
  return {
    state: getField(item, 'state', 'State') ?? 'idle',
    phase: getField(item, 'phase', 'Phase') ?? 'idle',
    trigger: getField(item, 'trigger', 'Trigger'),
    startedAt: getField(item, 'startedAt', 'StartedAt'),
    finishedAt: getField(item, 'finishedAt', 'FinishedAt'),
    error: getField(item, 'error', 'Error')
  }
}

export const isPlaylistActivationRunning = (activation) => activation?.state === 'running'

export const isPlaylistActivationTerminal = (activation) => terminalStates.has(activation?.state)

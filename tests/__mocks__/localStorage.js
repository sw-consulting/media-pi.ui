// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi backend

import { vi } from 'vitest'

// Create a localStorage mock that maintains state
const createLocalStorageMock = () => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    })
  }
}

export default createLocalStorageMock


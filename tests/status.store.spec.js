// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi backend

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStatusStore } from '@/stores/status.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn()
  }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('status store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchStatus sets versions from API', async () => {
    fetchWrapper.get.mockResolvedValue({
      appVersion: '1.2.3',
      dbVersion: '20240624'
    })

    const store = useStatusStore()
    await store.fetchStatus()

    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/status/status`
    )
    expect(store.coreVersion).toBe('1.2.3')
    expect(store.dbVersion).toBe('20240624')
  })

  it('fetchStatus throws error when API fails', async () => {
    const mockError = new Error('API error')
    fetchWrapper.get.mockRejectedValue(mockError)

    const store = useStatusStore()
    
    await expect(store.fetchStatus()).rejects.toThrow('API error')
    expect(store.coreVersion).toBeUndefined()
    expect(store.dbVersion).toBeUndefined()
  })
})


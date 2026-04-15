// Copyright (c) 2026 sw.consulting
// This file is a part of Media Pi frontend application

/* global Blob */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useScreenshotsStore } from '@/stores/screenshots.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'

const authStore = {
  screenshots_page: 2,
  screenshots_per_page: 50,
  screenshots_sort_by: [{ key: 'time_created', order: 'desc' }]
}

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStore
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn(),
    getFile: vi.fn(),
    delete: vi.fn()
  }
}))

describe('screenshots.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    authStore.screenshots_page = 2
    authStore.screenshots_per_page = 50
    authStore.screenshots_sort_by = [{ key: 'time_created', order: 'desc' }]
  })

  it('loads paged screenshots for a device with filters', async () => {
    fetchWrapper.get.mockImplementation(async (url) => {
      const parsed = new URL(url)
      expect(parsed.pathname).toBe('/api/screenshots')
      expect(parsed.searchParams.get('deviceId')).toBe('7')
      expect(parsed.searchParams.get('page')).toBe('2')
      expect(parsed.searchParams.get('pageSize')).toBe('50')
      expect(parsed.searchParams.get('sortBy')).toBe('time_created')
      expect(parsed.searchParams.get('sortOrder')).toBe('desc')
      expect(parsed.searchParams.get('from')).toBe('2026-04-14T10:00:00.000Z')
      expect(parsed.searchParams.get('to')).toBe('2026-04-15T11:30:00.000Z')

      return {
        items: [{ id: 10, originalFilename: 'shot.jpg' }],
        pagination: { totalCount: 1, hasNextPage: false, hasPreviousPage: true, currentPage: 2 },
        sorting: { sortBy: 'time_created', sortOrder: 'desc' }
      }
    })

    const store = useScreenshotsStore()
    await store.getAllByDevice(7, {
      from: '2026-04-14T13:00:00+03:00',
      to: '2026-04-15T14:30:00+03:00'
    })

    expect(store.screenshots).toEqual([{ id: 10, originalFilename: 'shot.jpg' }])
    expect(store.totalCount).toBe(1)
    expect(store.hasPreviousPage).toBe(true)
    expect(store.sorting).toEqual({ sortBy: 'time_created', sortOrder: 'desc' })
  })

  it('resets list state when loading fails', async () => {
    const error = new Error('failed')
    fetchWrapper.get.mockRejectedValueOnce(error)

    const store = useScreenshotsStore()

    await expect(store.getAllByDevice(7)).rejects.toThrow('failed')
    expect(store.screenshots).toEqual([])
    expect(store.totalCount).toBe(0)
    expect(store.error).toBe(error)
  })

  it('opens screenshot in a new tab via blob url', async () => {
    const mockBlob = new Blob(['img'], { type: 'image/jpeg' })
    const openMock = vi.fn(() => ({}))
    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()

    global.open = openMock
    global.URL = { createObjectURL, revokeObjectURL }

    fetchWrapper.getFile.mockResolvedValueOnce({
      headers: {
        get: vi.fn(() => 'attachment; filename="shot.jpg"')
      },
      blob: vi.fn(async () => mockBlob)
    })

    const store = useScreenshotsStore()
    const result = await store.open(11)

    expect(fetchWrapper.getFile).toHaveBeenCalledWith('http://localhost:8080/api/screenshots/11')
    expect(createObjectURL).toHaveBeenCalledWith(mockBlob)
    expect(openMock).toHaveBeenCalledWith('blob:test', '_blank', 'noopener')
    expect(result).toEqual({ id: 11, filename: 'shot.jpg', objectUrl: 'blob:test' })
  })

  it('deletes screenshot and updates local collection', async () => {
    fetchWrapper.delete.mockResolvedValueOnce(undefined)

    const store = useScreenshotsStore()
    store.screenshots = [{ id: 1 }, { id: 2 }]
    store.totalCount = 2

    await store.remove(1)

    expect(fetchWrapper.delete).toHaveBeenCalledWith('http://localhost:8080/api/screenshots/1')
    expect(store.screenshots).toEqual([{ id: 2 }])
    expect(store.totalCount).toBe(1)
  })
})

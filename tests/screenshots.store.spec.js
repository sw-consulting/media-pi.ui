// Copyright (c) 2026 sw.consulting
// This file is a part of Media Pi frontend application

/* global Blob */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
    postBlob: vi.fn(),
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

  afterEach(() => {
    vi.unstubAllGlobals()
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

  it('opens screenshot as preview blob url', async () => {
    const mockBlob = new Blob(['img'], { type: 'image/jpeg' })
    const createObjectURL = vi.fn(() => 'blob:test')

    vi.stubGlobal('URL', { createObjectURL })

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
    expect(result).toEqual({ id: 11, filename: 'shot.jpg', objectUrl: 'blob:test' })
    expect(store.screenshot).toEqual(result)
  })

  it('creates screenshot through device endpoint', async () => {
    const mockBlob = new Blob(['img'], { type: 'image/jpeg' })
    const response = {
      headers: {
        get: vi.fn(() => 'attachment; filename="created.jpg"')
      },
      blob: vi.fn(async () => mockBlob)
    }
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:created') })
    fetchWrapper.postBlob.mockResolvedValueOnce(response)

    const store = useScreenshotsStore()
    const result = await store.create(7)

    expect(fetchWrapper.postBlob).toHaveBeenCalledWith('http://localhost:8080/api/devices/7/screenshot')
    expect(result).toEqual({ id: null, filename: 'created.jpg', objectUrl: 'blob:created' })
    expect(store.screenshot).toEqual(result)
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('sets error state and rethrows when create() fails', async () => {
    const err = new Error('camera failed')
    fetchWrapper.postBlob.mockRejectedValueOnce(err)

    const store = useScreenshotsStore()

    await expect(store.create(7)).rejects.toThrow('camera failed')
    expect(store.error).toBe(err)
    expect(store.loading).toBe(false)
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

  it('returns empty array and resets state when deviceId is null', async () => {
    const store = useScreenshotsStore()
    store.screenshots = [{ id: 1 }]
    store.totalCount = 5

    const result = await store.getAllByDevice(null)

    expect(result).toEqual([])
    expect(store.screenshots).toEqual([])
    expect(store.totalCount).toBe(0)
    expect(store.activeFilters).toEqual({ deviceId: null, from: null, to: null })
    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })

  it('returns empty array and resets state when deviceId is undefined', async () => {
    const store = useScreenshotsStore()
    store.screenshots = [{ id: 3 }]

    const result = await store.getAllByDevice(undefined)

    expect(result).toEqual([])
    expect(store.screenshots).toEqual([])
    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })

  it('uses default pageSize when screenshots_per_page is 0 (invalid)', async () => {
    authStore.screenshots_per_page = 0
    fetchWrapper.get.mockResolvedValueOnce({ items: [], pagination: {}, sorting: {} })

    const store = useScreenshotsStore()
    await store.getAllByDevice(7)

    const parsed = new URL(fetchWrapper.get.mock.calls[0][0])
    expect(parsed.searchParams.get('pageSize')).toBe('100')
  })

  it('caps pageSize at maxPageSize (1000) when per_page is very large', async () => {
    authStore.screenshots_per_page = 9999
    fetchWrapper.get.mockResolvedValueOnce({ items: [], pagination: {}, sorting: {} })

    const store = useScreenshotsStore()
    await store.getAllByDevice(7)

    const parsed = new URL(fetchWrapper.get.mock.calls[0][0])
    expect(parsed.searchParams.get('pageSize')).toBe('1000')
  })

  it('resolves pageSize of -1 to totalCount when store has items loaded', async () => {
    authStore.screenshots_per_page = -1
    fetchWrapper.get.mockResolvedValueOnce({ items: [], pagination: {}, sorting: {} })

    const store = useScreenshotsStore()
    store.totalCount = 42

    await store.getAllByDevice(7)

    const parsed = new URL(fetchWrapper.get.mock.calls[0][0])
    expect(parsed.searchParams.get('pageSize')).toBe('42')
  })

  it('resolves pageSize of -1 to defaultPageSize when totalCount is 0', async () => {
    authStore.screenshots_per_page = -1
    fetchWrapper.get.mockResolvedValueOnce({ items: [], pagination: {}, sorting: {} })

    const store = useScreenshotsStore()

    await store.getAllByDevice(7)

    const parsed = new URL(fetchWrapper.get.mock.calls[0][0])
    expect(parsed.searchParams.get('pageSize')).toBe('100')
  })

  it('uses id/asc fallbacks when screenshots_sort_by is empty', async () => {
    authStore.screenshots_sort_by = []
    fetchWrapper.get.mockResolvedValueOnce({ items: [], pagination: {}, sorting: {} })

    const store = useScreenshotsStore()
    await store.getAllByDevice(7)

    const parsed = new URL(fetchWrapper.get.mock.calls[0][0])
    expect(parsed.searchParams.get('sortBy')).toBe('id')
    expect(parsed.searchParams.get('sortOrder')).toBe('asc')
  })

  it('normalizes Date object for from/to filters', async () => {
    const fromDate = new Date('2026-04-14T10:00:00.000Z')
    const toDate = new Date('2026-04-15T11:00:00.000Z')
    fetchWrapper.get.mockResolvedValueOnce({ items: [], pagination: {}, sorting: {} })

    const store = useScreenshotsStore()
    await store.getAllByDevice(7, { from: fromDate, to: toDate })

    const parsed = new URL(fetchWrapper.get.mock.calls[0][0])
    expect(parsed.searchParams.get('from')).toBe('2026-04-14T10:00:00.000Z')
    expect(parsed.searchParams.get('to')).toBe('2026-04-15T11:00:00.000Z')
  })

  it('omits from/to params when the date strings are invalid', async () => {
    fetchWrapper.get.mockResolvedValueOnce({ items: [], pagination: {}, sorting: {} })

    const store = useScreenshotsStore()
    await store.getAllByDevice(7, { from: 'not-a-date', to: new Date('invalid') })

    const parsed = new URL(fetchWrapper.get.mock.calls[0][0])
    expect(parsed.searchParams.has('from')).toBe(false)
    expect(parsed.searchParams.has('to')).toBe(false)
  })

  it('handles null/missing pagination and sorting in API response', async () => {
    fetchWrapper.get.mockResolvedValueOnce({ items: [{ id: 1 }] })

    const store = useScreenshotsStore()
    await store.getAllByDevice(7)

    expect(store.screenshots).toEqual([{ id: 1 }])
    expect(store.totalCount).toBe(0)
    expect(store.hasNextPage).toBe(false)
  })

  it('extracts filename using RFC 5987 filename* parameter', async () => {
    const mockBlob = new Blob(['img'], { type: 'image/jpeg' })
    vi.stubGlobal('open', vi.fn(() => ({})))
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:rfc'), revokeObjectURL: vi.fn() })

    fetchWrapper.getFile.mockResolvedValueOnce({
      headers: { get: vi.fn(() => "attachment; filename*=UTF-8''screenshot%2Ftest.jpg") },
      blob: vi.fn(async () => mockBlob)
    })

    const store = useScreenshotsStore()
    const result = await store.open(20)

    expect(result.filename).toBe('screenshot/test.jpg')
  })

  it('decodes filename* bare value without charset/language prefix', async () => {
    const mockBlob = new Blob(['img'], { type: 'image/jpeg' })
    vi.stubGlobal('open', vi.fn(() => ({})))
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:bare'), revokeObjectURL: vi.fn() })

    fetchWrapper.getFile.mockResolvedValueOnce({
      headers: { get: vi.fn(() => 'attachment; filename*=photo.jpg') },
      blob: vi.fn(async () => mockBlob)
    })

    const store = useScreenshotsStore()
    const result = await store.open(21)

    expect(result.filename).toBe('photo.jpg')
  })

  it('returns raw encoded value when filename* has invalid percent-encoding', async () => {
    const mockBlob = new Blob(['img'], { type: 'image/jpeg' })
    vi.stubGlobal('open', vi.fn(() => ({})))
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:inv'), revokeObjectURL: vi.fn() })

    fetchWrapper.getFile.mockResolvedValueOnce({
      headers: { get: vi.fn(() => "attachment; filename*=UTF-8''%Invalid") },
      blob: vi.fn(async () => mockBlob)
    })

    const store = useScreenshotsStore()
    const result = await store.open(22)

    expect(result.filename).toBe('%Invalid')
  })

  it('falls back to plain filename= when filename* decodes to empty string', async () => {
    const mockBlob = new Blob(['img'], { type: 'image/jpeg' })
    vi.stubGlobal('open', vi.fn(() => ({})))
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:empty'), revokeObjectURL: vi.fn() })

    // filename*='' → decodeRFC5987Value strips both quotes → empty string → falsy → fallback to filename=
    fetchWrapper.getFile.mockResolvedValueOnce({
      headers: {
        get: vi.fn(() => "attachment; filename*=''; filename=\"fallback.jpg\"")
      },
      blob: vi.fn(async () => mockBlob)
    })

    const store = useScreenshotsStore()
    const result = await store.open(23)

    expect(result.filename).toBe('fallback.jpg')
  })

  it('uses id-based fallback filename when Content-Disposition has no filename', async () => {
    const mockBlob = new Blob(['img'], { type: 'image/jpeg' })
    vi.stubGlobal('open', vi.fn(() => ({})))
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:nofn'), revokeObjectURL: vi.fn() })

    fetchWrapper.getFile.mockResolvedValueOnce({
      headers: { get: vi.fn(() => 'attachment') },
      blob: vi.fn(async () => mockBlob)
    })

    const store = useScreenshotsStore()
    const result = await store.open(24)

    expect(result.filename).toBe('screenshot-24')
  })

  it('uses id-based fallback filename when Content-Disposition is null', async () => {
    const mockBlob = new Blob(['img'], { type: 'image/jpeg' })
    vi.stubGlobal('open', vi.fn(() => ({})))
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:null'), revokeObjectURL: vi.fn() })

    fetchWrapper.getFile.mockResolvedValueOnce({
      headers: { get: vi.fn(() => null) },
      blob: vi.fn(async () => mockBlob)
    })

    const store = useScreenshotsStore()
    const result = await store.open(25)

    expect(result.filename).toBe('screenshot-25')
  })

  it('sets error state and rethrows when open() fails', async () => {
    const err = new Error('network error')
    fetchWrapper.getFile.mockRejectedValueOnce(err)

    const store = useScreenshotsStore()
    await expect(store.open(27)).rejects.toThrow('network error')
    expect(store.error).toBe(err)
    expect(store.loading).toBe(false)
  })

  it('does not decrement counts when removing an id that is not in the local list', async () => {
    fetchWrapper.delete.mockResolvedValueOnce(undefined)

    const store = useScreenshotsStore()
    store.screenshots = [{ id: 2 }]
    store.totalCount = 1

    await store.remove(999)

    expect(store.screenshots).toEqual([{ id: 2 }])
    expect(store.totalCount).toBe(1)
  })

  it('sets error state and rethrows when remove() fails', async () => {
    const err = new Error('delete failed')
    fetchWrapper.delete.mockRejectedValueOnce(err)

    const store = useScreenshotsStore()
    await expect(store.remove(1)).rejects.toThrow('delete failed')
    expect(store.error).toBe(err)
    expect(store.loading).toBe(false)
  })

  it('extracts single-quoted filename from Content-Disposition', async () => {
    const mockBlob = new Blob(['img'], { type: 'image/jpeg' })
    vi.stubGlobal('open', vi.fn(() => ({})))
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:sq'), revokeObjectURL: vi.fn() })

    fetchWrapper.getFile.mockResolvedValueOnce({
      headers: { get: vi.fn(() => "attachment; filename='single-quoted.jpg'") },
      blob: vi.fn(async () => mockBlob)
    })

    const store = useScreenshotsStore()
    const result = await store.open(30)

    expect(result.filename).toBe('single-quoted.jpg')
  })

  it('extracts unquoted filename from Content-Disposition', async () => {
    const mockBlob = new Blob(['img'], { type: 'image/jpeg' })
    vi.stubGlobal('open', vi.fn(() => ({})))
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:uq'), revokeObjectURL: vi.fn() })

    fetchWrapper.getFile.mockResolvedValueOnce({
      headers: { get: vi.fn(() => 'attachment; filename=unquoted.jpg') },
      blob: vi.fn(async () => mockBlob)
    })

    const store = useScreenshotsStore()
    const result = await store.open(31)

    expect(result.filename).toBe('unquoted.jpg')
  })

  it('falls back to id-based name when filename value is empty', async () => {
    const mockBlob = new Blob(['img'], { type: 'image/jpeg' })
    vi.stubGlobal('open', vi.fn(() => ({})))
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:efn'), revokeObjectURL: vi.fn() })

    fetchWrapper.getFile.mockResolvedValueOnce({
      headers: { get: vi.fn(() => 'attachment; filename=   ') },
      blob: vi.fn(async () => mockBlob)
    })

    const store = useScreenshotsStore()
    const result = await store.open(32)

    expect(result.filename).toBe('screenshot-32')
  })

  it('handles missing sortBy/sortOrder when screenshots_sort_by is undefined', async () => {
    authStore.screenshots_sort_by = undefined
    fetchWrapper.get.mockResolvedValueOnce({ items: [], pagination: {}, sorting: {} })

    const store = useScreenshotsStore()
    await store.getAllByDevice(7)

    const parsed = new URL(fetchWrapper.get.mock.calls[0][0])
    expect(parsed.searchParams.get('sortBy')).toBe('id')
    expect(parsed.searchParams.get('sortOrder')).toBe('asc')
  })

  it('defaults page to 1 when screenshots_page is 0 (falsy)', async () => {
    authStore.screenshots_page = 0
    fetchWrapper.get.mockResolvedValueOnce({ items: [], pagination: {}, sorting: {} })

    const store = useScreenshotsStore()
    await store.getAllByDevice(7)

    const parsed = new URL(fetchWrapper.get.mock.calls[0][0])
    expect(parsed.searchParams.get('page')).toBe('1')
  })

  it('defaults to empty array when API response has no items property', async () => {
    fetchWrapper.get.mockResolvedValueOnce({ pagination: { totalCount: 0 }, sorting: {} })

    const store = useScreenshotsStore()
    await store.getAllByDevice(7)

    expect(store.screenshots).toEqual([])
  })
})

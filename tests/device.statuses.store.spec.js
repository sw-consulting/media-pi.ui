// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDeviceStatusesStore } from '@/stores/device.statuses.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { useAuthStore } from '@/stores/auth.store.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: vi.fn(() => ({
    user: { token: 'mock-token' }
  }))
}))

const RealAbortController = global.AbortController

const mockStatuses = [
  { deviceId: 1, ipAddress: '192.168.1.10', isOnline: true, lastChecked: '2025-01-01T00:00:00Z', connectLatencyMs: 10, totalLatencyMs: 20 },
  { deviceId: 2, ipAddress: '192.168.1.11', isOnline: false, lastChecked: '2025-01-01T00:00:00Z', connectLatencyMs: 30, totalLatencyMs: 40 }
]

const normalizedMockStatus = {
  deviceId: 1,
  isOnline: true,
  lastChecked: '2025-01-01T00:00:00Z',
  connectLatencyMs: 10,
  totalLatencyMs: 20,
  softwareVersion: null,
  playbackServiceStatus: null,
  playlistUploadServiceStatus: null,
  videoUploadServiceStatus: null
}

const normalizedMockStatuses = [
  normalizedMockStatus,
  {
    deviceId: 2,
    isOnline: false,
    lastChecked: '2025-01-01T00:00:00Z',
    connectLatencyMs: 30,
    totalLatencyMs: 40,
    softwareVersion: null,
    playbackServiceStatus: null,
    playlistUploadServiceStatus: null,
    videoUploadServiceStatus: null
  }
]

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('device.statuses.store', () => {
  it('getAll sets statuses from API', async () => {
    fetchWrapper.get.mockResolvedValueOnce(mockStatuses)
    const store = useDeviceStatusesStore()
    await store.getAll()
    expect(fetchWrapper.get).toHaveBeenCalled()
    expect(store.statuses).toEqual(normalizedMockStatuses)
  })

  it('getById updates status in store', async () => {
    fetchWrapper.get.mockResolvedValueOnce(mockStatuses[0])
    const store = useDeviceStatusesStore()
    const result = await store.getById(1)
    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/1'))
    expect(store.statuses).toEqual([normalizedMockStatus])
    expect(result).toEqual(normalizedMockStatus)
  })

  it('getById adds the requested device id when snapshot omits it', async () => {
    const snapshot = {
      isOnline: true,
      lastChecked: '2025-01-01T00:00:00Z',
      connectLatencyMs: 10,
      totalLatencyMs: 20,
      playbackServiceStatus: true,
      playlistUploadServiceStatus: false,
      videoUploadServiceStatus: null
    }
    fetchWrapper.get.mockResolvedValueOnce(snapshot)
    const store = useDeviceStatusesStore()

    const result = await store.getById(1)

    const expected = { ...snapshot, deviceId: 1, softwareVersion: null }
    expect(store.statuses).toEqual([expected])
    expect(result).toEqual(expected)
  })

  it('normalizes PascalCase status items from the API', async () => {
    fetchWrapper.get.mockResolvedValueOnce({
      DeviceId: 1,
      IsOnline: true,
      LastChecked: '2025-01-01T00:00:00Z',
      ConnectLatencyMs: 10,
      TotalLatencyMs: 20,
      SoftwareVersion: '1.2.3',
      PlaybackServiceStatus: true,
      PlaylistUploadServiceStatus: false,
      VideoUploadServiceStatus: null
    })
    const store = useDeviceStatusesStore()

    const result = await store.getById(1)

    const expected = {
      deviceId: 1,
      isOnline: true,
      lastChecked: '2025-01-01T00:00:00Z',
      connectLatencyMs: 10,
      totalLatencyMs: 20,
      softwareVersion: '1.2.3',
      playbackServiceStatus: true,
      playlistUploadServiceStatus: false,
      videoUploadServiceStatus: null
    }
    expect(store.statuses).toEqual([expected])
    expect(result).toEqual(expected)
  })

  it('test posts and updates status', async () => {
    fetchWrapper.post.mockResolvedValueOnce(mockStatuses[0])
    const store = useDeviceStatusesStore()
    const result = await store.test(1)
    expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/1/test'), {})
    expect(store.statuses).toEqual([normalizedMockStatus])
    expect(result).toEqual(normalizedMockStatus)
  })

  it('startStream uses fetch with proper authentication and stopStream cancels stream', async () => {
    let readCallCount = 0
    let resolveSecondRead
    const secondRead = new Promise(resolve => { resolveSecondRead = resolve })
    const mockReader = {
      read: vi.fn().mockImplementation(() => {
        readCallCount++
        if (readCallCount === 1) {
          return Promise.resolve({
            done: false,
            value: new TextEncoder().encode('data: ' + JSON.stringify(mockStatuses[0]) + '\n')
          })
        } else {
          // Promise that we control to end the loop after stopStream
          return secondRead
        }
      }),
      cancel: vi.fn().mockResolvedValue(undefined)
    }

    const mockResponse = {
      ok: true,
      body: {
        getReader: () => mockReader
      }
    }

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse)

    const mockAbort = vi.fn()
    global.AbortController = vi.fn(() => ({
      signal: { aborted: false },
      abort: mockAbort
    }))

    const store = useDeviceStatusesStore()
    
    // Start the stream
    store.startStream()
    
    // Wait for the first message to be processed
    await new Promise(resolve => setTimeout(resolve, 50))
    
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/stream'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-token',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }),
        signal: expect.any(Object)
      })
    )
    expect(store.statuses).toEqual([normalizedMockStatus])
    
    // Stop the stream
    store.stopStream()
    // resolve the pending read so startStream can exit cleanly
    resolveSecondRead({ done: true })

    expect(mockAbort).toHaveBeenCalled()
    expect(mockReader.cancel).toHaveBeenCalled()
  })

  it('stopStream aborts pending fetch before stream starts', async () => {
    let capturedSignal
    let rejectFetch
    global.fetch = vi.fn((_url, opts) => new Promise((resolve, reject) => {
      capturedSignal = opts.signal
      rejectFetch = reject
    }))

    global.AbortController = RealAbortController

    const store = useDeviceStatusesStore()
    const startPromise = store.startStream()

    await Promise.resolve()

    store.stopStream()
    expect(capturedSignal.aborted).toBe(true)

    rejectFetch(Object.assign(new Error('aborted'), { name: 'AbortError' }))

    await startPromise

    expect(store.statuses).toEqual([])
  })

  it('keeps the shared stream alive until all consumers stop it', async () => {
    let capturedSignal
    let rejectFetch
    global.fetch = vi.fn((_url, opts) => new Promise((resolve, reject) => {
      capturedSignal = opts.signal
      rejectFetch = reject
    }))

    global.AbortController = RealAbortController

    const store = useDeviceStatusesStore()
    const startPromise = store.startStream()
    await Promise.resolve()
    await store.startStream()

    expect(global.fetch).toHaveBeenCalledTimes(1)

    store.stopStream()
    expect(capturedSignal.aborted).toBe(false)

    store.stopStream()
    expect(capturedSignal.aborted).toBe(true)

    rejectFetch(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    await startPromise
  })

  it('startStream handles fetch errors', async () => {
    const fetchError = new Error('Network error')
    global.fetch = vi.fn().mockRejectedValueOnce(fetchError)

    const store = useDeviceStatusesStore()
    await store.startStream()
    
    expect(store.error).toBe(fetchError)
  })

  it('startStream handles authentication errors', async () => {
    vi.mocked(useAuthStore).mockReturnValueOnce({ user: null })

    const store = useDeviceStatusesStore()
    await store.startStream()
    
    expect(store.error).toBeInstanceOf(Error)
    expect(store.error.message).toContain('No authentication token available')
  })

  it('startStream handles JSON parsing errors in SSE data', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: invalid-json\n') 
        })
        .mockResolvedValueOnce({ done: true }),
      cancel: vi.fn()
    }

    const mockResponse = {
      ok: true,
      body: {
        getReader: () => mockReader
      }
    }

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse)
    global.AbortController = vi.fn(() => ({
      signal: { aborted: false },
      abort: vi.fn()
    }))

    const store = useDeviceStatusesStore()
    await store.startStream()
    
    expect(store.error).toBeInstanceOf(Error)
  })

  it('getAll handles errors', async () => {
    const err = new Error('fail')
    fetchWrapper.get.mockRejectedValueOnce(err)
    const store = useDeviceStatusesStore()
    await expect(store.getAll()).rejects.toThrow('fail')
    expect(store.statuses).toEqual([])
    expect(store.error).toBe(err)
  })

  it('test handles errors', async () => {
    const err = new Error('fail')
    fetchWrapper.post.mockRejectedValueOnce(err)
    const store = useDeviceStatusesStore()
    await expect(store.test(1)).rejects.toThrow('fail')
    expect(store.error).toBe(err)
  })
})



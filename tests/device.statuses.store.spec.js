// Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// This file is a part of Media Pi frontend application

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
    expect(store.statuses).toEqual(mockStatuses)
  })

  it('getById updates status in store', async () => {
    fetchWrapper.get.mockResolvedValueOnce(mockStatuses[0])
    const store = useDeviceStatusesStore()
    await store.getById(1)
    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/1'))
    expect(store.statuses).toEqual([mockStatuses[0]])
  })

  it('test posts and updates status', async () => {
    fetchWrapper.post.mockResolvedValueOnce(mockStatuses[0])
    const store = useDeviceStatusesStore()
    await store.test(1)
    expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/1/test'), {})
    expect(store.statuses).toEqual([mockStatuses[0]])
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
    expect(store.statuses).toEqual([mockStatuses[0]])
    
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


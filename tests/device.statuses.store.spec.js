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

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

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

  it('startStream updates statuses on message and stopStream closes connection', () => {
    const close = vi.fn()
    class MockES {
      constructor(url) {
        this.url = url
        this.onmessage = null
        this.onerror = null
        this.close = close
        MockES.instance = this
      }
    }
    const original = global.EventSource
    global.EventSource = vi.fn((url) => new MockES(url))

    const store = useDeviceStatusesStore()
    store.startStream()
    expect(global.EventSource).toHaveBeenCalledWith(expect.stringContaining('/stream'))
    const item = mockStatuses[0]
    MockES.instance.onmessage({ data: JSON.stringify(item) })
    expect(store.statuses).toEqual([item])
    store.stopStream()
    expect(close).toHaveBeenCalled()

    global.EventSource = original
  })

  it('startStream assigns JSON errors to error', () => {
    class MockES {
      constructor(url) {
        this.url = url
        this.onmessage = null
        this.onerror = null
        this.close = vi.fn()
        MockES.instance = this
      }
    }
    const original = global.EventSource
    global.EventSource = vi.fn((url) => new MockES(url))

    const store = useDeviceStatusesStore()
    store.startStream()
    MockES.instance.onmessage({ data: 'invalid-json' })
    expect(store.error).toBeInstanceOf(Error)
    store.stopStream()

    global.EventSource = original
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


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

import { vi, describe, it, expect, beforeEach } from 'vitest'

// Place mocks back at the top level, which is fine with isolate: true in config
vi.mock('@/stores/auth.store.js', () => {
  return {
    useAuthStore: vi.fn(() => ({ user: { token: 'abc' }, logout: vi.fn() }))
  }
})

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api',
  enableLog: false
}))

import { fetchWrapper } from '@/helpers/fetch.wrapper.js'

const baseUrl = 'http://localhost:8080/api'

describe('fetchWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('handles successful json response', async () => {
    const response = { ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(JSON.stringify({ ok: true })) }
    global.fetch = vi.fn(() => Promise.resolve(response))
    const data = await fetchWrapper.get(`${baseUrl}/test`)
    expect(data).toEqual({ ok: true })
    expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/test`, { method: 'GET', headers: { Authorization: 'Bearer abc' } })
  })

  it('returns undefined for 204 responses', async () => {
    const response = { ok: true, status: 204, statusText: 'No Content', text: () => Promise.resolve('') }
    global.fetch = vi.fn(() => Promise.resolve(response))
    const data = await fetchWrapper.get(`${baseUrl}/empty`)
    expect(data).toBeUndefined()
  })

  it('throws parsed error for failed requests', async () => {
    const response = { ok: false, status: 401, statusText: 'Unauthorized', text: () => Promise.resolve(JSON.stringify({ msg: 'bad' })) }
    global.fetch = vi.fn(() => Promise.resolve(response))
    await expect(fetchWrapper.get(`${baseUrl}/fail`)).rejects.toThrow('bad')
  })

  it('throws network error in russian', async () => {
    global.fetch = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
    await expect(fetchWrapper.get(`${baseUrl}/neterr`)).rejects.toThrow('Не удалось соединиться')
  })
})

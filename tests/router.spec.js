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

let authStore
const alertClear = vi.fn()
const alertError = vi.fn()
const checkMock = vi.fn()

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ clear: alertClear, error: alertError })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStore
}))

vi.mock('@/views/User_LoginView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/User_RecoverView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/User_RegisterView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/Users_View.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/User_EditView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/Registers_View.vue', () => ({ default: { template: '<div />' } }))

import router from '@/router'

async function resetRouter(to = "/recover") {
  await router.replace(to);
  await router.isReady();
}

describe('router guards', () => {
  beforeEach(async () => {
    // Create auth store with ref for user
    authStore = { 
      user: null, 
      returnUrl: null, 
      check: checkMock, 
      isAdmin: false, 
      isLogist: false, 
      permissionRedirect: false 
    }
    checkMock.mockResolvedValue()
    alertClear.mockClear()
    alertError.mockClear()
    await resetRouter("/recover")
  })

  it('redirects unauthenticated users to login', async () => {
    await router.push('/users')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/login')
    expect(authStore.returnUrl).toBe('/users')
  })

  it('redirects authenticated users away from login to registers', async () => {
    // Directly set user property instead of using $patch
    authStore.user = { id: 3 }
    
    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/registers')
  })

  describe('root path redirects', () => {
    it('redirects unauthenticated user to login', async () => {
      // Set user to null directly, no need to use ref
      authStore.user = null
      
      await router.push('/')
      await router.isReady()
      expect(router.currentRoute.value.fullPath).toBe('/login')
    })

    it('redirects user to registers', async () => {
      // Set user directly, not as a ref value
      authStore.user = { id: 3 }
      authStore.isLogist = true
      authStore.isAdmin = true
      
      await router.push('/')
      await router.isReady()
      expect(router.currentRoute.value.fullPath).toBe('/registers')
    })

  })
})

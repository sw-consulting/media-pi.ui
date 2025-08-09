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

// Mock router
vi.mock('@/router', () => ({
  default: {
    push: vi.fn()
  }
}))

// Mock auth store
vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: vi.fn()
}))

import { redirectToDefaultRoute } from '@/helpers/default.route.js'
import router from '@/router'
import { useAuthStore } from '@/stores/auth.store.js'

describe('redirectToDefaultRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to login when user is not authenticated', () => {
    useAuthStore.mockReturnValue({
      user: null,
      isAdministrator: false,
      isManager: false,
      isEngineer: false
    })
    
    redirectToDefaultRoute()
    
    expect(router.push).toHaveBeenCalledWith('/login')
  })

  it('redirects administrator to accounts', () => {
    useAuthStore.mockReturnValue({
      user: { id: 1, roles: [1] },
      isAdministrator: true,
      isManager: false,
      isEngineer: false
    })
    
    redirectToDefaultRoute()
    
    expect(router.push).toHaveBeenCalledWith('/accounts')
  })

  it('redirects manager to accounts', () => {
    useAuthStore.mockReturnValue({
      user: { id: 2, roles: [11] },
      isAdministrator: false,
      isManager: true,
      isEngineer: false
    })
    
    redirectToDefaultRoute()
    
    expect(router.push).toHaveBeenCalledWith('/accounts')
  })

  it('redirects engineer to accounts', () => {
    useAuthStore.mockReturnValue({
      user: { id: 3, roles: [21] },
      isAdministrator: false,
      isManager: false,
      isEngineer: true
    })
    
    redirectToDefaultRoute()
    
    expect(router.push).toHaveBeenCalledWith('/accounts')
  })

  it('redirects user without role to edit page', () => {
    useAuthStore.mockReturnValue({
      user: { id: 4, roles: [] },
      isAdministrator: false,
      isManager: false,
      isEngineer: false
    })
    
    redirectToDefaultRoute()
    
    expect(router.push).toHaveBeenCalledWith('/user/edit/4')
  })

  it('redirects user with unknown role to edit page', () => {
    useAuthStore.mockReturnValue({
      user: { id: 5, roles: [99] },
      isAdministrator: false,
      isManager: false,
      isEngineer: false
    })
    
    redirectToDefaultRoute()
    
    expect(router.push).toHaveBeenCalledWith('/user/edit/5')
  })
})

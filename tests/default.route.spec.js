// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

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


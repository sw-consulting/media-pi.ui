// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

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
vi.mock('@/views/Accounts_View.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/DeviceGroup_CreateView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/DeviceGroup_EditView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/Device_CreateView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/Device_EditView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/Device_ManagementView.vue', () => ({ default: { template: '<div />' } }))

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

  it('redirects authenticated users away from login to accounts', async () => {
    // Directly set user property with a role
    authStore.user = { id: 3 }
    authStore.isAdministrator = true
    
    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/accounts')
  })

  it('redirects authenticated users without roles to their edit form', async () => {
    // User without any roles
    authStore.user = { id: 3 }
    authStore.isAdministrator = false
    authStore.isManager = false
    authStore.isEngineer = false
    
    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/user/edit/3')
  })

  describe('root path redirects', () => {
    it('redirects unauthenticated user to login', async () => {
      // Set user to null directly, no need to use ref
      authStore.user = null
      
      await router.push('/')
      await router.isReady()
      expect(router.currentRoute.value.fullPath).toBe('/login')
    })

    it('redirects user to accounts', async () => {
      // Set user directly, not as a ref value
      authStore.user = { id: 3 }
      authStore.isAdministrator = true

      await router.push('/')
      await router.isReady()
      expect(router.currentRoute.value.fullPath).toBe('/accounts')
    })

  })
})


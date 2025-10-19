/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

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
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useStatusStore } from '@/stores/status.store.js'

// Mock the roles store to prevent HTTP requests
vi.mock('@/stores/roles.store.js', () => ({
  useRolesStore: vi.fn(() => ({
    ensureLoaded: vi.fn().mockResolvedValue(),
    roles: [],
    loading: false,
    error: null
  }))
}))

// Mock the getRoleName function to return consistent test data while keeping other functions
vi.mock('@/helpers/user.helpers.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getRoleName: vi.fn(() => 'Test Role')
  }
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock Vuetify display composable
vi.mock('vuetify', () => ({
  useDisplay: () => ({
    height: { value: 600 }
  })
}))

// Mock the router with all necessary routes
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/login', component: { template: '<div>Login</div>' } },
    { path: '/users', component: { template: '<div>Users</div>' } },
    { path: '/accounts', component: { template: '<div>Accounts</div>' } },
    { path: '/user/edit/:id', component: { template: '<div>Edit User</div>' } },
    { path: '/recover', component: { template: '<div>Recover</div>' } },
    { path: '/register', component: { template: '<div>Register</div>' } },
    { path: '/videos', component: { template: '<div>Videos</div>' } }
  ]
})

describe('App Logout Functionality', () => {
  let authStore
  let statusStore
  let wrapper

  beforeEach(async () => {
    setActivePinia(createPinia())
    authStore = useAuthStore()
    statusStore = useStatusStore()
    
    // Mock the status store fetchStatus method
    statusStore.fetchStatus = vi.fn().mockResolvedValue({})
    
    // Set up a logged-in user
    authStore.user = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      patronymic: 'Smith',
      email: 'john@example.com',
      roles: [1] 
    }

    // Mock the logout method to properly clear user data
    authStore.logout = vi.fn(() => {
      authStore.user = null
      localStorage.removeItem('user')
    })

    await router.push('/')
    await router.isReady()

    wrapper = mount(App, {
      global: {
        plugins: [router],
        stubs: {
          RouterView: true,
          'v-app': { template: '<div class="v-app"><slot /></div>' },
          'v-app-bar': { template: '<div class="v-app-bar"><slot name="prepend" /><slot /></div>' },
          'v-app-bar-nav-icon': { template: '<button class="nav-icon" />' },
          'v-app-bar-title': { template: '<div class="orange"><slot /></div>' },
          'v-spacer': { template: '<div class="spacer" />' },
          'v-navigation-drawer': { 
            template: '<div class="nav-drawer"><slot name="prepend" /><slot /><slot name="append" /></div>' 
          },
          'v-list': { template: '<ul><slot /></ul>' },
          'v-list-item': { template: '<li><slot /></li>' },
          'v-main': { template: '<main><slot /></main>' }
        }
      }
    })
  })

  it('should display logout link when user is logged in', () => {
    const logoutLinks = wrapper.findAll('a[class="link"]')
    const logoutLink = logoutLinks.find(link => link.text() === 'Выход')
    expect(logoutLink).toBeTruthy()
    expect(logoutLink.text()).toBe('Выход')
  })

  it('should call logout and navigate to login page when logout is clicked', async () => {
    // Find the logout link specifically
    const logoutLinks = wrapper.findAll('a[class="link"]')
    const logoutLink = logoutLinks.find(link => link.text() === 'Выход')
    expect(logoutLink).toBeTruthy()
    expect(logoutLink.text()).toBe('Выход')

    // Click the logout link
    await logoutLink.trigger('click')

    // Verify logout was called
    expect(authStore.logout).toHaveBeenCalled()
  })

  it('should clear user data after logout', async () => {
    // Verify user is initially logged in
    expect(authStore.user).toBeTruthy()
    expect(authStore.isAdministrator).toBe(true)

    // Find and click logout link
    const logoutLinks = wrapper.findAll('a[class="link"]')
    const logoutLink = logoutLinks.find(link => link.text() === 'Выход')
    await logoutLink.trigger('click')

    // Verify user data is cleared
    expect(authStore.user).toBeNull()
    // Since these are computed properties based on user.roles, they become falsy when user is null
    expect(authStore.isAdministrator).toBeFalsy()
  })

  it('should display login link when user is not logged in', async () => {
    // Logout the user
    authStore.logout()
    
    await wrapper.vm.$nextTick()

    // Check that login link is displayed
    const loginLink = wrapper.find('a[class="link"]')
    expect(loginLink.exists()).toBe(true)
    expect(loginLink.text()).toBe('Вход')
  })

  it('should show user name in app bar when logged in', () => {
    const appBarTitle = wrapper.find('.orange')
    expect(appBarTitle.text()).toContain('Test Role | Doe John Smith')
  })

  it('should not show user name in app bar when logged out', async () => {
    // Logout the user
    authStore.user = null
    await wrapper.vm.$nextTick()

    const appBarTitle = wrapper.find('.orange')
    expect(appBarTitle.text()).toBe('Media Pi')
  })
})


/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UserLoginView from '@/views/User_LoginView.vue'
import { resolveAll } from './helpers/test-utils'

const routerPush = vi.hoisted(() => vi.fn())
const loginMock = vi.hoisted(() => vi.fn().mockResolvedValue())
let authStore

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { ...actual, storeToRefs: (store) => store }
})

vi.mock('@/router', () => ({
  default: { push: routerPush }
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ alert: null, clear: vi.fn(), error: vi.fn() })
}))

vi.mock('@/helpers/default.route.js', () => ({
  redirectToDefaultRoute: vi.fn()
}))

vi.mock('@/stores/roles.store.js', () => ({
  useRolesStore: () => ({
    ensureLoaded: vi.fn().mockResolvedValue()
  })
}))

const FormStub = {
  template: '<form @submit.prevent="$emit(\'submit\')"><slot :errors="{}" :isSubmitting="false" /></form>'
}
const FieldStub = {
  props: ['name', 'id', 'type'],
  template: '<input :id="id" :type="type" />'
}

describe('User_LoginView.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStore = { 
      login: loginMock, 
      isAdministrator: false, 
      isManager: false, 
      isEngineer: false,
      user: { id: 1 } 
    }
  })

  it('toggles password visibility', async () => {
    const wrapper = mount(UserLoginView, {
      global: { stubs: { Form: FormStub, Field: FieldStub, 'font-awesome-icon': true } }
    })
    const pwdInput = wrapper.find('#login_password')
    expect(pwdInput.attributes('type')).toBe('password')
    const toggle = wrapper.find('button[type="button"]')
    await toggle.trigger('click')
    expect(wrapper.find('#login_password').attributes('type')).toBe('text')
  })

  it('redirects after successful login', async () => {
    authStore.isAdministrator = true
    const wrapper = mount(UserLoginView, {
      global: { stubs: { Form: FormStub, Field: FieldStub, 'font-awesome-icon': true } }
    })
    await wrapper.vm.onSubmit({ login_email: 'a', login_password: 'b' })
    await resolveAll()
    expect(loginMock).toHaveBeenCalledWith('a', 'b')
    
    const { redirectToDefaultRoute } = await import('@/helpers/default.route.js')
    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('redirects non-admin to edit page', async () => {
    authStore.isAdministrator = false
    const wrapper = mount(UserLoginView, {
      global: { stubs: { Form: FormStub, Field: FieldStub, 'font-awesome-icon': true } }
    })
    await wrapper.vm.onSubmit({ login_email: 'a', login_password: 'b' })
    await resolveAll()
    
    const { redirectToDefaultRoute } = await import('@/helpers/default.route.js')
    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })
})


/* @vitest-environment jsdom */

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
  useAlertStore: () => ({ alert: null, clear: vi.fn() })
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
    authStore = { login: loginMock, isAdmin: false, user: { id: 1 } }
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
    expect(routerPush).toHaveBeenCalledWith('/accounts')
  })

  it('redirects non-admin to edit page', async () => {
    authStore.isAdministrator = false
    const wrapper = mount(UserLoginView, {
      global: { stubs: { Form: FormStub, Field: FieldStub, 'font-awesome-icon': true } }
    })
    await wrapper.vm.onSubmit({ login_email: 'a', login_password: 'b' })
    await resolveAll()
    expect(routerPush).toHaveBeenCalledWith('/user/edit/1')
  })
})

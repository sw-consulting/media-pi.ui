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

/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AccountsTree from '@/components/Accounts_Tree.vue'
import { resolveAll } from './helpers/test-utils'

let authStore
const accountsStore = {
  accounts: [],
  getAll: vi.fn().mockResolvedValue()
}
const devicesStore = {
  devices: [],
  getAll: vi.fn().mockResolvedValue()
}
const deviceGroupsStore = {
  groups: [],
  getAll: vi.fn().mockResolvedValue()
}

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { ...actual, storeToRefs: (store) => store }
})

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStore
}))

vi.mock('@/stores/accounts.store.js', () => ({
  useAccountsStore: () => accountsStore
}))

vi.mock('@/stores/devices.store.js', () => ({
  useDevicesStore: () => devicesStore
}))

vi.mock('@/stores/device.groups.store.js', () => ({
  useDeviceGroupsStore: () => deviceGroupsStore
}))

const mountTree = () => mount(AccountsTree, {
  global: {
    stubs: {
      'v-card': { template: '<div><slot /></div>' },
      'v-treeview': { props: ['items'], template: '<div />' }
    }
  }
})

describe('Accounts_Tree.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accountsStore.accounts = []
    devicesStore.devices = []
    deviceGroupsStore.groups = []
  })

  it('renders both roots for administrator', async () => {
    authStore = { isAdministrator: true, isManager: false, isEngineer: false }
    accountsStore.accounts = [
      { id: 1, name: 'Account 1' }
    ]
    devicesStore.devices = [
      { id: 1, name: 'Device A', accountId: 0 },
      { id: 2, name: 'Device B', accountId: 1, deviceGroupId: 0 }
    ]
    const wrapper = mountTree()
    await resolveAll()
    expect(wrapper.vm.treeItems.length).toBe(2)
    expect(wrapper.vm.treeItems[0].name).toBe('Нераспределённые устройства')
    expect(wrapper.vm.treeItems[1].name).toBe('Лицевые счета')
    expect(wrapper.vm.treeItems[1].children[0].name).toBe('Account 1')
  })

  it('shows only accounts for manager', async () => {
    authStore = { isAdministrator: false, isManager: true, isEngineer: false }
    accountsStore.accounts = [
      { id: 1, name: 'Account 1' }
    ]
    devicesStore.devices = [
      { id: 2, name: 'Device B', accountId: 1, deviceGroupId: 0 }
    ]
    const wrapper = mountTree()
    await resolveAll()
    expect(wrapper.vm.treeItems.length).toBe(1)
    expect(wrapper.vm.treeItems[0].name).toBe('Лицевые счета')
    expect(wrapper.vm.treeItems[0].children[0].children[0].name).toBe('Нераспределённые устройства')
  })

  it('shows only unassigned devices for engineer', async () => {
    authStore = { isAdministrator: false, isManager: false, isEngineer: true }
    devicesStore.devices = [
      { id: 1, name: 'Device A', accountId: 0 }
    ]
    const wrapper = mountTree()
    await resolveAll()
    expect(wrapper.vm.treeItems.length).toBe(1)
    expect(wrapper.vm.treeItems[0].name).toBe('Нераспределённые устройства')
  })
})


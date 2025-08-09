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

<script setup>
import { onMounted, ref, computed } from 'vue'
import { useAccountsCaption } from '@/helpers/accounts.caption.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAccountsStore } from '@/stores/accounts.store.js'
import { useDevicesStore } from '@/stores/devices.store.js'
import { useDeviceGroupsStore } from '@/stores/device.groups.store.js'

const accountsCaption = useAccountsCaption()
const authStore = useAuthStore()
const accountsStore = useAccountsStore()
const devicesStore = useDevicesStore()
const deviceGroupsStore = useDeviceGroupsStore()

const loading = ref(true)

// Role-based access helper functions
const canViewUnassignedDevices = computed(() => 
  authStore.isAdministrator || authStore.isEngineer
)

const canViewAccounts = computed(() => 
  authStore.isAdministrator || authStore.isManager
)

onMounted(async () => {
  try {
    await Promise.all([
      accountsStore.getAll(),
      devicesStore.getAll(),
      deviceGroupsStore.getAll()
    ])
  } finally {
    loading.value = false
  }
})

const unassignedRoot = computed(() => {
  if (!canViewUnassignedDevices.value) return null
  const children = (devicesStore.devices || [])
    .filter(d => !d.accountId || d.accountId === 0)
    .map(d => ({ id: `device-${d.id}`, name: d.name }))
  return { id: 'root-unassigned', name: 'Нераспределённые устройства', children }
})

const accountsRoot = computed(() => {
  if (!canViewAccounts.value) return null
  const accounts = (accountsStore.accounts || []).map(acc => {
    const devices = (devicesStore.devices || []).filter(d => d.accountId === acc.id)
    const unassigned = devices
      .filter(d => !d.deviceGroupId || d.deviceGroupId === 0)
      .map(d => ({ id: `device-${d.id}`, name: d.name }))
    const groups = (deviceGroupsStore.groups || [])
      .filter(g => g.accountId === acc.id)
      .map(g => ({
        id: `group-${g.id}`,
        name: g.name,
        children: devices
          .filter(d => d.deviceGroupId === g.id)
          .map(d => ({ id: `device-${d.id}`, name: d.name }))
      }))
    const children = []
    if (unassigned.length > 0) {
      children.push({ id: `account-${acc.id}-unassigned`, name: 'Нераспределённые устройства', children: unassigned })
    }
    children.push(...groups)
    return { id: `account-${acc.id}`, name: acc.name, children }
  })
  return { id: 'root-accounts', name: 'Лицевые счета', children: accounts }
})

const treeItems = computed(() => {
  const items = []
  if (unassignedRoot.value) items.push(unassignedRoot.value)
  if (accountsRoot.value) items.push(accountsRoot.value)
  return items
})
</script>

<template>
  <div class="settings table-2">
    <h1 class="orange">{{ accountsCaption || 'Информация не доступна' }}</h1>
    <hr class="hr" />

    <v-card>
      <v-treeview
        v-if="!loading"
        :items="treeItems"
        item-title="name"
        item-value="id"
        open-on-click
      />
    </v-card>
  </div>
</template>


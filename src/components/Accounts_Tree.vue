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
import { useAlertStore } from '@/stores/alert.store.js'

const authStore = useAuthStore()
const accountsStore = useAccountsStore()
const devicesStore = useDevicesStore()
const deviceGroupsStore = useDeviceGroupsStore()
const alertStore = useAlertStore()

const accountsCaption = useAccountsCaption(authStore)

const loading = ref(true)
const loadedNodes = ref(new Set())
const loadingNodes = ref(new Set())

// Role-based access helper functions
const canViewUnassignedDevices = computed(() => 
  authStore.isAdministrator || authStore.isEngineer
)

const canViewAccounts = computed(() => 
  authStore.isAdministrator || authStore.isManager
)

onMounted(async () => {
  try {
    // Only load accounts initially for lazy loading
    await accountsStore.getAll()
  } catch (error) {
    alertStore.error('Не удалось загрузить данные: ' + (error.message || error))
  } finally {
    loading.value = false
  }
})

// Initial tree structure (only top-level nodes with lazy loading markers)
const treeItems = computed(() => {
  const items = []
  
  if (canViewUnassignedDevices.value) {
    const hasChildren = !loadedNodes.value.has('root-unassigned')
    items.push({
      id: 'root-unassigned',
      name: 'Нераспределённые устройства',
      children: hasChildren ? [] : getUnassignedDevices()
    })
  }
  
  if (canViewAccounts.value) {
    const accounts = (accountsStore.accounts || []).map(acc => {
      const hasChildren = !loadedNodes.value.has(`account-${acc.id}`)
      return {
        id: `account-${acc.id}`,
        name: acc.name,
        children: hasChildren ? [] : getAccountChildren(acc.id)
      }
    })
    
    items.push({
      id: 'root-accounts',
      name: 'Лицевые счета',
      children: accounts
    })
  }
  
  return items
})

// Helper function to get unassigned devices
const getUnassignedDevices = () => {
  return (devicesStore.devices || [])
    .filter(d => !d.accountId || d.accountId === 0)
    .map(d => ({ id: `device-${d.id}`, name: d.name }))
}

// Helper function to get children for a specific account
const getAccountChildren = (accountId) => {
  const devices = (devicesStore.devices || []).filter(d => d.accountId === accountId)
  const unassigned = devices
    .filter(d => !d.deviceGroupId || d.deviceGroupId === 0)
    .map(d => ({ id: `device-${d.id}`, name: d.name }))
  
  const groups = (deviceGroupsStore.groups || [])
    .filter(g => g.accountId === accountId)
    .map(g => ({
      id: `group-${g.id}`,
      name: g.name,
      children: devices
        .filter(d => d.deviceGroupId === g.id)
        .map(d => ({ id: `device-${d.id}`, name: d.name }))
    }))
  
  const children = []
  if (unassigned.length > 0) {
    children.push({ 
      id: `account-${accountId}-unassigned`, 
      name: 'Нераспределённые устройства', 
      children: unassigned 
    })
  }
  children.push(...groups)
  
  return children
}

// Lazy loading function with exception handling
const loadChildren = async (item) => {
  const nodeId = item.id
  
  // Prevent duplicate loading
  if (loadedNodes.value.has(nodeId) || loadingNodes.value.has(nodeId)) {
    return
  }
  
  loadingNodes.value.add(nodeId)
  
  try {
    if (nodeId === 'root-unassigned') {
      // Load devices for unassigned root
      await devicesStore.getAll()
      loadedNodes.value.add(nodeId)
      
    } else if (nodeId.startsWith('account-')) {
      // Load devices and groups for specific account
      await Promise.all([
        devicesStore.getAll(),
        deviceGroupsStore.getAll()
      ])
      loadedNodes.value.add(nodeId)
    }
    
    // Force reactivity update
    treeItems.value
    
  } catch (error) {
    alertStore.error(`Не удалось загрузить данные для "${item.name}": ` + (error.message || error))
    console.error('Lazy loading failed for', nodeId, error)
  } finally {
    loadingNodes.value.delete(nodeId)
  }
}
</script>

<template>
  <div class="settings table-2">
    <h1 class="orange">{{ accountsCaption || 'Информация не доступна' }}</h1>
    <hr class="hr" />

    <v-card>
      <v-progress-linear 
        v-if="loading" 
        indeterminate 
        color="primary"
        class="mb-2"
      />
      
      <v-treeview
        v-if="!loading"
        :items="treeItems"
        item-title="name"
        item-value="id"
        :load-children="loadChildren"
        open-on-click
      >
        <template #prepend="{ item }">
          <v-progress-circular
            v-if="loadingNodes.has(item.id)"
            indeterminate
            size="16"
            width="2"
            color="primary"
          />
          <v-icon v-else-if="item.children && item.children.length === 0" size="16">
            mdi-folder-outline
          </v-icon>
          <v-icon v-else-if="item.children && item.children.length > 0" size="16">
            mdi-folder-open-outline
          </v-icon>
          <v-icon v-else size="16">
            mdi-circle-small
          </v-icon>
        </template>
      </v-treeview>
      
      <v-alert
        v-if="!loading && treeItems.length === 0"
        type="info"
        variant="outlined"
        class="ma-4"
      >
        Нет данных для отображения
      </v-alert>
    </v-card>
  </div>
</template>


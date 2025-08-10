// Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software")
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
import { onMounted, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAccountsCaption } from '@/helpers/accounts.caption.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAccountsStore } from '@/stores/accounts.store.js'
import { useDevicesStore } from '@/stores/devices.store.js'
import { useDeviceGroupsStore } from '@/stores/device.groups.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import ActionButton from '@/components/ActionButton.vue'

const router = useRouter()
const authStore = useAuthStore()
const accountsStore = useAccountsStore()
const devicesStore = useDevicesStore()
const deviceGroupsStore = useDeviceGroupsStore()
const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)
const { getAccountsTreeState } = storeToRefs(authStore)

const accountsCaption = useAccountsCaption(authStore)

const loading = ref(true)
const loadedNodes = ref(new Set())
const loadingNodes = ref(new Set())

// Tree state from auth store
const selectedNode = ref([])
const expandedNodes = ref([])

// Role-based access helper functions
const canViewUnassignedDevices = computed(() => 
  authStore.isAdministrator || authStore.isEngineer
)

const canViewAccounts = computed(() => 
  authStore.isAdministrator || authStore.isManager
)

// Restore state from auth store
const restoreTreeState = () => {
  const savedState = getAccountsTreeState.value
  if (savedState.selectedNode) {
    selectedNode.value = [savedState.selectedNode]
  }
  if (savedState.expandedNodes && savedState.expandedNodes.length > 0) {
    expandedNodes.value = [...savedState.expandedNodes]
  }
}

// Save state to auth store
const saveTreeState = () => {
  const selected = selectedNode.value && selectedNode.value.length > 0 ? selectedNode.value[0] : null
  const expanded = expandedNodes.value || []
  authStore.saveAccountsTreeState(selected, expanded)
}

// Watch for changes and auto-save
watch([selectedNode, expandedNodes], () => {
  saveTreeState()
}, { deep: true })

onMounted(async () => {
  try {
    // Only load accounts if user can view them
    if (canViewAccounts.value) {
      await accountsStore.getAll()
    }
    // Restore tree state after data is loaded
    restoreTreeState()
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
  } finally {
    loadingNodes.value.delete(nodeId)
  }
}

// Action button functions
const canManageAccounts = computed(() => authStore.isAdministrator)

const createAccount = () => {
  try {
    router.push('/account/create')
  } catch (error) {
    alertStore.error(`Не удалось перейти к созданию лицевого счёта: ${error.message || error}`)
  }
}

const editAccount = (item) => {
  try {
    const accountId = typeof item === 'object' ? item.id : item
    router.push(`/account/edit/${accountId}`)
  } catch (error) {
    alertStore.error(`Не удалось перейти к редактированию лицевого счёта: ${error.message || error}`)
  }
}

const deleteAccount = async (item) => {
  const accountId = typeof item === 'object' ? item.id : item
  const account = accountsStore.accounts.find(a => a.id === accountId)
  if (!account) return
  
  // eslint-disable-next-line no-undef
  const confirmed = confirm('Вы уверены, что хотите удалить этот лицевой счёт?')
  
  if (confirmed) {
    try {
      await accountsStore.delete(accountId)
    } catch (error) {
      alertStore.error(`Ошибка при удалении лицевого счёта: ${error.message || error}`)
    }
  }
}

// Helper to extract account ID from tree node ID
const getAccountIdFromNodeId = (nodeId) => {
  if (nodeId.startsWith('account-')) {
    return parseInt(nodeId.replace('account-', ''))
  }
  return null
}
</script>

<template>
  <div class="settings table-2">
    <h1 class="primary-heading">{{ accountsCaption || 'Информация не доступна' }}</h1>
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
        v-model:selected="selectedNode"
        v-model:opened="expandedNodes"
        open-on-click
        selectable
      >
        <template #prepend="{ item }">
          <v-progress-circular
            v-if="loadingNodes.has(item.id)"
            indeterminate
            size="16"
            width="2"
            color="primary"
          />
          <font-awesome-icon v-else-if="item.children && item.children.length === 0" icon="fa-regular fa-folder" size="1x" class="anti-btn" />
          <font-awesome-icon v-else-if="item.children && item.children.length > 0" icon="fa-regular fa-folder-open" size="1x" class="anti-btn" />
          <font-awesome-icon v-else icon="fa-regular fa-circle" size="1x" class="anti-btn" />
        </template>
        
        <template #append="{ item }">
          <!-- Action buttons for root-accounts node -->
          <div v-if="item.id === 'root-accounts' && canManageAccounts" class="tree-actions">
            <ActionButton :item="item" icon="fa-solid fa-plus" tooltip-text="Создать лицевой счёт" @click="createAccount" />
          </div>
          
          <!-- Action buttons for account nodes -->
          <div v-else-if="item.id.startsWith('account-') && canManageAccounts" class="tree-actions">
            <ActionButton :item="{ id: getAccountIdFromNodeId(item.id) }"  icon="fa-solid fa-pen" tooltip-text="Редактировать лицевой счёт"  @click="editAccount" />
            <ActionButton :item="{ id: getAccountIdFromNodeId(item.id) }"  icon="fa-solid fa-trash-can" tooltip-text="Удалить лицевой счёт" @click="deleteAccount" />
          </div>
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
    
    <!-- Global alert messages -->
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

<style scoped>
.tree-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.tree-actions .anti-btn {
  padding: 2px 6px;
  margin: 0 2px;
  font-size: 12px;
  min-width: auto;
  height: auto;
}

.tree-actions .anti-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}
</style>


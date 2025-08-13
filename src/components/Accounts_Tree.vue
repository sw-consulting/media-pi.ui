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
import { useAccountsTreeHelper } from '@/helpers/accounts.tree.helpers.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAccountsStore } from '@/stores/accounts.store.js'
import { useDevicesStore } from '@/stores/devices.store.js'
import { useDeviceGroupsStore } from '@/stores/device.groups.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirmation } from '@/helpers/confirmation.js'
import ActionButton from '@/components/ActionButton.vue'

const router = useRouter()
const authStore = useAuthStore()
const accountsStore = useAccountsStore()
const devicesStore = useDevicesStore()
const deviceGroupsStore = useDeviceGroupsStore()
const alertStore = useAlertStore()
const { confirmDelete } = useConfirmation()
const { alert } = storeToRefs(alertStore)

// Initialize tree helper
const {
  buildTreeItems,
  createLoadChildrenHandler,
  createStateManager,
  createAccountActions,
  getAccountIdFromNodeId,
  createPermissionCheckers
} = useAccountsTreeHelper()

const accountsCaption = useAccountsCaption(authStore)

const loading = ref(true)
const loadedNodes = ref(new Set())
const loadingNodes = ref(new Set())

// Tree state from auth store
const selectedNode = ref([])
const expandedNodes = ref([])

// Permission checkers
const {
  canViewUnassignedDevices,
  canViewAccounts,
  canEditAccounts,
  canCreateDeleteAccounts
} = createPermissionCheckers(authStore)

// State management
const { restoreTreeState, saveTreeState } = createStateManager(authStore)

// Action handlers
const { createAccount, editAccount, deleteAccount } = createAccountActions(
  router, 
  alertStore, 
  accountsStore, 
  confirmDelete
)

// Loading handler
const loadChildren = createLoadChildrenHandler(
  loadedNodes,
  loadingNodes,
  devicesStore,
  deviceGroupsStore,
  alertStore
)

// Watch for changes and auto-save
watch([selectedNode, expandedNodes], () => {
  saveTreeState(selectedNode, expandedNodes)
}, { deep: true })

onMounted(async () => {
  try {
    // Only load accounts if user can view them
    if (canViewAccounts.value) {
      await accountsStore.getAll()
    }
    // Restore tree state after data is loaded
    restoreTreeState(selectedNode, expandedNodes)
  } catch (error) {
    alertStore.error('Не удалось загрузить данные: ' + (error.message || error))
  } finally {
    loading.value = false
  }
})

// Tree structure using helper
const treeItems = computed(() => {
  return buildTreeItems(
    canViewUnassignedDevices.value,
    canViewAccounts.value,
    loadedNodes.value,
    accountsStore,
    devicesStore,
    deviceGroupsStore
  )
})
</script>

<template>
  <div class="settings table-2">
    <h1 class="primary-heading">{{ accountsCaption || 'Информация не доступна' }}</h1>
    <hr class="hr" />

    <v-card>
      <div v-if="loading" class="text-center m-5">
        <span class="spinner-border spinner-border-lg align-center"></span>
      </div>
      
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
          <!-- Device icons -->
          <font-awesome-icon v-else-if="item.id.startsWith('device-')" icon="fa-solid fa-tv" size="1x" class="anti-btn" />
          <!-- Device Group icons -->
          <font-awesome-icon v-else-if="item.id.startsWith('group-')" icon="fa-solid fa-object-group" size="1x" class="anti-btn" />
          <!-- Device Groups container icons -->
          <font-awesome-icon v-else-if="item.id.includes('-groups')" icon="fa-solid fa-layer-group" size="1x" class="anti-btn" />
          <!-- Account icons -->
          <font-awesome-icon v-else-if="item.id.startsWith('account-') && !item.id.includes('-unassigned') && !item.id.includes('-groups')" icon="fa-solid fa-building-user" size="1x" class="anti-btn" />
          <!-- Accounts container icon -->
          <font-awesome-icon v-else-if="item.id === 'root-accounts'" icon="fa-solid fa-city" size="1x" class="anti-btn" />
          <!-- Unassigned devices icons -->
          <font-awesome-icon v-else-if="item.id === 'root-unassigned' || item.id.includes('-unassigned')" icon="fa-regular fa-circle-question" size="1x" class="anti-btn" />
          <!-- Fallback for any other nodes -->
          <font-awesome-icon v-else icon="fa-regular fa-circle" size="1x" class="anti-btn" />
        </template>
        
        <template #append="{ item }">
          <!-- Action buttons for root-accounts node -->
          <div v-if="item.id === 'root-accounts' && canCreateDeleteAccounts" class="tree-actions">
            <ActionButton :item="item" icon="fa-solid fa-plus" tooltip-text="Создать лицевой счёт" @click="createAccount" />
          </div>
          
          <!-- Action buttons for account nodes -->
          <div v-else-if="item.id.startsWith('account-') && !item.id.includes('-unassigned') && !item.id.includes('-groups') && canEditAccounts" class="tree-actions">
            <ActionButton :item="{ id: getAccountIdFromNodeId(item.id) }"  icon="fa-solid fa-pen" tooltip-text="Редактировать лицевой счёт"  @click="editAccount" />
            <ActionButton v-if="canCreateDeleteAccounts" :item="{ id: getAccountIdFromNodeId(item.id) }"  icon="fa-solid fa-trash-can" tooltip-text="Удалить лицевой счёт" @click="deleteAccount" />
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


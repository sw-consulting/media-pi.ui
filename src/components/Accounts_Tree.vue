// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>
/**
 * Accounts Tree Component Permission Model
 * 
 * This component implements role-based permissions for tree operations:
 * 
 * SystemAdministrator:
 * - Full access to all operations
 * - Can create/delete accounts and device groups
 * - Can manage all devices and assignments
 * 
 * AccountManager:
 * - Can view and edit accounts they manage
 * - Can create, edit, and delete device groups
 * - Can assign/unassign devices to/from device groups
 * - Can edit devices in their accounts
 * - Cannot create/delete accounts
 * 
 * InstallationEngineer:
 * - Can view and manage unassigned devices
 * - Can assign devices to accounts
 * - Cannot access account-specific operations
 */
import { onMounted, onBeforeUnmount, ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAccountsCaption } from '@/helpers/accounts.caption.js'
import { 
  useAccountsTreeHelper, 
  getUnassignedDevices, 
  getAccountChildren,
  isTopLevelUnassignedDevice,
  isAccountAssignedDevice,
  isDeviceInUnassignedSection,
  isDeviceInGroupSection,
  getDeviceIdFromNodeId,
  getAccountIdFromNodeId,
  getGroupIdFromNodeId,
  createAvailableAccountsList,
  createAvailableDeviceGroupsList,
  createAccountAssignmentActions,
  createDeviceGroupAssignmentActions
} from '@/helpers/accounts.tree.helpers.js'
import { getDeviceFromItem } from '@/helpers/tree/device.actions.js'
import { getAccountFromItem } from '@/helpers/tree/account.actions.js'
import { getDeviceGroupFromItem } from '@/helpers/tree/devicegroup.actions.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAccountsStore } from '@/stores/accounts.store.js'
import { useDevicesStore } from '@/stores/devices.store.js'
import { useDeviceGroupsStore } from '@/stores/device.groups.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useDeviceStatusesStore } from '@/stores/device.statuses.store.js'
import { useConfirmation } from '@/helpers/confirmation.js'
import { canManageDevice, canManageAccount, canManageDeviceGroup } from '@/helpers/user.helpers.js'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'
import DeviceStatusDialog from '@/components/Device_Status_Dialog.vue'
import InlineAssignment from '@/components/InlineAssignment.vue'

const router = useRouter()
const authStore = useAuthStore()
const accountsStore = useAccountsStore()
const devicesStore = useDevicesStore()
const deviceGroupsStore = useDeviceGroupsStore()
const alertStore = useAlertStore()
const { confirmDelete } = useConfirmation()
const { alert } = storeToRefs(alertStore)
const deviceStatusesStore = useDeviceStatusesStore()

// State for account assignment
const accountAssignmentState = ref({})

// State for device group assignment
const deviceGroupAssignmentState = ref({})

// State for tracking devices being moved (to prevent duplication during transitions)
const transitioningDevices = ref(new Set())

// Device status dialog state
const statusDialogOpen = ref(false)
const statusDialogDeviceId = ref(null)



const openDeviceStatus = (item) => {
  const id = getDeviceIdFromNodeId(item.id)
  if (!id) return
  statusDialogDeviceId.value = id
  statusDialogOpen.value = true
}


// Initialize tree helper
const {
  buildTreeItems,
  createLoadChildrenHandler,
  createStateManager,
  createAccountActions,
  createDeviceGroupActions,
  createDeviceActions,
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
  canCreateDeleteAccounts
} = createPermissionCheckers(authStore)

// State management
const { restoreTreeState, saveTreeState } = createStateManager(authStore)

// Action handlers
const { createAccount, editAccount, deleteAccount: _deleteAccount } = createAccountActions(
  router, 
  alertStore, 
  accountsStore, 
  confirmDelete
)

const { createDeviceGroup: _createDeviceGroup, editDeviceGroup, deleteDeviceGroup: _deleteDeviceGroup } = createDeviceGroupActions(
  router,
  alertStore,
  deviceGroupsStore,
  confirmDelete
)

// Wrap deletion functions to preserve parent node expansion
const deleteAccount = async (item) => {
  // Store the parent container node that should remain expanded
  if (expandedNodes.value && !expandedNodes.value.includes('root-accounts')) {
    expandedNodes.value = [...expandedNodes.value, 'root-accounts']
  }
  await _deleteAccount(item)
}

const deleteDeviceGroup = async (item) => {
  // Extract account ID to preserve the groups container expansion
  const accountMatch = item.id?.toString().match(/(\d+)/)
  if (accountMatch) {
    const accountId = accountMatch[1]
    const accountNodeId = `account-${accountId}`
    const groupsNodeId = `account-${accountId}-groups`
    
    const nodesToExpand = [accountNodeId, groupsNodeId]
    nodesToExpand.forEach(nodeId => {
      if (expandedNodes.value && !expandedNodes.value.includes(nodeId)) {
        expandedNodes.value = [...expandedNodes.value, nodeId]
      }
    })
  }
  await _deleteDeviceGroup(item)
}

// Wrap creation functions to preserve parent node expansion
const createDeviceGroup = (item) => {
  // Extract account ID from groups container node and ensure parent nodes are expanded
  const match = item.id.match(/account-(\d+)-groups/)
  if (match) {
    const accountId = match[1]
    const accountNodeId = `account-${accountId}`
    const groupsNodeId = `account-${accountId}-groups`
    
    const nodesToExpand = [accountNodeId, groupsNodeId]
    nodesToExpand.forEach(nodeId => {
      if (!expandedNodes.value.includes(nodeId)) {
        expandedNodes.value = [...expandedNodes.value, nodeId]
      }
    })
    // The watch function will automatically save the state when expandedNodes changes
  }
  _createDeviceGroup(item)
}
/**
 * Device creation is intentionally disabled in this component.
 * Devices are not created manually by users through the UI; instead, they self-register
 * via an automated provisioning process when they first connect to the system.
 * This approach ensures that only authorized, network-visible devices are added,
 * and prevents accidental or unauthorized manual device creation.
 * The self-registration logic is handled by the backend/device onboarding workflow.
 * For more details, see the device provisioning documentation or backend implementation.
 */
const { editDevice, manageDevice, deleteDevice, unassignFromGroup: _unassignFromGroup, unassignFromAccount: _unassignFromAccount } = createDeviceActions(
  router,
  alertStore,
  devicesStore,
  confirmDelete,
  transitioningDevices 
)

// Wrap device actions to pass expandedNodes for preserving tree state
const unassignFromGroup = async (item) => {
  await _unassignFromGroup(item, expandedNodes)
}

const unassignFromAccount = async (item) => {
  await _unassignFromAccount(item, expandedNodes)
}

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

// Account assignment actions
const {
  startAccountAssignment,
  cancelAccountAssignment,
  confirmAccountAssignment: _confirmAccountAssignment,
  updateSelectedAccount
} = createAccountAssignmentActions(
  accountAssignmentState,
  transitioningDevices,
  devicesStore,
  alertStore
)

// Wrap assignment functions to pass expandedNodes for preserving tree state
const confirmAccountAssignment = async (item) => {
  await _confirmAccountAssignment(item, expandedNodes)
}

// Device group assignment actions
const {
  startDeviceGroupAssignment,
  cancelDeviceGroupAssignment,
  confirmDeviceGroupAssignment: _confirmDeviceGroupAssignment,
  updateSelectedDeviceGroup
} = createDeviceGroupAssignmentActions(
  deviceGroupAssignmentState,
  transitioningDevices,
  devicesStore,
  alertStore
)

// Wrap assignment functions to pass expandedNodes for preserving tree state
const confirmDeviceGroupAssignment = async (item) => {
  await _confirmDeviceGroupAssignment(item, expandedNodes)
}

// Available accounts for assignment (only accounts user can manage)
const availableAccounts = computed(() => {
  return createAvailableAccountsList(accountsStore, authStore)
})

// Function to get available device groups for a specific device item
const getAvailableDeviceGroups = (item) => {
  const accountId = getAccountIdFromNodeId(item.id)
  return createAvailableDeviceGroupsList(deviceGroupsStore, accountId)
}

// Tree structure using helper
const treeItems = computed(() => {
  return buildTreeItems(
    canViewUnassignedDevices.value,
    canViewAccounts.value,
    loadedNodes.value,
    accountsStore,
    devicesStore,
    deviceGroupsStore,
    // Pass custom functions that exclude transitioning devices
    (devicesStore) => getUnassignedDevices(devicesStore, transitioningDevices.value),
    (accountId, devicesStore, deviceGroupsStore) => getAccountChildren(accountId, devicesStore, deviceGroupsStore, transitioningDevices.value)
  )
})

// Device status helpers - keep a fast lookup map and a cache per tree node
const { statuses } = storeToRefs(deviceStatusesStore)
const statusesById = computed(() => {
  const map = new Map()
  ;(statuses.value || []).forEach(s => map.set(s.deviceId, s))
  return map
})

const deviceStatusCache = computed(() => {
  const cache = new Map()
  const devicesFromStore = devicesStore.devices

  const processItems = (items) => {
    items.forEach(item => {
      if (item.id.startsWith('device-')) {
        const deviceId = getDeviceIdFromNodeId(item.id)
        const status = statusesById.value.get(deviceId) ||
          devicesFromStore.find(d => d.id === deviceId)?.deviceStatus ||
          null

        cache.set(item.id, {
          isOnline: status?.isOnline || false,
          icon: status?.isOnline ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation',
          class: status?.isOnline ? 'text-success' : 'text-danger'
        })
      }

      if (item.children) {
        processItems(item.children)
      }
    })
  }

  processItems(treeItems.value)
  return cache
})

// Optimized status functions
const getDeviceStatusIcon = (item) => {
  return deviceStatusCache.value.get(item.id)?.icon || 'fa-solid fa-triangle-exclamation'
}

const getDeviceStatusClass = (item) => {
  return deviceStatusCache.value.get(item.id)?.class || 'text-danger'
}

// Group status aggregation
const groupStatusById = computed(() => {
  const result = new Map()
  const devices = devicesStore.devices || []
  const groups = deviceGroupsStore.groups || []
  groups.forEach(g => {
    const groupDevices = devices.filter(d => d.deviceGroupId === g.id)
    if (groupDevices.length === 0) {
      result.set(g.id, { allOnline: false, icon: 'fa-solid fa-circle-xmark', class: 'text-none' })
      return
    }
    const allOnline = groupDevices.every(d => (statusesById.value.get(d.id)?.isOnline) || d.deviceStatus?.isOnline === true)
    result.set(g.id, {
      allOnline,
      icon: allOnline ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation',
      class: allOnline ? 'text-success' : 'text-danger'
    })
  })
  return result
})

const getGroupStatusIcon = (item) => {
  const groupId = getGroupIdFromNodeId(item.id)
  return groupStatusById.value.get(groupId)?.icon || 'fa-solid fa-triangle-exclamation'
}

const getGroupStatusClass = (item) => {
  const groupId = getGroupIdFromNodeId(item.id)
  return groupStatusById.value.get(groupId)?.class || 'text-danger'
}

onMounted(async () => {
  loading.value = true
  try {
    // Для getAll backend сам интеллектуально фильтрует и отдаёт каждому своё
    await accountsStore.getAll()
    // Load device groups for group assignment functionality
    if (authStore.isAdministrator || authStore.isManager) {
      await deviceGroupsStore.getAll()
    }
    await deviceStatusesStore.getAll()
    deviceStatusesStore.startStream()
    // Restore tree state after data is loaded, with loadChildren support
    await restoreTreeState(selectedNode, expandedNodes, loadChildren)
    
    // Post-restoration logic: ensure logical parent-child expansion consistency
    await ensureLogicalExpansion()
  } catch (error) {
    alertStore.error('Не удалось загрузить данные: ' + (error.message || error))
  } finally {
    loading.value = false
  }
})

// Function to ensure logical expansion of parent nodes when they have content
const ensureLogicalExpansion = async () => {
  let hasChanges = false
  
  // If we have accounts, ensure root-accounts is expanded
  if (accountsStore.accounts && accountsStore.accounts.length > 0) {
    if (!expandedNodes.value.includes('root-accounts')) {
      expandedNodes.value = [...expandedNodes.value, 'root-accounts']
      hasChanges = true
    }
  }
  
  // For each account that has device groups, ensure the groups container is expanded
  if (deviceGroupsStore.groups && deviceGroupsStore.groups.length > 0) {
    const accountsWithGroups = new Set()
    deviceGroupsStore.groups.forEach(group => {
      if (group.accountId) {
        accountsWithGroups.add(group.accountId)
      }
    })
    
    accountsWithGroups.forEach(accountId => {
      const accountNodeId = `account-${accountId}`
      const groupsNodeId = `account-${accountId}-groups`
      
      // If the account node is expanded, also expand its groups container
      if (expandedNodes.value.includes(accountNodeId)) {
        if (!expandedNodes.value.includes(groupsNodeId)) {
          expandedNodes.value = [...expandedNodes.value, groupsNodeId]
          hasChanges = true
        }
      }
    })
  }
  
  // If we made changes, save the updated state
  if (hasChanges) {
    await nextTick() // Ensure DOM updates
    saveTreeState(selectedNode, expandedNodes)
  }
}

onBeforeUnmount(() => {
  deviceStatusesStore.stopStream()
})

</script>

<template>
  <div class="settings table-3 tree-container">
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
      >

        <template #prepend="{ item }">
          <v-progress-circular
            v-if="loadingNodes.has(item.id)"
            indeterminate
            size="16"
            width="2"
            color="primary"
          />
          <!-- Device icons with status -->
          <template v-else-if="item.id.startsWith('device-')">
            <font-awesome-icon icon="fa-solid fa-tv" size="1x" class="node-icon" />
            <font-awesome-icon :icon="getDeviceStatusIcon(item)" size="1x" :class="['node-icon', getDeviceStatusClass(item)]" />
          </template>
          <!-- Device Group icons with aggregated status -->
          <template v-else-if="item.id.startsWith('group-')">
            <font-awesome-icon icon="fa-solid fa-object-group" size="1x" class="node-icon" />
            <font-awesome-icon :icon="getGroupStatusIcon(item)" size="1x" :class="['node-icon', getGroupStatusClass(item)]" />
          </template>
          <!-- Device Groups container icons -->
          <font-awesome-icon v-else-if="item.id.includes('-groups')" icon="fa-solid fa-layer-group" size="1x" class="node-icon" />
          <!-- Account icons -->
          <font-awesome-icon v-else-if="item.id.startsWith('account-') && !item.id.includes('-unassigned') && !item.id.includes('-groups')" icon="fa-solid fa-building-user" size="1x" class="node-icon" />
          <!-- Accounts container icon -->
          <font-awesome-icon v-else-if="item.id === 'root-accounts'" icon="fa-solid fa-city" size="1x" class="node-icon" />
          <!-- Unassigned devices icons -->
          <font-awesome-icon v-else-if="item.id === 'root-unassigned' || item.id.includes('-unassigned')" icon="fa-regular fa-circle-question" size="1x" class="node-icon" />
          <!-- Fallback for any other nodes -->
          <font-awesome-icon v-else icon="fa-regular fa-circle" size="1x" class="node-icon" />
        </template>
        
        <template #append="{ item }">
          <!-- Control Panel for each item -->
          <div class="control-panel">
            <!-- Action buttons for root-accounts node -->
            <div v-if="item.id === 'root-accounts' && canCreateDeleteAccounts" class="tree-actions">
              <ActionButton :item="item" icon="fa-solid fa-plus" tooltip-text="Создать лицевой счёт" @click="createAccount" />
            </div>

            <!-- Action button for Device Groups node -->
            <div v-else-if="item.id.includes('-groups') && canManageAccount(authStore.user, getAccountFromItem(item, accountsStore))" class="tree-actions">
              <ActionButton :item="item" icon="fa-solid fa-plus" tooltip-text="Создать группу устройств" @click="() => createDeviceGroup(item)" />
            </div>

            <!-- Action buttons for individual device group nodes -->
            <div v-else-if="item.id.startsWith('group-') && canManageDeviceGroup(authStore.user, getDeviceGroupFromItem(item, deviceGroupsStore))" class="tree-actions">
              <ActionButton :item="{ id: getGroupIdFromNodeId(item.id) }" icon="fa-solid fa-pen" tooltip-text="Редактировать группу устройств" @click="editDeviceGroup" />
              <ActionButton :item="{ id: getGroupIdFromNodeId(item.id) }" icon="fa-solid fa-trash-can" tooltip-text="Удалить группу устройств" @click="deleteDeviceGroup" />
            </div>

            <!-- Action buttons for account nodes -->
            <div v-else-if="item.id.startsWith('account-') && !item.id.includes('-unassigned') && !item.id.includes('-groups') && canManageAccount(authStore.user, getAccountFromItem(item, accountsStore))" class="tree-actions">
              <ActionButton :item="{ id: getAccountIdFromNodeId(item.id) }"  icon="fa-solid fa-pen" tooltip-text="Редактировать лицевой счёт"  @click="editAccount" />
              <ActionButton v-if="canCreateDeleteAccounts" :item="{ id: getAccountIdFromNodeId(item.id) }"  icon="fa-solid fa-trash-can" tooltip-text="Удалить лицевой счёт" @click="deleteAccount" />
            </div>

            <!-- Action buttons for root-unassigned node (top level unassigned devices) -->
            
            <!--  Device shall register itself and provied access key, so manual creation is not possible 
            <div v-else-if="item.id === 'root-unassigned' && canManageDevice(authStore.user, {})" class="tree-actions">
              <ActionButton :item="item" icon="fa-solid fa-plus" tooltip-text="Зарегистрировать устройство" @click="createDevice" />
            </div>
            -->

            <!-- Action buttons for individual device nodes -->
            <div v-else-if="item.id.startsWith('device-')" class="tree-actions">
              <!-- Always allow viewing device status -->
              <ActionButton :item="item" icon="fa-solid fa-book-skull" tooltip-text="Системная информация" 
                :disabled="loading || deviceGroupAssignmentState[getDeviceIdFromNodeId(item.id)]?.editMode"
                @click="openDeviceStatus" 
              />
              <ActionButton :item="item" icon="fa-solid fa-list" tooltip-text="Управление устройством" 
                :disabled="loading || deviceGroupAssignmentState[getDeviceIdFromNodeId(item.id)]?.editMode"
                @click="manageDevice" 
              />
              <ActionButton :item="item" icon="fa-solid fa-pen" tooltip-text="Редактировать устройство" 
                :disabled="loading || accountAssignmentState[getDeviceIdFromNodeId(item.id)]?.editMode"
                @click="editDevice" 
              />
              <!-- Determine context: top-level unassigned vs account-assigned -->
              <template v-if="isTopLevelUnassignedDevice(item)">
                <!-- Top level unassigned devices: SystemAdministrator, InstallationEngineer -->
                <template v-if="canManageDevice(authStore.user, getDeviceFromItem(item, devicesStore))">
                  <!-- Inline account assignment selector -->
                  <InlineAssignment
                    :item="item"
                    :edit-mode="accountAssignmentState[getDeviceIdFromNodeId(item.id)]?.editMode || false"
                    :selected-value="accountAssignmentState[getDeviceIdFromNodeId(item.id)]?.selectedAccountId"
                    :available-options="availableAccounts"
                    placeholder="Выберите лицевой счёт"
                    start-icon="fa-solid fa-plug-circle-check"
                    start-tooltip="Назначить лицевой счёт"
                    confirm-tooltip="Назначить лицевой счёт"
                    cancel-tooltip="Отменить"
                    :loading="loading"
                    @start-assignment="startAccountAssignment"
                    @cancel-assignment="cancelAccountAssignment"
                    @confirm-assignment="confirmAccountAssignment"
                    @update-selection="(value) => updateSelectedAccount(getDeviceIdFromNodeId(item.id), value)"
                  />
                  <ActionButton :item="item" icon="fa-solid fa-trash-can" tooltip-text="Удалить устройство" 
                    :disabled="loading || accountAssignmentState[getDeviceIdFromNodeId(item.id)]?.editMode"
                    @click="deleteDevice" 
                  />
                </template>
              </template>
              <template v-else-if="isAccountAssignedDevice(item)">
                <!-- Account-assigned devices: SystemAdministrator, AccountManager -->
                <template v-if="canManageDevice(authStore.user, getDeviceFromItem(item, devicesStore))">
                  <!-- Inline device group assignment selector for unassigned devices -->
                  <InlineAssignment
                    v-if="isDeviceInUnassignedSection(item)"
                    :item="item"
                    :edit-mode="deviceGroupAssignmentState[getDeviceIdFromNodeId(item.id)]?.editMode || false"
                    :selected-value="deviceGroupAssignmentState[getDeviceIdFromNodeId(item.id)]?.selectedGroupId"
                    :available-options="getAvailableDeviceGroups(item)"
                    placeholder="Выберите группу"
                    start-icon="fa-solid fa-plug-circle-plus"
                    start-tooltip="Включить в группу"
                    confirm-tooltip="Включить"
                    cancel-tooltip="Отменить"
                    :loading="loading"
                    @start-assignment="startDeviceGroupAssignment"
                    @cancel-assignment="cancelDeviceGroupAssignment"
                    @confirm-assignment="confirmDeviceGroupAssignment"
                    @update-selection="(value) => updateSelectedDeviceGroup(getDeviceIdFromNodeId(item.id), value)"
                  />
                  <ActionButton v-if="isDeviceInGroupSection(item)" :item="item" icon="fa-solid fa-plug-circle-minus" tooltip-text="Исключить из группы" 
                    :disabled="loading || deviceGroupAssignmentState[getDeviceIdFromNodeId(item.id)]?.editMode"
                    @click="unassignFromGroup" 
                  />
                  <ActionButton v-if="isDeviceInUnassignedSection(item) && canCreateDeleteAccounts" :item="item" icon="fa-solid fa-plug-circle-xmark" tooltip-text="Исключить из лицевого счёта" 
                    :disabled="loading || deviceGroupAssignmentState[getDeviceIdFromNodeId(item.id)]?.editMode"
                    @click="unassignFromAccount" 
                  />
                </template>
              </template>
            </div>
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

    <!-- Device Status Dialog -->
    <DeviceStatusDialog 
      v-if="statusDialogDeviceId"
      v-model="statusDialogOpen"
      :device-id="statusDialogDeviceId"
    />

    <!-- Global alert messages -->
    <div v-if="alert && !statusDialogOpen" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

<style scoped>
.control-panel {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-left: 8px;
}

.tree-actions {
  display: flex;
  gap: 2px;
  padding: 2px 6px;
  background: linear-gradient(135deg, #75b2fd 0%, #bdddfd 100%);
  border: 1px solid #153754;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-height: 24px;
  align-items: center;
}

.tree-actions:hover {
  background: linear-gradient(135deg, #75b2fd 0%, #bdddfd 100%);
  border: 2px solid #1976d2;
  box-shadow: 0 2px 6px rgba(25, 118, 210, 0.15);
  transform: translateY(-1px);
  transition: all 0.2s ease;
}

.tree-actions .anti-btn {
  padding: 2px 4px;
  margin: 0;
  font-size: 11px;
  min-width: auto;
  height: 18px;
  background: transparent;
  border-radius: 3px;
  color: #495057;
  transition: all 0.15s ease;
}

.tree-actions .anti-btn:hover {
  background-color: rgba(25, 118, 210, 0.1);
  color: #1976d2;
  transform: scale(1.1);
}

.tree-actions .anti-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.node-icon {
  color: #4a647b;
  transition: color 0.2s ease;
}

:deep(.v-treeview-item) {
  padding-right: 8px !important;
}

:deep(.v-treeview-item:hover) {
  border: 2px solid #1976d2;
  color:  #104981;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.15);
  border-radius: 6px;
  background: none !important;
  transition: box-shadow 0.2s, border-color 0.2s;
}

:deep(.v-treeview-item:hover .node-icon) {
  color: #1976d2;
}

:deep(.v-treeview-item:hover .tree-actions) {
  background: linear-gradient(135deg, #a3caf9 0%, #e9f3fc 100%);
  border: 2px solid #1976d2;
  box-shadow: 0 3px 8px rgba(25, 118, 210, 0.2);
}

</style>

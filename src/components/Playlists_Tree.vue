// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import ActionButton from '@/components/ActionButton.vue'
import { useRouter } from 'vue-router'
import { useAccountsStore } from '@/stores/accounts.store.js'
import { usePlaylistsStore } from '@/stores/playlists.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirmation } from '@/helpers/confirmation.js'
import { isAdministrator, isManager, canManageAccountById } from '@/helpers/user.helpers.js'

const authStore = useAuthStore()
const accountsStore = useAccountsStore()
const playlistsStore = usePlaylistsStore()
const alertStore = useAlertStore()
const { confirmDelete } = useConfirmation()

const { accounts } = storeToRefs(accountsStore)

const loadingAccounts = ref(false)
const accountsError = ref(null)

const accountPlaylists = reactive({})
const accountErrors = reactive({})
const loadingNodes = reactive({})
const loadedNodes = ref(new Set())

const openedNodes = ref([])
const selectedNode = ref([])

const router = useRouter()

const accessibleAccounts = computed(() => {
  const currentUser = authStore.user
  const allAccounts = accounts.value || []

  if (!currentUser) {
    return []
  }

  if (isAdministrator(currentUser)) {
    return allAccounts
  }

  const managedAccountIds = Array.isArray(currentUser.accountIds)
    ? currentUser.accountIds
    : []

  if (isManager(currentUser) || managedAccountIds.length > 0) {
    return allAccounts.filter(account => managedAccountIds.includes(account.id))
  }

  return []
})

const treeItems = computed(() => {
  const accountNodes = accessibleAccounts.value.map(account => {
    const nodeId = `account-${account.id}`
    const hasLoadedChildren = loadedNodes.value.has(nodeId)
    return {
      id: nodeId,
      name: account.name || `Лицевой счёт №${account.id}`,
      accountId: account.id,
      children: hasLoadedChildren ? (accountPlaylists[account.id] || []) : []
    }
  })

  return [
    {
      id: 'root-accounts',
      name: 'Лицевые счета',
      children: accountNodes
    }
  ]
})

const accountErrorList = computed(() => {
  return accessibleAccounts.value
    .map(account => ({
      accountId: account.id,
      accountName: account.name || `Лицевой счёт №${account.id}`,
      message: accountErrors[account.id]
    }))
    .filter(item => !!item.message)
})

const canManagePlaylistsForAccount = (accountId) => {
  const user = authStore.user
  return canManageAccountById(user, accountId)
}

const buildPlaylistNodes = (playlists = []) => {
  if (!Array.isArray(playlists) || playlists.length === 0) {
    return []
  }

  return playlists.map(playlist => ({
    id: `playlist-${playlist.id}`,
    name: playlist.title || playlist.name || `Плейлист №${playlist.id}`,
    playlist
  }))
}

const markNodeLoaded = (nodeId) => {
  if (!loadedNodes.value.has(nodeId)) {
    loadedNodes.value = new Set([...loadedNodes.value, nodeId])
  }
}

const unmarkNodeLoaded = (nodeId) => {
  if (loadedNodes.value.has(nodeId)) {
    const next = new Set(loadedNodes.value)
    next.delete(nodeId)
    loadedNodes.value = next
  }
}

const fetchPlaylistsForAccount = async (accountId, nodeId) => {
  if (!accountId) {
    return []
  }

  if (loadedNodes.value.has(nodeId)) {
    return accountPlaylists[accountId] || []
  }

  if (loadingNodes[nodeId]) {
    return accountPlaylists[accountId] || []
  }

  loadingNodes[nodeId] = true
  accountErrors[accountId] = null

  try {
    const result = await playlistsStore.getAllByAccount(accountId)
    const nodes = buildPlaylistNodes(result)
    accountPlaylists[accountId] = nodes
    markNodeLoaded(nodeId)
    return nodes
  } catch (error) {
    accountErrors[accountId] = error?.message || 'Не удалось загрузить плейлисты'
    unmarkNodeLoaded(nodeId)
    return []
  } finally {
    loadingNodes[nodeId] = false
  }
}

const loadChildren = async (item) => {
  if (!item?.id?.startsWith('account-')) {
    return item?.children || []
  }

  const nodeId = item.id
  const accountId = Number.parseInt(nodeId.replace('account-', ''), 10)
  if (!Number.isFinite(accountId)) {
    return []
  }

  if (loadedNodes.value.has(nodeId)) {
    return accountPlaylists[accountId] || []
  }

  return fetchPlaylistsForAccount(accountId, nodeId)
}

const reloadAccountPlaylists = async (accountId) => {
  if (!accountId) return
  const nodeId = `account-${accountId}`
  delete accountPlaylists[accountId]
  accountErrors[accountId] = null
  unmarkNodeLoaded(nodeId)
  await fetchPlaylistsForAccount(accountId, nodeId)
}

const loadAccounts = async () => {
  loadingAccounts.value = true
  accountsError.value = null

  try {
    const currentUser = authStore.user
    if (!currentUser) {
      await accountsStore.getAll()
      return
    }

    if (isAdministrator(currentUser)) {
      await accountsStore.getAll()
    } else if (isManager(currentUser) && currentUser.id) {
      await accountsStore.getByManager(currentUser.id)
    } else {
      await accountsStore.getAll()
    }
  } catch (error) {
    accountsError.value = error?.message || 'Не удалось загрузить лицевые счета'
  } finally {
    loadingAccounts.value = false
  }
}

const openCreatePlaylist = (accountId) => {
  if (!canManagePlaylistsForAccount(accountId)) return
  router.push(`/playlist/create/${accountId}`)
}

const openEditPlaylist = (playlistNode) => {
  const playlist = playlistNode?.playlist
  if (!playlist || !canManagePlaylistsForAccount(playlist.accountId)) return
  router.push(`/playlist/edit/${playlist.id}`)
}

const deletePlaylist = async (playlistNode) => {
  const playlist = playlistNode?.playlist
  if (!playlist || !canManagePlaylistsForAccount(playlist.accountId)) {
    return
  }

  const confirmed = await confirmDelete(playlist.title || playlist.name || `Id ${playlist.id}`, 'плейлист')
  if (!confirmed) {
    return
  }

  try {
    await playlistsStore.remove(playlist.id)
    await reloadAccountPlaylists(playlist.accountId)
  } catch (error) {
    const message = error?.message || 'Не удалось удалить плейлист'
    alertStore.error(message)
  }
}

watch(accessibleAccounts, (newAccounts) => {
  const validIds = new Set(newAccounts.map(account => account.id))

  Object.keys(accountPlaylists).forEach(key => {
    const numericKey = Number.parseInt(key, 10)
    if (!validIds.has(numericKey)) {
      delete accountPlaylists[key]
    }
  })

  Object.keys(accountErrors).forEach(key => {
    const numericKey = Number.parseInt(key, 10)
    if (!validIds.has(numericKey)) {
      delete accountErrors[key]
    }
  })

  loadedNodes.value = new Set(
    [...loadedNodes.value].filter(nodeId => {
      if (!nodeId.startsWith('account-')) {
        return true
      }
      const accountId = Number.parseInt(nodeId.replace('account-', ''), 10)
      return validIds.has(accountId)
    })
  )

  openedNodes.value = openedNodes.value.filter(nodeId => {
    if (!nodeId.startsWith('account-')) {
      return true
    }
    const accountId = Number.parseInt(nodeId.replace('account-', ''), 10)
    return validIds.has(accountId)
  })
})

onMounted(async () => {
  await loadAccounts()
})
</script>

<template>
  <div class="settings table-3 tree-container">
    <h1 class="primary-heading">Плейлисты</h1>
    <hr class="hr" />
    <v-card elevation="2">
      <v-card-text>
        <v-progress-linear
          v-if="loadingAccounts"
          indeterminate
          color="primary"
          class="mb-4"
        />

        <v-treeview
          :items="treeItems"
          item-title="name"
          item-value="id"
          :load-children="loadChildren"
          v-model:opened="openedNodes"
          v-model:selected="selectedNode"
          open-on-click
          hoverable
          activatable
        >
          <template #prepend="{ item }">
            <v-progress-circular
              v-if="item.id.startsWith('account-') && loadingNodes[item.id]"
              indeterminate
              size="16"
              width="2"
              color="primary"
            />
            <template v-else>
              <template v-if="item.id.startsWith('playlist-')">
                <font-awesome-icon icon="fa-solid fa-list" size="1x" class="node-icon" />
              </template>
              <template v-else>
                <font-awesome-icon v-if="item.id === 'root-accounts'" icon="fa-solid fa-city" size="1x" class="node-icon" />
                <font-awesome-icon v-else-if="item.id.startsWith('account-')" icon="fa-solid fa-building-user" size="1x" class="node-icon" />
                <font-awesome-icon v-else icon="fa-regular fa-circle" size="1x" class="node-icon" />
              </template>
            </template>
          </template>
          <template #append="{ item }">
            <div class="control-panel">
              <div v-if="item.id.startsWith('account-') && canManagePlaylistsForAccount(item.accountId)" class="tree-actions">
                <ActionButton
                  :item="item"
                  icon="fa-solid fa-plus"
                  tooltip-text="Создать плейлист"
                  aria-label="Создать плейлист"
                  @click="openCreatePlaylist(item.accountId)"
                />
              </div>
              <div v-else-if="item.id.startsWith('playlist-') && canManagePlaylistsForAccount(item.playlist?.accountId)" class="tree-actions">
                <ActionButton
                  :item="item"
                  icon="fa-solid fa-pen"
                  tooltip-text="Редактировать плейлист"
                  aria-label="Редактировать плейлист"
                  @click="openEditPlaylist(item)"
                />
                <ActionButton
                  :item="item"
                  icon="fa-solid fa-trash-can"
                  tooltip-text="Удалить плейлист"
                  aria-label="Удалить плейлист"
                  @click="deletePlaylist(item)"
                />
              </div>
            </div>
          </template>
        </v-treeview>
      </v-card-text>
    </v-card>

    <v-alert
      v-if="accountsError"
      type="error"
      variant="tonal"
      class="mt-4"
    >
      {{ accountsError }}
      <template #append>
        <v-btn
          color="primary"
          variant="text"
          size="small"
          @click="loadAccounts"
        >
          Повторить
        </v-btn>
      </template>
    </v-alert>

    <v-alert
      v-for="error in accountErrorList"
      :key="`account-error-${error.accountId}`"
      type="error"
      variant="tonal"
      class="mt-2"
    >
      Ошибка при загрузке плейлистов для «{{ error.accountName }}»: {{ error.message }}
      <template #append>
        <v-btn
          color="primary"
          variant="text"
          size="small"
          @click="reloadAccountPlaylists(error.accountId)"
        >
          Повторить
        </v-btn>
      </template>
    </v-alert>

    <!-- Playlist settings are now displayed on a separate page -->
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

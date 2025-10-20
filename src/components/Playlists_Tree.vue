// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import ActionButton from '@/components/ActionButton.vue'
import PlaylistsSettings from '@/components/Playlists_Settings.vue'
import { useAccountsStore } from '@/stores/accounts.store.js'
import { usePlaylistsStore } from '@/stores/playlists.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirmation } from '@/helpers/confirmation.js'
import { isAdministrator, isManager, canManageAccountById } from '@/helpers/user.helpers.js'
import '@/assets/tree.common.css'

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

const dialogState = reactive({
  open: false,
  register: true,
  accountId: null,
  playlistId: null,
  key: 0
})

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
  if (!canManagePlaylistsForAccount(accountId)) {
    return
  }
  dialogState.register = true
  dialogState.accountId = accountId
  dialogState.playlistId = null
  dialogState.key += 1
  dialogState.open = true
}

const openEditPlaylist = (playlistNode) => {
  const playlist = playlistNode?.playlist
  if (!playlist || !canManagePlaylistsForAccount(playlist.accountId)) {
    return
  }
  dialogState.register = false
  dialogState.accountId = playlist.accountId
  dialogState.playlistId = playlist.id
  dialogState.key += 1
  dialogState.open = true
}

const closeDialog = () => {
  dialogState.open = false
}

const handleSaved = async ({ accountId }) => {
  dialogState.open = false
  if (accountId) {
    await reloadAccountPlaylists(accountId)
  }
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

    <v-dialog v-model="dialogState.open" max-width="640">
      <v-card>
        <v-card-text>
          <Suspense>
            <PlaylistsSettings
              :key="dialogState.key"
              :register="dialogState.register"
              :id="dialogState.playlistId ?? undefined"
              :account-id="dialogState.accountId ?? undefined"
              @saved="handleSaved"
              @cancel="closeDialog"
            />
            <template #fallback>
              <div class="text-center m-5">
                <span class="spinner-border spinner-border-lg align-center"></span>
                <div class="mt-2">Загрузка формы плейлиста...</div>
              </div>
            </template>
          </Suspense>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

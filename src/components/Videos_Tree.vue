// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>
import { computed, onMounted, reactive, ref, watch, nextTick } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import ActionDialog from '@/components/ActionDialog.vue'
import { storeToRefs } from 'pinia'
import { useAccountsStore } from '@/stores/accounts.store.js'
import { useVideosStore } from '@/stores/videos.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { isAdministrator, isManager, canManageAccountById } from '@/helpers/user.helpers.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirmation } from '@/helpers/confirmation.js'
import '@/assets/tree.common.css'

const authStore = useAuthStore()
const alertStore = useAlertStore()
const { confirmDelete } = useConfirmation()
const accountsStore = useAccountsStore()
const videosStore = useVideosStore()

const { accounts } = storeToRefs(accountsStore)

const loadingAccounts = ref(false)
const accountsError = ref(null)
// Tree state (restore from auth store if available; tolerate older mocks without API)
const initialVideosTreeState = authStore.getVideosTreeState ? authStore.getVideosTreeState : { openedNodes: [], selectedNode: [] }
const openedNodes = ref([...(initialVideosTreeState.openedNodes || [])])
const selectedNode = ref([...(initialVideosTreeState.selectedNode || [])])

const accountVideos = reactive({})
const accountErrors = reactive({})
const loadingNodes = reactive({})
const loadedNodes = ref(new Set())

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

  if (isManager(currentUser)) {
    return allAccounts.filter(account => managedAccountIds.includes(account.id))
  }

  // For other roles, allow read access only to explicitly assigned accounts
  if (managedAccountIds.length > 0) {
    return allAccounts.filter(account => managedAccountIds.includes(account.id))
  }

  return []
})

const treeItems = computed(() => {
  // Build account child nodes
  const accountNodes = accessibleAccounts.value.map(account => {
    const nodeId = `account-${account.id}`
    const hasLoadedChildren = loadedNodes.value.has(nodeId)
    return {
      id: nodeId,
      name: account.name || `Лицевой счёт №${account.id}`,
      accountId: account.id,
      children: hasLoadedChildren ? accountVideos[account.id] || [] : []
    }
  })

  // Root nodes structure similar to Accounts_Tree
  const roots = [
    {
      id: 'root-accounts',
      name: 'Лицевые счета',
      children: accountNodes
    },
    {
      id: 'root-subscriptions',
      name: 'Подписные категории',
      children: [] // Empty for now
    }
  ]

  return roots
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

const buildVideoNodes = (videos = []) => {
  if (!Array.isArray(videos) || videos.length === 0) {
    return [] // Don't create artificial placeholder nodes
  }
  // Omit children property so Vuetify treats node as leaf (no toggler arrows)
  return videos.map(video => ({
    id: `video-${video.id}`,
    name: video.name || video.title || `Видео №${video.id}`,
    video
  }))
}

const fetchVideosForAccount = async (accountId, nodeId) => {
  if (!accountId) {
    return []
  }

  if (loadingNodes[nodeId]) {
    return accountVideos[accountId] || []
  }

  loadingNodes[nodeId] = true
  accountErrors[accountId] = null

  try {
  const result = await videosStore.getAllByAccount(accountId)
  const nodes = buildVideoNodes(result)
    accountVideos[accountId] = nodes
    markNodeLoaded(nodeId)
    return nodes
  } catch (error) {
    accountErrors[accountId] = error?.message || 'Не удалось загрузить видео'
    unmarkNodeLoaded(nodeId)
    return []
  } finally {
    loadingNodes[nodeId] = false
  }
}

// Permission check for video management on account
const canManageVideosForAccount = (accountId) => {
  const user = authStore.user
  return canManageAccountById(user, accountId)
}

// Action state refs
const creatingVideoForAccount = ref(null)
const editingVideoId = ref(null)
// Action dialog state for modal blocking operations (e.g., upload)
const actionDialog = reactive({ show: false, title: '' })

// Upload flow using new signature uploadFile(file, accountId, title='')
const uploadVideoForAccount = async (accountId, file) => {
  if (!canManageVideosForAccount(accountId) || !file) return
  const baseName = file.name ? file.name.replace(/\.[^.]+$/, '') : ''
  actionDialog.title = 'Загрузка видео...'
  actionDialog.show = true
  try {
    await videosStore.uploadFile(file, accountId, baseName)
    // Refresh account videos
    delete accountVideos[accountId]
    unmarkNodeLoaded(`account-${accountId}`)
    await reloadAccountVideos(accountId)
  } catch (error) {
    alertStore.error('Не удалось загрузить видео: ' + (error.message || error))
  } finally {
    creatingVideoForAccount.value = null
    // Let ActionDialog component handle min display and hide; just request hide
    actionDialog.show = false
  }
}

const editVideo = async (videoNode) => {
  const video = videoNode?.video
  if (!video || !canManageVideosForAccount(video.accountId)) return
  const currentName = video.name || video.title || ''
  const newName = window.prompt('Введите новое название видео', currentName)
  if (!newName || newName === currentName) return
  try {
    await videosStore.update(video.id, { name: newName })
    delete accountVideos[video.accountId]
    unmarkNodeLoaded(`account-${video.accountId}`)
    await reloadAccountVideos(video.accountId)
  } catch (error) {
    alertStore.error('Не удалось обновить видео: ' + (error.message || error))
  } finally {
    editingVideoId.value = null
  }
}

const deleteVideo = async (videoNode) => {
  const video = videoNode?.video
  if (!video || !canManageVideosForAccount(video.accountId)) return
  try {
    const confirmed = await confirmDelete((video.name || video.title || `Id ${video.id}`), 'видеофайл')
    if (!confirmed) return
    await videosStore.remove(video.id)
    delete accountVideos[video.accountId]
    unmarkNodeLoaded(`account-${video.accountId}`)
    await reloadAccountVideos(video.accountId)
  } catch (error) {
    alertStore.error('Не удалось удалить видеофайл: ' + (error.message || error))
  }
}

// Hidden file input handling
const fileInputRef = ref(null)
const triggerUpload = (accountId) => {
  if (!canManageVideosForAccount(accountId)) return
  creatingVideoForAccount.value = accountId
  if (fileInputRef.value) {
    fileInputRef.value.dataset.accountId = accountId
    fileInputRef.value.click()
  }
}
const onFileSelected = (e) => {
  const files = e.target.files
  const accountId = parseInt(e.target.dataset.accountId, 10)
  if (!files || files.length === 0) {
    creatingVideoForAccount.value = null
    return
  }
  uploadVideoForAccount(accountId, files[0])
  e.target.value = ''
}

const loadChildren = async (item) => {
  if (!item?.id?.startsWith('account-')) {
    return item?.children || []
  }

  const accountId = Number.parseInt(item.id.replace('account-', ''), 10)
  if (!Number.isFinite(accountId)) {
    return []
  }

  return fetchVideosForAccount(accountId, item.id)
}

const reloadAccountVideos = async (accountId) => {
  const nodeId = `account-${accountId}`
  delete accountVideos[accountId]
  accountErrors[accountId] = null
  unmarkNodeLoaded(nodeId)
  await nextTick()

  // Force reload the children by calling loadChildren directly
  // This ensures the tree data is refreshed
  try {
    await loadChildren({ id: nodeId, accountId: accountId })
  } catch (error) {
    alertStore.error('Не удалось обновить страницу: ' + (error.message || error))
  }
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

watch(accessibleAccounts, (newAccounts) => {
  const validIds = new Set(newAccounts.map(account => account.id))

  Object.keys(accountVideos).forEach(key => {
    const numericKey = Number.parseInt(key, 10)
    if (!validIds.has(numericKey)) {
      delete accountVideos[key]
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
  // Persist initial (possibly restored) state if method exists
  if (authStore.saveVideosTreeState) {
    authStore.saveVideosTreeState(selectedNode.value, openedNodes.value)
  }
})

// Persist changes to selection and opened nodes
watch([selectedNode, openedNodes], () => {
  if (authStore.saveVideosTreeState) {
    authStore.saveVideosTreeState(selectedNode.value, openedNodes.value)
  }
}, { deep: true })
</script>

<template>
  <div class="settings table-3 videos-tree tree-container">
  <h1 class="primary-heading">Видеофайлы</h1>
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
              <template v-if="item.id.startsWith('video-')">
                <font-awesome-icon icon="fa-solid fa-film" size="1x" class="node-icon" />
              </template>
              <template v-else>
                <font-awesome-icon v-if="item.id === 'root-accounts'" icon="fa-solid fa-city" size="1x" class="node-icon" />
                <font-awesome-icon v-else-if="item.id === 'root-subscriptions'" icon="fa-solid fa-tags" size="1x" class="node-icon" />
                <font-awesome-icon v-else-if="item.id.startsWith('account-')" icon="fa-solid fa-building-user" size="1x" class="node-icon" />
                <font-awesome-icon v-else icon="fa-regular fa-circle" size="1x" class="node-icon" />
              </template>
            </template>
          </template>
          <template #append="{ item }">
            <div class="control-panel">
              <!-- Account node actions -->
              <div v-if="item.id.startsWith('account-') && canManageVideosForAccount(item.accountId)" class="tree-actions">
                <ActionButton :item="item" icon="fa-solid fa-plus" tooltip-text="Загрузить видео" @click="() => triggerUpload(item.accountId)" />
              </div>
              <!-- Video node actions -->
              <div v-else-if="item.id.startsWith('video-') && canManageVideosForAccount(item.video?.accountId)" class="tree-actions">
                <ActionButton :item="item" icon="fa-solid fa-pen" tooltip-text="Редактировать видео" @click="() => editVideo(item)" />
                <ActionButton :item="item" icon="fa-solid fa-trash-can" tooltip-text="Удалить видео" @click="() => deleteVideo(item)" />
              </div>
            </div>
          </template>
        </v-treeview>
        <input ref="fileInputRef" type="file" style="display:none" @change="onFileSelected" />
      </v-card-text>
    </v-card>

    <!-- Global modal action dialog for blocking operations like upload -->
    <ActionDialog :actionDialog="actionDialog" />
    <!-- Fallback plain overlay in case Vuetify dialog is not visible in some environments -->
    <div v-if="actionDialog.show" class="mp-action-overlay" role="dialog" aria-modal="true" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);z-index:2000;">
      <div style="background:#fff;padding:1rem 1.25rem;border-radius:8px;min-width:260px;max-width:90%;text-align:center;box-shadow:0 6px 24px rgba(0,0,0,0.2);">
        <div class="primary-heading" style="margin-bottom:0.5rem;">{{ actionDialog.title }}</div>
        <div style="margin-top:0.5rem;">
          <div style="display:inline-block;width:48px;height:48px;border-radius:50%;border:6px solid rgba(0,0,0,0.08);border-top-color:var(--v-primary-base, #1976d2);animation:mp-spin 1s linear infinite"></div>
        </div>
      </div>
    </div>

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
      Ошибка при загрузке видео для «{{ error.accountName }}»: {{ error.message }}
      <template #append>
        <v-btn
          color="primary"
          variant="text"
          size="small"
          @click="reloadAccountVideos(error.accountId)"
        >
          Повторить
        </v-btn>
      </template>
    </v-alert>
  </div>
</template>

<style scoped>
@keyframes mp-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

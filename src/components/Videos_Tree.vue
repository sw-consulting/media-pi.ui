// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>
import { computed, onMounted, reactive, ref, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useAccountsStore } from '@/stores/accounts.store.js'
import { useVideosStore } from '@/stores/videos.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { isAdministrator, isManager } from '@/helpers/user.helpers.js'

const authStore = useAuthStore()
const accountsStore = useAccountsStore()
const videosStore = useVideosStore()

const { accounts } = storeToRefs(accountsStore)

const loadingAccounts = ref(false)
const accountsError = ref(null)
const openedNodes = ref([])
const selectedNode = ref([])

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
  return accessibleAccounts.value.map(account => {
    const nodeId = `account-${account.id}`
    const hasLoadedChildren = loadedNodes.value.has(nodeId)

    return {
      id: nodeId,
      name: account.name || `Лицевой счёт №${account.id}`,
      accountId: account.id,
      children: hasLoadedChildren ? accountVideos[account.id] || [] : []
    }
  })
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

const buildVideoNodes = (videos = [], accountId) => {
  if (!Array.isArray(videos) || videos.length === 0) {
    return [
      {
        id: `account-${accountId}-empty`,
        name: 'Видео отсутствуют',
        disabled: true,
        children: []
      }
    ]
  }

  return videos.map(video => ({
    id: `video-${video.id}`,
    name: video.name || video.title || `Видео №${video.id}`,
    video,
    children: []
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
    const nodes = buildVideoNodes(result, accountId)
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

  if (!openedNodes.value.includes(nodeId)) {
    openedNodes.value = [...openedNodes.value, nodeId]
  } else {
    openedNodes.value = openedNodes.value.filter(id => id !== nodeId)
    await nextTick()
    openedNodes.value = [...openedNodes.value, nodeId]
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
})
</script>

<template>
  <div class="videos-tree">
    <v-card class="videos-tree__card" elevation="2">
      <v-card-title class="videos-tree__title">
        Видеоматериалы
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-progress-linear
          v-if="loadingAccounts"
          indeterminate
          color="primary"
          class="mb-4"
        />

        <v-alert
          v-else-if="!treeItems.length"
          type="info"
          variant="outlined"
        >
          Нет доступных лицевых счетов или данные не найдены.
        </v-alert>

        <v-treeview
          v-else
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
              <font-awesome-icon
                v-if="item.id.startsWith('account-')"
                icon="fa-solid fa-building-user"
                class="node-icon"
              />
              <font-awesome-icon
                v-else-if="item.id.startsWith('video-')"
                icon="fa-solid fa-photo-film"
                class="node-icon"
              />
              <font-awesome-icon
                v-else
                icon="fa-regular fa-circle"
                class="node-icon"
              />
            </template>
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
.videos-tree__card {
  max-width: 720px;
  margin: 0 auto;
}

.videos-tree__title {
  font-weight: 600;
}

.node-icon {
  margin-right: 8px;
  color: var(--v-theme-primary);
}
</style>

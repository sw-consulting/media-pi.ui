// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { mdiMagnify } from '@mdi/js'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'

import { useVideosStore } from '@/stores/videos.store.js'
import { useAccountsStore } from '@/stores/accounts.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirmation } from '@/helpers/confirmation.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { canManageAccountById, isAdministrator } from '@/helpers/user.helpers.js'

const videosStore = useVideosStore()
const accountsStore = useAccountsStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const { confirmDelete } = useConfirmation()

const { videos, loading } = storeToRefs(videosStore)
const { loading: accountsLoading, accounts } = storeToRefs(accountsStore)
const { alert } = storeToRefs(alertStore)

const selectedAccountId = ref(null)
const search = ref('')
const fileInput = ref(null)
const itemsPerPage = ref(10)
const sortBy = ref([])
const page = ref(1)

const accountOptions = computed(() => {

    if (!authStore.user) {
      return []
    }

    const preAccounts = (accounts.value || []).map(acc => ({
      value: acc.id,
      title: acc.name
    }))
    
    const accountsList = [...preAccounts, { title: 'Общие видеофайлы', value: 0 } ]

    if (isAdministrator(authStore.user)) {
      return accountsList
    }

    const managedAccountIds = Array.isArray(authStore.user.accountIds)
      ? authStore.user.accountIds
      : []

    return accountsList.filter(account => managedAccountIds.includes(account.value) || account.value === 0)
})


const headers = [
  { title: '', align: 'center', key: 'actions', sortable: false, width: '5%' },
  { title: 'Название', align: 'start', key: 'title' },
  { title: 'Имя файла', align: 'start', key: 'originalFilename' },
  { title: 'Размер', align: 'start', key: 'fileSize' },
  { title: 'Длительность', align: 'start', key: 'duration' },
]

const selectWidth = computed(() => {
  if (!accountOptions.value.length) return 'auto'
  const longestTitle = accountOptions.value.reduce((longest, option) => 
    option.title.length > longest.length ? option.title : longest, ''
  )
  // Approximate width: 8px per character + padding + dropdown arrow
  return `${Math.max(longestTitle.length * 9 + 65, 200)}px`
})

const canManageSelectedAccount = computed(() => {
  if (selectedAccountId.value === 0) {
    return isAdministrator(authStore.user)
  }
  return canManageAccountById(authStore.user, selectedAccountId.value)
})

const isBusy = computed(() => loading.value || accountsLoading.value)

function ensureSelection(options) {
  const availableValues = options.map(option => option.value)
  if (!availableValues.includes(selectedAccountId.value)) {
    selectedAccountId.value = availableValues.length ? availableValues[0] : null
  }
}

const refreshVideos = async () => {
  try {
    await videosStore.getAllByAccount(selectedAccountId.value)
  } catch (err) {
    alertStore.error('Не удалось загрузить видеофайл: ' + (err?.message || err))
  }
}

watch(accountOptions, (options) => ensureSelection(options), { immediate: true })

watch(selectedAccountId, async () => {
  if (selectedAccountId.value === undefined) return
  await refreshVideos()
}, { immediate: true })

onMounted(async () => {
  try {
    await accountsStore.getAll()
  } catch (err) {
    alertStore.error('Не удалось загрузить лицевые счета: ' + (err?.message || err))
  }
})

function triggerUpload() {
  if (!fileInput.value) return
  fileInput.value.value = null
  fileInput.value.click()
}

async function uploadVideo(file) {
  if (!file) return
  if (!canManageSelectedAccount.value) {
    alertStore.error('Недостаточно прав для загрузки видеофайла в выбранный раздел')
    return
  }
  try {
    await videosStore.uploadFile(file, selectedAccountId.value, file.name)
    await refreshVideos()
  } catch (err) {
    alertStore.error('Не удалось загрузить видеофайл: ' + (err?.message || err))
  }
}

function onFileChange(event) {
  const file = event?.target?.files?.[0]
  uploadVideo(file)
}

function editVideo(item) {
  console.warn('Редактирование видео пока не реализовано', item)
  alertStore.error('Редактирование видеофайлов пока не поддерживается')
}

function canManageVideo(item) {
  if (!item) return false
  if (item.accountId === null) {
    return isAdministrator(authStore.user)
  }
  return canManageAccountById(authStore.user, item.accountId)
}

async function deleteVideo(item) {
  if (!canManageVideo(item)) return
  const confirmed = await confirmDelete(item.title || item.originalFilename || 'видеофайл', 'видеофайл')
  if (!confirmed) return
  try {
    await videosStore.remove(item.id)
    await refreshVideos()
  } catch (err) {
    alertStore.error('Не удалось удалить видеофайл: ' + (err?.message || err))
  }
}

function filterVideos(value, query, item) {
  if (!query) return true
  const rawVideo = item?.raw
  if (!rawVideo) return false
  const q = query.toLocaleLowerCase()
  return [
    rawVideo.title,
    rawVideo.originalFilename,
    rawVideo.fileSize,
    rawVideo.duration,
    rawVideo.accountDisplay
  ].some(field => (field || '').toString().toLocaleLowerCase().includes(q))
}
</script>

<template>
  <div class="settings table-3">
    <div class="header-with-actions">
      <h1 class="primary-heading">Видеофайлы</h1>
      <div class="header-actions-container">
        <div v-if="loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <v-select
            v-model="selectedAccountId"
            :items="accountOptions"
            label="Лицевой счёт"
            item-title="title"
            item-value="value"
            density="compact"
            variant="outlined"
            hide-details
            :disabled="isBusy"
            :style="{ width: selectWidth, marginRight: '12px' }"
          />
          <div class="header-actions header-actions-group">
            <ActionButton
              data-test="upload-video-button"
              :item="{}"
              icon="fa-solid fa-cloud-arrow-up"
              tooltip-text="Загрузить видеофайл"
              :disabled="!canManageSelectedAccount || isBusy"
              @click="triggerUpload"
            />
            <input ref="fileInput" class="d-none" type="file" accept="video/*" @change="onFileChange" />
          </div>
        </div>
      </div>
    </div>
    <hr class="hr" />

    <v-card>
      <div v-if="videos?.length">
        <v-text-field
          v-model="search"
          :append-inner-icon="mdiMagnify"
          label="Поиск по любой информации о видеофайлах"
          variant="solo"
          hide-details
        />
      </div>
      <v-data-table
        v-if="videos?.length"
        v-model:items-per-page="itemsPerPage"
        items-per-page-text="Видеофайлов на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="page"
        :headers="headers"
        :items="videos"
        :search="search"
        v-model:sort-by="sortBy"
        :custom-filter="filterVideos"
        item-value="id"
        class="elevation-1"
      >
        <template v-slot:[`item.accountDisplay`]="{ item }">
          {{ item.accountDisplay || '—' }}
        </template>
        <template v-slot:[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton
              data-test="edit-video-button"
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать видеофайл"
              :disabled="!canManageVideo(item)"
              @click="editVideo(item)"
            />
            <ActionButton
              data-test="delete-video-button"
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить видеофайл"
              :disabled="!canManageVideo(item)"
              @click="deleteVideo(item)"
            />
          </div>
        </template>
      </v-data-table>
      <div v-if="!videos?.length" class="text-center m-5">
        {{ isBusy ? 'Загрузка...' : 'Нет видеофайлов' }}
      </div>
    </v-card>
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

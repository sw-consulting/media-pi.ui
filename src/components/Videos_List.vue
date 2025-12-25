// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>
import { computed, onMounted, ref, watch, nextTick } from 'vue'
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
import { createAccountOptions, estimateSelectWidth } from '@/helpers/account.options.js'

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
const titleInputRef = ref(null)
const itemsPerPage = ref(10)
const sortBy = ref([])
const page = ref(1)
const editingVideoId = ref(null)
const editingTitle = ref('')
const titleSaving = ref(false)

const accountOptions = computed(() => createAccountOptions(accounts.value || [], authStore.user, { includeCommon: true }))


const headers = [
  { title: '', align: 'center', key: 'actions', sortable: false, width: '5%' },
  { title: 'Название', align: 'start', key: 'title', width: '50%' },
  { title: 'Имя файла', align: 'start', key: 'originalFilename', width: '19%' },
  { title: 'Размер', align: 'start', key: 'fileSize', width: '13%' },
  { title: 'Длительность', align: 'start', key: 'duration', width: '13%' },
]

const selectWidth = computed(() => estimateSelectWidth(accountOptions.value))

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

function canManageVideo(item) {
  if (!item) return false
  if (item.accountId === 0) {
    return isAdministrator(authStore.user)
  }
  return canManageAccountById(authStore.user, item.accountId)
}

const isEditing = (item) => editingVideoId.value === item?.id

async function startEdit(item) {
  if (!canManageVideo(item)) return
  editingVideoId.value = item.id
  editingTitle.value = item.title || ''
  await nextTick()
  titleInputRef.value?.focus()
}

function cancelEdit() {
  editingVideoId.value = null
  editingTitle.value = ''
}

async function saveEdit(item) {
  if (!item || titleSaving.value) return
  const newTitle = editingTitle.value.trim()
  if (!newTitle) {
    alertStore.error('Название не может быть пустым')
    return
  }
  // Skip API call if title hasn't changed
  if (newTitle === item.title) {
    cancelEdit()
    return
  }
  titleSaving.value = true
  try {
    await videosStore.update(item.id, { title: newTitle })
    await refreshVideos()
    cancelEdit()
  } catch (err) {
    alertStore.error('Не удалось обновить название: ' + (err?.message || err))
  } finally {
    titleSaving.value = false
  }
}

function handleTitleKeydown(event, item) {
  if (event.key === 'Enter') {
    event.preventDefault()
    saveEdit(item)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    if (!titleSaving.value) {
      cancelEdit()
    }
  }
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

watch(videos, (current) => {
  if (!editingVideoId.value) return
  const exists = (current || []).some(video => video.id === editingVideoId.value)
  if (!exists) {
    cancelEdit()
  }
})
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
              :disabled="!canManageSelectedAccount || isBusy || titleSaving"
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
        <template v-slot:[`item.title`]="{ item }">
          <div class="title-cell">
            <div v-if="isEditing(item)" class="title-edit">
              <input
                ref="titleInputRef"
                v-model="editingTitle"
                class="title-input"
                type="text"
                data-test="edit-title-input"
                aria-label="Название видео"
                @keydown="handleTitleKeydown($event, item)"
              />
              <ActionButton
                data-test="save-title-button"
                :item="item"
                icon="fa-solid fa-check-double"
                tooltip-text="Сохранить"
                :disabled="!canManageVideo(item) || titleSaving || isBusy"
                @click="saveEdit(item)"
              />
              <ActionButton
                data-test="cancel-title-button"
                :item="item"
                icon="fa-solid fa-xmark"
                tooltip-text="Отменить"
                :disabled="titleSaving || isBusy"
                @click="cancelEdit"
              />
            </div>
            <div v-else class="title-display">
              <span class="title-text">{{ item.title || '—' }}</span>
              <ActionButton
                data-test="edit-video-button"
                :item="item"
                icon="fa-solid fa-pen"
                tooltip-text="Редактировать название видео"
                :disabled="!canManageVideo(item) || isBusy || titleSaving"
                @click="startEdit(item)"
              />
            </div>
          </div>
        </template>
        <template v-slot:[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton
              data-test="delete-video-button"
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить видеофайл"
              :disabled="!canManageVideo(item) || isBusy || titleSaving"
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

<style scoped>
.title-cell {
  display: flex;
  align-items: center;
  width: 100%;
}

.title-display {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.title-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title-edit {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.title-input {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  border: 1px solid #666;
  border-radius: 4px;
  background-color: #fff;
}
</style>

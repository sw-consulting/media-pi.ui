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
const { confirmDelete, confirmAction } = useConfirmation()

const { videos, loading } = storeToRefs(videosStore)
const { loading: accountsLoading, accounts } = storeToRefs(accountsStore)
const { alert } = storeToRefs(alertStore)

const selectedAccountId = ref(null)
const fileInput = ref(null)
const titleInputRef = ref(null)
const editingVideoId = ref(null)
const editingTitle = ref('')
const titleSaving = ref(false)
const isUploading = ref(false)
const uploadProgressPercent = ref(0)
const uploadProgressIndeterminate = ref(true)
const uploadAbortController = ref(null)
const selectedVideoIds = ref([])

const accountOptions = computed(() => createAccountOptions(accounts.value || [], authStore.user, { includeCommon: true }))

const uploadProgressTitle = computed(() => isUploading.value ? 'Загрузка видеофайлов' : '')

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

const isBusy = computed(() => loading.value || accountsLoading.value || isUploading.value)
const selectedVideoCount = computed(() => selectedVideoIds.value.length)
const canDeleteSelectedVideos = computed(() => canManageSelectedAccount.value && selectedVideoCount.value > 0 && !isBusy.value && !titleSaving.value)

function resetUploadProgress() {
  uploadProgressPercent.value = 0
  uploadProgressIndeterminate.value = true
}

function handleUploadProgress(progress) {
  if (!progress?.lengthComputable || progress.percentage === null || progress.percentage === undefined) {
    uploadProgressIndeterminate.value = true
    return
  }

  uploadProgressIndeterminate.value = false
  uploadProgressPercent.value = Math.min(100, Math.max(0, progress.percentage))
}

function cancelUpload() {
  uploadAbortController.value?.abort()
}

function isAbortError(err) {
  return err?.name === 'AbortError'
}

function ensureSelection(options) {
  const availableValues = options.map(option => option.value)
  if (!availableValues.includes(selectedAccountId.value)) {
    selectedAccountId.value = availableValues.length ? availableValues[0] : null
  }
}

const refreshVideos = async () => {
  try {
    await videosStore.getAllByAccount(selectedAccountId.value)
    return true
  } catch (err) {
    alertStore.error('Не удалось загрузить информацию о видеофайлах: ' + (err?.message || err))
    return false
  }
}

watch(accountOptions, (options) => ensureSelection(options), { immediate: true })

watch(selectedAccountId, async () => {
  if (selectedAccountId.value === undefined) return
  selectedVideoIds.value = []
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

async function uploadVideos(files) {
  const selectedFiles = Array.from(files || []).filter(Boolean)
  if (!selectedFiles.length) return
  if (!canManageSelectedAccount.value) {
    alertStore.error('Недостаточно прав для загрузки видеофайлов в выбранный раздел')
    return
  }
  resetUploadProgress()
  isUploading.value = true
  const abortController = new AbortController()
  uploadAbortController.value = abortController
  try {
    await videosStore.uploadFiles(selectedFiles, selectedAccountId.value, {
      onUploadProgress: handleUploadProgress,
      signal: abortController.signal
    })
    await refreshVideos()
  } catch (err) {
    if (!isAbortError(err)) {
      alertStore.error('Не удалось загрузить видеофайлы: ' + (err?.message || err))
    }
  } finally {
    isUploading.value = false
    uploadAbortController.value = null
    resetUploadProgress()
  }
}

function onFileChange(event) {
  uploadVideos(event?.target?.files)
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

function summarizeBatchDeleteResult(result, requestedCount) {
  const failures = Array.isArray(result?.failures) ? result.failures : []
  const deletedIds = Array.isArray(result?.deletedIds) ? result.deletedIds : []
  const deletedCount = deletedIds.length

  if (failures.length === 0) {
    alertStore.success(`Удалено видеофайлов: ${deletedCount || requestedCount}`)
    return
  }

  const failureDetails = failures
    .slice(0, 3)
    .map(failure => failure?.message || `id=${failure?.id}`)
    .join('; ')
  const remainingCount = failures.length > 3 ? `; ещё ${failures.length - 3}` : ''
  alertStore.error(`Удалено видеофайлов: ${deletedCount}. Не удалось удалить: ${failures.length}. ${failureDetails}${remainingCount}`)
}

async function deleteSelectedVideos() {
  const ids = [...selectedVideoIds.value]
  if (!ids.length || !canManageSelectedAccount.value) return

  const confirmed = await confirmAction(`Удалить выбранные видеофайлы (${ids.length})?`, {
    title: 'Подтверждение удаления',
    confirmationText: 'Удалить',
    cancellationText: 'Отмена',
    confirmationButtonProps: {
      color: 'orange-darken-3'
    }
  })
  if (!confirmed) return

  try {
    const result = await videosStore.removeBatch(ids)
    selectedVideoIds.value = []
    const refreshed = await refreshVideos()
    if (refreshed) {
      summarizeBatchDeleteResult(result, ids.length)
    }
  } catch (err) {
    alertStore.error('Не удалось удалить видеофайлы: ' + (err?.message || err))
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
  const currentIds = new Set((current || []).map(video => video.id))
  selectedVideoIds.value = selectedVideoIds.value.filter(id => currentIds.has(id))

  if (!editingVideoId.value) return
  const exists = currentIds.has(editingVideoId.value)
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
              tooltip-text="Загрузить видеофайлы"
              :disabled="!canManageSelectedAccount || isBusy || titleSaving"
              @click="triggerUpload"
            />
            <input ref="fileInput" class="d-none" type="file" accept="video/*" multiple @change="onFileChange" />
          </div>
          <div class="header-actions header-actions-group">
            <ActionButton
              data-test="batch-delete-video-button"
              :item="{}"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить выбранные видеофайлы"
              :disabled="!canDeleteSelectedVideos"
              @click="deleteSelectedVideos"
            />
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="isUploading"
      class="upload-progress-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-progress-title"
      data-test="upload-progress"
    >
      <div class="upload-progress-card">
        <div id="upload-progress-title" class="primary-heading upload-progress-title" data-test="upload-progress-label">
          {{ uploadProgressTitle }}
        </div>
        <div class="upload-progress-spinner-wrap">
          <v-progress-circular
            data-test="upload-progress-spinner"
            :model-value="uploadProgressPercent"
            :indeterminate="uploadProgressIndeterminate"
            :size="70"
            :width="7"
            color="primary"
          >
            <span v-if="!uploadProgressIndeterminate" class="upload-progress-percent">
              {{ uploadProgressPercent }}%
            </span>
          </v-progress-circular>
        </div>
        <v-btn
          data-test="cancel-upload-button"
          color="orange-darken-3"
          variant="text"
          class="upload-cancel-button"
          @click="cancelUpload"
        >
          Отменить
        </v-btn>
      </div>
    </div>
    <hr class="hr" />

    <v-card>
      <div v-if="videos?.length">
        <v-text-field
          v-model="authStore.videos_search"
          :append-inner-icon="mdiMagnify"
          label="Поиск по любой информации о видеофайлах"
          variant="solo"
          hide-details
        />
      </div>
      <v-data-table
        v-if="videos?.length"
        v-model:items-per-page="authStore.videos_per_page"
        items-per-page-text="Видеофайлов на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.videos_page"
        v-model="selectedVideoIds"
        :headers="headers"
        :items="videos"
        :search="authStore.videos_search"
        v-model:sort-by="authStore.videos_sort_by"
        :custom-filter="filterVideos"
        :show-select="canManageSelectedAccount"
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

.upload-progress-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  z-index: 2000;
}

.upload-progress-card {
  background: #fff;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  min-width: 260px;
  max-width: 90%;
  text-align: center;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
}

.upload-progress-title {
  margin-bottom: 0.5rem;
}

.upload-progress-spinner-wrap {
  display: flex;
  justify-content: center;
}

.upload-progress-percent {
  color: #1976d2;
  font-size: 0.875rem;
}

.upload-cancel-button {
  margin: 0.75rem 0 0;
}
</style>

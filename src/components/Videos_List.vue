// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { mdiMagnify } from '@mdi/js'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'

import { useVideosStore } from '@/stores/videos.store.js'
import { useAccountsStore } from '@/stores/accounts.store.js'
import { useCategoriesStore } from '@/stores/categories.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirmation } from '@/helpers/confirmation.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { canManageAccountById, isAdministrator } from '@/helpers/user.helpers.js'
import { estimateSelectWidth } from '@/helpers/account.options.js'
import {
  createCategoryOptions,
  createVideoScopeOptions,
  getCategoryTitle,
  parseVideoScope
} from '@/helpers/video.scope.helpers.js'

const props = defineProps({
  title: {
    type: String,
    default: 'Видеофайлы'
  },
  fixedScope: {
    type: String,
    default: null
  }
})

const videosStore = useVideosStore()
const accountsStore = useAccountsStore()
const categoriesStore = useCategoriesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const { confirmDelete, confirmAction } = useConfirmation()

const { videos, loading } = storeToRefs(videosStore)
const { loading: accountsLoading, accounts } = storeToRefs(accountsStore)
const { loading: categoriesLoading, categories } = storeToRefs(categoriesStore)
const { alert } = storeToRefs(alertStore)

const selectedScope = ref(props.fixedScope)
const fileInput = ref(null)
const titleInputRef = ref(null)
const editingVideoId = ref(null)
const editingTitle = ref('')
const titleSaving = ref(false)
const categorySaving = ref(false)
const isUploading = ref(false)
const uploadPhase = ref('idle')
const uploadProgressPercent = ref(0)
const uploadProgressIndeterminate = ref(true)
const uploadAbortController = ref(null)
const selectedVideoIds = ref([])
const batchCategoryId = ref(0)
const localItemsPerPage = ref(10)
const localSearch = ref('')
const localSortBy = ref([])
const localPage = ref(1)

const scopeOptions = computed(() => {
  if (props.fixedScope) return []
  return createVideoScopeOptions(accounts.value || [], categories.value || [], authStore.user)
})
const selectedScopeInfo = computed(() => parseVideoScope(selectedScope.value))
const categoryOptions = computed(() => createCategoryOptions(categories.value || []))

const uploadProgressTitle = computed(() => {
  if (uploadPhase.value === 'processing') return 'Обработка видеофайлов'
  if (uploadPhase.value === 'refreshing') return 'Обновление списка видеофайлов'
  return isUploading.value ? 'Загрузка видеофайлов' : ''
})
const uploadProgressText = computed(() => {
  if (uploadPhase.value === 'processing') return 'Файлы загружены. Идёт обработка на сервере...'
  if (uploadPhase.value === 'refreshing') return 'Получаем обновлённую информацию...'
  return ''
})
const canCancelUpload = computed(() => uploadPhase.value === 'uploading')

const headers = [
  { title: '', align: 'center', key: 'actions', sortable: false, width: '5%' },
  { title: 'Название', align: 'start', key: 'title', width: '38%' },
  { title: 'Имя файла', align: 'start', key: 'originalFilename', width: '18%' },
  { title: 'Категория', align: 'start', key: 'categoryTitle', width: '18%' },
  { title: 'Размер', align: 'start', key: 'fileSize', width: '13%' },
  { title: 'Длительность', align: 'start', key: 'duration', width: '13%' },
]

const selectWidth = computed(() => estimateSelectWidth(scopeOptions.value))

const canManageSelectedScope = computed(() => {
  const scope = selectedScopeInfo.value
  if (scope.accountId === 0) {
    return isAdministrator(authStore.user)
  }
  return canManageAccountById(authStore.user, scope.accountId)
})

const isBusy = computed(() => loading.value || accountsLoading.value || categoriesLoading.value || isUploading.value)
const selectedVideoCount = computed(() => selectedVideoIds.value.length)
const canDeleteSelectedVideos = computed(() => canManageSelectedScope.value && selectedVideoCount.value > 0 && !isBusy.value && !titleSaving.value && !categorySaving.value)
const canUpdateSelectedCategory = computed(() => canDeleteSelectedVideos.value && typeof batchCategoryId.value === 'number')
const tableItemsPerPage = computed({
  get: () => props.fixedScope ? localItemsPerPage.value : authStore.videos_per_page,
  set: value => {
    if (props.fixedScope) localItemsPerPage.value = value
    else authStore.videos_per_page = value
  }
})
const tableSearch = computed({
  get: () => props.fixedScope ? localSearch.value : authStore.videos_search,
  set: value => {
    if (props.fixedScope) localSearch.value = value
    else authStore.videos_search = value
  }
})
const tableSortBy = computed({
  get: () => props.fixedScope ? localSortBy.value : authStore.videos_sort_by,
  set: value => {
    if (props.fixedScope) localSortBy.value = value
    else authStore.videos_sort_by = value
  }
})
const tablePage = computed({
  get: () => props.fixedScope ? localPage.value : authStore.videos_page,
  set: value => {
    if (props.fixedScope) localPage.value = value
    else authStore.videos_page = value
  }
})

function resetUploadProgress() {
  uploadPhase.value = 'idle'
  uploadProgressPercent.value = 0
  uploadProgressIndeterminate.value = true
}

function handleUploadProgress(progress) {
  if (!progress?.lengthComputable || progress.percentage === null || progress.percentage === undefined) {
    uploadProgressIndeterminate.value = true
    return
  }

  const nextPercent = Math.min(100, Math.max(0, progress.percentage))
  uploadProgressPercent.value = nextPercent

  if (nextPercent >= 100) {
    uploadPhase.value = 'processing'
    uploadProgressIndeterminate.value = true
    return
  }

  uploadPhase.value = 'uploading'
  uploadProgressIndeterminate.value = false
}

function cancelUpload() {
  uploadAbortController.value?.abort()
}

function isAbortError(err) {
  return err?.name === 'AbortError'
}

function ensureSelection(options) {
  if (props.fixedScope) {
    selectedScope.value = props.fixedScope
    return
  }

  const availableValues = options.map(option => option.value)
  if (!availableValues.includes(selectedScope.value)) {
    selectedScope.value = availableValues.length ? availableValues[0] : null
  }
}

const refreshVideos = async () => {
  try {
    const scope = selectedScopeInfo.value
    await videosStore.getAllByAccount(
      scope.accountId,
      Object.prototype.hasOwnProperty.call(scope, 'categoryId') && scope.categoryId !== undefined
        ? { categoryId: scope.categoryId }
        : {}
    )
    return true
  } catch (err) {
    alertStore.error('Не удалось загрузить информацию о видеофайлах: ' + (err?.message || err))
    return false
  }
}

watch(scopeOptions, (options) => ensureSelection(options), { immediate: true })

watch(selectedScope, async () => {
  if (selectedScope.value === undefined || selectedScope.value === null) return
  selectedVideoIds.value = []
  await refreshVideos()
}, { immediate: true })

onMounted(async () => {
  try {
    if (!props.fixedScope) {
      await accountsStore.getAll()
    }
    await categoriesStore.getAll()
  } catch (err) {
    alertStore.error('Не удалось загрузить справочники видеофайлов: ' + (err?.message || err))
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
  if (!canManageSelectedScope.value) {
    alertStore.error('Недостаточно прав для загрузки видеофайлов в выбранный раздел')
    return
  }
  resetUploadProgress()
  isUploading.value = true
  uploadPhase.value = 'uploading'
  const abortController = new AbortController()
  uploadAbortController.value = abortController
  try {
    const scope = selectedScopeInfo.value
    const uploadOptions = {
      onUploadProgress: handleUploadProgress,
      signal: abortController.signal
    }
    if (scope.categoryId !== undefined) {
      uploadOptions.categoryId = scope.categoryId
    }

    await videosStore.uploadFiles(selectedFiles, scope.accountId, uploadOptions)
    uploadPhase.value = 'refreshing'
    uploadProgressIndeterminate.value = true
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

function categoryTitle(categoryId) {
  return getCategoryTitle(categoryId, categories.value || [])
}

async function updateVideoCategory(item, categoryId) {
  if (!canManageVideo(item) || categorySaving.value) return
  categorySaving.value = true
  try {
    await videosStore.update(item.id, { categoryId })
    await refreshVideos()
  } catch (err) {
    alertStore.error('Не удалось обновить категорию: ' + (err?.message || err))
  } finally {
    categorySaving.value = false
  }
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
  if (!ids.length || !canManageSelectedScope.value) return

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

function summarizeBatchCategoryResult(result, requestedCount) {
  const failures = Array.isArray(result?.failures) ? result.failures : []
  const updatedIds = Array.isArray(result?.updatedIds) ? result.updatedIds : []
  const updatedCount = updatedIds.length

  if (failures.length === 0) {
    alertStore.success(`Обновлено видеофайлов: ${updatedCount || requestedCount}`)
    return
  }

  const failureDetails = failures
    .slice(0, 3)
    .map(failure => failure?.message || `id=${failure?.id}`)
    .join('; ')
  const remainingCount = failures.length > 3 ? `; ещё ${failures.length - 3}` : ''
  alertStore.error(`Обновлено видеофайлов: ${updatedCount}. Не удалось обновить: ${failures.length}. ${failureDetails}${remainingCount}`)
}

async function updateSelectedVideoCategory() {
  const ids = [...selectedVideoIds.value]
  if (!ids.length || !canManageSelectedScope.value || typeof batchCategoryId.value !== 'number') return

  categorySaving.value = true
  try {
    const result = await videosStore.updateCategoryBatch(ids, batchCategoryId.value)
    selectedVideoIds.value = []
    const refreshed = await refreshVideos()
    if (refreshed) {
      summarizeBatchCategoryResult(result, ids.length)
    }
  } catch (err) {
    alertStore.error('Не удалось обновить категории видеофайлов: ' + (err?.message || err))
  } finally {
    categorySaving.value = false
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
    rawVideo.accountDisplay,
    categoryTitle(rawVideo.categoryId)
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
      <h1 class="primary-heading">{{ props.title }}</h1>
      <div class="header-actions-container">
        <div v-if="loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <v-select
            v-if="!props.fixedScope"
            v-model="selectedScope"
            :items="scopeOptions"
            label="Раздел"
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
              :disabled="!canManageSelectedScope || isBusy || titleSaving || categorySaving"
              @click="triggerUpload"
            />
            <input ref="fileInput" class="d-none" type="file" accept="video/*" multiple @change="onFileChange" />
          </div>
          <div class="header-actions header-actions-group">
            <v-select
              v-model="batchCategoryId"
              :items="categoryOptions"
              label="Категория"
              item-title="title"
              item-value="value"
              density="compact"
              variant="outlined"
              hide-details
              :disabled="!canUpdateSelectedCategory"
              style="width: 220px; margin-right: 8px;"
            />
            <ActionButton
              data-test="batch-category-video-button"
              :item="{}"
              icon="fa-solid fa-tags"
              tooltip-text="Изменить категорию выбранных видеофайлов"
              :disabled="!canUpdateSelectedCategory"
              @click="updateSelectedVideoCategory"
            />
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
        <div v-if="uploadProgressText" class="upload-progress-text" data-test="upload-progress-text">
          {{ uploadProgressText }}
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
          v-if="canCancelUpload"
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
          v-model="tableSearch"
          :append-inner-icon="mdiMagnify"
          label="Поиск по любой информации о видеофайлах"
          variant="solo"
          hide-details
        />
      </div>
      <v-data-table
        v-if="videos?.length"
        v-model:items-per-page="tableItemsPerPage"
        items-per-page-text="Видеофайлов на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="tablePage"
        v-model="selectedVideoIds"
        :headers="headers"
        :items="videos"
        :search="tableSearch"
        v-model:sort-by="tableSortBy"
        :custom-filter="filterVideos"
        :show-select="canManageSelectedScope"
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
            </div>
          </div>
        </template>
        <template v-slot:[`item.categoryTitle`]="{ item }">
          <v-select
            v-if="canManageVideo(item) && item.accountId === 0"
            :model-value="item.categoryId || 0"
            :items="categoryOptions"
            item-title="title"
            item-value="value"
            density="compact"
            variant="outlined"
            hide-details
            :disabled="isBusy || titleSaving || categorySaving"
            data-test="video-category-select"
            @update:model-value="updateVideoCategory(item, $event)"
          />
          <span v-else data-test="video-category-label">{{ categoryTitle(item.categoryId) }}</span>
        </template>
        <template v-slot:[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton
              data-test="edit-video-button"
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать название видео"
              :disabled="!canManageVideo(item) || isBusy || titleSaving || categorySaving"
              @click="startEdit(item)"
            />
            <ActionButton
              data-test="delete-video-button"
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить видеофайл"
              :disabled="!canManageVideo(item) || isBusy || titleSaving || categorySaving"
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

.upload-progress-text {
  color: #5c6f7f;
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
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

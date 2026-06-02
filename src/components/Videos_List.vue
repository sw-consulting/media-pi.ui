// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { mdiMagnify } from '@mdi/js'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'

import router from '@/router'
import { useVideosStore } from '@/stores/videos.store.js'
import { useAccountsStore } from '@/stores/accounts.store.js'
import { useCategoriesStore } from '@/stores/categories.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirmation } from '@/helpers/confirmation.js'
import { isPlaylistAccessImpactError } from '@/helpers/playlist.access.impact.js'
import ModalWindow from '@/components/ModalWindow.vue'
import PlaylistAccessImpactDialog from '@/components/PlaylistAccessImpactDialog.vue'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { canManageAccountById, isAdministrator } from '@/helpers/user.helpers.js'
import { estimateSelectWidth } from '@/helpers/account.options.js'
import {
  createCategoryOptions,
  createVideoScopeOptions,
  getVideoCategoryTitle,
  parseVideoScope
} from '@/helpers/video.scope.helpers.js'

const props = defineProps({
  title: {
    type: String,
    default: 'Видеофайлы'
  },
  embedded: {
    type: Boolean,
    default: false
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
const uploadProgressRef = ref(null)
const categorySaving = ref(false)
const isUploading = ref(false)
const uploadPhase = ref('idle')
const uploadProgressPercent = ref(0)
const uploadProgressIndeterminate = ref(true)
const uploadAbortController = ref(null)
const selectedVideoIds = ref([])
const batchCategoryId = ref(0)
const batchCategoryDialog = ref(false)
const playlistImpactDialog = ref(false)
const playlistImpact = ref(null)
const pendingCategoryUpdate = ref(null)
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

const baseHeaders = [
  { title: '', align: 'center', key: 'actions', sortable: false, width: '5%' },
  { title: 'Название', align: 'start', key: 'title', width: '42%' },
  { title: 'Имя файла', align: 'start', key: 'originalFilename', width: '22%' },
  { title: 'Размер', align: 'start', key: 'fileSize', width: '13%' },
  { title: 'Длительность', align: 'start', key: 'duration', width: '13%' },
]

const categoryHeader = { title: 'Категория', align: 'start', key: 'categoryTitle', width: '18%' }
const showCategoryColumn = computed(() => selectedScopeInfo.value.accountId === 0)
const headers = computed(() => {
  if (!showCategoryColumn.value) return baseHeaders
  return [
    baseHeaders[0],
    { ...baseHeaders[1], width: '38%' },
    { ...baseHeaders[2], width: '18%' },
    categoryHeader,
    baseHeaders[3],
    baseHeaders[4],
  ]
})

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
const canDeleteSelectedVideos = computed(() => canManageSelectedScope.value && selectedVideoCount.value > 0 && !isBusy.value && !categorySaving.value)
const canUpdateSelectedCategory = computed(() => selectedScopeInfo.value.accountId === 0 && canDeleteSelectedVideos.value)
const canApplyBatchCategory = computed(() => canUpdateSelectedCategory.value && typeof batchCategoryId.value === 'number')
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

function handleUploadProgressKeydown(event) {
  if (event.key !== 'Escape' || !canCancelUpload.value) return
  event.preventDefault()
  cancelUpload()
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

watch(isUploading, async (visible) => {
  if (!visible) return
  await nextTick()
  uploadProgressRef.value?.focus()
})

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

function videoCategoryTitle(video) {
  return getVideoCategoryTitle(video, categories.value || [])
}

function editVideo(item) {
  if (!canManageVideo(item)) return
  router.push(`/video/edit/${item.id}`)
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
      batchCategoryDialog.value = false
      summarizeBatchCategoryResult(result, ids.length)
    }
  } catch (err) {
    if (isPlaylistAccessImpactError(err)) {
      playlistImpact.value = err.data
      pendingCategoryUpdate.value = { ids, categoryId: batchCategoryId.value }
      playlistImpactDialog.value = true
      return
    }
    alertStore.error('Не удалось обновить категории видеофайлов: ' + (err?.message || err))
  } finally {
    categorySaving.value = false
  }
}

async function confirmPlaylistCleanup() {
  const pending = pendingCategoryUpdate.value
  if (!pending) return

  categorySaving.value = true
  try {
    const result = await videosStore.updateCategoryBatch(pending.ids, pending.categoryId, { forcePlaylistCleanup: true })
    selectedVideoIds.value = []
    const refreshed = await refreshVideos()
    if (refreshed) {
      batchCategoryDialog.value = false
      playlistImpactDialog.value = false
      pendingCategoryUpdate.value = null
      summarizeBatchCategoryResult(result, pending.ids.length)
    }
  } catch (err) {
    alertStore.error('Не удалось обновить категории видеофайлов: ' + (err?.message || err))
  } finally {
    categorySaving.value = false
  }
}

function cancelPlaylistCleanup() {
  if (categorySaving.value) return
  playlistImpactDialog.value = false
  pendingCategoryUpdate.value = null
}

function openBatchCategoryDialog() {
  if (!canUpdateSelectedCategory.value) return
  batchCategoryId.value = 0
  batchCategoryDialog.value = true
}

function closeBatchCategoryDialog() {
  if (categorySaving.value) return
  batchCategoryDialog.value = false
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
    videoCategoryTitle(rawVideo)
  ].some(field => (field || '').toString().toLocaleLowerCase().includes(q))
}

watch(videos, (current) => {
  const currentIds = new Set((current || []).map(video => video.id))
  selectedVideoIds.value = selectedVideoIds.value.filter(id => currentIds.has(id))
})
</script>

<template>
  <div class="settings table-3" :class="{ 'videos-list-embedded': props.embedded }">
    <div class="header-with-actions" :class="{ 'videos-list-subsection-header': props.embedded }">
      <div class="videos-list-title">
        <h2
          v-if="props.embedded"
          class="secondary-heading"
          data-test="videos-list-subheading"
        >
          {{ props.title }}
        </h2>
        <h1
          v-else
          class="primary-heading"
          data-test="videos-list-heading"
        >
          {{ props.title }}
        </h1>
      </div>
      <div class="header-actions-container">
        <div v-if="loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div v-if="!props.fixedScope" class="header-actions header-actions-group">
          <v-select            
            v-model="selectedScope"
            :items="scopeOptions"
            label="Лицевой счёт или категория"
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
              :disabled="!canManageSelectedScope || isBusy || categorySaving"
              @click="triggerUpload"
            />
            <input ref="fileInput" class="d-none" type="file" accept="video/*" multiple @change="onFileChange" />
          </div>
      </div>
          <div v-else class="header-actions header-actions-group">
            <ActionButton
              data-test="upload-video-button"
              :item="{}"
              icon="fa-solid fa-cloud-arrow-up"
              tooltip-text="Загрузить видеофайлы"
              :disabled="!canManageSelectedScope || isBusy || categorySaving"
              @click="triggerUpload"
            />
            <input ref="fileInput" class="d-none" type="file" accept="video/*" multiple @change="onFileChange" />
          </div>

      <div class="header-actions-container">
          <div class="header-actions header-actions-group">
            <ActionButton
              data-test="batch-category-video-button"
              :item="{}"
              icon="fa-solid fa-arrows-turn-to-dots"
              tooltip-text="Изменить категорию выбранных видеофайлов"
              :disabled="!canUpdateSelectedCategory"
              @click="openBatchCategoryDialog"
            />
          </div>
      </div>
      <div class="header-actions-container">
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
    <ModalWindow
      v-model="batchCategoryDialog"
      title="Изменение категории"
      data-test="batch-category-dialog"
      @confirm="updateSelectedVideoCategory"
      @cancel="closeBatchCategoryDialog"
    >
      <div class="batch-category-dialog-content">
        <p class="batch-category-message">
          Выберите категорию для выбранных видеофайлов ({{ selectedVideoCount }}).
        </p>
        <v-select
          v-model="batchCategoryId"
          :items="categoryOptions"
          label="Категория"
          item-title="title"
          item-value="value"
          density="compact"
          variant="outlined"
          hide-details
          :disabled="categorySaving"
          data-test="batch-category-select"
        />
      </div>
      <template #actions>
        <v-btn
          data-test="apply-batch-category-button"
          color="primary"
          variant="text"
          :disabled="!canApplyBatchCategory"
          @click="updateSelectedVideoCategory"
        >
          <span v-show="categorySaving" class="spinner-border spinner-border-sm mr-1"></span>
          Применить
        </v-btn>
        <v-btn
          data-test="cancel-batch-category-button"
          variant="text"
          :disabled="categorySaving"
          @click="closeBatchCategoryDialog"
        >
          Отменить
        </v-btn>
      </template>
    </ModalWindow>
    <PlaylistAccessImpactDialog
      v-model="playlistImpactDialog"
      :impact="playlistImpact"
      :saving="categorySaving"
      @confirm="confirmPlaylistCleanup"
      @cancel="cancelPlaylistCleanup"
    />
    <div
      v-if="isUploading"
      ref="uploadProgressRef"
      class="upload-progress-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-progress-title"
      data-test="upload-progress"
      tabindex="0"
      @keydown="handleUploadProgressKeydown"
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
    <hr v-if="!props.embedded" class="hr" />
    <div v-else class="videos-list-subsection-divider"></div>

    <v-card :class="{ 'videos-list-card-embedded': props.embedded }">
      <div v-if="videos?.length">
        <v-text-field
          v-model="tableSearch"
          :append-inner-icon="mdiMagnify"
          label="Поиск по любой информации о видеофайлах"
          variant="solo"
          :density="props.embedded ? 'compact' : undefined"
          hide-details
        />
      </div>
      <v-data-table
        v-model:items-per-page="tableItemsPerPage"
        items-per-page-text="Видеофайлов на странице"
        no-data-text="Нет видеофайлов"
        no-results-text="Видеофайлы не найдены"
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
        :density="props.embedded ? 'compact' : undefined"
        class="elevation-1"
      >
        <template v-slot:[`item.accountDisplay`]="{ item }">
          {{ item.accountDisplay || '—' }}
        </template>
        <template v-slot:[`item.title`]="{ item }">
          <div class="title-display">
            <span class="title-text">{{ item.title || '—' }}</span>
          </div>
        </template>
        <template v-slot:[`item.categoryTitle`]="{ item }">
          <span data-test="video-category-label">{{ videoCategoryTitle(item) }}</span>
        </template>
        <template v-slot:[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton
              data-test="edit-video-button"
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать видеофайл"
              :disabled="!canManageVideo(item) || isBusy || categorySaving"
              @click="editVideo"
            />
            <ActionButton
              data-test="delete-video-button"
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить видеофайл"
              :disabled="!canManageVideo(item) || isBusy || categorySaving"
              @click="deleteVideo(item)"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

<style scoped>
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

.videos-list-title {
  min-width: 0;
}

.videos-list-title .primary-heading,
.videos-list-title .secondary-heading {
  margin: 0;
}

.videos-list-embedded {
  margin-top: 1.5rem;
}

.videos-list-embedded .videos-list-subsection-header {
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 8px;
}

.videos-list-embedded .header-actions {
  gap: 0.125rem;
  padding: 0.25rem;
  border-color: #d0d7de;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}

.videos-list-subsection-divider {
  height: 1px;
  margin: 0 0 12px;
  background: #e0e0e0;
}

.videos-list-card-embedded {
  overflow: hidden;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: none;
}

.videos-list-embedded :deep(.v-data-table thead th),
.videos-list-embedded :deep(.v-data-table-server thead th),
.videos-list-embedded :deep(.v-table thead th),
.videos-list-embedded :deep(.v-table > .v-table__wrapper > table > thead > tr > th) {
  font-size: 0.9rem !important;
}

.videos-list-embedded :deep(.v-data-table__td) {
  font-size: 0.875rem;
}

.batch-category-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.batch-category-message {
  margin: 0;
  color: #34495e;
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

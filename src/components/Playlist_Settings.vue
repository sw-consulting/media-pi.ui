// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>
import { computed, ref, watch } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'

import { usePlaylistsStore } from '@/stores/playlists.store.js'
import { useVideosStore } from '@/stores/videos.store.js'
import { useAccountsStore } from '@/stores/accounts.store.js'
import { useCategoriesStore } from '@/stores/categories.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { redirectToDefaultRoute } from '@/helpers/default.route.js'
import { createAccountOptions } from '@/helpers/account.options.js'
import { formatDuration, formatFileSize } from '@/helpers/media.format.js'
import { getCategoryTitle } from '@/helpers/video.scope.helpers.js'

const props = defineProps({
  register: {
    type: Boolean,
    required: true
  },
  id: {
    type: Number,
    required: false
  },
  accountId: {
    type: Number,
    required: false
  }
})

const playlistsStore = usePlaylistsStore()
const videosStore = useVideosStore()
const accountsStore = useAccountsStore()
const categoriesStore = useCategoriesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)
const { loading } = storeToRefs(playlistsStore)

const playlist = ref({
  title: '',
  filename: '',
  accountId: props.accountId ?? null
})

function generatePlaylistFilename() {
  const digits = Math.floor(100000 + Math.random() * 900000).toString()
  return `playlist-${digits}.m3u`
}

// Initialize filename for new playlists when creating
if (props.register && !playlist.value.filename) {
  playlist.value.filename = generatePlaylistFilename()
}

const playlistItems = ref([])
const availableVideos = ref([])
const videoSearch = ref('')
const itemsError = ref('')
const filenameError = ref('')
const initialLoading = ref(false)
const videosLoading = ref(false)
const selectedAvailableVideoIds = ref([])
const selectedPlaylistItemKeys = ref([])
const availableSortBy = ref([])
let playlistItemUid = 0

const schema = Yup.object().shape({
  title: Yup.string().trim().required('Необходимо указать описание')
})

const playlistVideoHeaders = [
  { title: '', align: 'center', key: 'select', sortable: false, width: '44px' },
  { title: '#', align: 'center', key: 'position', sortable: false, width: '44px' },
  { title: 'Название', align: 'start', key: 'title', sortable: false },
  { title: 'Категория', align: 'start', key: 'categoryName', sortable: false, width: '150px' },
  { title: 'Размер', align: 'start', key: 'fileSize', sortable: false, width: '120px' },
  { title: 'Длительность', align: 'start', key: 'duration', sortable: false, width: '130px' },
  { title: '', align: 'center', key: 'actions', sortable: false, width: '44px' }
]

const availableVideoHeaders = [
  { title: '', align: 'center', key: 'actions', sortable: false, width: '44px' },
  { title: '', align: 'center', key: 'select', sortable: false, width: '44px' },
  { title: 'Название', align: 'start', key: 'title' },
  { title: 'Лицевой счёт', align: 'start', key: 'accountName', sortable: false, width: '150px' },
  { title: 'Категория', align: 'start', key: 'categoryName', sortable: true, width: '150px' },
  { title: 'Размер', align: 'start', key: 'fileSize', sortable: true, sort: compareMediaNumber, width: '120px' },
  { title: 'Длительность', align: 'start', key: 'duration', sortable: true, sort: compareMediaNumber, width: '130px' }
]

const videoAccountOptions = computed(() => createAccountOptions(accountsStore.accounts || [], authStore.user, { includeCommon: true }))

const accountNameById = computed(() => {
  const map = new Map()
  map.set(0, 'Общие видеофайлы')
  for (const account of accountsStore.accounts || []) {
    map.set(account.id, account.name || `Лицевой счёт ${account.id}`)
  }
  return map
})
const accountLabel = computed(() => {
  if (playlist.value.accountId === null || playlist.value.accountId === undefined) return '—'
  return accountNameById.value.get(playlist.value.accountId) || `Лицевой счёт ${playlist.value.accountId}`
})

const availableVideoMap = computed(() => {
  const map = new Map()
  for (const video of availableVideos.value) {
    map.set(video.id, video)
  }
  return map
})

const filteredAvailableVideos = computed(() => {
  if (!videoSearch.value) return availableVideos.value
  const query = videoSearch.value.toLocaleLowerCase()
  return availableVideos.value.filter(video => [
    video.title,
    video.originalFilename,
    video.accountName,
    video.categoryName
  ].some(field => (field || '').toString().toLocaleLowerCase().includes(query)))
})

const sortedFilteredAvailableVideos = computed(() => {
  const items = filteredAvailableVideos.value
  if (!availableSortBy.value.length) return items
  const { key, order } = availableSortBy.value[0]
  const sorted = [...items].sort((a, b) => {
    const result = key === 'fileSize' || key === 'duration'
      ? compareMediaNumber(a[key], b[key])
      : (a[key] || '').toString().localeCompare((b[key] || '').toString(), 'ru')
    return order === 'desc' ? -result : result
  })
  return sorted
})

const playlistVideoDetails = computed(() => playlistItems.value.map((item, index) => {
  const video = availableVideoMap.value.get(item.videoId)
  const title = video?.title || video?.originalFilename || `Видео #${item.videoId}`
  const categoryId = video?.categoryId ?? 0
  return {
    key: item.uid,
    videoId: item.videoId,
    position: index + 1,
    title,
    fileSize: video?.fileSize,
    duration: video?.duration,
    accountName: video?.accountName,
    categoryId,
    categoryName: getCategoryTitle(categoryId, categoriesStore.categories || [])
  }
}))

const totalVideoCount = computed(() => playlistItems.value.length)
const totalFileSize = computed(() => playlistVideoDetails.value.reduce((sum, item) => sum + (Number(item.fileSize) || 0), 0))
const totalDuration = computed(() => playlistVideoDetails.value.reduce((sum, item) => sum + (Number(item.duration) || 0), 0))
const visibleAvailableVideoIds = computed(() => sortedFilteredAvailableVideos.value.map(video => video.id))
const visiblePlaylistItemKeys = computed(() => playlistVideoDetails.value.map(item => item.key))
const hasSelectedAvailableVideos = computed(() => selectedAvailableVideoIds.value.length > 0)
const hasSelectedPlaylistItems = computed(() => selectedPlaylistItemKeys.value.length > 0)
const allVisibleAvailableVideosSelected = computed(() => (
  visibleAvailableVideoIds.value.length > 0 &&
  visibleAvailableVideoIds.value.every(id => selectedAvailableVideoIds.value.includes(id))
))
const someVisibleAvailableVideosSelected = computed(() => (
  visibleAvailableVideoIds.value.some(id => selectedAvailableVideoIds.value.includes(id)) &&
  !allVisibleAvailableVideosSelected.value
))
const allVisiblePlaylistItemsSelected = computed(() => (
  visiblePlaylistItemKeys.value.length > 0 &&
  visiblePlaylistItemKeys.value.every(key => selectedPlaylistItemKeys.value.includes(key))
))
const someVisiblePlaylistItemsSelected = computed(() => (
  visiblePlaylistItemKeys.value.some(key => selectedPlaylistItemKeys.value.includes(key)) &&
  !allVisiblePlaylistItemsSelected.value
))

const playlistButtonText = computed(() => (props.register ? 'Создать' : 'Сохранить'))
const playlistTitleText = computed(() => (props.register ? 'Новый плейлист' : `Настройки плейлиста '${playlist.value.title}'` ))
const formKey = computed(() => `${props.register ? 'create' : 'edit'}-${playlist.value.accountId ?? 'none'}`)

watch(videoAccountOptions, async (options) => {
  if (!options.length) {
    availableVideos.value = []
    return
  }
  await loadAvailableVideos()
}, { immediate: true })

watch(availableVideos, (videos) => {
  const availableIds = new Set((videos || []).map(video => video.id))
  selectedAvailableVideoIds.value = selectedAvailableVideoIds.value.filter(id => availableIds.has(id))
})

watch(playlistItems, (items) => {
  const itemKeys = new Set((items || []).map(item => item.uid))
  selectedPlaylistItemKeys.value = selectedPlaylistItemKeys.value.filter(key => itemKeys.has(key))
}, { deep: true })

if (!props.register) {
  initialLoading.value = true
  try {
    await playlistsStore.getById(props.id)
    const loadedPlaylist = playlistsStore.playlist
    if (!loadedPlaylist) {
      throw new Error(`Плейлист с ID ${props.id} не найден`)
    }
    playlist.value = {
      title: loadedPlaylist.title || '',
      filename: loadedPlaylist.filename || '',
      accountId: loadedPlaylist.accountId ?? null
    }
    playlistItems.value = normalizePlaylistItems(loadedPlaylist.items)
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      redirectToDefaultRoute()
    } else if (err.status === 404) {
      alertStore.error(`Плейлист с ID ${props.id} не найден`)
    } else {
      alertStore.error(`Ошибка загрузки плейлиста: ${err.message || err}`)
    }
  } finally {
    initialLoading.value = false
  }
}

try {
  await accountsStore.getAll()
  await categoriesStore.getAll()
  updateAvailableCategoryNames()
} catch (err) {
  alertStore.error(`Не удалось загрузить лицевые счета: ${err.message || err}`)
}

function normalizePlaylistItems(items) {
  if (!Array.isArray(items)) return []
  return items
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((item) => ({
      uid: createPlaylistItemUid(),
      videoId: item.videoId,
      position: item.position
    }))
}

function createPlaylistItemUid() {
  playlistItemUid += 1
  return `playlist-item-${playlistItemUid}`
}

function createPlaylistItem(videoId, position) {
  return {
    uid: createPlaylistItemUid(),
    videoId,
    position
  }
}

function getVideoTitle(video) {
  return video?.title || video?.originalFilename || `Видео #${video?.id}`
}

function toSortableMediaNumber(value) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function compareMediaNumber(a, b) {
  return toSortableMediaNumber(a) - toSortableMediaNumber(b)
}

function updateAvailableCategoryNames() {
  availableVideos.value = availableVideos.value.map(video => ({
    ...video,
    categoryName: getCategoryTitle(video.categoryId, categoriesStore.categories || [])
  }))
}

async function loadAvailableVideos() {
  videosLoading.value = true
  try {
    const currentAccountId = playlist.value.accountId ?? props.accountId ?? null
    const accountIds = [...new Set([
      0,
      currentAccountId
    ].filter(accountId => accountId !== null && accountId !== undefined))]

    const collected = []
    for (const accountId of accountIds) {
      const items = await videosStore.getAllByAccount(accountId)
      for (const video of items || []) {
        collected.push({
          id: video.id,
          title: video.title,
          originalFilename: video.originalFilename,
          fileSize: video.fileSizeBytes,
          duration: video.durationSeconds,
          accountId: video.accountId,
          accountName: accountNameById.value.get(video.accountId) || `Лицевой счёт ${video.accountId}`,
          categoryId: video.categoryId || 0,
          categoryName: getCategoryTitle(video.categoryId, categoriesStore.categories || [])
        })
      }
    }
    availableVideos.value = collected
  } catch (err) {
    alertStore.error(`Не удалось загрузить список видео: ${err.message || err}`)
  } finally {
    videosLoading.value = false
  }
}

function addVideoToPlaylist(video) {
  if (!video) return
  playlistItems.value.push(createPlaylistItem(video.id, playlistItems.value.length + 1))
  itemsError.value = ''
}

function addSelectedVideosToPlaylist() {
  if (!selectedAvailableVideoIds.value.length) return
  const selectedIds = new Set(selectedAvailableVideoIds.value)
  const videosToAdd = sortedFilteredAvailableVideos.value.filter(video => selectedIds.has(video.id))
  for (const video of videosToAdd) {
    playlistItems.value.push(createPlaylistItem(video.id, playlistItems.value.length + 1))
  }
  selectedAvailableVideoIds.value = []
  if (videosToAdd.length) itemsError.value = ''
}

function removePlaylistItem(index) {
  if (index < 0 || index >= playlistItems.value.length) return
  const [removed] = playlistItems.value.splice(index, 1)
  if (removed) {
    selectedPlaylistItemKeys.value = selectedPlaylistItemKeys.value.filter(key => key !== removed.uid)
  }
  rebuildPositions()
}

function removeSelectedPlaylistItems() {
  if (!selectedPlaylistItemKeys.value.length) return
  const selectedKeys = new Set(selectedPlaylistItemKeys.value)
  playlistItems.value = playlistItems.value.filter(item => !selectedKeys.has(item.uid))
  selectedPlaylistItemKeys.value = []
  rebuildPositions()
}

function toggleAvailableVideoSelection(videoId, checked) {
  const selected = new Set(selectedAvailableVideoIds.value)
  if (checked) {
    selected.add(videoId)
  } else {
    selected.delete(videoId)
  }
  selectedAvailableVideoIds.value = Array.from(selected)
}

function togglePlaylistItemSelection(key, checked) {
  const selected = new Set(selectedPlaylistItemKeys.value)
  if (checked) {
    selected.add(key)
  } else {
    selected.delete(key)
  }
  selectedPlaylistItemKeys.value = Array.from(selected)
}

function toggleVisibleAvailableVideos(checked) {
  const visibleIds = new Set(visibleAvailableVideoIds.value)
  const selected = new Set(selectedAvailableVideoIds.value)
  for (const id of visibleIds) {
    if (checked) {
      selected.add(id)
    } else {
      selected.delete(id)
    }
  }
  selectedAvailableVideoIds.value = Array.from(selected)
}

function toggleVisiblePlaylistItems(checked) {
  const visibleKeys = new Set(visiblePlaylistItemKeys.value)
  const selected = new Set(selectedPlaylistItemKeys.value)
  for (const key of visibleKeys) {
    if (checked) {
      selected.add(key)
    } else {
      selected.delete(key)
    }
  }
  selectedPlaylistItemKeys.value = Array.from(selected)
}

function movePlaylistItem(index, direction) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= playlistItems.value.length) return
  const updated = playlistItems.value.slice()
  const [moved] = updated.splice(index, 1)
  updated.splice(newIndex, 0, moved)
  playlistItems.value = updated
  rebuildPositions()
}

function rebuildPositions() {
  playlistItems.value = playlistItems.value.map((item, index) => ({
    ...item,
    position: index + 1
  }))
}

async function checkFilenameUnique(filename, accountId) {
  const trimmed = filename.trim().toLocaleLowerCase()
  if (!trimmed) return true
  const existing = await playlistsStore.getAllByAccount(accountId)
  return !(existing || []).some(item => {
    if (!item?.filename) return false
    if (props.id && item.id === props.id) return false
    return item.filename.toLocaleLowerCase() === trimmed
  })
}

function buildItemsPayload() {
  return playlistItems.value.map((item, index) => ({
    videoId: item.videoId,
    position: index + 1
  }))
}

async function onSubmit(values) {
  itemsError.value = ''
  filenameError.value = ''

  const trimmedTitle = values.title.trim()
  const accountId = values.accountId ?? playlist.value.accountId ?? props.accountId ?? null

  try {
    let finalFilename = (playlist.value.filename || '').trim()
    if (props.register && !finalFilename) {
      finalFilename = generatePlaylistFilename()
      // reflect into reactive state so UI is consistent
      playlist.value.filename = finalFilename
    }
    const isUnique = await checkFilenameUnique(finalFilename, accountId)
    if (!isUnique) {
      filenameError.value = 'Плейлист с таким именем файла уже существует'
      alertStore.error(filenameError.value)
      return
    }

    const payload = {
      title: trimmedTitle,
      filename: finalFilename,
      items: buildItemsPayload()
    }

    if (props.register) {
      payload.accountId = accountId
      await playlistsStore.create(payload)
    } else {
      await playlistsStore.update(props.id, payload)
    }
    router.go(-1)
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      redirectToDefaultRoute()
    } else if (err.status === 404) {
      alertStore.error(`Плейлист с ID ${props.id} не найден`)
    } else if (err.status === 409) {
      alertStore.error('Плейлист с таким названием уже существует')
    } else if (err.status === 422) {
      alertStore.error('Проверьте корректность введённых данных')
    } else {
      alertStore.error(`Ошибка при ${props.register ? 'создании' : 'обновлении'} плейлиста: ${err.message || err}`)
    }
  }
}
</script>

<template>
  <div class="settings form-4 form-compact">
    <h1 class="primary-heading">{{ playlistTitleText }}</h1>
    <hr class="hr" />

    <Form
      :key="formKey"
      :validation-schema="schema"
      :initial-values="playlist"
      @submit="onSubmit"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-group">
        <label class="label-1">Лицевой счёт:</label>
        <div class="form-control input-1">{{ accountLabel }}</div>
        <Field name="accountId" type="hidden" />
      </div>

      <div class="form-group">
        <label for="title" class="label-1">Описание:</label>
        <Field
          name="title"
          type="text"
          id="title"
          :disabled="isSubmitting"
          class="form-control input-1"
          :class="{ 'is-invalid': errors.title }"
          placeholder="Введите описание плейлиста"
        />
      </div>

      <div class="playlist-columns">
        <div class="playlist-column">
          <div class="playlist-column-header header-with-actions">
            <div class="playlist-column-title">
              <h2 class="secondary-heading">Видео в плейлисте</h2>
            </div>
          </div>
          <div class="playlist-column-controls">
            <div class="playlist-summary">
              <div>Видео: {{ totalVideoCount }}</div>
              <div>Размер: {{ formatFileSize(totalFileSize) }}</div>
              <div>Длительность: {{ formatDuration(totalDuration) }}</div>
            </div>
            <div class="playlist-controls-actions playlist-controls-actions-end">
              <div class="header-actions-container">
                <div class="header-actions header-actions-group">
                  <ActionButton
                    data-test="batch-remove-video-button"
                    :item="{}"
                    icon="fa-solid fa-angles-right"
                    tooltip-text="Удалить выбранные из плейлиста"
                    :disabled="isSubmitting || !hasSelectedPlaylistItems"
                    @click="removeSelectedPlaylistItems"
                  />
                </div>
              </div>
            </div>
          </div>
          <v-data-table
            :headers="playlistVideoHeaders"
            :items="playlistVideoDetails"
            item-value="key"
            :items-per-page="-1"
            hide-default-footer
            density="compact"
            class="playlist-table elevation-1"
            no-data-text="Добавьте видео в плейлист"
          >
            <template v-slot:[`header.select`]>
              <label class="playlist-table-checkbox" title="Выбрать все видео в плейлисте">
                <input
                  data-test="playlist-select-all"
                  type="checkbox"
                  aria-label="Выбрать все видео в плейлисте"
                  :checked="allVisiblePlaylistItemsSelected"
                  :indeterminate.prop="someVisiblePlaylistItemsSelected"
                  :disabled="isSubmitting || !visiblePlaylistItemKeys.length"
                  @change="toggleVisiblePlaylistItems($event.target.checked)"
                />
              </label>
            </template>
            <template v-slot:[`item.select`]="{ item }">
              <label class="playlist-table-checkbox" :title="`Выбрать ${item.title}`">
                <input
                  data-test="playlist-row-select"
                  type="checkbox"
                  :aria-label="`Выбрать ${item.title}`"
                  :checked="selectedPlaylistItemKeys.includes(item.key)"
                  :disabled="isSubmitting"
                  @change="togglePlaylistItemSelection(item.key, $event.target.checked)"
                />
              </label>
            </template>
            <template v-slot:[`item.title`]="{ item }">
              <div class="playlist-title-cell">
                <div class="playlist-video-title">{{ item.title }}</div>
              </div>
            </template>
            <template v-slot:[`item.fileSize`]="{ item }">
              {{ formatFileSize(item.fileSize) }}
            </template>
            <template v-slot:[`item.categoryName`]="{ item }">
              <span class="playlist-account-cell">{{ item.categoryName || 'Без категории' }}</span>
            </template>
            <template v-slot:[`item.duration`]="{ item }">
              {{ formatDuration(item.duration) }}
            </template>
            <template v-slot:[`item.actions`]="{ item }">
              <div class="playlist-video-actions">
                <ActionButton
                  data-test="move-up-button"
                  :item="item"
                  icon="fa-solid fa-chevron-up"
                  tooltip-text="Переместить вверх"
                  :disabled="isSubmitting || item.position <= 1"
                  @click="movePlaylistItem(item.position - 1, -1)"
                />
                <ActionButton
                  data-test="move-down-button"
                  :item="item"
                  icon="fa-solid fa-chevron-down"
                  tooltip-text="Переместить вниз"
                  :disabled="isSubmitting || item.position === playlistVideoDetails.length"
                  @click="movePlaylistItem(item.position - 1, 1)"
                />
                <ActionButton
                  data-test="remove-video-button"
                  :item="item"
                  icon="fa-solid fa-angle-right"
                  tooltip-text="Удалить из плейлиста"
                  :disabled="isSubmitting"
                  @click="removePlaylistItem(item.position - 1)"
                />
              </div>
            </template>
          </v-data-table>
          <div v-if="itemsError" class="alert alert-danger mt-3 mb-0">{{ itemsError }}</div>
        </div>

        <div class="playlist-column">
          <div class="playlist-column-header header-with-actions">
            <div class="playlist-column-title">
              <h2 class="secondary-heading">Доступные видео</h2>
            </div>
          </div>
          <div class="playlist-column-controls">
            <div class="playlist-controls-actions playlist-controls-actions-start">
              <div class="header-actions-container">
                <div class="header-actions header-actions-group">
                  <ActionButton
                    data-test="batch-add-video-button"
                    :item="{}"
                    icon="fa-solid fa-angles-left"
                    tooltip-text="Добавить выбранные видео"
                    :disabled="isSubmitting || videosLoading || !hasSelectedAvailableVideos"
                    @click="addSelectedVideosToPlaylist"
                  />
                </div>
              </div>
            </div>
            <v-text-field
              v-model="videoSearch"
              label="Поиск видео"
              variant="outlined"
              density="compact"
              hide-details
            />
          </div>
          <v-data-table
            :headers="availableVideoHeaders"
            :items="sortedFilteredAvailableVideos"
            v-model:sort-by="availableSortBy"
            item-value="id"
            :items-per-page="-1"
            hide-default-footer
            density="compact"
            class="playlist-table elevation-1"
            :loading="videosLoading"
            loading-text="Загрузка видео..."
            no-data-text="Нет доступных видео"
          >
            <template v-slot:[`header.select`]>
              <label class="playlist-table-checkbox" title="Выбрать все доступные видео">
                <input
                  data-test="available-select-all"
                  type="checkbox"
                  aria-label="Выбрать все доступные видео"
                  :checked="allVisibleAvailableVideosSelected"
                  :indeterminate.prop="someVisibleAvailableVideosSelected"
                  :disabled="isSubmitting || videosLoading || !visibleAvailableVideoIds.length"
                  @change="toggleVisibleAvailableVideos($event.target.checked)"
                />
              </label>
            </template>
            <template v-slot:[`item.select`]="{ item }">
              <label class="playlist-table-checkbox" :title="`Выбрать ${getVideoTitle(item)}`">
                <input
                  data-test="available-video-select"
                  type="checkbox"
                  :aria-label="`Выбрать ${getVideoTitle(item)}`"
                  :checked="selectedAvailableVideoIds.includes(item.id)"
                  :disabled="isSubmitting"
                  @change="toggleAvailableVideoSelection(item.id, $event.target.checked)"
                />
              </label>
            </template>
            <template v-slot:[`item.title`]="{ item }">
              <div class="playlist-title-cell">
                <div class="playlist-video-title">
                  {{ getVideoTitle(item) }}
                </div>
                <div v-if="item.title && item.originalFilename && item.title !== item.originalFilename" class="playlist-video-sub">
                  {{ item.originalFilename }}
                </div>
              </div>
            </template>
            <template v-slot:[`item.accountName`]="{ item }">
              <span class="playlist-account-cell">{{ item.accountName || '—' }}</span>
            </template>
            <template v-slot:[`item.categoryName`]="{ item }">
              <span class="playlist-account-cell">{{ item.categoryName || 'Без категории' }}</span>
            </template>
            <template v-slot:[`item.fileSize`]="{ item }">
              {{ formatFileSize(item.fileSize) }}
            </template>
            <template v-slot:[`item.duration`]="{ item }">
              {{ formatDuration(item.duration) }}
            </template>
            <template v-slot:[`item.actions`]="{ item }">
              <ActionButton
                data-test="add-video-button"
                :item="item"
                icon="fa-solid fa-angle-left"
                tooltip-text="Добавить в плейлист"
                :disabled="isSubmitting"
                @click="addVideoToPlaylist"
              />
            </template>
          </v-data-table>
        </div>
      </div>

      <div class="form-group mt-8">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
          {{ playlistButtonText }}
        </button>
        <button
          class="button secondary"
          type="button"
          @click="$router.go(-1)"
        >
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
      </div>

      <div v-if="errors.title" class="alert alert-danger mt-3 mb-0">{{ errors.title }}</div>
    </Form>

    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>

    <div v-if="loading || initialLoading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
      <div class="mt-2">{{ loading ? 'Сохранение...' : 'Загрузка...' }}</div>
    </div>
  </div>
</template>

<style scoped>
.playlist-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
  margin-top: 16px;
}

.playlist-column-header {
  margin-bottom: 8px;
}

.playlist-column-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.playlist-column-title .secondary-heading {
  margin: 0;
}

.playlist-column {
  min-width: 0;
}

.playlist-column-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  margin-bottom: 8px;
}

.playlist-column-controls :deep(.v-input) {
  flex: 1 1 auto;
  min-width: 0;
}

.playlist-controls-actions {
  display: flex;
  flex: 0 0 auto;
}

.playlist-controls-actions-end {
  margin-left: auto;
}

.playlist-table-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.playlist-table-checkbox input {
  width: 16px;
  height: 16px;
  margin: 0;
  cursor: pointer;
}

.playlist-table-checkbox input:disabled {
  cursor: not-allowed;
}

.playlist-table {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

:deep(.playlist-table th),
:deep(.playlist-table td) {
  white-space: nowrap;
}

.playlist-title-cell {
  min-width: 0;
}

.playlist-video-title {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.playlist-video-sub {
  font-size: 0.85rem;
  color: #6c7a89;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-video-actions {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.playlist-account-cell {
  color: #6c7a89;
}

.playlist-summary {
  margin-top: 0;
  margin-bottom: 0;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: var(--primary-color-dark);
}

@media (max-width: 1100px) {
  .playlist-columns {
    grid-template-columns: 1fr;
  }
}
</style>

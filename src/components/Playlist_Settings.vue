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
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { redirectToDefaultRoute } from '@/helpers/default.route.js'
import { createAccountOptions } from '@/helpers/account.options.js'
import { formatDuration, formatFileSize } from '@/helpers/media.format.js'

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
const authStore = useAuthStore()
const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)
const { loading } = storeToRefs(playlistsStore)

const playlist = ref({
  title: '',
  filename: '',
  accountId: props.accountId ?? null
})

const playlistItems = ref([])
const availableVideos = ref([])
const videoSearch = ref('')
const itemsError = ref('')
const filenameError = ref('')
const initialLoading = ref(false)
const videosLoading = ref(false)

const schema = Yup.object().shape({
  title: Yup.string().trim().required('Необходимо указать название'),
  filename: Yup.string().trim().required('Необходимо указать имя файла'),
  accountId: Yup.number().required('Необходимо выбрать лицевой счёт')
})

const videoAccountOptions = computed(() => createAccountOptions(accountsStore.accounts || [], authStore.user, { includeCommon: true }))

const accountNameById = computed(() => {
  const map = new Map()
  map.set(0, 'Общие')
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
    video.accountName
  ].some(field => (field || '').toString().toLocaleLowerCase().includes(query)))
})

const playlistVideoDetails = computed(() => playlistItems.value.map((item, index) => {
  const video = availableVideoMap.value.get(item.videoId)
  const title = video?.title || video?.originalFilename || `Видео #${item.videoId}`
  return {
    key: `${item.videoId}-${index}`,
    position: index + 1,
    title,
    fileSize: video?.fileSize,
    duration: video?.duration,
    accountName: video?.accountName
  }
}))

const totalVideoCount = computed(() => playlistItems.value.length)
const totalFileSize = computed(() => playlistVideoDetails.value.reduce((sum, item) => sum + (Number(item.fileSize) || 0), 0))
const totalDuration = computed(() => playlistVideoDetails.value.reduce((sum, item) => sum + (Number(item.duration) || 0), 0))

const playlistButtonText = computed(() => (props.register ? 'Создать' : 'Сохранить'))
const playlistTitleText = computed(() => (props.register ? 'Новый плейлист' : 'Настройки плейлиста'))
const formKey = computed(() => `${props.register ? 'create' : 'edit'}-${playlist.value.accountId ?? 'none'}`)

watch(videoAccountOptions, async (options) => {
  if (!options.length) {
    availableVideos.value = []
    return
  }
  await loadAvailableVideos()
}, { immediate: true })

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
} catch (err) {
  alertStore.error(`Не удалось загрузить лицевые счета: ${err.message || err}`)
}

function normalizePlaylistItems(items) {
  if (!Array.isArray(items)) return []
  return items
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((item) => ({
      videoId: item.videoId,
      position: item.position
    }))
}

async function loadAvailableVideos() {
  videosLoading.value = true
  try {
    const accountIds = videoAccountOptions.value.map(option => option.value)
    const collected = []
    for (const accountId of accountIds) {
      const items = await videosStore.getAllByAccount(accountId)
      for (const video of items || []) {
        collected.push({
          id: video.id,
          title: video.title,
          originalFilename: video.originalFilename,
          fileSize: video.fileSize,
          duration: video.duration,
          accountId: video.accountId,
          accountName: accountNameById.value.get(video.accountId) || `Лицевой счёт ${video.accountId}`
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
  playlistItems.value.push({ videoId: video.id, position: playlistItems.value.length + 1 })
  itemsError.value = ''
}

function removePlaylistItem(index) {
  playlistItems.value.splice(index, 1)
  rebuildPositions()
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

  if (playlistItems.value.length === 0) {
    itemsError.value = 'Добавьте хотя бы одно видео в плейлист'
    return
  }

  const trimmedTitle = values.title.trim()
  const trimmedFilename = values.filename.trim()
  const accountId = values.accountId ?? playlist.value.accountId ?? props.accountId ?? null

  try {
    const isUnique = await checkFilenameUnique(trimmedFilename, accountId)
    if (!isUnique) {
      filenameError.value = 'Плейлист с таким именем файла уже существует'
      alertStore.error(filenameError.value)
      return
    }

    const payload = {
      title: trimmedTitle,
      filename: trimmedFilename,
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
  <div class="settings form-2 form-compact">
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
        <label for="title" class="label">Название:</label>
        <Field
          name="title"
          type="text"
          id="title"
          :disabled="isSubmitting"
          class="form-control input"
          :class="{ 'is-invalid': errors.title }"
          placeholder="Введите название плейлиста"
        />
      </div>

      <div class="form-group">
        <label for="filename" class="label">Имя файла:</label>
        <Field
          name="filename"
          type="text"
          id="filename"
          :disabled="isSubmitting"
          class="form-control input"
          :class="{ 'is-invalid': errors.filename || filenameError }"
          placeholder="Введите имя файла плейлиста"
        />
      </div>

      <div class="form-group">
        <label class="label">Лицевой счёт:</label>
        <div class="form-control input">{{ accountLabel }}</div>
        <Field name="accountId" type="hidden" />
      </div>

      <div class="playlist-columns">
        <div class="playlist-column">
          <div class="playlist-column-header">
            <h2 class="secondary-heading">Доступные видео</h2>
          </div>
          <v-text-field
            v-model="videoSearch"
            label="Поиск видео"
            variant="outlined"
            density="compact"
            hide-details
          />
          <div class="playlist-video-list">
            <div v-if="videosLoading" class="text-center m-3">Загрузка видео...</div>
            <div v-else-if="!filteredAvailableVideos.length" class="text-center m-3">
              Нет доступных видео
            </div>
            <div
              v-for="video in filteredAvailableVideos"
              :key="video.id"
              class="playlist-video-row"
            >
              <div class="playlist-video-meta">
                <div class="playlist-video-title">
                  {{ video.title || video.originalFilename || `Видео #${video.id}` }}
                </div>
                <div class="playlist-video-sub">
                  {{ formatFileSize(video.fileSize) }} · {{ formatDuration(video.duration) }}
                  <span v-if="video.accountName"> · {{ video.accountName }}</span>
                </div>
              </div>
              <ActionButton
                data-test="add-video-button"
                :item="video"
                icon="fa-solid fa-plus"
                tooltip-text="Добавить в плейлист"
                :disabled="isSubmitting"
                @click="addVideoToPlaylist"
              />
            </div>
          </div>
        </div>

        <div class="playlist-column">
          <div class="playlist-column-header">
            <h2 class="secondary-heading">Видео в плейлисте</h2>
          </div>
          <div class="playlist-video-list">
            <div v-if="!playlistVideoDetails.length" class="text-center m-3">
              Добавьте видео в плейлист
            </div>
            <div
              v-for="(item, index) in playlistVideoDetails"
              :key="item.key"
              class="playlist-video-row"
            >
              <div class="playlist-video-position">{{ item.position }}</div>
              <div class="playlist-video-meta">
                <div class="playlist-video-title">{{ item.title }}</div>
                <div class="playlist-video-sub">
                  {{ formatFileSize(item.fileSize) }} · {{ formatDuration(item.duration) }}
                  <span v-if="item.accountName"> · {{ item.accountName }}</span>
                </div>
              </div>
              <div class="playlist-video-actions">
                <ActionButton
                  data-test="move-up-button"
                  :item="item"
                  icon="fa-solid fa-chevron-up"
                  tooltip-text="Переместить вверх"
                  :disabled="isSubmitting || index === 0"
                  @click="movePlaylistItem(index, -1)"
                />
                <ActionButton
                  data-test="move-down-button"
                  :item="item"
                  icon="fa-solid fa-chevron-down"
                  tooltip-text="Переместить вниз"
                  :disabled="isSubmitting || index === playlistVideoDetails.length - 1"
                  @click="movePlaylistItem(index, 1)"
                />
                <ActionButton
                  data-test="remove-video-button"
                  :item="item"
                  icon="fa-solid fa-trash-can"
                  tooltip-text="Удалить из плейлиста"
                  :disabled="isSubmitting"
                  @click="removePlaylistItem(index)"
                />
              </div>
            </div>
          </div>
          <div class="playlist-summary">
            <div>Видео: {{ totalVideoCount }}</div>
            <div>Размер: {{ formatFileSize(totalFileSize) }}</div>
            <div>Длительность: {{ formatDuration(totalDuration) }}</div>
          </div>
          <div v-if="itemsError" class="alert alert-danger mt-3 mb-0">{{ itemsError }}</div>
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
      <div v-if="errors.filename" class="alert alert-danger mt-3 mb-0">{{ errors.filename }}</div>
      <div v-if="errors.accountId" class="alert alert-danger mt-3 mb-0">{{ errors.accountId }}</div>
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.playlist-video-list {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px;
  min-height: 220px;
  background: #fff;
}

.playlist-video-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 6px;
  border-bottom: 1px solid #f0f0f0;
}

.playlist-video-row:last-child {
  border-bottom: none;
}

.playlist-video-position {
  font-weight: 600;
  width: 24px;
  text-align: center;
  color: #5c6f7f;
}

.playlist-video-meta {
  flex: 1;
  min-width: 0;
}

.playlist-video-title {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-video-sub {
  font-size: 0.85rem;
  color: #6c7a89;
  margin-top: 2px;
}

.playlist-video-actions {
  display: flex;
  gap: 6px;
}

.playlist-summary {
  margin-top: 12px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-weight: 600;
}

@media (max-width: 1100px) {
  .playlist-columns {
    grid-template-columns: 1fr;
  }
}
</style>

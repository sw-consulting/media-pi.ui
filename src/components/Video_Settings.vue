// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'

import router from '@/router'
import { useVideosStore } from '@/stores/videos.store.js'
import { useAccountsStore } from '@/stores/accounts.store.js'
import { useCategoriesStore } from '@/stores/categories.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { redirectToDefaultRoute } from '@/helpers/default.route.js'
import { canManageAccountById, isAdministrator } from '@/helpers/user.helpers.js'
import { formatDuration, formatFileSize } from '@/helpers/media.format.js'
import { createCategoryOptions } from '@/helpers/video.scope.helpers.js'
import { isPlaylistAccessImpactError } from '@/helpers/playlist.access.impact.js'
import { getDuplicateOriginalFilenameMessage, isDuplicateOriginalFilenameError } from '@/helpers/video.original.filename.conflict.js'
import { getDuplicateVideoDescriptionMessage, isDuplicateVideoDescriptionError } from '@/helpers/video.description.conflict.js'
import { showFormValidationErrors } from '@/helpers/form.validation.alert.js'
import AlertOutput from '@/components/AlertOutput.vue'
import PlaylistAccessImpactDialog from '@/components/PlaylistAccessImpactDialog.vue'
import VideoViewDialog from '@/components/Video_View_Dialog.vue'

const props = defineProps({
  id: {
    type: Number,
    required: true
  }
})

const videosStore = useVideosStore()
const accountsStore = useAccountsStore()
const categoriesStore = useCategoriesStore()
const alertStore = useAlertStore()
const authStore = useAuthStore()
const { loading, video: loadedVideo, videoPreview } = storeToRefs(videosStore)
const { account } = storeToRefs(accountsStore)
const { categories } = storeToRefs(categoriesStore)

const schema = Yup.object().shape({
  title: Yup.string().trim().required('Необходимо указать описание')
})

const video = ref({ title: '', categoryId: 0, accountId: 0 })
const categoryId = ref(0)
const initialLoading = ref(false)
const playlistImpactDialog = ref(false)
const playlistImpact = ref(null)
const pendingVideoPayload = ref(null)
const forceSaving = ref(false)
const videoDialogOpen = ref(false)
const videoDialogTitle = ref('')
const faCheckDouble = 'fa-solid fa-check-double'
const faXmark = 'fa-solid fa-xmark'

const categoryOptions = computed(() => createCategoryOptions(categories.value || []))
const isCommonVideo = computed(() => (video.value?.accountId ?? 0) === 0)
const accountName = computed(() => {
  const accountId = Number(video.value?.accountId ?? 0)
  if (!Number.isFinite(accountId) || accountId === 0) return 'Общие файлы'
  return video.value?.accountName || video.value?.accountDisplay || account.value?.name || `Лицевой счёт ${accountId}`
})
const formattedFileSize = computed(() => formatFileSize(video.value?.fileSizeBytes ?? video.value?.fileSize))
const formattedDuration = computed(() => formatDuration(video.value?.durationSeconds ?? video.value?.duration))

function canManageVideo(item) {
  if (!item) return false
  if ((item.accountId ?? 0) === 0) {
    return isAdministrator(authStore.user)
  }
  return canManageAccountById(authStore.user, item.accountId)
}

if (!props.id || isNaN(props.id)) {
  redirectToDefaultRoute()
} else {
  initialLoading.value = true
  try {
    await Promise.all([
      videosStore.getById(props.id),
      categoriesStore.getAll()
    ])
    const currentVideo = loadedVideo.value
    if (!currentVideo) {
      throw new Error(`Видеофайл с ID ${props.id} не найден`)
    }
    if (!canManageVideo(currentVideo)) {
      redirectToDefaultRoute()
    }
    const accountId = Number(currentVideo.accountId ?? 0)
    if (Number.isFinite(accountId) && accountId !== 0 && !currentVideo.accountName && !currentVideo.accountDisplay) {
      try {
        await accountsStore.getById(accountId)
      } catch {
        // The readonly field can still fall back to the account id if the name is unavailable.
      }
    }
    video.value = {
      ...currentVideo,
      title: currentVideo.title || '',
      categoryId: currentVideo.categoryId || 0
    }
    categoryId.value = video.value.categoryId
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      redirectToDefaultRoute()
    } else if (err.status === 404) {
      alertStore.error(`Видеофайл с ID ${props.id} не найден`)
    } else {
      alertStore.error(`Ошибка загрузки видеофайла: ${err.message || err}`)
    }
  } finally {
    initialLoading.value = false
  }
}

async function saveVideoPayload(payload, forcePlaylistCleanup = false) {
  try {
    const updatePayload = { ...payload }
    if (forcePlaylistCleanup) updatePayload.forcePlaylistCleanup = true
    await videosStore.update(props.id, updatePayload)
    router.go(-1)
  } catch (err) {
    if (isDuplicateOriginalFilenameError(err)) {
      alertStore.error(getDuplicateOriginalFilenameMessage(err))
      return
    }
    if (isDuplicateVideoDescriptionError(err)) {
      alertStore.error(getDuplicateVideoDescriptionMessage(err))
      return
    }
    if (isPlaylistAccessImpactError(err) && !forcePlaylistCleanup) {
      playlistImpact.value = err.data
      pendingVideoPayload.value = payload
      playlistImpactDialog.value = true
      return
    }
    if (err.status === 401 || err.status === 403) {
      redirectToDefaultRoute()
    } else if (err.status === 404) {
      alertStore.error(`Видеофайл с ID ${props.id} не найден`)
    } else if (err.status === 422) {
      alertStore.error('Проверьте корректность введённых данных')
    } else {
      alertStore.error(`Ошибка при обновлении видеофайла: ${err.message || err}`)
    }
  }
}

async function onSubmit(values) {
  const payload = {
    title: values.title.trim()
  }
  if (isCommonVideo.value) {
    payload.categoryId = categoryId.value
  }
  await saveVideoPayload(payload)
}

function getVideoTitle(item) {
  return item?.title || item?.originalFilename || `Видео #${item?.id || props.id}`
}

function showVideoDialog() {
  videoDialogTitle.value = getVideoTitle(video.value)
  videoDialogOpen.value = true
}

function handleVideoPlaybackError(message) {
  alertStore.error(message)
}

async function openVideo() {
  if (!video.value?.id) return
  alertStore.clear()
  try {
    await videosStore.open(video.value.id)
    showVideoDialog()
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      redirectToDefaultRoute()
      return
    }
    alertStore.error(`Ошибка открытия видеофайла: ${err.message || err}`)
  }
}

async function confirmPlaylistCleanup() {
  if (!pendingVideoPayload.value) return
  forceSaving.value = true
  try {
    await saveVideoPayload(pendingVideoPayload.value, true)
  } finally {
    forceSaving.value = false
  }
}

function cancelPlaylistCleanup() {
  if (forceSaving.value) return
  playlistImpactDialog.value = false
  pendingVideoPayload.value = null
}

function onInvalidSubmit(context) {
  return showFormValidationErrors(alertStore, context)
}
</script>

<template>
  <div class="settings form-3 form-compact">
    <Form
      :validation-schema="schema"
      :initial-values="video"
      @submit="onSubmit"
      @invalid-submit="onInvalidSubmit"
      v-slot="{ errors, isSubmitting, handleSubmit }"
    >
      <div class="header-with-actions">
        <h1 class="primary-heading">Настройки видеофайла</h1>
        <div class="header-actions-container">
          <div
            v-if="loading || initialLoading || forceSaving"
            class="header-actions header-actions-group"
            data-test="settings-loading-indicator"
          >
            <span class="spinner-border spinner-border-m"></span>
          </div>
          <div class="header-actions header-actions-group">
            <ActionButton
              data-test="open-video-button"
              :item="{}"
              icon="fa-solid fa-film"
              icon-size="2x"
              tooltip-text="Просмотр видеофайла"
              :disabled="isSubmitting || loading || initialLoading || !video.id"
              @click="openVideo"
            />
            <ActionButton
              data-test="save-video-button"
              :item="{}"
              :icon="faCheckDouble"
              icon-size="2x"
              tooltip-text="Сохранить"
              :disabled="isSubmitting"
              @click="handleSubmit(onSubmit)"
            />
            <ActionButton
              data-test="cancel-video-button"
              :item="{}"
              :icon="faXmark"
              icon-size="2x"
              tooltip-text="Отменить"
              @click="router.go(-1)"
            />
          </div>
        </div>
      </div>
      <hr class="hr" />
      <AlertOutput />

      <div class="form-group">
        <label for="accountName" class="label">Лицевой счёт:</label>
        <input
          id="accountName"
          data-test="video-account-name"
          :value="accountName"
          readonly
          class="form-control input"
        />
      </div>

      <div class="form-group">
        <label for="title" class="label">Описание:</label>
        <Field
          name="title"
          type="text"
          id="title"
          :disabled="isSubmitting"
          class="form-control input"
          :class="{ 'is-invalid': errors.title }"
          placeholder="Введите описание видеофайла"
        />
      </div>

      <div class="video-media-row">
        <div class="form-group video-media-group">
          <label for="fileSize" class="label">Размер:</label>
          <input
            id="fileSize"
            data-test="video-file-size"
            :value="formattedFileSize"
            readonly
            class="form-control input metadata-input"
          />
        </div>

        <div class="form-group video-media-group">
          <label for="duration" class="label">Длительность:</label>
          <input
            id="duration"
            data-test="video-duration"
            :value="formattedDuration"
            readonly
            class="form-control input metadata-input"
          />
        </div>
      </div>

      <div v-if="isCommonVideo" class="form-group">
        <label for="categoryId" class="label">Категория:</label>
        <v-select
          id="categoryId"
          v-model="categoryId"
          :items="categoryOptions"
          item-title="title"
          item-value="value"
          density="compact"
          variant="outlined"
          hide-details
          :disabled="isSubmitting"
          data-test="video-category-select"
        />
      </div>
    </Form>

    <PlaylistAccessImpactDialog
      v-model="playlistImpactDialog"
      :impact="playlistImpact"
      :saving="forceSaving"
      @confirm="confirmPlaylistCleanup"
      @cancel="cancelPlaylistCleanup"
    />
    <VideoViewDialog
      v-model="videoDialogOpen"
      :video="videoPreview"
      :title="videoDialogTitle"
      @playback-error="handleVideoPlaybackError"
    />
  </div>
</template>

<style scoped>
.video-media-row {
  display: grid;
  grid-template-columns: calc(40% + 0.375rem) minmax(0, 1fr);
  column-gap: 0;
  row-gap: 0.25rem;
  align-items: center;
}

.video-media-group {
  min-width: 0;
}

.video-media-group .label {
  width: auto;
  min-width: 7.5rem;
}

.metadata-input {
  flex: 0 0 10rem;
  width: 10rem;
  max-width: 10rem;
}
</style>

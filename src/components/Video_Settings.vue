// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'

import router from '@/router'
import { useVideosStore } from '@/stores/videos.store.js'
import { useCategoriesStore } from '@/stores/categories.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { redirectToDefaultRoute } from '@/helpers/default.route.js'
import { canManageAccountById, isAdministrator } from '@/helpers/user.helpers.js'
import { createCategoryOptions } from '@/helpers/video.scope.helpers.js'
import { isPlaylistAccessImpactError } from '@/helpers/playlist.access.impact.js'
import PlaylistAccessImpactDialog from '@/components/PlaylistAccessImpactDialog.vue'

const props = defineProps({
  id: {
    type: Number,
    required: true
  }
})

const videosStore = useVideosStore()
const categoriesStore = useCategoriesStore()
const alertStore = useAlertStore()
const authStore = useAuthStore()
const { alert } = storeToRefs(alertStore)
const { loading, video: loadedVideo } = storeToRefs(videosStore)
const { categories } = storeToRefs(categoriesStore)

const schema = Yup.object().shape({
  title: Yup.string().trim().required('Необходимо указать название')
})

const video = ref({ title: '', categoryId: 0, accountId: 0 })
const categoryId = ref(0)
const initialLoading = ref(false)
const playlistImpactDialog = ref(false)
const playlistImpact = ref(null)
const pendingVideoPayload = ref(null)
const forceSaving = ref(false)

const categoryOptions = computed(() => createCategoryOptions(categories.value || []))
const isCommonVideo = computed(() => (video.value?.accountId ?? 0) === 0)

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
</script>

<template>
  <div class="settings form-3 form-compact">
    <h1 class="primary-heading">Настройки видеофайла</h1>
    <hr class="hr" />

    <Form
      :validation-schema="schema"
      :initial-values="video"
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
          placeholder="Введите название видеофайла"
        />
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

      <div class="form-group mt-8">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
          Сохранить
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

    <PlaylistAccessImpactDialog
      v-model="playlistImpactDialog"
      :impact="playlistImpact"
      :saving="forceSaving"
      @confirm="confirmPlaylistCleanup"
      @cancel="cancelPlaylistCleanup"
    />
  </div>
</template>

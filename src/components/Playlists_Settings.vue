// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { storeToRefs } from 'pinia'

import { usePlaylistsStore } from '@/stores/playlists.store.js'
import { useVideosStore } from '@/stores/videos.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import FieldArrayWithButtons from '@/components/FieldArrayWithButtons.vue'

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

const emit = defineEmits(['saved', 'cancel'])

const playlistsStore = usePlaylistsStore()
const videosStore = useVideosStore()
const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)
const { loading } = storeToRefs(playlistsStore)

const playlistForm = ref({
  title: '',
  videoIds: ['']
})
const formKey = ref(1)
const playlistAccountId = ref(props.accountId ?? null)
const initialLoading = ref(false)

const schema = Yup.object().shape({
  title: Yup.string().trim().min(1, 'Необходимо указать название плейлиста'),
  videoIds: Yup.array().of(
    Yup.mixed().test(
      'is-number-or-empty',
      'Ошибка выбора видеофайлов',
      value => value === '' || (!Number.isNaN(Number.parseInt(value, 10)))
    )
  )
})

const isRegister = () => props.register

const effectiveAccountId = computed(() => playlistAccountId.value ?? null)

const availableVideos = ref([])

const videoOptions = computed(() => {
  return (availableVideos.value || []).map(video => ({
    value: video.id,
    text: video.title || video.name || `Видео №${video.id}`
  }))
})

const loadVideosForAccount = async (accountId) => {
  if (!accountId) {
    availableVideos.value = []
    return
  }
  try {
    const videos = await videosStore.getAllByAccount(accountId)
    availableVideos.value = Array.isArray(videos) ? videos : []
  } catch (error) {
    const message = error?.message || 'Не удалось загрузить список видео'
    alertStore.error(message)
    availableVideos.value = []
  }
}

const extractVideoIds = (playlist) => {
  if (!playlist) return []
  if (Array.isArray(playlist.videoIds)) {
    return playlist.videoIds
  }
  if (Array.isArray(playlist.videos)) {
    return playlist.videos.map(video => video.id).filter(id => id !== undefined && id !== null)
  }
  return []
}

const applyFormValues = (values) => {
  playlistForm.value = values
  formKey.value += 1
}

onMounted(async () => {
  if (!isRegister()) {
    initialLoading.value = true
    try {
      const result = await playlistsStore.getById(props.id)
      const loaded = result || playlistsStore.playlist
      if (!loaded) {
        throw new Error(`Плейлист с ID ${props.id} не найден`)
      }
      playlistAccountId.value = loaded.accountId ?? playlistAccountId.value
      const videoIds = extractVideoIds(loaded)
      applyFormValues({
        title: (loaded.title || loaded.name || '').trim(),
        videoIds: videoIds.length > 0 ? videoIds.map(id => id ?? '') : ['']
      })
    } catch (error) {
      const message = error?.message || 'Не удалось загрузить плейлист'
      alertStore.error(message)
    } finally {
      initialLoading.value = false
    }
  }

  if (effectiveAccountId.value) {
    await loadVideosForAccount(effectiveAccountId.value)
  }

  if (!Array.isArray(playlistForm.value.videoIds) || playlistForm.value.videoIds.length === 0) {
    applyFormValues({
      title: playlistForm.value.title || '',
      videoIds: ['']
    })
  } else {
    formKey.value += 1
  }
})

const getTitle = () => (isRegister() ? 'Новый плейлист' : 'Настройки плейлиста')
const getButtonText = () => (isRegister() ? 'Создать' : 'Сохранить')

const filterVideoIds = (videoIds) => {
  return (videoIds || [])
    .map(value => Number.parseInt(value, 10))
    .filter(Number.isFinite)
}

const onSubmit = async (values, submitContext = {}) => {
  const { setSubmitting } = submitContext
  const accountId = effectiveAccountId.value
  if (!accountId) {
    alertStore.error('Не выбран лицевой счёт для плейлиста')
    if (typeof setSubmitting === 'function') {
      setSubmitting(false)
    }
    return
  }

  const payload = {
    title: values.title.trim(),
    videoIds: filterVideoIds(values.videoIds)
  }
  if (isRegister()) {
    payload.accountId = accountId
  }

  try {
    if (isRegister()) {
      await playlistsStore.create(payload)
    } else {
      await playlistsStore.update(props.id, payload)
    }
    emit('saved', { accountId })
  } catch (error) {
    const status = error?.status
    const statusMessages = {
      401: 'Недостаточно прав для выполнения операции',
      403: 'Недостаточно прав для выполнения операции',
      404: 'Плейлист или ресурсы не найдены',
      409: 'Плейлист с таким названием уже существует',
      422: 'Проверьте корректность введённых данных'
    }
    const message = statusMessages[status] || error?.message || 'Не удалось сохранить плейлист'
    alertStore.error(message)
  } finally {
    if (typeof setSubmitting === 'function') {
      setSubmitting(false)
    }
  }
}

const cancel = () => {
  emit('cancel')
}
</script>

<template>
  <div class="settings form-3 form-compact">
    <h1 class="primary-heading">{{ getTitle() }}</h1>
    <hr class="hr" />

    <Form
      :key="formKey"
      :validation-schema="schema"
      :initial-values="playlistForm"
      @submit="onSubmit"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-group">
        <label for="title" class="label">Название плейлиста:</label>
        <Field
          name="title"
          id="title"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.title }"
          :disabled="isSubmitting"
          placeholder="Введите название плейлиста"
        />
        <div v-if="errors.title" class="alert alert-danger mt-2 mb-0">{{ errors.title }}</div>
      </div>

      <div>
        <FieldArrayWithButtons
          name="videoIds"
          label="Видеофайлы в плейлисте:"
          :options="videoOptions"
          placeholder="Выберите видеофайл"
          :has-error="!!errors.videoIds"
        />
        <div v-if="errors.videoIds" class="alert alert-danger mt-2 mb-0">{{ errors.videoIds }}</div>
      </div>

      <div class="form-group mt-8">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting || loading" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
          {{ getButtonText() }}
        </button>
        <button
          class="button secondary"
          type="button"
          @click="cancel"
        >
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
      </div>
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

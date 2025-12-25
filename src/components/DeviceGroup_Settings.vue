// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>
import { computed, ref, watch } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'

import { useDeviceGroupsStore } from '@/stores/device.groups.store.js'
import { usePlaylistsStore } from '@/stores/playlists.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { redirectToDefaultRoute } from '@/helpers/default.route.js'
import { formatDuration, formatFileSize } from '@/helpers/media.format.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'

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

const deviceGroupsStore = useDeviceGroupsStore()
const playlistsStore = usePlaylistsStore()
const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)
const { loading } = storeToRefs(deviceGroupsStore)
const { playlists, loading: playlistsLoading, error: playlistsError } = storeToRefs(playlistsStore)
const authStore = useAuthStore()
const itemsPerPage = authStore.playlists_per_page
const page = authStore.playlists_page

const schema = Yup.object().shape({
  name: Yup.string().required('Необходимо указать имя')
})

const group = ref({ name: '' })
const initialLoading = ref(false)
const groupAccountId = ref(props.accountId ?? null)
const selectedUploadIds = ref([])
const selectedPlayId = ref(null)

const playlistHeaders = computed(() => ([
  { title: 'Загружать', align: 'center', key: 'upload', sortable: false, width: '7%' },
  { title: 'Воспроизводить', align: 'center', key: 'play', sortable: false, width: '7%' },
  { title: 'Название', align: 'start', key: 'title', width: '50%' },
  { title: 'Длительность', align: 'center', key: 'totalDurationSeconds', width: '12%' },
  { title: 'Размер', align: 'center', key: 'totalFileSizeBytes', width: '12%' },
  { title: 'Файлов', align: 'center', key: 'videoCount', width: '12%' }
]))

if (!isRegister()) {
  initialLoading.value = true
  try {
    await deviceGroupsStore.getById(props.id)
    const loadedGroup = deviceGroupsStore.group
    if (!loadedGroup) {
      throw new Error(`Группа устройств с ID ${props.id} не найдена`)
    }
    group.value = {
      name: loadedGroup.name || ''
    }
    groupAccountId.value = loadedGroup.accountId ?? props.accountId ?? null
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      redirectToDefaultRoute()
    } else if (err.status === 404) {
      alertStore.error(`Группа устройств с ID ${props.id} не найдена`)
    } else {
      const errorMessage = err.message || err
      alertStore.error(`Ошибка загрузки группы устройств: ${errorMessage}`)
    }
  } finally {
    initialLoading.value = false
  }
}

function isRegister () {
  return props.register
}

function getButton () {
  return isRegister() ? 'Создать' : 'Сохранить'
}

const loadPlaylists = async (accountId) => {
  if (accountId === null || accountId === undefined) {
    playlists.value = []
    return
  }
  try {
    await playlistsStore.getAllByAccount(accountId)
  } catch (err) {
    alertStore.error('Не удалось загрузить плейлисты: ' + (err?.message || err))
  }
}

const toggleUploadSelection = (playlistId, checked) => {
  const current = new Set(selectedUploadIds.value)
  if (checked) {
    current.add(playlistId)
  } else {
    current.delete(playlistId)
    // if the unchecked playlist was set to play, clear it
    if (selectedPlayId.value === playlistId) selectedPlayId.value = null
  }
  selectedUploadIds.value = Array.from(current)
}

const togglePlaySelection = (playlistId, event) => {
  if (selectedPlayId.value === playlistId) {
    selectedPlayId.value = null
    if (event) event.preventDefault()
    return
  }
  selectedPlayId.value = playlistId
}

watch(groupAccountId, async (accountId) => {
  selectedUploadIds.value = []
  selectedPlayId.value = null
  await loadPlaylists(accountId)
}, { immediate: true })

async function onSubmit (values) {
  try {
    const payload = {
      name: values.name.trim()
    }
    if (isRegister()) {
      payload.accountId = props.accountId
      await deviceGroupsStore.add(payload)
    } else {
      await deviceGroupsStore.update(props.id, payload)
    }
    router.go(-1)
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      redirectToDefaultRoute()
    } else if (err.status === 404) {
      alertStore.error(`Группа устройств с ID ${props.id} не найдена`)
    } else if (err.status === 409) {
      alertStore.error('Группа устройств с таким названием уже существует')
    } else if (err.status === 422) {
      alertStore.error('Проверьте корректность введённых данных')
    } else {
      const errorMessage = err.message || err
      alertStore.error(`Ошибка при ${isRegister() ? 'создании' : 'обновлении'} группы устройств: ${errorMessage}`)
    }
  }
}
</script>

<template>
  <div class="settings form-4 form-compact">
    <h1 class="primary-heading">{{ isRegister() ? 'Новая группа устройств' : `Настройки группы устройств '${group.name}'` }}</h1>
    <hr class="hr" />

    <Form
      :validation-schema="schema"
      :initial-values="group"
      @submit="onSubmit"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-group">
        <label for="name" class="label-1">Название:</label>
        <Field name="name" type="text" id="name" :disabled="isSubmitting"
          class="form-control input-1" :class="{ 'is-invalid': errors.name }"
          placeholder="Введите название группы"
        />
      </div>

      <v-card class="mt-8">
        <v-data-table
          :headers="playlistHeaders"
          :items="playlists"
          item-value="id"
          class="elevation-1"
          v-model:items-per-page="itemsPerPage"
          items-per-page-text="Плейлистов на странице"
          :items-per-page-options="itemsPerPageOptions"
          page-text="{0}-{1} из {2}"
          v-model:page="page"
        >
          <template v-slot:[`item.upload`]="{ item }">
            <div class="checkbox-styled-wrapper">
              <input
                class="checkbox-styled"
                :data-test="`playlist-upload-${item.id}`"
                type="checkbox"
                :checked="selectedUploadIds.includes(item.id)"
                :disabled="playlistsLoading"
                @change="toggleUploadSelection(item.id, $event.target.checked)"
                :id="`playlist-upload-${item.id}`"
              />
              <label :for="`playlist-upload-${item.id}`"></label>
            </div>
          </template>
          <template v-slot:[`item.play`]="{ item }">
            <label class="radio-styled" :class="{ 'disabled': playlistsLoading || !selectedUploadIds.includes(item.id) }">
              <input
                type="radio"
                class="radio-input"
                :data-test="`playlist-play-${item.id}`"
                name="device-group-playlist"
                :checked="selectedPlayId === item.id"
                :disabled="playlistsLoading || !selectedUploadIds.includes(item.id)"
                @click="togglePlaySelection(item.id, $event)"
              />
              <span class="radio-mark"></span>
            </label>
          </template>
          <template v-slot:[`item.totalFileSizeBytes`]="{ item }">
            {{ formatFileSize(item.totalFileSizeBytes) }}
          </template>
          <template v-slot:[`item.totalDurationSeconds`]="{ item }">
            {{ formatDuration(item.totalDurationSeconds) }}
          </template>
        </v-data-table>
        <div v-if="!playlists?.length" class="text-center m-5">
          {{ playlistsLoading ? 'Загрузка...' : 'Нет плейлистов' }}
        </div>
      </v-card>
      <div v-if="playlistsError" class="text-center m-5">
        <div class="text-danger">Ошибка при загрузке списка плейлистов: {{ playlistsError }}</div>
      </div>

      <div class="form-group mt-8">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
          {{ getButton() }}
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

      <div v-if="errors.name" class="alert alert-danger mt-3 mb-0">{{ errors.name }}</div>
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

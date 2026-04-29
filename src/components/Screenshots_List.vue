// Copyright (c) 2026 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'

import { useScreenshotsStore } from '@/stores/screenshots.store.js'
import { useDevicesStore } from '@/stores/devices.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirmation } from '@/helpers/confirmation.js'
import { formatFileSize } from '@/helpers/media.format.js'

const props = defineProps({
  deviceId: { type: Number, required: true }
})

const screenshotsStore = useScreenshotsStore()
const devicesStore = useDevicesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const router = useRouter()
const { confirmDelete } = useConfirmation()

const { screenshots, loading: screenshotsLoading, totalCount } = storeToRefs(screenshotsStore)
const { device, loading: deviceLoading } = storeToRefs(devicesStore)
const { alert } = storeToRefs(alertStore)

const fromValue = ref('')
const toValue = ref('')

const itemsPerPageOptions = Object.freeze([
  { value: 10, title: '10' },
  { value: 25, title: '25' },
  { value: 50, title: '50' },
  { value: 100, title: '100' }
])

const headers = Object.freeze([
  { title: '', align: 'center', key: 'actions', sortable: false, width: '96px' },
//  { title: 'ID', align: 'start', key: 'id', width: '10%' },
  { title: 'Создан', align: 'start', key: 'time_created', width: '28%' },
  { title: 'Имя файла', align: 'start', key: 'originalFilename', sortable: false, width: '42%' },
  { title: 'Размер', align: 'start', key: 'fileSizeBytes', sortable: false, width: '20%' }
])

const isBusy = computed(() => Boolean(screenshotsLoading.value || deviceLoading.value))
const deviceTitle = computed(() => {
  if (!device.value) return 'Загрузка...'
  if (device.value.id === props.deviceId && device.value.name) return device.value.name
  return props.deviceId
})

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const sec = String(date.getSeconds()).padStart(2, '0')
  return `${dd}.${mm}.${yyyy} ${hh}:${min}:${sec}`
}

async function loadPhotos() {
  try {
    await screenshotsStore.getAllByDevice(props.deviceId, {
      from: fromValue.value || null,
      to: toValue.value || null
    })
  } catch (err) {
    alertStore.error('Не удалось загрузить фотографии: ' + (err?.message || err))
  }
}

async function loadDevice() {
  try {
    await devicesStore.getById(props.deviceId)
  } catch (err) {
    alertStore.error('Не удалось загрузить устройство: ' + (err?.message || err))
  }
}

async function openPhoto(item) {
  try {
    await screenshotsStore.open(item.id)
  } catch (err) {
    alertStore.error('Не удалось открыть фотографию: ' + (err?.message || err))
  }
}

async function takePhoto() {
  try {
    await screenshotsStore.create(props.deviceId)
    await loadPhotos()
  } catch (err) {
    alertStore.error('Не удалось сделать фотографию: ' + (err?.message || err))
  }
}

async function deletePhoto(item) {
  const confirmed = await confirmDelete(item.originalFilename || `фотография #${item.id}`, 'фотографию')
  if (!confirmed) return

  try {
    await screenshotsStore.remove(item.id)
    if (!screenshots.value.length && authStore.screenshots_page > 1) {
      authStore.screenshots_page -= 1
      return
    }
    await loadPhotos()
  } catch (err) {
    alertStore.error('Не удалось удалить фотографию: ' + (err?.message || err))
  }
}

async function applyFilters() {
  if (authStore.screenshots_page !== 1) {
    authStore.screenshots_page = 1
    return
  }
  await loadPhotos()
}

async function clearFilters() {
  fromValue.value = ''
  toValue.value = ''
  await applyFilters()
}

function goBack() {
  router.push(`/device/manage/${props.deviceId}`)
}

watch(
  () => props.deviceId,
  async (deviceId) => {
    if (!deviceId) return
    await Promise.all([
      loadDevice(),
      loadPhotos()
    ])
  },
  { immediate: true }
)

watch(
  [
    () => authStore.screenshots_page,
    () => authStore.screenshots_per_page,
    () => authStore.screenshots_sort_by
  ],
  async () => {
    if (!props.deviceId) return
    await loadPhotos()
  },
  { deep: true }
)

onBeforeUnmount(() => {
  alertStore.clear()
})
</script>

<template>
  <div class="settings table-2">
    <div class="header-with-actions">
      <h1 class="primary-heading">Фотографии устройства {{ deviceTitle }}</h1>
      <div class="header-actions-container">
        <div v-if="isBusy" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            data-test="take-photo-button"
            :item="{}"
            iconSize="2x"
            icon="fa-solid fa-camera"
            tooltipText="Сфотографировать"
            :disabled="isBusy"
            @click="takePhoto"
          />
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            data-test="back-to-device-button"
            :item="{}"
            iconSize="2x"
            icon="fa-solid fa-xmark"
            tooltipText="Закрыть"
            :disabled="isBusy"
            @click="goBack"
          />
        </div>
      </div>
    </div>

    <hr class="hr" />

    <div class="screenshots-filters">
      <label class="screenshots-filter-field">
        <span>С</span>
        <input
          id="screenshots-filter-from"
          v-model="fromValue"
          class="form-control input"
          type="datetime-local"
          :disabled="isBusy"
        />
      </label>
      <label class="screenshots-filter-field">
        <span>по</span>
        <input
          id="screenshots-filter-to"
          v-model="toValue"
          class="form-control input"
          type="datetime-local"
          :disabled="isBusy"
        />
      </label>
      <div class="screenshots-filter-actions">
        <ActionButton
          data-test="apply-screenshots-filter"
          :item="{}"
          icon="fa-solid fa-filter"
          tooltipText="Применить фильтр"
          :disabled="isBusy"
          @click="applyFilters"
        />
        <ActionButton
          data-test="clear-screenshots-filter"
          :item="{}"
          icon="fa-solid fa-filter-circle-xmark"
          tooltipText="Сбросить фильтр"
          :disabled="isBusy"
          @click="clearFilters"
        />
      </div>
    </div>

    <v-card>
      <v-data-table-server
        v-model:items-per-page="authStore.screenshots_per_page"
        v-model:page="authStore.screenshots_page"
        v-model:sort-by="authStore.screenshots_sort_by"
        :headers="headers"
        :items="screenshots"
        :items-length="totalCount"
        :items-per-page-options="itemsPerPageOptions"
        :loading="isBusy"
        items-per-page-text="Снимков на странице"
        page-text="{0}-{1} из {2}"
        item-value="id"
        class="elevation-1"
      >
        <template #[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton
              data-test="open-photo-button"
              :item="item"
              icon="fa-solid fa-image"
              tooltipText="Открыть фотографию"
              :disabled="isBusy"
              @click="openPhoto(item)"
            />
            <ActionButton
              data-test="delete-photo-button"
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltipText="Удалить фотографию"
              :disabled="isBusy"
              @click="deletePhoto(item)"
            />
          </div>
        </template>

        <template #[`item.time_created`]="{ item }">
          {{ formatDate(item.timeCreated) }}
        </template>

        <template #[`item.originalFilename`]="{ item }">
          <span class="filename-cell">{{ item.originalFilename || '—' }}</span>
        </template>

        <template #[`item.fileSizeBytes`]="{ item }">
          {{ formatFileSize(item.fileSizeBytes) }}
        </template>
      </v-data-table-server>

      <div v-if="!isBusy && !screenshots.length" class="text-center m-5">
        Нет скриншотов
      </div>
    </v-card>

    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button class="btn btn-link close" @click="alertStore.clear()">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

<style scoped>
.screenshots-filters {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  overflow-x: auto;
}

.screenshots-filter-field {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  white-space: nowrap;
}

.screenshots-filter-field .input {
  width: 220px;
}

.screenshots-filter-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 0.5rem;
}

@media (max-width: 800px) {
  .screenshots-filters {
    flex-direction: column;
    align-items: flex-start;
    overflow-x: visible;
  }

}

.filename-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

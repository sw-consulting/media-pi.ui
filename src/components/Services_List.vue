// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi backend

<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import ActionButton from '@/components/ActionButton.vue'
import { useDevicesStore } from '@/stores/devices.store.js'

const props = defineProps({
  deviceId: { type: Number, required: true },
  accessible: { type: Boolean, default: false },
  open: { type: Boolean, default: false }
})

const devicesStore = useDevicesStore()
const { services, loading, error } = storeToRefs(devicesStore)

const sortBy = ref([{ key: 'unit', order: 'asc' }])
const lastActionMessage = ref('')
const lastActionState = ref('success')
const lastError = ref('')

const headers = [
  { title: '', align: 'center', key: 'actions', sortable: false, width: '5%' },
  { title: 'Служба', align: 'start', key: 'unit' },
  { title: 'Активность', align: 'start', key: 'active' },
  { title: 'Состояние', align: 'start', key: 'sub' },
  { title: 'Ошибка', align: 'start', key: 'error' }
]

const isAccessible = computed(() => Boolean(props.accessible))
const isOpen = computed(() => Boolean(props.open))
const isBusy = computed(() => Boolean(loading.value))

const shouldLoad = computed(() => Boolean(props.deviceId) && isAccessible.value && isOpen.value)

const displayServices = computed(() => {
  if (!isAccessible.value) {
    return []
  }

  const units = Array.isArray(services.value) ? services.value : []
  return units.map((service, index) => {
    const unitName = typeof service?.unit === 'string' ? service.unit : ''
    return {
      key: unitName || `service-${index}`,
      unit: unitName || '—',
      active: formatState(service?.active),
      sub: formatState(service?.sub),
      error: formatServiceError(service?.error)
    }
  })
})

const requestError = computed(() => {
  const message = lastError.value || extractMessage(error.value)
  return message && message.trim() ? message : ''
})

watch(shouldLoad, (value) => {
  if (value) {
    fetchServices()
  }
}, { immediate: true })

watch(() => props.deviceId, () => {
  lastActionMessage.value = ''
  lastError.value = ''
})

watch(isOpen, (value) => {
  if (!value) {
    lastActionMessage.value = ''
    lastError.value = ''
  }
})

watch(isAccessible, (value) => {
  if (!value) {
    lastActionMessage.value = ''
    lastError.value = ''
  }
})

async function fetchServices() {
  if (!shouldLoad.value) {
    return
  }

  lastError.value = ''
  try {
    await devicesStore.listServices(props.deviceId)
  } catch (err) {
    lastError.value = extractMessage(err)
  }
}

function formatState(value) {
  if (value === null || value === undefined) {
    return '—'
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : '—'
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    const formatted = value
      .map(item => formatState(item))
      .filter(item => item !== '—')
    return formatted.length ? formatted.join(', ') : '—'
  }

  if (typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, 'Value')) {
      return formatState(value.Value)
    }
    if (Object.prototype.hasOwnProperty.call(value, 'value')) {
      return formatState(value.value)
    }
    if (Object.prototype.hasOwnProperty.call(value, 'State')) {
      return formatState(value.State)
    }
    if (Object.prototype.hasOwnProperty.call(value, 'state')) {
      return formatState(value.state)
    }

    for (const key of Object.keys(value)) {
      const formatted = formatState(value[key])
      if (formatted !== '—') {
        return formatted
      }
    }

    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  return String(value)
}

function extractMessage(err) {
  if (!err) {
    return ''
  }

  if (typeof err === 'string') {
    return err
  }

  if (typeof err === 'number' || typeof err === 'boolean') {
    return String(err)
  }

  if (typeof err === 'object') {
    if (Object.prototype.hasOwnProperty.call(err, 'message') && typeof err.message === 'string') {
      return err.message
    }
    if (Object.prototype.hasOwnProperty.call(err, 'error') && typeof err.error === 'string') {
      return err.error
    }

    try {
      return JSON.stringify(err)
    } catch {
      return String(err)
    }
  }

  return String(err)
}

function formatServiceError(err) {
  const message = extractMessage(err)
  return message ? message : '—'
}

async function handleAction(actionFn, item) {
  if (!isAccessible.value || !item || !item.unit) {
    return
  }

  try {
    const response = await actionFn(props.deviceId, item.unit)
    const { message, state } = normalizeActionResponse(response)
    lastActionMessage.value = message
    lastActionState.value = state

    if (state === 'success') {
      await fetchServices()
    }
  } catch (err) {
    lastActionMessage.value = extractMessage(err) || 'Не удалось выполнить действие'
    lastActionState.value = 'error'
  }
}

function normalizeActionResponse(response) {
  if (!response) {
    return { message: 'Операция выполнена', state: 'success' }
  }

  if (typeof response === 'string') {
    return { message: response, state: 'success' }
  }

  if (typeof response === 'object') {
    if (Object.prototype.hasOwnProperty.call(response, 'error') && response.error) {
      return { message: extractMessage(response.error), state: 'error' }
    }

    if (Object.prototype.hasOwnProperty.call(response, 'result') && response.result) {
      return { message: response.result, state: 'success' }
    }

    if (Object.prototype.hasOwnProperty.call(response, 'enabled') && typeof response.enabled === 'boolean') {
      return {
        message: response.enabled ? 'Служба включена' : 'Служба отключена',
        state: 'success'
      }
    }

    if (Object.prototype.hasOwnProperty.call(response, 'ok') && response.ok === false) {
      return { message: 'Операция не выполнена', state: 'error' }
    }
  }

  return { message: 'Операция выполнена', state: 'success' }
}

const startService = (item) => handleAction(devicesStore.startService, item)
const stopService = (item) => handleAction(devicesStore.stopService, item)
const restartService = (item) => handleAction(devicesStore.restartService, item)
const enableService = (item) => handleAction(devicesStore.enableService, item)
const disableService = (item) => handleAction(devicesStore.disableService, item)
</script>

<template>
  <div class="services-list">
    <h2 class="services-heading">Службы устройства</h2>
    <div v-if="!isAccessible" class="services-unavailable">
      Список служб доступен только когда устройство находится онлайн.
    </div>
    <template v-else>
      <v-card class="services-card">
        <v-data-table
          v-if="displayServices.length"
          :headers="headers"
          :items="displayServices"
          class="elevation-1"
          item-key="key"
          :items-per-page="-1"
          hide-default-footer
          v-model:sort-by="sortBy"
        >
          <template #item.actions="{ item }">
            <div class="actions-container services-actions">
              <ActionButton
                class="start-service"
                :item="item"
                icon="fa-solid fa-play"
                tooltip-text="Start"
                :disabled="isBusy"
                @click="startService"
              />
              <ActionButton
                class="stop-service"
                :item="item"
                icon="fa-solid fa-hand"
                tooltip-text="Stop"
                :disabled="isBusy"
                @click="stopService"
              />
              <ActionButton
                class="restart-service"
                :item="item"
                icon="fa-solid fa-rotate-right"
                tooltip-text="Restart"
                :disabled="isBusy"
                @click="restartService"
              />
              <ActionButton
                class="enable-service"
                :item="item"
                icon="fa-solid fa-circle-check"
                tooltip-text="Enable"
                :disabled="isBusy"
                @click="enableService"
              />
              <ActionButton
                class="disable-service"
                :item="item"
                icon="fa-solid fa-ban"
                tooltip-text="Disable"
                :disabled="isBusy"
                @click="disableService"
              />
            </div>
          </template>

          <template #item.active="{ item }">
            <span class="services-state">{{ item.active }}</span>
          </template>

          <template #item.sub="{ item }">
            <span class="services-state">{{ item.sub }}</span>
          </template>

          <template #item.error="{ item }">
            <span :class="['services-state', item.error !== '—' ? 'text-danger' : '']">{{ item.error }}</span>
          </template>
        </v-data-table>
        <div v-else class="services-empty">Службы не найдены.</div>
      </v-card>

      <div v-if="isBusy" class="services-loading">
        <span class="spinner-border spinner-border-lg align-center"></span>
      </div>

      <div v-if="requestError" class="services-message text-danger">
        {{ requestError }}
      </div>

      <div
        v-if="lastActionMessage"
        class="services-message"
        :class="lastActionState === 'error' ? 'text-danger' : 'text-success'"
      >
        {{ lastActionMessage }}
      </div>
    </template>
  </div>
</template>

<style scoped>
.services-list {
  margin-top: 1.5rem;
}

.services-heading {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--button-secondary-bg);
  margin-bottom: 0.75rem;
}

.services-unavailable {
  padding: 1rem;
  text-align: center;
  color: #6b7280;
  background-color: #f3f4f6;
  border-radius: 8px;
}

.services-card {
  border: 1px solid var(--primary-color, #2563eb);
  border-radius: 12px;
  overflow: hidden;
}

.services-actions {
  justify-content: center;
}

.services-state {
  display: inline-block;
  min-width: 3rem;
}

.services-empty {
  padding: 1.5rem;
  text-align: center;
  color: #6b7280;
}

.services-loading {
  text-align: center;
  margin-top: 1rem;
}

.services-message {
  margin-top: 0.75rem;
  text-align: center;
  font-weight: 500;
}
</style>

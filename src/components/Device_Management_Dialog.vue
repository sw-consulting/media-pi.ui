// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useDevicesStore } from '@/stores/devices.store.js'
import { useDeviceStatusesStore } from '@/stores/device.statuses.store.js'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  deviceId: { type: Number, required: true }
})

const emit = defineEmits(['update:modelValue'])

const devicesStore = useDevicesStore()
const deviceStatusesStore = useDeviceStatusesStore()
const { statuses } = storeToRefs(deviceStatusesStore)

const internalOpen = ref(props.modelValue)
watch(() => props.modelValue, (value) => { internalOpen.value = value })
watch(internalOpen, (value) => emit('update:modelValue', value))

const informationalPanels = [
  { key: 'timers', title: 'Настройки таймеров' },
  { key: 'playlist', title: 'Настройки плей-листа' },
  { key: 'audio', title: 'Настройки аудио' }
]

const currentStatus = computed(() => {
  const id = props.deviceId
  if (!id) return null

  const live = (statuses.value || []).find((s) => s?.deviceId === id)
  if (live) return live

  const device = devicesStore.getDeviceById(id)
  return device?.deviceStatus || null
})

const isOnline = computed(() => Boolean(currentStatus.value?.isOnline))
const isDisabled = computed(() => !isOnline.value)

const runWithDevice = async (handler) => {
  if (!props.deviceId || typeof handler !== 'function') return
  await handler(props.deviceId)
}

const applyChanges = () => runWithDevice(devicesStore.reloadSystem)
const reboot = () => runWithDevice(devicesStore.rebootSystem)
const shutdown = () => runWithDevice(devicesStore.shutdownSystem)
</script>

<template>
  <v-dialog v-model="internalOpen" class="management-dialog">
    <v-card class="management-card">
      <v-card-title>
        <div class="d-flex align-center justify-space-between w-100">
          <span>Управление устройством</span>
        </div>
      </v-card-title>
      <v-card-text>
        <div class="panel-grid">
          <fieldset v-for="panel in informationalPanels" :key="panel.key" class="panel">
            <legend>{{ panel.title }}</legend>
            <div class="panel-content" />
          </fieldset>

          <fieldset class="panel">
            <legend>Управление системой</legend>
            <div class="panel-content system-actions">
              <button
                class="button-o-c primary"
                type="button"
                :disabled="isDisabled"
                @click="applyChanges"
              >
                Применить изменения
              </button>
              <button
                class="button-o-c warning"
                type="button"
                :disabled="isDisabled"
                @click="reboot"
              >
                Перезагрузить
              </button>
              <button
                class="button-o-c danger"
                type="button"
                :disabled="isDisabled"
                @click="shutdown"
              >
                Выключить
              </button>
            </div>
          </fieldset>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <button
          class="button-o-c primary"
          type="button"
          @click="internalOpen = false"
        >
          Закрыть
        </button>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.management-dialog {
  max-width: 900px;
}

.management-card {
  border: 2px solid var(--primary-color-dark);
  border-radius: 12px;
}

.panel-grid {
  display: grid;
  gap: 1rem;
}

.panel {
  border: 2px solid var(--primary-color-dark);
  border-radius: 12px;
  padding: 1rem;
}

.panel legend {
  font-weight: 600;
  padding: 0 0.5rem;
  color: var(--button-secondary-bg);
}

.panel-content {
  min-height: 80px;
}

.system-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.button-o-c {
  color: var(--button-secondary-bg);
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  margin: 0.5rem 0;
  transition: 0.4s;
  border: 1px solid var(--primary-color);
  border-radius: 6px;
  min-width: 180px;
}

.button-o-c:hover,
.button-o-c:focus {
  outline: none;
  box-shadow: 0px 2px 10px var(--primary-color);
  color: var(--primary-color);
}

.button-o-c:disabled {
  opacity: 0.6;
  box-shadow: none;
  cursor: not-allowed;
}

.button-o-c.warning {
  border-color: #f59e0b;
}

.button-o-c.danger {
  border-color: #ef4444;
}
</style>

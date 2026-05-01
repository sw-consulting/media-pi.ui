// Copyright (c) 2026 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import { computed } from 'vue'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  screenshot: { type: Object, default: null },
  deviceTitle: { type: [String, Number], default: '' },
  takenAt: { type: [String, Date, Number], default: null }
})

const emit = defineEmits(['update:modelValue'])

const formattedTakenAt = computed(() => {
  if (!props.takenAt) return ''

  const date = new Date(props.takenAt)
  if (Number.isNaN(date.getTime())) return String(props.takenAt)

  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const sec = String(date.getSeconds()).padStart(2, '0')
  return `${dd}.${mm}.${yyyy} ${hh}:${min}:${sec}`
})

const title = computed(() => {
  const parts = ['Фотография устройства']
  if (props.deviceTitle) parts.push(String(props.deviceTitle))
  if (formattedTakenAt.value) parts.push(formattedTakenAt.value)
  return parts.join(' ')
})

const imageAlt = computed(() => props.screenshot?.filename || title.value)

function closeDialog() {
  emit('update:modelValue', false)
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="1100"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="screenshot-dialog-card">
      <div class="screenshot-dialog-header">
        <h2 class="secondary-heading screenshot-dialog-title">{{ title }}</h2>
        <ActionButton
          data-test="close-screenshot-dialog"
          :item="{}"
          icon="fa-solid fa-xmark"
          tooltipText="Закрыть"
          @click="closeDialog"
        />
      </div>

      <div class="screenshot-dialog-body">
        <img
          v-if="screenshot?.objectUrl"
          class="screenshot-dialog-image"
          :src="screenshot.objectUrl"
          :alt="imageAlt"
        />
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.screenshot-dialog-card {
  max-height: 90vh;
  overflow: hidden;
}

.screenshot-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #536373;
}

.screenshot-dialog-title {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.screenshot-dialog-body {
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: calc(90vh - 72px);
  padding: 1rem;
  overflow: auto;
}

.screenshot-dialog-image {
  max-width: 100%;
  height: auto;
  object-fit: contain;
}
</style>

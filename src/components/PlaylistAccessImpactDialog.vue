// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import { computed } from 'vue'
import ModalWindow from '@/components/ModalWindow.vue'
import { normalizePlaylistAccessImpact } from '@/helpers/playlist.access.impact.js'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  impact: {
    type: Object,
    default: null
  },
  saving: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const normalizedImpact = computed(() => normalizePlaylistAccessImpact(props.impact))

function confirm() {
  if (props.saving) return
  emit('confirm')
}

function cancel() {
  if (props.saving) return
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<template>
  <ModalWindow
    v-if="modelValue"
    :model-value="modelValue"
    title="Изменение плейлистов"
    width="560px"
    min-width="320px"
    data-test="playlist-impact-dialog"
    @update:model-value="$emit('update:modelValue', $event)"
    @confirm="confirm"
    @cancel="cancel"
  >
    <div class="impact-summary">
      Будет изменено плейлистов: {{ normalizedImpact.affectedPlaylistCount }},
      удалено включений: {{ normalizedImpact.affectedItemCount }},
      видеофайлов: {{ normalizedImpact.affectedVideoCount }}.
    </div>

    <div class="impact-list" data-test="playlist-impact-list">
      <div
        v-for="playlist in normalizedImpact.affectedPlaylists"
        :key="playlist.playlistId"
        class="impact-list-item"
      >
        <div class="impact-playlist-title">
          {{ playlist.accountName }} / {{ playlist.title }}
        </div>
        <div class="impact-playlist-meta">
          {{ playlist.filename || `id=${playlist.playlistId}` }} · удалено включений: {{ playlist.removedItemCount }}
        </div>
      </div>
    </div>

    <template #actions>
      <v-btn
        data-test="confirm-playlist-impact-button"
        color="orange-darken-3"
        variant="text"
        :disabled="saving"
        @click="$emit('confirm')"
      >
        <span v-show="saving" class="spinner-border spinner-border-sm mr-1"></span>
        Продолжить
      </v-btn>
      <v-btn
        data-test="cancel-playlist-impact-button"
        variant="text"
        :disabled="saving"
        @click="cancel"
      >
        Отмена
      </v-btn>
    </template>
  </ModalWindow>
</template>

<style scoped>
.impact-summary {
  color: #34495e;
  margin-bottom: 0.75rem;
}

.impact-list {
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid #d0d7de;
  border-radius: 6px;
}

.impact-list-item {
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid #e0e0e0;
}

.impact-list-item:last-child {
  border-bottom: 0;
}

.impact-playlist-title {
  font-weight: 600;
  color: #243447;
}

.impact-playlist-meta {
  margin-top: 0.2rem;
  color: #5c6f7f;
  font-size: 0.875rem;
}
</style>

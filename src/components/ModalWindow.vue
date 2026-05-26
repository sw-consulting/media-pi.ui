// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  width: {
    type: String,
    default: '30%'
  },
  minWidth: {
    type: String,
    default: '250px'
  }
})

defineEmits(['update:modelValue'])
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    :width="width"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="modal-window-card" :style="{ minWidth }">
      <v-card-title class="modal-window-title">{{ title }}</v-card-title>
      <v-card-text class="modal-window-content">
        <slot />
      </v-card-text>
      <v-card-actions class="modal-window-actions">
        <slot name="actions" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.modal-window-card {
  padding: 0.25rem 0;
}

.modal-window-title {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.4;
  padding: 1rem 1rem 0.5rem;
}

.modal-window-content {
  padding: 0.5rem 1rem 0.75rem;
}

.modal-window-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.5rem 1rem 1rem;
}
</style>

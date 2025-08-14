<!-- Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software")
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

This file is a part of Media Pi frontend application -->

<script setup>
import { computed } from 'vue'
import ActionButton from '@/components/ActionButton.vue'

const props = defineProps({
  // The item being assigned (device, etc.)
  item: {
    type: Object,
    required: true
  },
  // Whether assignment mode is currently active
  editMode: {
    type: Boolean,
    default: false
  },
  // Currently selected assignment value (account ID, group ID, etc.)
  selectedValue: {
    type: [Number, String],
    default: null
  },
  // Available options for assignment
  availableOptions: {
    type: Array,
    default: () => []
  },
  // Text for the placeholder
  placeholder: {
    type: String,
    default: 'Выберите элемент'
  },
  // Icon for the start assignment button
  startIcon: {
    type: String,
    default: 'fa-solid fa-plug-circle-check'
  },
  // Tooltip text for the start assignment button
  startTooltip: {
    type: String,
    default: 'Назначить'
  },
  // Tooltip text for the confirm button
  confirmTooltip: {
    type: String,
    default: 'Подтвердить назначение'
  },
  // Tooltip text for the cancel button
  cancelTooltip: {
    type: String,
    default: 'Отменить'
  },
  // Whether the component is disabled
  disabled: {
    type: Boolean,
    default: false
  },
  // Loading state
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'start-assignment',
  'cancel-assignment', 
  'confirm-assignment',
  'update-selection'
])

// Computed to determine if confirm button should be enabled
const canConfirm = computed(() => {
  return !props.loading && !props.disabled && props.selectedValue !== null && props.selectedValue !== undefined
})

// Event handlers
const handleStart = () => {
  emit('start-assignment', props.item)
}

const handleCancel = () => {
  emit('cancel-assignment', props.item)
}

const handleConfirm = () => {
  emit('confirm-assignment', props.item)
}

const handleSelectionUpdate = (value) => {
  emit('update-selection', value)
}
</script>

<template>
  <div class="assignment-inline">
    <div v-if="editMode" class="assignment-selector-inline">
      <v-select 
        :model-value="selectedValue"
        @update:model-value="handleSelectionUpdate"
        :items="availableOptions"
        item-title="title"
        item-value="id"
        :placeholder="placeholder"
        variant="outlined"
        density="compact"
        hide-details
        hide-no-data
        :disabled="loading || disabled"
      />
      <ActionButton 
        :item="item" 
        icon="fa-solid fa-check" 
        :tooltip-text="confirmTooltip"
        :disabled="!canConfirm"
        @click="handleConfirm" 
      />
      <ActionButton 
        :item="item" 
        icon="fa-solid fa-xmark" 
        :tooltip-text="cancelTooltip"
        :disabled="loading || disabled"
        @click="handleCancel" 
      />
    </div>
    <ActionButton 
      v-else
      :item="item" 
      :icon="startIcon"
      :tooltip-text="startTooltip"
      :disabled="loading || disabled"
      @click="handleStart" 
    />
  </div>
</template>

<style scoped>
.assignment-inline {
  display: inline-block;
}

.assignment-selector-inline {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 250px;
}

.assignment-selector-inline .v-select {
  font-size: 0.875rem;
  min-width: 250px;
  background-color: white;
}

.assignment-selector-inline .v-select :deep(.v-field__input) {
  font-size: 0.875rem;
  min-height: 32px;
  background-color: white;
}

.assignment-selector-inline .v-select :deep(.v-field__field) {
  min-height: 32px;
  background-color: white;
}

.assignment-selector-inline .v-select :deep(.v-field) {
  background-color: white;
}

.assignment-selector-inline .v-select :deep(.v-field--variant-outlined) {
  background-color: white;
}

.assignment-selector-inline:hover .v-select :deep(.v-field__input),
.assignment-selector-inline:hover .v-select :deep(.v-field__field),
.assignment-selector-inline:hover .v-select :deep(.v-field),
.assignment-selector-inline:hover .v-select :deep(.v-field--variant-outlined),
.assignment-selector-inline:hover .v-select :deep(.v-input__control),
.assignment-selector-inline:hover .v-select :deep(.v-field__overlay) {
  color: #1976d2 !important;
  background-color: white !important;
}
</style>

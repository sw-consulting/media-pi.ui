// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>
import { Field, FieldArray } from 'vee-validate'
import ActionButton from '@/components/ActionButton.vue'

defineProps({
  name: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  // When true, hides the label visually while keeping the plus button aligned.
  hideLabel: {
    type: Boolean,
    default: false
  },
  fieldType: {
    type: String,
    default: 'select',
    validator: (value) => ['select', 'input', 'textarea'].includes(value)
  },
  options: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: 'Выберите опцию:'
  },
  addTooltip: {
    type: String,
    default: 'Добавить элемент'
  },
  removeTooltip: {
    type: String,
    default: 'Удалить элемент'
  },
  defaultValue: {
    type: [String, Number, Object],
    default: ''
  },
  fieldProps: {
    type: Object,
    default: () => ({})
  },
  hasError: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const cloneDefaultValue = (value) => {
  if (value && typeof value === 'object') {
    try {
      return JSON.parse(JSON.stringify(value))
    } catch {
      return { ...value }
    }
  }

  return value
}
</script>

<template>
  <FieldArray :name="name" v-slot="{ fields, push, remove }">
    <div
      v-for="(field, idx) in fields"
      :key="field.key"
      :class="['form-group', 'mb-2', { 'no-label': hideLabel }]"
    >
      <!-- Keep label node for first index; CSS will hide it when hideLabel is true -->
      <label v-if="idx === 0" class="label">{{ label }}:</label>
      <div v-else class="label"></div>
      
      <div class="field-container">
        <!-- Plus button positioned to the left for first option -->
        <ActionButton
          v-if="idx === 0"
          icon="fa-solid fa-plus"
          :item="defaultValue"
          @click="push(cloneDefaultValue(defaultValue))"
          class="button-o-c field-container-plus"
          :tooltip-text="addTooltip"
          :disabled="disabled"
        />
        <!-- Spacer to keep alignment when label hidden and no plus button on subsequent rows -->
        <div
          v-else-if="hideLabel"
          class="field-container-plus-spacer"
        ></div>

        <slot
          name="field"
          :field-name="`${name}[${idx}]`"
          :index="idx"
          :field="field"
        >
          <Field
            :name="`${name}[${idx}]`"
            :as="fieldType"
            :id="`${name}_${idx}`"
            class="form-control input field-container-select"
            :class="{ 'is-invalid': hasError }"
            :disabled="disabled"
            v-bind="fieldProps"
          >
            <option v-if="fieldType === 'select'" value="">{{ placeholder }}</option>
            <template v-if="fieldType === 'select'">
              <option v-for="option in options" :key="option.value" :value="option.value">
                {{ option.text }}
              </option>
            </template>
          </Field>
        </slot>

        <!-- Minus button always after select -->
        <ActionButton
          icon="fa-solid fa-minus"
          :item="idx"
          @click="remove(idx)"
          :disabled="disabled || fields.length === 1"
          class="button-o-c ml-2"
          :tooltip-text="removeTooltip"
        />
      </div>
    </div>
  </FieldArray>
</template>


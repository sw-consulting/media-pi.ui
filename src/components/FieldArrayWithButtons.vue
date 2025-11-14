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
  moveUpTooltip: {
    type: String,
    default: 'Переместить вверх'
  },
  moveDownTooltip: {
    type: String,
    default: 'Переместить вниз'
  },
  defaultValue: {
    type: [String, Number],
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
  ordered: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <FieldArray :name="name" v-slot="{ fields, push, remove, move }">
    <div v-for="(field, idx) in fields" :key="field.key" class="form-group mb-2">
      <label v-if="idx === 0" class="label">{{ label }}:</label>
      <div v-else class="label"></div>

      <div class="field-container">
        <!-- Plus button positioned to the left for first option -->
        <ActionButton 
          v-if="idx === 0"
          icon="fa-solid fa-plus"
          :item="defaultValue"
          @click="push(defaultValue)"
          class="field-container-plus"
          :tooltip-text="addTooltip"
        />
        
        <Field :name="`${name}[${idx}]`" :as="fieldType" :id="`${name}_${idx}`"
          class="form-control input field-container-select" :class="{ 'is-invalid': hasError }"
          v-bind="fieldProps"
        >
          <option v-if="fieldType === 'select'" value="">{{ placeholder }}</option>
          <template v-if="fieldType === 'select'">
            <option v-for="option in options" :key="option.value" :value="option.value">
              {{ option.text }}
            </option>
          </template>
        </Field>

        <template v-if="ordered">
          <ActionButton
            icon="fa-solid fa-chevron-up"
            :item="idx"
            @click="move(idx, idx - 1)"
            :disabled="idx === 0"
            :tooltip-text="moveUpTooltip"
            class="padding-0"
            classBtn="padding-0"
          />

          <ActionButton
            icon="fa-solid fa-chevron-down"
            :item="idx"
            @click="move(idx, idx + 1)"
            :disabled="idx === fields.length - 1"
            :tooltip-text="moveDownTooltip"
            class="padding-0"
            classBtn="padding-0"
          />
        </template>

        <!-- Minus button always after select -->
        <ActionButton
          icon="fa-solid fa-minus"
          :item="idx"
          @click="remove(idx)"
          :disabled="fields.length === 1"
          class="padding-0"
          classBtn="padding-0"
          :tooltip-text="removeTooltip"
        />
      </div>
    </div>
  </FieldArray>
</template>


// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>
defineProps({
  item: { required: true },
  icon: { type: String, required: true },
  tooltipText: { type: String, required: true },
  iconSize: { type: String, default: '1x' },
  disabled: { type: Boolean, default: false }
})

defineEmits(['click'])
</script>
<template>
  <v-tooltip :text="tooltipText" :disabled="disabled">
    <template v-slot:activator="{ props }">
      <button 
        type="button" 
        @click.stop="$emit('click', item)" 
        :class="['anti-btn', { 'disabled-btn': disabled }, $attrs.class]"
        v-bind="props"
        :disabled="disabled"
      >
        <font-awesome-icon :size="iconSize" :icon="icon"  :class="['button-o-c', $attrs.classBtn]"/>
      </button>
    </template>
  </v-tooltip>
</template>

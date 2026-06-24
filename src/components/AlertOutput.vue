// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import { storeToRefs } from 'pinia'
import { useAlertStore } from '@/stores/alert.store.js'

const props = defineProps({
  show: {
    type: Boolean,
    default: true
  }
})

const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)
</script>

<template>
  <div v-if="props.show && alert" class="alert alert-dismissable mt-0 mb-3" :class="alert.type">
    <button @click="alertStore.clear()" class="btn btn-link close">×</button>
    {{ alert.message }}
  </div>
</template>

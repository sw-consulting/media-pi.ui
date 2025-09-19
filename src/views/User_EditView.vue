// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi backend

<script setup>
import UserSettings from '@/components/User_Settings.vue'

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})
const id = parseInt(props.id)
</script>

<template>
  <Suspense>
    <UserSettings :register="false" :id="id" />
  </Suspense>
</template>

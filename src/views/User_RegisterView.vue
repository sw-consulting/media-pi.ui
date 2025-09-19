// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi backend

<script setup>
import UserSettings from '@/components/User_Settings.vue'
</script>

<template>
  <Suspense>
    <UserSettings :register="true" />
  </Suspense>
</template>

<script setup>
// Copyright (c) 2025 sw.consulting
// Licensed under the MIT License.
// This file is a part of Mediapi frontend application

import UserSettings from '@/components/User_Settings.vue'
</script>

<template>
  <Suspense>
    <UserSettings :register="true" />
  </Suspense>
</template>

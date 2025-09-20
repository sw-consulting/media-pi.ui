// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>
import AccountSettings from '@/components/Account_Settings.vue'
</script>

<template>
  <Suspense>
    <AccountSettings :register="true" />
    <template #fallback>
      <div class="text-center m-5">
        <span class="spinner-border spinner-border-lg align-center"></span>
        <div class="mt-2">Подготовка формы создания лицевого счёта...</div>
      </div>
    </template>
  </Suspense>
</template>

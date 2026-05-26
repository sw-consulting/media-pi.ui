// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import CategorySettings from '@/components/Category_Settings.vue'
</script>

<template>
  <Suspense>
    <CategorySettings :register="true" />
    <template #fallback>
      <div class="text-center m-5">
        <span class="spinner-border spinner-border-lg align-center"></span>
        <div class="mt-2">Подготовка формы создания категории...</div>
      </div>
    </template>
  </Suspense>
</template>

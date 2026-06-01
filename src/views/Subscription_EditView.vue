// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import SubscriptionSettings from '@/components/Subscription_Settings.vue'

const props = defineProps({
  accountId: {
    type: String,
    required: true
  },
  categoryId: {
    type: String,
    required: true
  }
})
const accountId = parseInt(props.accountId, 10)
const categoryId = parseInt(props.categoryId, 10)
</script>

<template>
  <Suspense>
    <SubscriptionSettings :register="false" :account-id="accountId" :category-id="categoryId" />
    <template #fallback>
      <div class="text-center m-5">
        <span class="spinner-border spinner-border-lg align-center"></span>
        <div class="mt-2">Загрузка информации о подписке...</div>
      </div>
    </template>
  </Suspense>
</template>

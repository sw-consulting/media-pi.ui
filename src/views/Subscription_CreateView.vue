// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import SubscriptionSettings from '@/components/Subscription_Settings.vue'

const props = defineProps({
  accountId: {
    type: String,
    required: true
  }
})
const accountId = parseInt(props.accountId, 10)
</script>

<template>
  <Suspense>
    <SubscriptionSettings :register="true" :account-id="accountId" />
    <template #fallback>
      <div class="text-center m-5">
        <span class="spinner-border spinner-border-lg align-center"></span>
        <div class="mt-2">Подготовка формы создания подписки...</div>
      </div>
    </template>
  </Suspense>
</template>

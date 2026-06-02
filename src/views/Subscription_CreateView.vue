// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import SubscriptionSettings from '@/components/Subscription_Settings.vue'

const props = defineProps({
  accountId: {
    type: String,
    required: false
  },
  categoryId: {
    type: String,
    required: false
  },
  categoryLocked: {
    type: Boolean,
    default: false
  },
  categoryTitle: {
    type: String,
    required: false,
    default: ''
  }
})
const parsedAccountId = props.accountId ? parseInt(props.accountId, 10) : NaN
const accountIdValue = Number.isFinite(parsedAccountId) ? parsedAccountId : undefined
const parsedCategoryId = props.categoryId ? parseInt(props.categoryId, 10) : NaN
const categoryIdValue = Number.isFinite(parsedCategoryId) ? parsedCategoryId : undefined
</script>

<template>
  <Suspense>
    <SubscriptionSettings
      :register="true"
      :account-id="accountIdValue"
      :category-id="categoryIdValue"
      :category-locked="categoryLocked"
      :category-title="categoryTitle"
    />
    <template #fallback>
      <div class="text-center m-5">
        <span class="spinner-border spinner-border-lg align-center"></span>
        <div class="mt-2">Подготовка формы создания подписки...</div>
      </div>
    </template>
  </Suspense>
</template>

/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SubscriptionCreateView from '@/views/Subscription_CreateView.vue'
import SubscriptionEditView from '@/views/Subscription_EditView.vue'

const stubs = {
  SubscriptionSettings: {
    props: ['register', 'accountId', 'categoryId', 'categoryLocked', 'categoryTitle'],
    template: '<div data-test="subscription-settings" :data-register="register" :data-account-id="accountId" :data-category-id="categoryId" :data-category-locked="categoryLocked" :data-category-title="categoryTitle"></div>'
  }
}

describe('Subscription views', () => {
  it('passes parsed account id to create settings', async () => {
    const wrapper = mount(SubscriptionCreateView, {
      props: { accountId: '12' },
      global: { stubs }
    })
    await flushPromises()

    const settings = wrapper.find('[data-test="subscription-settings"]')
    expect(settings.attributes('data-register')).toBe('true')
    expect(settings.attributes('data-account-id')).toBe('12')
  })

  it('passes optional category id to create settings', async () => {
    const wrapper = mount(SubscriptionCreateView, {
      props: { accountId: '12', categoryId: '7' },
      global: { stubs }
    })
    await flushPromises()

    const settings = wrapper.find('[data-test="subscription-settings"]')
    expect(settings.attributes('data-register')).toBe('true')
    expect(settings.attributes('data-account-id')).toBe('12')
    expect(settings.attributes('data-category-id')).toBe('7')
  })

  it('passes locked category id to create settings without account id', async () => {
    const wrapper = mount(SubscriptionCreateView, {
      props: { categoryId: '7', categoryLocked: true, categoryTitle: 'Premium' },
      global: { stubs }
    })
    await flushPromises()

    const settings = wrapper.find('[data-test="subscription-settings"]')
    expect(settings.attributes('data-register')).toBe('true')
    expect(settings.attributes('data-account-id')).toBeUndefined()
    expect(settings.attributes('data-category-id')).toBe('7')
    expect(settings.attributes('data-category-locked')).toBe('true')
    expect(settings.attributes('data-category-title')).toBe('Premium')
  })

  it('passes parsed account and category ids to edit settings', async () => {
    const wrapper = mount(SubscriptionEditView, {
      props: { accountId: '12', categoryId: '7' },
      global: { stubs }
    })
    await flushPromises()

    const settings = wrapper.find('[data-test="subscription-settings"]')
    expect(settings.attributes('data-register')).toBe('false')
    expect(settings.attributes('data-account-id')).toBe('12')
    expect(settings.attributes('data-category-id')).toBe('7')
  })
})

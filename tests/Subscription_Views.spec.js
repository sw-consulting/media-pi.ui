/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SubscriptionCreateView from '@/views/Subscription_CreateView.vue'
import SubscriptionEditView from '@/views/Subscription_EditView.vue'

const stubs = {
  SubscriptionSettings: {
    props: ['register', 'accountId', 'categoryId'],
    template: '<div data-test="subscription-settings" :data-register="register" :data-account-id="accountId" :data-category-id="categoryId"></div>'
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

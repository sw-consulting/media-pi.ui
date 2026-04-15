/* @vitest-environment jsdom */
// Copyright (c) 2026 sw.consulting
// This file is a part of Media Pi frontend application

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/components/Screenshots_List.vue', () => ({
  default: {
    name: 'Screenshots_List',
    props: { deviceId: Number },
    template: '<div class="screenshots-list-stub"></div>'
  }
}))

import ScreenshotsView from '@/views/Screenshots_View.vue'

describe('Screenshots_View.vue', () => {
  it('converts route id to number and passes it to the list component', () => {
    const wrapper = mount(ScreenshotsView, {
      props: { id: '12' },
      global: {
        stubs: {
          Suspense: { template: '<div><slot /></div>' }
        }
      }
    })

    const stub = wrapper.findComponent({ name: 'Screenshots_List' })
    expect(typeof stub.props('deviceId')).toBe('number')
    expect(stub.props('deviceId')).toBe(12)
  })
})

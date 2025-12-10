/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/components/Device_Management.vue', () => ({
  default: {
    props: { deviceId: Number },
    template: '<div class="management-stub" :data-device-id="deviceId"></div>'
  }
}))

import DeviceManagementView from '@/views/Device_ManagementView.vue'

describe('Device_ManagementView.vue', () => {
  it('converts route id to number and passes to component', () => {
    const wrapper = mount(DeviceManagementView, {
      props: { id: '7' },
      global: {
        stubs: {
          Suspense: { template: '<div><slot /></div>' }
        }
      }
    })

    expect(wrapper.find('.management-stub').attributes('data-device-id')).toBe('7')
  })
})

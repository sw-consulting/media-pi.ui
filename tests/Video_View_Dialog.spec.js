/* @vitest-environment jsdom */
// Copyright (c) 2026 sw.consulting
// This file is a part of Media Pi frontend application

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VideoViewDialog from '@/components/Video_View_Dialog.vue'

vi.mock('@sw-consulting/tooling.ui.kit', () => ({
  ActionButton: {
    name: 'ActionButton',
    props: ['item', 'icon', 'tooltipText'],
    emits: ['click'],
    template: '<button :data-icon="icon" :data-tooltip="tooltipText" @click="$emit(\'click\', item)"></button>'
  }
}))

function mountDialog(props = {}) {
  return mount(VideoViewDialog, {
    props: {
      modelValue: true,
      video: { id: 1, filename: 'clip.mp4', streamUrl: 'http://localhost:8080/api/videos/1/file?playbackToken=token' },
      title: 'Clip',
      ...props
    },
    global: {
      stubs: {
        'v-dialog': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<div v-if="modelValue" data-test="dialog"><slot /></div>'
        },
        'v-card': {
          template: '<div><slot /></div>'
        }
      }
    }
  })
}

async function triggerMediaError(wrapper, code) {
  const video = wrapper.find('[data-test="video-player"]')
  Object.defineProperty(video.element, 'error', {
    configurable: true,
    value: { code }
  })
  await video.trigger('error')
}

describe('Video_View_Dialog.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders native video controls as the playback control surface', () => {
    const wrapper = mountDialog()

    const video = wrapper.find('[data-test="video-player"]')

    expect(video.exists()).toBe(true)
    expect(video.attributes('src')).toBe('http://localhost:8080/api/videos/1/file?playbackToken=token')
    expect(video.attributes()).toHaveProperty('controls')
    expect(video.attributes()).toHaveProperty('autoplay')
    expect(wrapper.find('[data-test="close-video-dialog"]').attributes('data-icon')).toBe('fa-solid fa-xmark')
  })

  it('starts playback when the dialog opens', async () => {
    const playSpy = vi
      .spyOn(globalThis.HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => Promise.resolve())

    try {
      const wrapper = mountDialog({ modelValue: false })

      await wrapper.setProps({ modelValue: true })
      await nextTick()

      expect(playSpy).toHaveBeenCalled()
    } finally {
      playSpy.mockRestore()
    }
  })

  it('pauses and rewinds video before closing', async () => {
    const wrapper = mountDialog()
    const video = wrapper.find('[data-test="video-player"]').element
    video.pause = vi.fn()
    video.currentTime = 12

    await wrapper.find('[data-test="close-video-dialog"]').trigger('click')

    expect(video.pause).toHaveBeenCalled()
    expect(video.currentTime).toBe(0)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it.each([4, 3])('emits playback error and closes for unsupported media error code %s', async (errorCode) => {
    const wrapper = mountDialog()
    const video = wrapper.find('[data-test="video-player"]').element
    video.pause = vi.fn()

    await triggerMediaError(wrapper, errorCode)

    expect(wrapper.emitted('playback-error')?.[0]).toEqual(['Стриминг этого видеофайла не поддерживается браузером.'])
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    expect(wrapper.find('[data-test="video-playback-error"]').exists()).toBe(false)
  })

  it('shows loading failure message for network media errors', async () => {
    const wrapper = mountDialog()

    await triggerMediaError(wrapper, 2)

    const error = wrapper.find('[data-test="video-playback-error"]')
    expect(error.exists()).toBe(true)
    expect(error.text()).toBe('Не удалось загрузить видеофайл')
    expect(wrapper.emitted('playback-error')).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('clears playback error when closing the dialog', async () => {
    const wrapper = mountDialog()
    const video = wrapper.find('[data-test="video-player"]').element
    video.pause = vi.fn()

    await triggerMediaError(wrapper, 2)
    expect(wrapper.find('[data-test="video-playback-error"]').exists()).toBe(true)

    await wrapper.find('[data-test="close-video-dialog"]').trigger('click')

    expect(wrapper.find('[data-test="video-playback-error"]').exists()).toBe(false)
  })

  it('clears playback error when stream url changes', async () => {
    const wrapper = mountDialog()

    await triggerMediaError(wrapper, 2)
    expect(wrapper.find('[data-test="video-playback-error"]').exists()).toBe(true)

    await wrapper.setProps({
      video: {
        id: 2,
        filename: 'next.mp4',
        streamUrl: 'http://localhost:8080/api/videos/2/file?playbackToken=next'
      }
    })

    expect(wrapper.find('[data-test="video-playback-error"]').exists()).toBe(false)
  })
})

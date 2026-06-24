import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AlertOutput from '@/components/AlertOutput.vue'
import { useAlertStore } from '@/stores/alert.store.js'

describe('AlertOutput.vue', () => {
  let alertStore

  beforeEach(() => {
    setActivePinia(createPinia())
    alertStore = useAlertStore()
    vi.spyOn(alertStore, 'clear')
  })

  it('does not render when there is no alert', () => {
    const wrapper = mount(AlertOutput)

    expect(wrapper.find('.alert-dismissable').exists()).toBe(false)
  })

  it('renders the current alert and clears it from the close button', async () => {
    alertStore.error('Ошибка загрузки')

    const wrapper = mount(AlertOutput)

    expect(wrapper.find('.alert-dismissable').classes()).toContain('alert-danger')
    expect(wrapper.find('.alert-dismissable').text()).toContain('Ошибка загрузки')

    await wrapper.find('.btn-link.close').trigger('click')

    expect(alertStore.clear).toHaveBeenCalled()
    expect(alertStore.alert).toBeNull()
  })

  it('suppresses the alert when show is false', () => {
    alertStore.success('Готово')

    const wrapper = mount(AlertOutput, { props: { show: false } })

    expect(wrapper.find('.alert-dismissable').exists()).toBe(false)
  })
})

// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi backend

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia } from 'pinia'
import InlineAssignment from '@/components/InlineAssignment.vue'
import ActionButton from '@/components/ActionButton.vue'

// Mock FontAwesome
vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: {
    name: 'FontAwesomeIcon',
    template: '<i class="fa-icon" :class="[icon]"></i>',
    props: ['icon', 'size', 'class']
  }
}))

// Global component registration
const globalComponents = {
  'font-awesome-icon': {
    name: 'FontAwesomeIcon',
    template: '<i class="fa-icon" :class="[icon]"></i>',
    props: ['icon', 'size', 'class']
  }
}

describe('InlineAssignment.vue', () => {
  let wrapper, vuetify, pinia

  const mockItem = { id: 'device-123' }
  const mockOptions = [
    { id: 1, title: 'Option 1' },
    { id: 2, title: 'Option 2' }
  ]

  beforeEach(() => {
    vuetify = createVuetify()
    pinia = createPinia()
  })

  const createWrapper = (props = {}) => {
    return mount(InlineAssignment, {
      props: {
        item: mockItem,
        availableOptions: mockOptions,
        ...props
      },
      global: {
        plugins: [vuetify, pinia],
        components: {
          ActionButton,
          ...globalComponents
        }
      }
    })
  }

  describe('Initial state (not in edit mode)', () => {
    it('should render start assignment button when not in edit mode', () => {
      wrapper = createWrapper({ editMode: false })
      
      const startButton = wrapper.findComponent(ActionButton)
      expect(startButton.exists()).toBe(true)
      expect(startButton.props('icon')).toBe('fa-solid fa-plug-circle-check')
      expect(startButton.props('tooltipText')).toBe('Назначить')
    })

    it('should emit start-assignment when start button is clicked', async () => {
      wrapper = createWrapper({ editMode: false })
      
      const startButton = wrapper.findComponent(ActionButton)
      await startButton.vm.$emit('click', mockItem)
      
      expect(wrapper.emitted('start-assignment')).toBeTruthy()
      expect(wrapper.emitted('start-assignment')[0]).toEqual([mockItem])
    })

    it('should use custom start icon and tooltip', () => {
      wrapper = createWrapper({ 
        editMode: false,
        startIcon: 'fa-solid fa-custom',
        startTooltip: 'Custom Start'
      })
      
      const startButton = wrapper.findComponent(ActionButton)
      expect(startButton.props('icon')).toBe('fa-solid fa-custom')
      expect(startButton.props('tooltipText')).toBe('Custom Start')
    })
  })

  describe('Edit mode', () => {
    it('should render selector and action buttons when in edit mode', () => {
      wrapper = createWrapper({ editMode: true })
      
      const selector = wrapper.find('.assignment-selector-inline')
      expect(selector.exists()).toBe(true)
      
      const vSelect = wrapper.findComponent({ name: 'VSelect' })
      expect(vSelect.exists()).toBe(true)
      
      const actionButtons = wrapper.findAllComponents(ActionButton)
      expect(actionButtons).toHaveLength(2) // confirm and cancel
    })

    it('should pass correct props to v-select', () => {
      wrapper = createWrapper({ 
        editMode: true,
        selectedValue: 1,
        placeholder: 'Custom placeholder'
      })
      
      const vSelect = wrapper.findComponent({ name: 'VSelect' })
      expect(vSelect.props('modelValue')).toBe(1)
      expect(vSelect.props('items')).toEqual(mockOptions)
      expect(vSelect.props('placeholder')).toBe('Custom placeholder')
    })

    it('should emit update-selection when selection changes', async () => {
      wrapper = createWrapper({ editMode: true })
      
      const vSelect = wrapper.findComponent({ name: 'VSelect' })
      await vSelect.vm.$emit('update:modelValue', 2)
      
      expect(wrapper.emitted('update-selection')).toBeTruthy()
      expect(wrapper.emitted('update-selection')[0]).toEqual([2])
    })

    it('should emit confirm-assignment when confirm button is clicked', async () => {
      wrapper = createWrapper({ 
        editMode: true,
        selectedValue: 1
      })
      
      const actionButtons = wrapper.findAllComponents(ActionButton)
      const confirmButton = actionButtons.find(btn => btn.props('icon') === 'fa-solid fa-check')
      
      await confirmButton.vm.$emit('click', mockItem)
      
      expect(wrapper.emitted('confirm-assignment')).toBeTruthy()
      expect(wrapper.emitted('confirm-assignment')[0]).toEqual([mockItem])
    })

    it('should emit cancel-assignment when cancel button is clicked', async () => {
      wrapper = createWrapper({ editMode: true })
      
      const actionButtons = wrapper.findAllComponents(ActionButton)
      const cancelButton = actionButtons.find(btn => btn.props('icon') === 'fa-solid fa-xmark')
      
      await cancelButton.vm.$emit('click', mockItem)
      
      expect(wrapper.emitted('cancel-assignment')).toBeTruthy()
      expect(wrapper.emitted('cancel-assignment')[0]).toEqual([mockItem])
    })

    it('should disable confirm button when no selection', () => {
      wrapper = createWrapper({ 
        editMode: true,
        selectedValue: null
      })
      
      const actionButtons = wrapper.findAllComponents(ActionButton)
      const confirmButton = actionButtons.find(btn => btn.props('icon') === 'fa-solid fa-check')
      
      expect(confirmButton.props('disabled')).toBe(true)
    })

    it('should enable confirm button when selection is made', () => {
      wrapper = createWrapper({ 
        editMode: true,
        selectedValue: 1
      })
      
      const actionButtons = wrapper.findAllComponents(ActionButton)
      const confirmButton = actionButtons.find(btn => btn.props('icon') === 'fa-solid fa-check')
      
      expect(confirmButton.props('disabled')).toBe(false)
    })
  })

  describe('Loading and disabled states', () => {
    it('should disable all controls when loading', () => {
      wrapper = createWrapper({ 
        editMode: true,
        loading: true,
        selectedValue: 1
      })
      
      const vSelect = wrapper.findComponent({ name: 'VSelect' })
      expect(vSelect.props('disabled')).toBe(true)
      
      const actionButtons = wrapper.findAllComponents(ActionButton)
      actionButtons.forEach(button => {
        expect(button.props('disabled')).toBe(true)
      })
    })

    it('should disable all controls when disabled prop is true', () => {
      wrapper = createWrapper({ 
        editMode: true,
        disabled: true,
        selectedValue: 1
      })
      
      const vSelect = wrapper.findComponent({ name: 'VSelect' })
      expect(vSelect.props('disabled')).toBe(true)
      
      const actionButtons = wrapper.findAllComponents(ActionButton)
      actionButtons.forEach(button => {
        expect(button.props('disabled')).toBe(true)
      })
    })
  })

  describe('Custom tooltips', () => {
    it('should use custom tooltips for action buttons', () => {
      wrapper = createWrapper({ 
        editMode: true,
        confirmTooltip: 'Custom Confirm',
        cancelTooltip: 'Custom Cancel'
      })
      
      const actionButtons = wrapper.findAllComponents(ActionButton)
      const confirmButton = actionButtons.find(btn => btn.props('icon') === 'fa-solid fa-check')
      const cancelButton = actionButtons.find(btn => btn.props('icon') === 'fa-solid fa-xmark')
      
      expect(confirmButton.props('tooltipText')).toBe('Custom Confirm')
      expect(cancelButton.props('tooltipText')).toBe('Custom Cancel')
    })
  })

  describe('Default props', () => {
    it('should use default values when props are not provided', () => {
      wrapper = createWrapper()
      
      expect(wrapper.props('editMode')).toBe(false)
      expect(wrapper.props('selectedValue')).toBe(null)
      expect(wrapper.props('availableOptions')).toEqual(mockOptions)
      expect(wrapper.props('placeholder')).toBe('Выберите элемент')
      expect(wrapper.props('startIcon')).toBe('fa-solid fa-plug-circle-check')
      expect(wrapper.props('startTooltip')).toBe('Назначить')
      expect(wrapper.props('disabled')).toBe(false)
      expect(wrapper.props('loading')).toBe(false)
    })
  })
})


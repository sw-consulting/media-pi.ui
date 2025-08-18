// Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software")
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// This file is a part of Media Pi frontend application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createDeviceGroupAssignmentActions } from '@/helpers/tree/devicegroup.assignment.helpers.js'
import { getAccountChildren, getUnassignedDevices } from '@/helpers/tree/tree.builder.js'

describe('Device Group Assignment Race Condition Prevention', () => {
  let deviceGroupAssignmentState, transitioningDevices, devicesStore, deviceGroupsStore, alertStore
  let assignmentActions

  beforeEach(() => {
    deviceGroupAssignmentState = ref({})
    transitioningDevices = ref(new Set())
    
    devicesStore = {
      devices: [
        { id: 1, name: 'Device 1', accountId: 1, deviceGroupId: 0 },
        { id: 2, name: 'Device 2', accountId: 1, deviceGroupId: 1 },
        { id: 3, name: 'Device 3' } // top-level unassigned
      ],
      assignGroup: vi.fn().mockResolvedValue()
    }

    deviceGroupsStore = {
      groups: [
        { id: 1, name: 'Group 1', accountId: 1 },
        { id: 2, name: 'Group 2', accountId: 1 }
      ]
    }

    alertStore = {
      error: vi.fn()
    }

    assignmentActions = createDeviceGroupAssignmentActions(
      deviceGroupAssignmentState,
      transitioningDevices,
      devicesStore,
      alertStore
    )
  })

  describe('Linear State Change Process', () => {
    it('should remove device from tree during transition', async () => {
      // Initial state: device is in unassigned section
      const initialTree = getAccountChildren(1, devicesStore, deviceGroupsStore, transitioningDevices.value)
      const unassignedSection = initialTree.find(node => node.id === 'account-1-unassigned')
      
      expect(unassignedSection.children).toHaveLength(1)
      expect(unassignedSection.children[0]).toEqual({
        id: 'device-1-account-1-unassigned',
        name: 'Device 1'
      })

      // Start assignment process - device should be marked as transitioning
      const deviceItem = { id: 'device-1-account-1-unassigned' }
      assignmentActions.startDeviceGroupAssignment(deviceItem)
      
      // Set the selected group
      assignmentActions.updateSelectedDeviceGroup(1, 2)
      
      // Confirm assignment - this should mark device as transitioning
      const assignmentPromise = assignmentActions.confirmDeviceGroupAssignment(deviceItem)
      
      // While assignment is in progress, device should be removed from tree
      const treeWhileTransitioning = getAccountChildren(1, devicesStore, deviceGroupsStore, transitioningDevices.value)
      const unassignedWhileTransitioning = treeWhileTransitioning.find(node => node.id === 'account-1-unassigned')
      
      expect(unassignedWhileTransitioning.children).toHaveLength(0) // Device should be hidden
      expect(transitioningDevices.value.has(1)).toBe(true) // Device should be marked as transitioning

      // Wait for assignment to complete
      await assignmentPromise

      // After assignment, device should no longer be transitioning
      expect(transitioningDevices.value.has(1)).toBe(false)
      
      // Update the device in the store to reflect the new group assignment
      devicesStore.devices[0].deviceGroupId = 2

      // Tree should now show device in the new group
      const finalTree = getAccountChildren(1, devicesStore, deviceGroupsStore, transitioningDevices.value)
      const groupsSection = finalTree.find(node => node.id === 'account-1-groups')
      const targetGroup = groupsSection.children.find(group => group.id === 'group-2')
      
      expect(targetGroup.children).toHaveLength(1)
      expect(targetGroup.children[0]).toEqual({
        id: 'device-1-account-1-group-2',
        name: 'Device 1'
      })
    })

    it('should handle assignment errors gracefully', async () => {
      // Mock assignment failure
      devicesStore.assignGroup.mockRejectedValue(new Error('Assignment failed'))

      const deviceItem = { id: 'device-1-account-1-unassigned' }
      assignmentActions.startDeviceGroupAssignment(deviceItem)
      assignmentActions.updateSelectedDeviceGroup(1, 2)

      // Attempt assignment
      await assignmentActions.confirmDeviceGroupAssignment(deviceItem)

      // Device should no longer be transitioning after error
      expect(transitioningDevices.value.has(1)).toBe(false)
      
      // Error should be reported
      expect(alertStore.error).toHaveBeenCalledWith('Ошибка при назначении группы: Assignment failed')

      // Device should be back in tree at original position
      const tree = getAccountChildren(1, devicesStore, deviceGroupsStore, transitioningDevices.value)
      const unassignedSection = tree.find(node => node.id === 'account-1-unassigned')
      
      expect(unassignedSection.children).toHaveLength(1)
      expect(unassignedSection.children[0].id).toBe('device-1-account-1-unassigned')
    })

    it('should prevent duplicate devices during transition', () => {
      // Mark device as transitioning
      transitioningDevices.value.add(1)

      // Device should not appear in either location
      const tree = getAccountChildren(1, devicesStore, deviceGroupsStore, transitioningDevices.value)
      const unassignedSection = tree.find(node => node.id === 'account-1-unassigned')
      const groupsSection = tree.find(node => node.id === 'account-1-groups')
      
      // Device 1 should not appear in unassigned section
      expect(unassignedSection.children).toHaveLength(0)
      
      // Device 1 should not appear in any group
      const group1 = groupsSection.children.find(group => group.id === 'group-1')
      expect(group1.children).toHaveLength(1) // Only Device 2 which is already in Group 1
      expect(group1.children[0].id).toBe('device-2-account-1-group-1')
    })

    it('should handle top-level unassigned devices correctly', () => {
      // Mark top-level device as transitioning
      transitioningDevices.value.add(3)

      // Top-level unassigned devices should also be filtered
      const topLevelDevices = getUnassignedDevices(devicesStore, transitioningDevices.value)
      
      // Device 3 should not appear in top-level unassigned devices
      expect(topLevelDevices).toHaveLength(0)
      
      // Remove from transitioning and it should reappear
      transitioningDevices.value.delete(3)
      const devicesAfterTransition = getUnassignedDevices(devicesStore, transitioningDevices.value)
      
      expect(devicesAfterTransition).toHaveLength(1)
      expect(devicesAfterTransition[0]).toEqual({
        id: 'device-3',
        name: 'Device 3'
      })
    })
  })

  describe('Device ID Pattern Consistency', () => {
    it('should use consistent ID patterns for devices in different contexts', () => {
      const tree = getAccountChildren(1, devicesStore, deviceGroupsStore, transitioningDevices.value)
      
      // Device in unassigned section should have account context
      const unassignedSection = tree.find(node => node.id === 'account-1-unassigned')
      expect(unassignedSection.children[0].id).toBe('device-1-account-1-unassigned')
      
      // Device in group section should have account and group context
      const groupsSection = tree.find(node => node.id === 'account-1-groups')
      const group1 = groupsSection.children.find(group => group.id === 'group-1')
      expect(group1.children[0].id).toBe('device-2-account-1-group-1')
    })

    it('should allow proper device identification across different contexts', () => {
      // Test that device ID extraction works for all patterns
      const unassignedDevice = { id: 'device-1-account-1-unassigned' }
      const groupDevice = { id: 'device-2-account-1-group-1' }
      const topLevelDevice = { id: 'device-3' }

      // All should extract correct device IDs
      const deviceIdRegex = /device-(\d+)/
      
      expect(unassignedDevice.id.match(deviceIdRegex)[1]).toBe('1')
      expect(groupDevice.id.match(deviceIdRegex)[1]).toBe('2')
      expect(topLevelDevice.id.match(deviceIdRegex)[1]).toBe('3')
    })
  })
})

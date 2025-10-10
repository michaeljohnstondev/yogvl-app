// FILE: services/groupService.js - Group Management Service

import {
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from '../auth/services/firebase';

/**
 * Group structure (stored in users/{userId}/userdata/inviteGroups):
 * {
 *   id: string,          // Unique group ID (generated client-side)
 *   name: string,        // Group name (may include emoji)
 *   emoji: string,       // Separate emoji field (empty if emoji is in name)
 *   description?: string,// Optional group description
 *   members: string[]    // Array of user IDs who are members
 * }
 */

// Create a new group
export const createGroup = async (groupData) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to create groups');
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();
    const existingGroups = userData?.userdata?.inviteGroups || [];

    // Generate unique ID for new group
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newGroup = {
      id: groupId,
      name: groupData.name,
      emoji: groupData.emoji || '',
      description: groupData.description || '',
      members: groupData.members || [],
    };

    // Add new group to array
    const updatedGroups = [...existingGroups, newGroup];

    await updateDoc(userRef, {
      'userdata.inviteGroups': updatedGroups,
    });

    console.log('[GroupService] Created group:', groupId);
    return newGroup;
  } catch (error) {
    console.error('[GroupService] Error creating group:', error);
    throw new Error(`Failed to create group: ${error.message}`);
  }
};

// Get all groups for current user
export const getUserGroups = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();
    const groups = userData?.userdata?.inviteGroups || [];

    console.log('[GroupService] Fetched user groups:', groups.length);
    return groups;
  } catch (error) {
    console.error('[GroupService] Error fetching user groups:', error);
    throw new Error(`Failed to fetch groups: ${error.message}`);
  }
};

// Update group
export const updateGroup = async (groupId, updates) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();
    const groups = userData?.userdata?.inviteGroups || [];

    // Find and update the specific group
    const updatedGroups = groups.map((group) =>
      group.id === groupId ? { ...group, ...updates } : group
    );

    await updateDoc(userRef, {
      'userdata.inviteGroups': updatedGroups,
    });

    console.log('[GroupService] Updated group:', groupId);
    return { id: groupId, ...updates };
  } catch (error) {
    console.error('[GroupService] Error updating group:', error);
    throw new Error(`Failed to update group: ${error.message}`);
  }
};

// Add member to group
export const addMemberToGroup = async (groupId, userId) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();
    const groups = userData?.userdata?.inviteGroups || [];

    // Find the group and check if user is already a member
    const groupIndex = groups.findIndex((g) => g.id === groupId);
    if (groupIndex === -1) {
      throw new Error('Group not found');
    }

    if (groups[groupIndex].members.includes(userId)) {
      throw new Error('User is already a member of this group');
    }

    // Update the group with new member
    const updatedGroups = [...groups];
    updatedGroups[groupIndex] = {
      ...updatedGroups[groupIndex],
      members: [...updatedGroups[groupIndex].members, userId],
    };

    await updateDoc(userRef, {
      'userdata.inviteGroups': updatedGroups,
    });

    console.log('[GroupService] Added member to group:', groupId, userId);
    return true;
  } catch (error) {
    console.error('[GroupService] Error adding member:', error);
    throw new Error(`Failed to add member: ${error.message}`);
  }
};

// Remove member from group
export const removeMemberFromGroup = async (groupId, userId) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();
    const groups = userData?.userdata?.inviteGroups || [];

    // Find the group
    const groupIndex = groups.findIndex((g) => g.id === groupId);
    if (groupIndex === -1) {
      throw new Error('Group not found');
    }

    // Remove user from members array
    const updatedGroups = [...groups];
    updatedGroups[groupIndex] = {
      ...updatedGroups[groupIndex],
      members: updatedGroups[groupIndex].members.filter((id) => id !== userId),
    };

    await updateDoc(userRef, {
      'userdata.inviteGroups': updatedGroups,
    });

    console.log('[GroupService] Removed member from group:', groupId, userId);
    return true;
  } catch (error) {
    console.error('[GroupService] Error removing member:', error);
    throw new Error(`Failed to remove member: ${error.message}`);
  }
};

// Delete group
export const deleteGroup = async (groupId) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();
    const groups = userData?.userdata?.inviteGroups || [];

    // Filter out the group to delete
    const updatedGroups = groups.filter((group) => group.id !== groupId);

    if (updatedGroups.length === groups.length) {
      throw new Error('Group not found');
    }

    await updateDoc(userRef, {
      'userdata.inviteGroups': updatedGroups,
    });

    console.log('[GroupService] Deleted group:', groupId);
    return true;
  } catch (error) {
    console.error('[GroupService] Error deleting group:', error);
    throw new Error(`Failed to delete group: ${error.message}`);
  }
};

// Get group by ID
export const getGroupById = async (groupId) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();
    const groups = userData?.userdata?.inviteGroups || [];

    const group = groups.find((g) => g.id === groupId);

    if (!group) {
      throw new Error('Group not found');
    }

    return group;
  } catch (error) {
    console.error('[GroupService] Error fetching group:', error);
    throw new Error(`Failed to fetch group: ${error.message}`);
  }
};

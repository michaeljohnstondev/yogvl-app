// FILE: services/groupService.js - Group Management Service

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../auth/services/firebase';

/**
 * Group structure:
 * {
 *   id: string,
 *   name: string,
 *   emoji: string,
 *   description?: string,
 *   ownerId: string,
 *   members: string[], // array of user IDs
 *   isPrivate: boolean,
 *   createdAt: timestamp,
 *   updatedAt: timestamp
 * }
 */

// Create a new group
export const createGroup = async (groupData) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to create groups');
    }

    const groupDoc = {
      name: groupData.name,
      emoji: groupData.emoji || '👥',
      description: groupData.description || '',
      ownerId: currentUser.uid,
      members: groupData.members || [],
      isPrivate: groupData.isPrivate || false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'groups'), groupDoc);

    console.log('[GroupService] Created group:', docRef.id);
    return {
      id: docRef.id,
      ...groupDoc,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('[GroupService] Error creating group:', error);
    throw new Error(`Failed to create group: ${error.message}`);
  }
};

// Get all groups for current user (owned or member)
export const getUserGroups = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    // Get groups where user is owner
    const ownedGroupsQuery = query(
      collection(db, 'groups'),
      where('ownerId', '==', currentUser.uid)
    );

    // Get groups where user is a member
    const memberGroupsQuery = query(
      collection(db, 'groups'),
      where('members', 'array-contains', currentUser.uid)
    );

    const [ownedSnapshot, memberSnapshot] = await Promise.all([
      getDocs(ownedGroupsQuery),
      getDocs(memberGroupsQuery),
    ]);

    const ownedGroups = ownedSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      isOwner: true,
    }));

    const memberGroups = memberSnapshot.docs
      .filter((doc) => !ownedGroups.some((group) => group.id === doc.id)) // Avoid duplicates
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        isOwner: false,
      }));

    const allGroups = [...ownedGroups, ...memberGroups];

    // Sort by updatedAt on client side (newest first)
    allGroups.sort((a, b) => {
      const aTime = a.updatedAt?.toDate?.() || a.updatedAt || new Date(0);
      const bTime = b.updatedAt?.toDate?.() || b.updatedAt || new Date(0);
      return bTime - aTime;
    });

    console.log('[GroupService] Fetched user groups:', allGroups.length);
    return allGroups;
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

    const groupRef = doc(db, 'groups', groupId);
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(groupRef, updateData);

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

    const groupRef = doc(db, 'groups', groupId);

    // First get current group data to check if user is already a member
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) {
      throw new Error('Group not found');
    }

    const groupData = groupDoc.data();
    if (groupData.members.includes(userId)) {
      throw new Error('User is already a member of this group');
    }

    // Add user to members array
    await updateDoc(groupRef, {
      members: [...groupData.members, userId],
      updatedAt: serverTimestamp(),
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

    const groupRef = doc(db, 'groups', groupId);

    // Get current group data
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) {
      throw new Error('Group not found');
    }

    const groupData = groupDoc.data();

    // Remove user from members array
    const updatedMembers = groupData.members.filter((id) => id !== userId);

    await updateDoc(groupRef, {
      members: updatedMembers,
      updatedAt: serverTimestamp(),
    });

    console.log('[GroupService] Removed member from group:', groupId, userId);
    return true;
  } catch (error) {
    console.error('[GroupService] Error removing member:', error);
    throw new Error(`Failed to remove member: ${error.message}`);
  }
};

// Delete group (owner only)
export const deleteGroup = async (groupId) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    const groupRef = doc(db, 'groups', groupId);

    // Check if current user is the owner
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) {
      throw new Error('Group not found');
    }

    const groupData = groupDoc.data();
    if (groupData.ownerId !== currentUser.uid) {
      throw new Error('Only group owner can delete the group');
    }

    await deleteDoc(groupRef);

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
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);

    if (!groupDoc.exists()) {
      throw new Error('Group not found');
    }

    return {
      id: groupDoc.id,
      ...groupDoc.data(),
    };
  } catch (error) {
    console.error('[GroupService] Error fetching group:', error);
    throw new Error(`Failed to fetch group: ${error.message}`);
  }
};

// Search groups (public groups only)
export const searchPublicGroups = async (searchTerm) => {
  try {
    const groupsQuery = query(
      collection(db, 'groups'),
      where('isPrivate', '==', false)
    );

    const snapshot = await getDocs(groupsQuery);
    const groups = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort by updatedAt on client side (newest first)
    groups.sort((a, b) => {
      const aTime = a.updatedAt?.toDate?.() || a.updatedAt || new Date(0);
      const bTime = b.updatedAt?.toDate?.() || b.updatedAt || new Date(0);
      return bTime - aTime;
    });

    // Filter by search term (client-side filtering since Firestore doesn't support full-text search)
    const filteredGroups = searchTerm
      ? groups.filter(
          (group) =>
            group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            group.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : groups;

    console.log('[GroupService] Found public groups:', filteredGroups.length);
    return filteredGroups;
  } catch (error) {
    console.error('[GroupService] Error searching groups:', error);
    throw new Error(`Failed to search groups: ${error.message}`);
  }
};

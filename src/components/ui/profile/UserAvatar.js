// UserAvatar.js - Avatar component that takes userId and fetches user data

import React, { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { doc, getDoc } from '../../../lib/firebase';
import { db } from '../../../auth/services/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../auth/AuthContext';
import { usePrivacyValidation } from '../../../hooks/usePrivacyValidation';
import { getProfilePictureUrl } from '../../../services/profilePictureService';
import theme from '../../../theme/themes';

// In-memory cache for user data to prevent unnecessary re-fetches
const userDataCache = new Map();
const CACHE_DURATION = 60000; // 1 minute

const UserAvatar = memo(
  function UserAvatar({ userId, size = 32, style, onPress }) {
    const { currentUserId } = useAuth();
    const { isUserBlocked } = usePrivacyValidation(currentUserId);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isBlocked, setIsBlocked] = useState(false);

    useEffect(() => {
      const fetchUserData = async () => {
        if (!userId) {
          setLoading(false);
          return;
        }

        // Check cache first
        const cached = userDataCache.get(userId);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          setUserData(cached.data);
          setIsBlocked(cached.isBlocked || false);
          setLoading(false);
          return;
        }

        try {
          // Check if user is blocked first - for efficiency
          if (currentUserId && userId !== currentUserId) {
            const blocked = await isUserBlocked(userId);
            setIsBlocked(blocked);

            // If blocked, don't fetch user data - show generic avatar
            if (blocked) {
              setUserData(null);
              setLoading(false);
              // Cache blocked status
              userDataCache.set(userId, {
                data: null,
                isBlocked: true,
                timestamp: Date.now()
              });
              return;
            }
          }

          // Fetch user data if not blocked
          const userRef = doc(db, 'users', userId);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserData(data);
            // Cache the fetched data
            userDataCache.set(userId, {
              data,
              isBlocked: false,
              timestamp: Date.now()
            });
          }
        } catch (error) {
          console.error(
            '[UserAvatar] Error fetching user data for avatar:',
            error
          );
        } finally {
          setLoading(false);
        }
      };

      fetchUserData();
    }, [userId, currentUserId, isUserBlocked]); // Restored isUserBlocked dependency with proper memoization

    if (loading) {
      const loadingContent = (
        <View
          style={[styles.avatarContainer, { width: size, height: size }, style]}
        >
          <View style={[styles.placeholder, { width: size, height: size }]} />
        </View>
      );

      if (onPress) {
        return (
          <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            {loadingContent}
          </TouchableOpacity>
        );
      }

      return loadingContent;
    }

    // Handle blocked users - show generic avatar
    // Support both nested (userdata.contactInfo) and flat (root level) structures
    const contactInfo = userData?.userdata?.contactInfo || userData || {};
    const displayName = isBlocked
      ? 'User' // Generic name for blocked users
      : contactInfo.displayName ||
        (contactInfo.firstName && contactInfo.lastName
          ? `${contactInfo.firstName} ${contactInfo.lastName}`
          : contactInfo.firstName || contactInfo.email || 'User');

    // Get initials
    const getInitials = (name) => {
      if (!name) return '?';
      if (isBlocked) return '?'; // Generic initials for blocked users
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name[0].toUpperCase();
    };

    const initials = getInitials(displayName);
    const profilePictureUrl = !isBlocked ? getProfilePictureUrl(userData) : null;

    const avatarContent = (
      <View
        style={[styles.avatarContainer, { width: size, height: size }, style]}
      >
        <LinearGradient
          colors={
            isBlocked
              ? [theme.colors.darkGray, theme.colors.gray] // Muted colors for blocked users
              : [theme.colors.vibeBlue, theme.colors.vibeCyan]
          }
          style={[
            styles.avatar,
            { width: size, height: size, borderRadius: size / 2 },
            isBlocked && styles.blockedAvatar, // Additional styling for blocked users
          ]}
        >
          {profilePictureUrl ? (
            <Image
              source={{ uri: profilePictureUrl }}
              style={[
                styles.profileImage,
                { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 },
              ]}
              resizeMode="cover"
            />
          ) : (
            <Text
              style={[
                styles.initials,
                { fontSize: size * 0.4 },
                isBlocked && styles.blockedInitials,
              ]}
            >
              {initials}
            </Text>
          )}
        </LinearGradient>
      </View>
    );

    // Remove click functionality for blocked users
    if (onPress && !isBlocked) {
      return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {avatarContent}
        </TouchableOpacity>
      );
    }

    return avatarContent;
  },
  (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    // Only re-render if these props actually change
    return (
      prevProps.userId === nextProps.userId &&
      prevProps.size === nextProps.size &&
      prevProps.onPress === nextProps.onPress &&
      JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style)
    );
  }
);

const styles = StyleSheet.create({
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
  },
  placeholder: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: theme.colors.gray,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  initials: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
  blockedAvatar: {
    opacity: 0.6, // Dimmed appearance for blocked users
    borderColor: theme.colors.gray,
  },
  blockedInitials: {
    color: theme.colors.textSecondary, // Muted text color for blocked users
    opacity: 0.8,
  },
});

export default UserAvatar;

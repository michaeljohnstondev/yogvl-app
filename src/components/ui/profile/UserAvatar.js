// UserAvatar.js - Avatar component that takes userId and fetches user data

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../auth/services/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../../theme/themes';

export default function UserAvatar({ userId, size = 32, style }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
      } catch (error) {
        console.error('Error fetching user data for avatar:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  if (loading) {
    return (
      <View style={[styles.avatarContainer, { width: size, height: size }, style]}>
        <View style={[styles.placeholder, { width: size, height: size }]} />
      </View>
    );
  }

  const contactInfo = userData?.userdata?.contactInfo || {};
  const displayName = contactInfo.firstName && contactInfo.lastName 
    ? `${contactInfo.firstName} ${contactInfo.lastName}`
    : contactInfo.firstName || contactInfo.email || 'User';

  // Get initials
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const initials = getInitials(displayName);

  return (
    <View style={[styles.avatarContainer, { width: size, height: size }, style]}>
      <LinearGradient
        colors={[theme.colors.vibeBlue, theme.colors.vibeCyan]}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
          {initials}
        </Text>
      </LinearGradient>
    </View>
  );
}

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
  initials: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
});
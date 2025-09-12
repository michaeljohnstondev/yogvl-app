// ProfileAvatar.js - Reusable Profile Avatar Component

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getProfilePictureUrl } from '../../services/profilePictureService';
import theme from '../../../theme/themes';

export default function ProfileAvatar({ 
  userData, 
  size = 50, 
  style,
  showBorder = true,
  isLoading = false 
}) {
  if (!userData) return null;

  const contactInfo = userData?.userdata?.contactInfo || {};
  const profilePictureUrl = getProfilePictureUrl(userData);
  
  // Get display name and initials
  const displayName = contactInfo.firstName && contactInfo.lastName 
    ? `${contactInfo.firstName} ${contactInfo.lastName}`
    : contactInfo.email || userData.email || 'User';

  const initials = contactInfo.firstName && contactInfo.lastName
    ? `${contactInfo.firstName.charAt(0)}${contactInfo.lastName.charAt(0)}`.toUpperCase()
    : (contactInfo.email || userData.email ? (contactInfo.email || userData.email).charAt(0).toUpperCase() : '?');

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const innerAvatarStyle = {
    width: size - (showBorder ? 4 : 0),
    height: size - (showBorder ? 4 : 0),
    borderRadius: (size - (showBorder ? 4 : 0)) / 2,
  };

  const textStyle = {
    fontSize: size * 0.4,
  };

  if (isLoading) {
    return (
      <View style={[styles.container, avatarStyle, style]}>
        <LinearGradient
          colors={showBorder ? theme.colors.buttonGradient : ['transparent', 'transparent']}
          style={[styles.borderGradient, avatarStyle]}
        >
          <View style={[styles.innerContainer, innerAvatarStyle, styles.loadingContainer]}>
            <ActivityIndicator size="small" color={theme.colors.vibeBlue} />
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.container, avatarStyle, style]}>
      <LinearGradient
        colors={showBorder ? theme.colors.buttonGradient : ['transparent', 'transparent']}
        style={[styles.borderGradient, avatarStyle]}
      >
        <View style={[styles.innerContainer, innerAvatarStyle]}>
          {profilePictureUrl ? (
            <Image 
              source={{ uri: profilePictureUrl }}
              style={[styles.profileImage, innerAvatarStyle]}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={['rgba(0, 198, 255, 0.3)', 'rgba(0, 255, 150, 0.2)']}
              style={[styles.initialsContainer, innerAvatarStyle]}
            >
              <Text style={[styles.initialsText, textStyle]}>{initials}</Text>
            </LinearGradient>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  borderGradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerContainer: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  initialsContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    backgroundColor: theme.colors.inputBackground,
  },
});
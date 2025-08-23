import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import theme from '../theme/themes';
import VibeButton from '../components/ui/VibeButton';
import CloseButton from '../components/ui/CloseButton';

export default function AdminScreen({ navigation }) {
  const { currentUserId, userData } = useAuth();
  const [debugMode, setDebugMode] = useState(false);
  const [targetUserId, setTargetUserId] = useState('0O6cWgFu26XvH0gOJXyRKD39l3v1');
  const [customMessage, setCustomMessage] = useState('');
  const [searchName, setSearchName] = useState('');

  const handleGoBack = () => {
    navigation.goBack();
  };

  // Friend Management Functions
  const clearSpecificFriendData = async () => {
    if (!targetUserId.trim()) {
      Alert.alert('Error', 'Please enter a User ID');
      return;
    }
    
    try {
      const { clearFriendshipData } = await import('../services/friendService');
      await clearFriendshipData(currentUserId, targetUserId.trim());
      Alert.alert('Success', 'Friendship data cleared successfully!');
      setTargetUserId('');
    } catch (error) {
      console.error('Error clearing friendship data:', error);
      Alert.alert('Error', 'Failed to clear friendship data: ' + error.message);
    }
  };

  const followTestUser = async () => {
    if (!targetUserId.trim()) {
      Alert.alert('Error', 'Please enter a User ID');
      return;
    }
    
    try {
      const { followUser } = await import('../services/followService');
      await followUser(currentUserId, targetUserId.trim(), userData);
      Alert.alert('Success', 'Now following user!');
      setTargetUserId('');
    } catch (error) {
      console.error('Error following user:', error);
      Alert.alert('Error', 'Failed to follow user: ' + error.message);
    }
  };

  const addToFavorites = async () => {
    if (!targetUserId.trim()) {
      Alert.alert('Error', 'Please enter a User ID');
      return;
    }
    
    try {
      const { addToFavorites } = await import('../services/friendService');
      await addToFavorites(currentUserId, targetUserId.trim());
      Alert.alert('Success', 'User added to favorites!');
      setTargetUserId('');
    } catch (error) {
      console.error('Error adding to favorites:', error);
      Alert.alert('Error', 'Failed to add to favorites: ' + error.message);
    }
  };

  const removeFromFavorites = async () => {
    if (!targetUserId.trim()) {
      Alert.alert('Error', 'Please enter a User ID');
      return;
    }
    
    try {
      const { removeFromFavorites } = await import('../services/friendService');
      await removeFromFavorites(currentUserId, targetUserId.trim());
      Alert.alert('Success', 'User removed from favorites!');
      setTargetUserId('');
    } catch (error) {
      console.error('Error removing from favorites:', error);
      Alert.alert('Error', 'Failed to remove from favorites: ' + error.message);
    }
  };

  const unfollowTestUser = async () => {
    if (!targetUserId.trim()) {
      Alert.alert('Error', 'Please enter a User ID');
      return;
    }
    
    Alert.alert(
      'Confirm Unfollow',
      'Are you sure you want to unfollow this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfollow',
          style: 'destructive',
          onPress: async () => {
            try {
              const { unfollowUser } = await import('../services/followService');
              await unfollowUser(currentUserId, targetUserId.trim());
              Alert.alert('Success', 'User unfollowed!');
              setTargetUserId('');
            } catch (error) {
              console.error('Error unfollowing user:', error);
              Alert.alert('Error', 'Failed to unfollow user: ' + error.message);
            }
          }
        }
      ]
    );
  };

  // Data Management Functions
  const showUserData = () => {
    const userDataString = JSON.stringify(userData, null, 2);
    Alert.alert('User Data', userDataString.substring(0, 1000) + (userDataString.length > 1000 ? '...' : ''));
  };

  const copyUserId = async () => {
    // For debugging - shows user ID
    Alert.alert('Your User ID', currentUserId, [
      { text: 'OK' }
    ]);
    console.log('User ID:', currentUserId);
  };

  const showStudioInfo = () => {
    const studioInfo = userData?.userdata?.studios?.default;
    const info = `Studio ID: ${studioInfo?.studioId || 'None'}
Studio Name: ${studioInfo?.studioName || 'None'}
Location: ${studioInfo?.location || 'None'}`;
    Alert.alert('Studio Info', info);
  };

  const showFollowingList = async () => {
    try {
      const { getFollowing, getMutualFollows } = await import('../services/followService');
      const [following, mutualFollows] = await Promise.all([
        getFollowing(currentUserId, 20),
        getMutualFollows(currentUserId, 20)
      ]);
      
      if (following.length === 0 && mutualFollows.length === 0) {
        Alert.alert('Following List', 'You are not following anyone yet.');
        return;
      }

      let listText = '';
      
      if (mutualFollows.length > 0) {
        listText += `FRIENDS (Mutual Follows): ${mutualFollows.length}\n`;
        listText += mutualFollows.map(friend => 
          `${friend.displayName || friend.name || 'Unknown'}\nID: ${friend.id}`
        ).join('\n\n');
        listText += '\n\n';
      }
      
      if (following.length > mutualFollows.length) {
        const onlyFollowing = following.filter(f => 
          !mutualFollows.some(m => m.id === f.targetUserId)
        );
        if (onlyFollowing.length > 0) {
          listText += `FOLLOWING: ${onlyFollowing.length}\n`;
          listText += onlyFollowing.map(user => 
            `${user.targetData?.displayName || 'Unknown'}\nID: ${user.targetUserId}`
          ).join('\n\n');
        }
      }

      Alert.alert('Your Following List', listText);
    } catch (error) {
      console.error('Error fetching following list:', error);
      Alert.alert('Error', 'Failed to load following list: ' + error.message);
    }
  };

  const searchUserByName = async () => {
    if (!searchName.trim()) {
      Alert.alert('Error', 'Please enter a first name to search');
      return;
    }

    try {
      const { getStudioUsers } = await import('../services/userService');
      const studioId = userData?.userdata?.studios?.default?.studioId;
      
      if (!studioId) {
        Alert.alert('Error', 'Studio information not found');
        return;
      }

      const users = await getStudioUsers(currentUserId, studioId);
      const searchTerm = searchName.trim().toLowerCase();
      
      const matchingUsers = users.filter(user => {
        const firstName = user.firstName?.toLowerCase();
        const lastName = user.lastName?.toLowerCase();
        const fullName = user.name?.toLowerCase();
        
        return firstName?.includes(searchTerm) || 
               lastName?.includes(searchTerm) || 
               fullName?.includes(searchTerm);
      });

      if (matchingUsers.length === 0) {
        Alert.alert('No Results', `No users found with name "${searchName}"`);
        return;
      }

      const usersList = matchingUsers.map(user => {
        const displayName = user.name || 'Unknown';
        return `${displayName}\nID: ${user.id}`;
      }).join('\n\n');

      Alert.alert(`Found ${matchingUsers.length} user(s)`, usersList);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users: ' + error.message);
    }
  };

  const testNotification = async () => {
    try {
      // Import notification service and send test
      const { notifyFriendRequest } = await import('../services/notifications');
      await notifyFriendRequest({
        recipientId: currentUserId,
        senderId: 'test_sender',
        senderName: 'Test Sender'
      });
      Alert.alert('Success', 'Test notification sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification: ' + error.message);
    }
  };

  // Debug Functions
  const clearAsyncStorage = async () => {
    Alert.alert(
      'Clear Storage',
      'This will clear all local app data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const AsyncStorage = await import('@react-native-async-storage/async-storage');
              await AsyncStorage.default.clear();
              Alert.alert('Success', 'AsyncStorage cleared! Please restart the app.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear storage: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const forceCrash = () => {
    Alert.alert(
      'Force Crash',
      'This will intentionally crash the app for testing. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Crash',
          style: 'destructive',
          onPress: () => {
            throw new Error('Intentional crash for testing');
          }
        }
      ]
    );
  };

  const logConsoleMessage = () => {
    const message = customMessage || 'Test console message from AdminScreen';
    console.log('[AdminScreen]', message);
    console.warn('[AdminScreen] Warning:', message);
    console.error('[AdminScreen] Error:', message);
    Alert.alert('Success', 'Messages logged to console! Check your debugger.');
  };

  // Event Management Functions
  const navigateToEventManagement = () => {
    // Navigate to a future event management screen
    Alert.alert('Coming Soon', 'Event management features will be added here.');
  };

  const showEventMetrics = async () => {
    try {
      // Get event counts from Firebase
      const metrics = `User Metrics:
- User ID: ${currentUserId}
- Studio: ${userData?.userdata?.studios?.default?.studioId || 'None'}
- Has Contact Info: ${userData?.userdata?.contactinfo?.firstName ? 'Yes' : 'No'}
- Has Location: ${userData?.userdata?.studios?.default?.studioId ? 'Yes' : 'No'}

Debug Info:
- Debug Mode: ${debugMode ? 'ON' : 'OFF'}
- App Version: 1.0.0
- Platform: React Native`;

      Alert.alert('App Metrics', metrics);
    } catch (error) {
      Alert.alert('Error', 'Failed to load metrics: ' + error.message);
    }
  };

  // Render helper for action buttons
  const renderActionButton = (title, onPress, color = 'blue', style = {}) => (
    <VibeButton
      label={title}
      onPress={onPress}
      variant="toggle"
      color={color}
      style={[styles.actionButton, style]}
    />
  );

  const renderSection = (title, children) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <CloseButton onPress={handleGoBack} />
        <Text style={styles.headerTitle}>Admin Tools</Text>
        <View style={styles.headerRight}>
          <Text style={styles.debugText}>Debug</Text>
          <Switch
            value={debugMode}
            onValueChange={setDebugMode}
            trackColor={{ false: theme.colors.darkGray, true: theme.colors.vibeBlue }}
            thumbColor={debugMode ? theme.colors.white : theme.colors.gray}
          />
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* User ID Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Target User ID:</Text>
          <TextInput
            style={styles.textInput}
            value={targetUserId}
            onChangeText={setTargetUserId}
            placeholder="Enter user ID for friend operations"
            placeholderTextColor={theme.colors.gray}
          />
        </View>

        {/* Name Search */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Search by Name:</Text>
          <TextInput
            style={styles.textInput}
            value={searchName}
            onChangeText={setSearchName}
            placeholder="Enter first name, last name, or full name"
            placeholderTextColor={theme.colors.gray}
          />
          <VibeButton
            label="Search Users"
            onPress={searchUserByName}
            variant="toggle"
            color="cyan"
            style={styles.searchButton}
          />
        </View>

        {/* Follow Management */}
        {renderSection('Follow Management', (
          <View style={styles.buttonGrid}>
            {renderActionButton('Follow User', followTestUser, 'green')}
            {renderActionButton('Unfollow User', unfollowTestUser, 'red')}
            {renderActionButton('Add to Favorites', addToFavorites, 'yellow')}
            {renderActionButton('Remove from Favorites', removeFromFavorites, 'orange')}
            {renderActionButton('Clear Friend Data (Legacy)', clearSpecificFriendData, 'red')}
          </View>
        ))}

        {/* User Data */}
        {renderSection('User Data', (
          <View style={styles.buttonGrid}>
            {renderActionButton('Show User Data', showUserData, 'blue')}
            {renderActionButton('Copy User ID', copyUserId, 'cyan')}
            {renderActionButton('Show Studio Info', showStudioInfo, 'purple')}
            {renderActionButton('Show Following List', showFollowingList, 'green')}
            {renderActionButton('Show Metrics', showEventMetrics, 'teal')}
          </View>
        ))}

        {/* Notifications */}
        {renderSection('Notifications', (
          <View style={styles.buttonGrid}>
            {renderActionButton('Send Test Notification', testNotification, 'pink')}
            {renderActionButton('Navigate to Notifications', () => navigation.navigate('Notifications'), 'blue')}
          </View>
        ))}

        {/* Event Management */}
        {renderSection('Event Management', (
          <View style={styles.buttonGrid}>
            {renderActionButton('Event Metrics', navigateToEventManagement, 'green')}
            {renderActionButton('Create Test Event', navigateToEventManagement, 'blue')}
            {renderActionButton('Manage Templates', navigateToEventManagement, 'purple')}
          </View>
        ))}

        {/* Debug Tools */}
        {renderSection('Debug Tools', (
          <View>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Custom Log Message:</Text>
              <TextInput
                style={styles.textInput}
                value={customMessage}
                onChangeText={setCustomMessage}
                placeholder="Enter message to log to console"
                placeholderTextColor={theme.colors.gray}
              />
            </View>
            <View style={styles.buttonGrid}>
              {renderActionButton('Log Console Message', logConsoleMessage, 'cyan')}
              {renderActionButton('Clear AsyncStorage', clearAsyncStorage, 'orange')}
              {renderActionButton('Force Crash (Testing)', forceCrash, 'red')}
            </View>
          </View>
        ))}

        {/* Navigation Shortcuts */}
        {renderSection('Navigation', (
          <View style={styles.buttonGrid}>
            {renderActionButton('User Profile', () => navigation.navigate('UserProfile'), 'blue')}
            {renderActionButton('Privacy Settings', () => navigation.navigate('PrivacySettings'), 'purple')}
            {renderActionButton('Notification Settings', () => navigation.navigate('NotificationSettings'), 'pink')}
            {renderActionButton('Create Event', () => navigation.navigate('CreateEvent'), 'green')}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Admin Tools v1.0</Text>
          <Text style={styles.footerText}>Debug Mode: {debugMode ? 'ON' : 'OFF'}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.vibeBlue,
  },
  headerTitle: {
    color: theme.colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  debugText: {
    color: theme.colors.white,
    fontSize: 14,
    fontFamily: theme.fonts.main,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
    paddingBottom: 8,
  },
  buttonGrid: {
    gap: 10,
  },
  actionButton: {
    marginVertical: 0,
  },
  inputSection: {
    marginVertical: 16,
  },
  inputLabel: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    color: theme.colors.white,
    fontSize: 16,
    fontFamily: theme.fonts.main,
    borderWidth: 1,
    borderColor: theme.colors.darkGray,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    borderTopWidth: 1,
    borderTopColor: theme.colors.darkGray,
    marginTop: 20,
  },
  footerText: {
    color: theme.colors.gray,
    fontSize: 12,
    fontFamily: theme.fonts.main,
  },
  searchButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
});
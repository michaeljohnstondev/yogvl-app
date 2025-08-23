import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import styles from '../../styles/inviteScreenStyles';

// Utility function to clean event titles for consistent matching
const cleanEventTitle = (title) => {
  if (!title) return '';
  return title
    .replace(/[^\w\s]/g, '') // Remove all non-word characters (keeps letters, numbers, spaces)
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .toLowerCase()
    .trim();
};

const GroupFilterSection = ({
  customGroups,
  groupsLoading,
  selectedGroup,
  setSelectedGroup,
  setShowGroupModal,
  selectGroup,
  appUsers,
  localSelectedUsers,
  maxLimit,
  themeColor,
  themeBgColor,
  eventTitle,
  selectedInterests,
  setSelectedInterests,
  showFavorites,
  setShowFavorites,
  showFriends,
  setShowFriends,
  showLocalNode,
  setShowLocalNode
}) => {
  const handleGroupPress = (group) => {
    if (selectedGroup?.id === group.id) {
      setSelectedGroup(null);
    } else {
      setSelectedGroup(group);
    }
  };

  const handleGroupLongPress = (group) => {
    selectGroup(group, appUsers, localSelectedUsers, maxLimit);
  };

  const toggleEventTitle = () => {
    const cleanTitle = cleanEventTitle(eventTitle);
    console.log('[GroupFilter] Toggling interest filter for:', cleanTitle);
    if (cleanTitle) {
      setSelectedInterests(prev => 
        prev.includes(cleanTitle)
          ? prev.filter(i => i !== cleanTitle)
          : [...prev, cleanTitle]
      );
    }
  };

  return (
    <View style={styles.groupContainer}>
      {/* Custom Groups Section */}
      <Text style={[styles.filterLabel]}>
        Custom Groups: <Text style={styles.privateGroupHint}>Tap filters, long press adds</Text>
      </Text>
      <View style={styles.groupButtons}>
        <TouchableOpacity
          style={styles.manageGroupsButton}
          onPress={() => setShowGroupModal(true)}
        >
          <Text style={styles.manageGroupsText}>+ Manage</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.filterLabel, { marginTop: 20 }]}>Filters:</Text>
      {groupsLoading ? (
        <View style={styles.groupLoadingContainer}>
          <ActivityIndicator size="small" color={themeColor} />
          <Text style={styles.groupLoadingText}>Loading groups...</Text>
        </View>
      ) : (
        <View style={styles.groupButtons}>
          <TouchableOpacity
            style={[styles.groupButton, showFavorites && { backgroundColor: themeBgColor, borderColor: themeColor }]}
            onPress={() => setShowFavorites(!showFavorites)}
          >
            <Text style={[styles.groupButtonText, showFavorites && { color: themeColor }]}>
              ⭐ Favorites
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.groupButton, showFriends && { backgroundColor: themeBgColor, borderColor: themeColor }]}
            onPress={() => setShowFriends(!showFriends)}
          >
            <Text style={[styles.groupButtonText, showFriends && { color: themeColor }]}>
              👫 Friends
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.groupButton, showLocalNode && { backgroundColor: themeBgColor, borderColor: themeColor }]}
            onPress={() => setShowLocalNode(!showLocalNode)}
          >
            <Text style={[styles.groupButtonText, showLocalNode && { color: themeColor }]}>
              🌐 Local
            </Text>
          </TouchableOpacity>

          {eventTitle && (
            <TouchableOpacity
              style={[
                styles.groupButton,
                selectedInterests.includes(cleanEventTitle(eventTitle)) && { 
                  backgroundColor: themeBgColor, 
                  borderColor: themeColor 
                }
              ]}
              onPress={toggleEventTitle}
            >
              <Text style={[
                styles.groupButtonText,
                selectedInterests.includes(cleanEventTitle(eventTitle)) && { color: themeColor }
              ]}>
                {eventTitle}
              </Text>
            </TouchableOpacity>
          )}
          
          {customGroups.map(group => (
            <TouchableOpacity
              key={group.id}
              style={[
                styles.groupButton, 
                selectedGroup?.id === group.id && { 
                  backgroundColor: themeBgColor, 
                  borderColor: themeColor 
                }
              ]}
              onPress={() => handleGroupPress(group)}
              onLongPress={() => handleGroupLongPress(group)}
            >
              <Text style={[
                styles.groupButtonText, 
                selectedGroup?.id === group.id && { color: themeColor }
              ]}>
                {group.emoji} {group.name} ({group.members.length})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default GroupFilterSection;
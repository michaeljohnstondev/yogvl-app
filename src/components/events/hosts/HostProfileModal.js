// components/HostProfileModal.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import VibeButton from '../../vibeComponents/VibeButton';
import { UserReliabilityCard } from '../UserReliabilityCard';
import { getUserEventStats } from '../utils/eventUtils';

const HostProfileModal = ({
  visible,
  onClose,
  hostData,
  currentUserId,
  onFollow, // Future implementation
}) => {
  const [isFollowing, setIsFollowing] = useState(false); // Future: check actual follow status

  if (!hostData) return null;

  const displayName =
    hostData.displayName ||
    `${hostData.firstName || ''} ${hostData.lastName || ''}`.trim() ||
    hostData.email?.split('@')[0] ||
    'Unknown Host';

  const stats = getUserEventStats(hostData);
  const isCurrentUser = currentUserId === hostData.id;

  const handleContact = () => {
    if (hostData.email) {
      const subject = encodeURIComponent('Regarding your event');
      const mailtoUrl = `mailto:${hostData.email}?subject=${subject}`;

      Linking.openURL(mailtoUrl).catch(() => {
        Alert.alert('Error', 'Unable to open email app');
      });
    }
  };

  const handleFollow = () => {
    // Future implementation
    setIsFollowing(!isFollowing);
    if (onFollow) {
      onFollow(hostData.id, !isFollowing);
    }
  };

  const formatJoinDate = (timestamp) => {
    if (!timestamp) return 'Recently joined';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const options = { year: 'numeric', month: 'long' };
      return `Joined ${date.toLocaleDateString(undefined, options)}`;
    } catch {
      return 'Recently joined';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>Host Profile</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Info */}
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>

              <Text style={styles.hostName}>{displayName}</Text>

              {hostData.bio && <Text style={styles.bio}>{hostData.bio}</Text>}

              <Text style={styles.joinDate}>
                {formatJoinDate(hostData.createdAt)}
              </Text>
            </View>

            {/* Event Statistics */}
            <UserReliabilityCard userData={hostData} />

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.eventsCreated}</Text>
                <Text style={styles.statLabel}>Events Created</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.eventsAttended}</Text>
                <Text style={styles.statLabel}>Events Attended</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {Math.round(stats.reliabilityScore)}%
                </Text>
                <Text style={styles.statLabel}>Reliability</Text>
              </View>
            </View>

            {/* Contact Info */}
            {(hostData.phone || hostData.website || hostData.socialMedia) && (
              <View style={styles.contactSection}>
                <Text style={styles.sectionTitle}>Contact Info</Text>

                {hostData.phone && (
                  <TouchableOpacity
                    style={styles.contactItem}
                    onPress={() => Linking.openURL(`tel:${hostData.phone}`)}
                  >
                    <Text style={styles.contactIcon}>📞</Text>
                    <Text style={styles.contactText}>{hostData.phone}</Text>
                  </TouchableOpacity>
                )}

                {hostData.website && (
                  <TouchableOpacity
                    style={styles.contactItem}
                    onPress={() => Linking.openURL(hostData.website)}
                  >
                    <Text style={styles.contactIcon}>🌐</Text>
                    <Text style={styles.contactText}>{hostData.website}</Text>
                  </TouchableOpacity>
                )}

                {hostData.socialMedia && (
                  <TouchableOpacity
                    style={styles.contactItem}
                    onPress={() => Linking.openURL(hostData.socialMedia)}
                  >
                    <Text style={styles.contactIcon}>📱</Text>
                    <Text style={styles.contactText}>Social Media</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Host Highlights */}
            {(stats.eventsCreated > 5 || stats.reliabilityScore > 90) && (
              <View style={styles.highlightsSection}>
                <Text style={styles.sectionTitle}>Host Highlights</Text>

                {stats.eventsCreated > 10 && (
                  <View style={styles.highlight}>
                    <Text style={styles.highlightIcon}>🌟</Text>
                    <Text style={styles.highlightText}>Experienced Host</Text>
                  </View>
                )}

                {stats.reliabilityScore > 95 && (
                  <View style={styles.highlight}>
                    <Text style={styles.highlightIcon}>✅</Text>
                    <Text style={styles.highlightText}>Highly Reliable</Text>
                  </View>
                )}

                {stats.eventsCreated > 20 && (
                  <View style={styles.highlight}>
                    <Text style={styles.highlightIcon}>🏆</Text>
                    <Text style={styles.highlightText}>Community Builder</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          {!isCurrentUser && (
            <View style={styles.buttonContainer}>
              {hostData.email && (
                <VibeButton
                  label="CONTACT HOST"
                  onPress={handleContact}
                  variant="outline"
                  style={styles.contactButton}
                />
              )}

              <VibeButton
                label={isFollowing ? 'FOLLOWING' : 'FOLLOW HOST'}
                onPress={handleFollow}
                variant={isFollowing ? 'outline' : 'filled'}
                style={[
                  styles.followButton,
                  isFollowing && styles.followingButton,
                ]}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    height: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  hostName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  joinDate: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  contactSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  contactIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  highlightsSection: {
    marginBottom: 20,
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  highlightIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  highlightText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  buttonContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12,
  },
  contactButton: {
    borderColor: '#2196F3',
  },
  followButton: {
    // Default filled style
  },
  followingButton: {
    borderColor: '#4CAF50',
  },
});

export default HostProfileModal;

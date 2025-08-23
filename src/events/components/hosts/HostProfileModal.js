// components/HostProfileModal.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import VibeButton from '../../../components/ui/VibeButton';
import { UserReliabilityCard } from '../UserReliabilityCard';
import { getUserEventStats } from '../../lib/userMetrics';
import { useVibeAlert } from '../../../components/ui/VibeAlertContext';
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../auth/services/firebase';

const HostProfileModal = ({
  visible,
  onClose,
  hostData,
  currentUserId,
  eventId, // New prop for rating the event/host
  onFollow, // Future implementation
}) => {
  const [isFollowing, setIsFollowing] = useState(false); // Future: check actual follow status
  const [userRating, setUserRating] = useState(0); // User's rating for this host/event
  const [hasRated, setHasRated] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const vibeAlert = useVibeAlert();

  useEffect(() => {
    if (visible && currentUserId && hostData && eventId) {
      checkExistingRating();
    }
  }, [visible, currentUserId, hostData, eventId]);

  if (!hostData) return null;

  const contactInfo = hostData?.userdata?.contactinfo || {};
  const displayName =
    hostData.displayName ||
    `${contactInfo.firstName || ''} ${contactInfo.lastName || ''}`.trim() ||
    (contactInfo.email || hostData.email)?.split('@')[0] ||
    'Unknown Host';

  const stats = getUserEventStats(hostData);
  const isCurrentUser = currentUserId === hostData.id;

  const checkExistingRating = async () => {
    if (!currentUserId || !hostData || !eventId) return;
    
    try {
      const ratingId = `${currentUserId}_${hostData.id}_${eventId}`;
      const ratingDoc = await getDoc(doc(db, 'hostRatings', ratingId));
      
      if (ratingDoc.exists()) {
        const data = ratingDoc.data();
        setUserRating(data.rating);
        setHasRated(true);
      } else {
        setUserRating(0);
        setHasRated(false);
      }
    } catch (error) {
      console.error('Error checking rating:', error);
    }
  };

  const submitRating = async (rating) => {
    if (!currentUserId || !hostData || !eventId || isCurrentUser) return;
    
    setIsSubmittingRating(true);
    try {
      const ratingId = `${currentUserId}_${hostData.id}_${eventId}`;
      
      await setDoc(doc(db, 'hostRatings', ratingId), {
        raterId: currentUserId,
        hostId: hostData.id,
        eventId: eventId,
        rating: rating,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Also add to ratings collection for analytics
      await addDoc(collection(db, 'ratings'), {
        type: 'host',
        raterId: currentUserId,
        targetId: hostData.id,
        eventId: eventId,
        rating: rating,
        createdAt: serverTimestamp(),
      });

      setUserRating(rating);
      setHasRated(true);
      
      vibeAlert.success('Rating Submitted!', `You rated ${displayName} ${rating} star${rating !== 1 ? 's' : ''}!`);
    } catch (error) {
      console.error('Error submitting rating:', error);
      vibeAlert.error('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleStarPress = (rating) => {
    if (isCurrentUser || isSubmittingRating) return;
    
    vibeAlert.confirm(
      'Rate Host',
      `Rate ${displayName} ${rating} star${rating !== 1 ? 's' : ''} for this event?`,
      () => submitRating(rating),
      () => {} // Cancel - do nothing
    );
  };

  const renderStarRating = () => {
    if (isCurrentUser) return null;

    return (
      <View style={styles.ratingSection}>
        <Text style={styles.ratingTitle}>
          {hasRated ? 'Your Rating' : 'Rate This Host'}
        </Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => handleStarPress(star)}
              disabled={isSubmittingRating}
              style={styles.starButton}
            >
              <Text
                style={[
                  styles.star,
                  star <= userRating && styles.starFilled,
                  isSubmittingRating && styles.starDisabled,
                ]}
              >
                ★
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {hasRated && (
          <Text style={styles.ratingSubtext}>
            You rated {userRating} star{userRating !== 1 ? 's' : ''}
          </Text>
        )}
        {!hasRated && (
          <Text style={styles.ratingSubtext}>
            Tap stars to rate this host's event
          </Text>
        )}
      </View>
    );
  };

  const handleContact = () => {
    const email = hostData.userdata?.contactinfo?.email;
    if (email) {
      const subject = encodeURIComponent('Regarding your event');
      const mailtoUrl = `mailto:${email}?subject=${subject}`;

      Linking.openURL(mailtoUrl).catch(() => {
        vibeAlert.error('Error', 'Unable to open email app');
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
                {formatJoinDate(hostData.userdata?.metadata?.createdAt)}
              </Text>
            </View>

            {/* Event Statistics */}
            <UserReliabilityCard userData={hostData} />

            {/* Host Rating Section */}
            {renderStarRating()}

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
            {(hostData.userdata?.contactinfo?.phoneNumber || hostData.website || hostData.socialMedia) && (
              <View style={styles.contactSection}>
                <Text style={styles.sectionTitle}>Contact Info</Text>

                {hostData.userdata?.contactinfo?.phoneNumber && (
                  <TouchableOpacity
                    style={styles.contactItem}
                    onPress={() => Linking.openURL(`tel:${hostData.userdata.contactinfo.phoneNumber}`)}
                  >
                    <Text style={styles.contactIcon}>📞</Text>
                    <Text style={styles.contactText}>{hostData.userdata.contactinfo.phoneNumber}</Text>
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
              {hostData.userdata?.contactinfo?.email && (
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
    backgroundColor: 'rgba(8, 11, 30, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  modalContainer: {
    backgroundColor: '#080B1E',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    height: '90%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 198, 255, 0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 198, 255, 0.2)',
    backgroundColor: 'rgba(0, 198, 255, 0.05)',
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
    backgroundColor: 'rgba(0, 198, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 198, 255, 0.4)',
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
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 198, 255, 0.2)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00C6FF',
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
    backgroundColor: 'rgba(11, 17, 37, 0.8)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 198, 255, 0.2)',
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
    backgroundColor: 'rgba(11, 17, 37, 0.8)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#00C6FF',
    borderWidth: 1,
    borderColor: 'rgba(0, 198, 255, 0.2)',
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
    borderTopColor: 'rgba(0, 198, 255, 0.2)',
    backgroundColor: 'rgba(0, 198, 255, 0.05)',
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
  ratingSection: {
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 198, 255, 0.2)',
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 28,
    color: '#666',
  },
  starFilled: {
    color: '#FFD700',
  },
  starDisabled: {
    opacity: 0.5,
  },
  ratingSubtext: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
});

export default HostProfileModal;

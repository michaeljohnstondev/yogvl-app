import React, { useState, useCallback, memo, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FormatDate } from '../../../lib/formatDate';
import { textUtils } from '../../../lib/textUtils';
import { mapUtils } from '../../../lib/mapUtils';
import { normalizeEventTitleToInterest } from '../../../lib/interestUtils';
import EventCreatorInfo from '../hosts/EventCreatorInfo';
import theme from '../../../theme/themes';
import { doc, getDoc } from '../../../lib/firebase/firestore';
import { db } from '../../../auth/services/firebase';

function EventInfoSection({
  event,
  currentUserId,
  creatorData,
  cohostData,
  friendAttendees,
  userInterests,
  showPrivacyFlash,
  isAdmin,
  isSubscribed,
  isEventPast,
  onInterestToggle,
  onPrivacyIconPress,
  onShowHostProfile,
  onShowAttendeesModal,
  onNotificationSettings,
  vibeAlert,
  studioId,
}) {
  if (!event) return null;

  const isHost = event.createdBy === currentUserId;

  // State for dynamically fetched official event organization name
  const [hostDisplayName, setHostDisplayName] = useState(null);

  // Fetch studio nickname when event is official
  useEffect(() => {
    const fetchStudioNickname = async () => {
      if (event.isOfficialEvent && studioId) {
        try {
          const studioRef = doc(db, 'studios', studioId);
          const studioSnap = await getDoc(studioRef);

          if (studioSnap.exists()) {
            const studioData = studioSnap.data();
            console.log('[EventInfoSection] Studio data:', studioData);
            console.log('[EventInfoSection] Studio nickname:', studioData.nickname);
            console.log('[EventInfoSection] Studio city:', studioData.city);

            // Use nickname if available, otherwise use city name with a space
            const displayName = studioData.nickname
              ? `Yo${studioData.nickname}`
              : `Yo ${studioData.city || 'GVL'}`;

            console.log('[EventInfoSection] Using display name:', displayName);
            setHostDisplayName(displayName);
          } else {
            console.warn('[EventInfoSection] Studio document not found:', studioId);
            setHostDisplayName('YoGVL'); // Fallback
          }
        } catch (error) {
          console.error('[EventInfoSection] Error fetching studio nickname:', error);
          setHostDisplayName('YoGVL'); // Fallback
        }
      } else {
        setHostDisplayName(null); // Not an official event
      }
    };

    fetchStudioNickname();
  }, [event.isOfficialEvent, studioId]);

  // Create optimized interest lookup to prevent repeated array searches
  const interestLookup = useMemo(() => {
    const lookup = new Map();
    userInterests.forEach((interest) => {
      lookup.set(interest.toLowerCase(), true);
    });
    return lookup;
  }, [userInterests]);

  // Memoized interest state for the event title
  const genericInterestState = useMemo(() => {
    if (!event.title) return { isInterested: false, interest: '' };

    // Use centralized normalization function to ensure emoji removal, trim, lowercase
    const normalizedInterest = normalizeEventTitleToInterest(event.title);
    const isInterested = interestLookup.has(normalizedInterest);

    return {
      isInterested,
      interest: normalizedInterest, // Always use normalized version (no emoji, lowercase, trimmed)
    };
  }, [event.title, interestLookup]);

  // Memoized venue interest state
  const venueInterestState = useMemo(() => {
    if (!event.location) return { isInterested: false, interest: '' };

    // Normalize venue name (lowercase, trim)
    const normalizedVenue = normalizeEventTitleToInterest(event.location);
    const isInterested = interestLookup.has(normalizedVenue);

    return {
      isInterested,
      interest: normalizedVenue,
    };
  }, [event.location, interestLookup]);
  const isCohost = event.cohosts?.includes(currentUserId);
  const isHostOrCohost = isHost || isCohost;

  const { cleanTitle } = textUtils.extractEmoji(event.title);

  // Calculate guest count (exclude host and cohosts from subscribers)
  const guestCount = useMemo(() => {
    const totalSubscribers = event.subscriberCount || 0;
    const cohostCount = event.cohosts?.length || 0;
    // Subtract 1 for the host and cohosts to get actual guest count
    return Math.max(0, totalSubscribers - 1 - cohostCount);
  }, [event.subscriberCount, event.cohosts]);

  // Format guest/attendee display
  const attendeeDisplayText = useMemo(() => {
    // If viewing as host/cohost, show guest count
    if (isHostOrCohost) {
      if (guestCount === 0) return 'No guests yet';
      if (guestCount === 1) return '1 guest';
      return `${guestCount} guests`;
    }

    // If viewing as regular attendee
    const attendeeCount = guestCount;
    if (attendeeCount === 0) return 'No attendees yet';
    if (attendeeCount === 1) return 'You';
    return `You + ${attendeeCount - 1} ${attendeeCount === 2 ? 'other' : 'others'}`;
  }, [guestCount, isHostOrCohost]);

  const handleLocationPress = useCallback(() => {
    // Only open maps if there's an actual address (not just a location name)
    if (event.address) {
      vibeAlert.confirm(
        'Open Maps',
        `Open ${event.location || 'this location'} in Maps?`,
        () => {
          mapUtils.openMapsWithLocation(event.location, event.address);
        }
      );
    }
  }, [event.address, event.location, vibeAlert]);

  const handleGenericInterestPress = useCallback(() => {
    if (onInterestToggle) {
      onInterestToggle(genericInterestState.interest);
    }
  }, [genericInterestState.interest, onInterestToggle]);

  const handleVenueInterestPress = useCallback(() => {
    if (onInterestToggle) {
      onInterestToggle(venueInterestState.interest);
    }
  }, [venueInterestState.interest, onInterestToggle]);

  const handleAttendeesPress = useCallback(() => {
    const canViewAttendees =
      (isHostOrCohost && guestCount > 0) ||
      (isAdmin && guestCount > 0) ||
      friendAttendees.length > 0;

    if (canViewAttendees && onShowAttendeesModal) {
      onShowAttendeesModal();
    }
  }, [
    isHostOrCohost,
    isAdmin,
    guestCount,
    friendAttendees.length,
    onShowAttendeesModal,
  ]);

  const canViewAttendees =
    (isHostOrCohost && guestCount > 0) ||
    (isAdmin && guestCount > 0) ||
    friendAttendees.length > 0;

  return (
    <View style={styles.infoSection}>
      {/* Event Name with Privacy and Interests */}
      <TouchableOpacity
        style={styles.infoCard}
        onPress={handleGenericInterestPress}
        activeOpacity={0.7}
      >
        <View style={styles.eventNameRow}>
          <TouchableOpacity
            onPress={onPrivacyIconPress}
            style={styles.privacyIconContainer}
          >
            <Text style={styles.privacyIcon}>
              {event.isPrivate ? '🔒' : '🌍'}
            </Text>
          </TouchableOpacity>
          <View style={styles.eventNameContent}>
            <Text style={styles.infoLabel}>Event Name</Text>
            <Text style={styles.infoValue}>
              {showPrivacyFlash
                ? event.isPrivate
                  ? 'Private Event'
                  : 'Public Event'
                : cleanTitle}
            </Text>
          </View>
          <View style={styles.interestStars}>
            <Text
              style={[
                styles.starIcon,
                {
                  color: genericInterestState.isInterested
                    ? theme.colors.vibeYellow
                    : theme.colors.textSecondary,
                  fontSize: genericInterestState.isInterested ? 20 : 26,
                  marginLeft: genericInterestState.isInterested ? 2 : 0,
                },
              ]}
            >
              {genericInterestState.isInterested ? '⭐' : '☆'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Location */}
      <TouchableOpacity
        style={styles.infoCard}
        onPress={handleLocationPress}
        disabled={!event.address}
        activeOpacity={event.address ? 0.7 : 1}
      >
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📍</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>
              {event.location || 'Location TBD'}
            </Text>
          </View>
          {event.location && (
            <TouchableOpacity
              onPress={handleVenueInterestPress}
              style={styles.venueStarButton}
            >
              <Text
                style={[
                  styles.starIcon,
                  {
                    color: venueInterestState.isInterested
                      ? theme.colors.vibeYellow
                      : theme.colors.textSecondary,
                    fontSize: venueInterestState.isInterested ? 20 : 26,
                  },
                ]}
              >
                {venueInterestState.isInterested ? '⭐' : '☆'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {/* Date & Time */}
      <TouchableOpacity
        style={styles.infoCard}
        onPress={onNotificationSettings}
        disabled={!isSubscribed || isEventPast || !onNotificationSettings}
        activeOpacity={0.7}
      >
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📅</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Date & Time</Text>
            {(() => {
              const fullDateTime = FormatDate(
                event.eventTimestamp?.toDate() || event.utcDateTime,
                event.eventTimeZone ||
                  Intl.DateTimeFormat().resolvedOptions().timeZone
              );

              // Split by @ symbol for "Today @ 3:00 PM" format
              if (fullDateTime.includes('@')) {
                const [datePart, timePart] = fullDateTime.split('@').map(s => s.trim());
                return (
                  <>
                    <Text style={styles.infoValue}>{datePart}</Text>
                    <Text style={styles.infoValue}>{timePart}</Text>
                  </>
                );
              }

              // Split by last comma for "Mon, Jan 15, 3:00 PM" format
              const lastCommaIndex = fullDateTime.lastIndexOf(',');
              if (lastCommaIndex > 0) {
                const datePart = fullDateTime.substring(0, lastCommaIndex);
                const timePart = fullDateTime.substring(lastCommaIndex + 1).trim();
                return (
                  <>
                    <Text style={styles.infoValue}>{datePart}</Text>
                    <Text style={styles.infoValue}>{timePart}</Text>
                  </>
                );
              }

              // Fallback: show as single line if can't split
              return <Text style={styles.infoValue}>{fullDateTime}</Text>;
            })()}
          </View>
          {/* Notification Bell Icon - Only show when subscribed and event is not past */}
          {isSubscribed && !isEventPast && onNotificationSettings && (
            <View style={styles.notificationButton}>
              <Text style={styles.notificationIcon}>🔔</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Event Hosts */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>👤</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>
              Event Host{cohostData.length > 0 ? 's' : ''}
            </Text>
            <EventCreatorInfo
              creatorData={creatorData}
              hostDisplayName={hostDisplayName}
              showLabel={false}
              showReliability={false}
              onPress={() =>
                onShowHostProfile && onShowHostProfile(creatorData)
              }
            />
            {cohostData.length > 0 && (
              <View style={styles.cohostsContainer}>
                {cohostData.map((cohost) => (
                  <EventCreatorInfo
                    key={cohost.id}
                    creatorData={cohost}
                    showLabel={false}
                    showReliability={false}
                    onPress={() =>
                      onShowHostProfile && onShowHostProfile(cohost)
                    }
                    style={styles.cohostItem}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Guests - Show to host/cohost if any guests, or to regular guests if there are other guests besides themselves */}
      {((isHostOrCohost && guestCount > 0) || (!isHostOrCohost && guestCount > 1 && isSubscribed)) && (
        <TouchableOpacity
          style={styles.infoCard}
          onPress={handleAttendeesPress}
          disabled={!canViewAttendees}
          activeOpacity={0.7}
        >
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>👥</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                Guests{event.maxGuests ? ` (${event.maxGuests} max)` : ''}
              </Text>
              <Text style={styles.infoValue}>
                {attendeeDisplayText}
              </Text>
              <View style={styles.eventBadges}>
                {event.hasFee && event.entryFee && (
                  <View style={styles.feeBadge}>
                    <Text style={styles.badgeText}>
                      💰 ${event.entryFee || 'Paid'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  infoSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  infoCard: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: theme.sizes.borderRadius,
    marginVertical: 8,
    padding: 16,
    borderWidth: 3,
    borderColor: theme.colors.vibeBlue,
  },
  eventNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  privacyIconContainer: {
    marginRight: 12,
    padding: 4,
  },
  privacyIcon: {
    fontSize: 20,
  },
  eventNameContent: {
    flex: 1,
  },
  interestStars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  starIcon: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 40,
    textAlign: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: '500',
    lineHeight: 22,
  },
  venueStarButton: {
    padding: 4,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cohostsContainer: {
    marginTop: 8,
  },
  cohostItem: {
    marginTop: 4,
  },
  eventBadges: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  feeBadge: {
    backgroundColor: theme.colors.vibeBackgroundGreen,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: theme.colors.vibeGreen,
  },
  badgeText: {
    fontSize: 12,
    color: theme.colors.vibeGreen,
    fontWeight: '600',
  },
  notificationButton: {
    padding: 8,
    paddingRight: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.sizes.borderRadius,
    marginLeft: 12,
  },
  notificationIcon: {
    fontSize: 20,
  },
});

export default memo(EventInfoSection);

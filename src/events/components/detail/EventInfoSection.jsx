import React, { useState, useCallback, memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FormatDate } from '../../../lib/formatDate';
import { textUtils } from '../../../lib/textUtils';
import { mapUtils } from '../../../lib/mapUtils';
import EventCreatorInfo from '../hosts/EventCreatorInfo';
import theme from '../../../theme/themes';

function EventInfoSection({
  event,
  currentUserId,
  creatorData,
  cohostData,
  friendAttendees,
  userInterests,
  eventInterests,
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
}) {
  if (!event) return null;

  const isHost = event.createdBy === currentUserId;

  // Create optimized interest lookup to prevent repeated array searches
  const interestLookup = useMemo(() => {
    const lookup = new Map();
    userInterests.forEach((interest) => {
      lookup.set(interest.toLowerCase(), true);
    });
    return lookup;
  }, [userInterests]);

  // Memoized function to check if user is interested in a topic
  const isUserInterested = useCallback(
    (interest) => {
      return interestLookup.has(interest.toLowerCase());
    },
    [interestLookup]
  );

  // Memoized generic interest state (for when no specific interests exist)
  const genericInterestState = useMemo(() => {
    if (!event.title) return { isInterested: false, interest: '' };

    const genericInterest = event.title.toLowerCase().trim();
    const isInterested = interestLookup.has(genericInterest);

    return {
      isInterested,
      interest: event.title.trim(),
    };
  }, [event.title, interestLookup]);
  const isCohost = event.cohosts?.includes(currentUserId);
  const isHostOrCohost = isHost || isCohost;

  const { cleanTitle } = textUtils.extractEmoji(event.title);
  const attendeeCount = Math.max(0, (event.subscriberCount || 0) - 1);

  // Format attendee display: "You + X others"
  const attendeeDisplayText = useMemo(() => {
    if (attendeeCount === 0) return 'No attendees yet';

    if (attendeeCount === 1) {
      return 'You';
    }

    return `You + ${attendeeCount - 1} ${attendeeCount === 2 ? 'other' : 'others'}`;
  }, [attendeeCount]);

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

  const handleInterestPress = useCallback(
    (interest) => {
      if (onInterestToggle) {
        onInterestToggle(interest);
      }
    },
    [onInterestToggle]
  );

  const handleGenericInterestPress = useCallback(() => {
    handleInterestPress(genericInterestState.interest);
  }, [genericInterestState.interest, handleInterestPress]);

  const handleAttendeesPress = useCallback(() => {
    const canViewAttendees =
      (isHostOrCohost && (event?.subscriberCount || 0) > 1) ||
      (isAdmin && (event?.subscriberCount || 0) > 1) ||
      friendAttendees.length > 0;

    if (canViewAttendees && onShowAttendeesModal) {
      onShowAttendeesModal();
    }
  }, [
    isHostOrCohost,
    isAdmin,
    event?.subscriberCount,
    friendAttendees.length,
    onShowAttendeesModal,
  ]);

  const canViewAttendees =
    (isHostOrCohost && attendeeCount > 0) ||
    (isAdmin && attendeeCount > 0) ||
    friendAttendees.length > 0;

  return (
    <View style={styles.infoSection}>
      {/* Event Name with Privacy and Interests */}
      <View style={styles.infoCard}>
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
            {eventInterests.length > 0 ? (
              eventInterests.map((interest, index) => {
                const isInterested = isUserInterested(interest);
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleInterestPress(interest)}
                    style={styles.starButton}
                  >
                    <Text
                      style={[
                        styles.starIcon,
                        {
                          color: isInterested
                            ? theme.colors.vibeYellow
                            : theme.colors.textSecondary,
                          fontSize: isInterested ? 20 : 26,
                          marginLeft: isInterested ? 2 : 0,
                        },
                      ]}
                    >
                      {isInterested ? '⭐' : '☆'}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <TouchableOpacity
                onPress={handleGenericInterestPress}
                style={styles.starButton}
              >
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
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Date & Time */}
      <View style={styles.infoCard}>
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
          {/* Notification Bell Button - Only show when subscribed and event is not past */}
          {isSubscribed && !isEventPast && onNotificationSettings && (
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={onNotificationSettings}
              activeOpacity={0.7}
            >
              <Text style={styles.notificationIcon}>🔔</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Location */}
      <TouchableOpacity
        style={styles.infoCard}
        onPress={handleLocationPress}
        disabled={!event.address}
      >
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📍</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>
              {event.location || 'Location TBD'}
            </Text>
          </View>
          {event.address && (
            <Text style={styles.tapToOpenMaps}>🗺️</Text>
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

      {/* Attendees - Only show when there are enough attendees for meaningful display */}
      {attendeeCount >= 2 && !(isAdmin && !isHostOrCohost && attendeeCount === 1) && (
        <View style={styles.infoCard}>
          <TouchableOpacity
            style={styles.infoRow}
            onPress={handleAttendeesPress}
            disabled={!canViewAttendees}
            activeOpacity={canViewAttendees ? 0.7 : 1}
          >
            <Text style={styles.infoIcon}>👥</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                Attendees{event.maxGuests ? ` (${event.maxGuests} max)` : ''}
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
          </TouchableOpacity>
        </View>
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
  starButton: {
    padding: 4,
    paddingRight: 5,
    alignItems: 'center',
    justifyContent: 'center',
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
  tapToOpenMaps: {
    fontSize: 20,
    color: theme.colors.vibeBlue,
    marginLeft: 8,
    marginRight: 5,
    alignSelf: 'center',
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

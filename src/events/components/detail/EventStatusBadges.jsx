import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  getEventStatus,
  getStatusColor,
  isPastEvent,
} from '../../lib/eventUtils';
import { CloseButton } from '../../../components/ui/buttons';
import theme from '../../../theme/themes';

const EventStatusBadges = memo(function EventStatusBadges({
  event,
  isSubscribed,
  onNotificationSettings,
  onReportEvent,
  onBack,
}) {
  if (!event) return null;

  // Memoize expensive calculations to prevent unnecessary recalculations
  const eventStatus = useMemo(() => getEventStatus(event), [event]);
  const statusColor = useMemo(() => getStatusColor(eventStatus), [eventStatus]);
  const isEventPast = useMemo(() => isPastEvent(event), [event]);

  const handleNotificationPress = () => {
    if (onNotificationSettings) {
      onNotificationSettings();
    }
  };

  const handleReportPress = () => {
    if (onReportEvent) {
      onReportEvent();
    }
  };

  return (
    <View style={styles.badgesSection}>
      <View style={styles.badgeRow}>
        {/* Back/Home Button */}
        {onBack && (
          <CloseButton onPress={onBack} style={styles.backButton} />
        )}

        <View style={styles.titleBadges}>
          {/* Event Status Badge */}
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusColor,
                borderColor: statusColor,
              },
            ]}
          >
            <Text style={styles.statusText}>{eventStatus}</Text>
          </View>

          {/* Additional status indicators */}
          {event.isPrivate && (
            <View style={styles.privateBadge}>
              <Text style={styles.privateBadgeText}>🔒 Private</Text>
            </View>
          )}

          {event.hasFee && event.entryFee && (
            <View style={styles.feeBadge}>
              <Text style={styles.feeBadgeText}>💰 ${event.entryFee}</Text>
            </View>
          )}
        </View>

        {/* Report Button - Only show when event has required data */}
        {event.id && event.title && event.createdBy && (
          <TouchableOpacity
            style={styles.reportButton}
            onPress={handleReportPress}
            activeOpacity={0.7}
          >
            <Text style={styles.reportIcon}>⚠️</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

export default EventStatusBadges;

const styles = StyleSheet.create({
  badgesSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '100%',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  titleBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
  },
  statusText: {
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  privateBadge: {
    backgroundColor: theme.colors.vibeBackgroundPurple,
    borderWidth: 2,
    borderColor: theme.colors.vibePurple,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  privateBadgeText: {
    color: theme.colors.vibePurple,
    fontSize: 12,
    fontWeight: '600',
  },
  feeBadge: {
    backgroundColor: theme.colors.vibeBackgroundGreen,
    borderWidth: 2,
    borderColor: theme.colors.vibeGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  feeBadgeText: {
    color: theme.colors.vibeGreen,
    fontSize: 12,
    fontWeight: '600',
  },
  reportButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.sizes.borderRadius,
  },
  reportIcon: {
    fontSize: 18,
  },
});

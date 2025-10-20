import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FormatDate } from '../../lib/formatDate';
import theme from '../../theme/themes';

export default function EventCard({
  title,
  eventTimestamp,
  utcDateTime, // Keep for backward compatibility temporarily
  eventTimeZone, // Keep for backward compatibility temporarily
  location,
  onPress,
  isHostedByUser = false, // New prop to indicate if user is hosting
}) {
  // Choose gradient colors based on hosting status
  const gradientColors = isHostedByUser
    ? [theme.colors.vibeBlue, theme.colors.vibePurple] // Vibe blue to purple gradient for hosted events
    : ['#00f2fe', '#4facfe']; // Cyan/blue gradient for regular events

  // Choose background color that works well with border
  const cardBackgroundColor = isHostedByUser
    ? 'rgba(0, 16, 32, 0.8)' // Background for hosted events (closer to app background)
    : 'rgba(0, 8, 20, 0.8)'; // Standard background for regular events

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.wrapper}
      delayPressIn={150}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
          {(eventTimestamp || utcDateTime) && (
            <Text style={styles.meta}>
              {eventTimestamp
                ? FormatDate(
                    eventTimestamp.toDate
                      ? eventTimestamp.toDate()
                      : eventTimestamp,
                    Intl.DateTimeFormat().resolvedOptions().timeZone
                  )
                : FormatDate(utcDateTime, eventTimeZone)}
            </Text>
          )}
          <Text
            style={[
              styles.title,
              { fontSize: title && title.length > 20 ? 20 : 22 },
            ]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          {location && (
            <Text
              style={styles.location}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {location}
            </Text>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingHorizontal: 4,
  },
  gradient: {
    borderRadius: 24,
    padding: 3,
  },
  card: {
    backgroundColor: 'rgba(0, 8, 20, 0.8)', // Less transparent dark navy
    borderRadius: 20,
    padding: 20,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  meta: {
    color: '#ddd',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '400',
    marginBottom: 8,
  },
  location: {
    color: '#ddd',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 4,
  },
});

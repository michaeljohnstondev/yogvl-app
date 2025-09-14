import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FormatDate } from '../../lib/formatDate';

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
    ? ['#FFD700', '#FF8C00'] // Yellow to orange gradient for hosted events
    : ['#00f2fe', '#4facfe']; // Cyan/blue gradient for regular events

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
        <View style={styles.card}>
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
    borderRadius: 20,
    padding: 2,
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  meta: {
    color: '#ddd',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '400',
    marginBottom: 4,
  },
  location: {
    color: '#ddd',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
});

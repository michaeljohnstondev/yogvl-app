import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FormatDate } from '../events/utils/formatDate';

export default function EventCard({
  title,
  utcDateTime,
  eventTimeZone,
  location,
  onPress,
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.wrapper}
      delayPressIn={150}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#00f2fe', '#4facfe']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.card}>
          {utcDateTime && eventTimeZone && (
            <Text style={styles.meta}>
              {FormatDate(utcDateTime, eventTimeZone)}
            </Text>
          )}
          <Text style={styles.title}>{title}</Text>
          {location && <Text style={styles.location}>{location}</Text>}
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

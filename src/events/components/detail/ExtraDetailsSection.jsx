// ExtraDetailsSection.jsx — renders the optional Details-block fields
// (what's provided, what to bring, parking, dress code, age
// restrictions) on the event detail screen. Each field is rendered as
// its own info card matching the Location / Date / Time visual pattern.
// Fields with no content are hidden entirely so old events without
// these fields render clean, and hosts who didn't fill a specific
// field don't get an empty label.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../../../theme/themes';

const FIELDS = [
  { key: 'whatsProvided', icon: '📦', label: "What's Provided" },
  { key: 'whatToBring', icon: '🎒', label: 'What to Bring' },
  { key: 'parkingInstructions', icon: '🅿️', label: 'Parking' },
  { key: 'dressCode', icon: '👔', label: 'Dress Code' },
  { key: 'ageRestrictions', icon: '🔞', label: 'Age Restrictions' },
];

const hasContent = (v) => typeof v === 'string' && v.trim().length > 0;

const ExtraDetailsSection = ({ event }) => {
  if (!event) return null;

  const rows = FIELDS.filter((f) => hasContent(event[f.key]));
  if (rows.length === 0) return null;

  return (
    <View>
      {rows.map((f) => (
        <View key={f.key} style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>{f.icon}</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{f.label}</Text>
              <Text style={styles.infoValue}>{event[f.key].trim()}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

// Matches the info-card visual pattern used by Location / Date / Time
// in EventInfoSection so cards read as one system, not a bolt-on.
const styles = StyleSheet.create({
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 22,
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: theme.fonts.main,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    color: theme.colors.textPrimary || '#fff',
    fontSize: 15,
    fontFamily: theme.fonts.main,
    lineHeight: 20,
  },
});

export default ExtraDetailsSection;

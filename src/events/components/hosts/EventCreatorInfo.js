// components/events/hosts/EventCreatorInfo.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ProfileAvatar from '../../../components/ui/ProfileAvatar';
import ReliabilityBadge from '../../../components/ui/ReliabilityBadge';

const EventCreatorInfo = ({
  creatorData,
  style,
  showLabel = true,
  showReliability = true,
  compact = false,
  onPress = null, // Make it clickable
}) => {
  if (!creatorData) return null;

  // Enhanced display name logic
  const getDisplayName = () => {
    if (creatorData.displayName) {
      return creatorData.displayName;
    }

    // Try to construct from first/last name
    const contactInfo = creatorData?.userdata?.contactInfo || {};
    const firstName = contactInfo.firstName || '';
    const lastName = contactInfo.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName) {
      return fullName;
    }

    // Fallback to email username
    const email = contactInfo.email || creatorData.email;
    if (email) {
      return email.split('@')[0];
    }

    return 'Unknown Host';
  };

  const displayName = getDisplayName();

  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress ? { onPress, activeOpacity: 0.7 } : {};

  if (compact) {
    return (
      <Container style={[styles.compactContainer, style]} {...containerProps}>
        <ProfileAvatar 
          userData={creatorData} 
          size={32}
          showBorder={true}
        />
        <Text style={styles.compactName} numberOfLines={1}>
          {displayName}
        </Text>
        {showReliability && (
          <ReliabilityBadge userData={creatorData} size="small" showLabel={false} />
        )}
        {onPress && <Text style={styles.clickHint}>ⓘ</Text>}
      </Container>
    );
  }

  return (
    <Container style={[styles.container, style]} {...containerProps}>
      {showLabel && <Text style={styles.label}>Hosted by:</Text>}
      <View style={styles.details}>
        <ProfileAvatar 
          userData={creatorData} 
          size={40}
          showBorder={true}
        />
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{displayName}</Text>
          {onPress && <Text style={styles.clickHint}>ⓘ</Text>}
        </View>
        {showReliability && (
          <ReliabilityBadge userData={creatorData} size="medium" />
        )}
      </View>
    </Container>
  );
};

const EventCreatorBadge = ({ creatorData, style, onPress = null }) => {
  if (!creatorData) return null;

  // Use same display name logic
  const getDisplayName = () => {
    if (creatorData.displayName) return creatorData.displayName;

    const contactInfo = creatorData?.userdata?.contactInfo || {};
    const firstName = contactInfo.firstName || '';
    const lastName = contactInfo.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName) return fullName;
    const email = contactInfo.email || creatorData.email;
    if (email) return email.split('@')[0];
    return 'Host';
  };

  const displayName = getDisplayName();
  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress ? { onPress, activeOpacity: 0.7 } : {};

  return (
    <Container style={[styles.badgeContainer, style]} {...containerProps}>
      <Text style={styles.badgeText}>by {displayName}</Text>
      <ReliabilityBadge userData={creatorData} size="small" showLabel={false} />
      {onPress && <Text style={styles.badgeClickHint}>ⓘ</Text>}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {},
  label: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  name: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  clickHint: {
    color: '#4CAF50',
    fontSize: 14,
    marginLeft: 6,
    opacity: 0.7,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 8,
  },
  compactName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    marginRight: 6,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  badgeText: {
    color: '#888',
    fontSize: 10,
    fontWeight: '500',
  },
  badgeClickHint: {
    color: '#4CAF50',
    fontSize: 10,
    opacity: 0.7,
  },
});

export { EventCreatorInfo, EventCreatorBadge };
export default EventCreatorInfo;

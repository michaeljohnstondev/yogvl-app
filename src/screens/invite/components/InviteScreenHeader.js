import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import CloseButton from '../../../components/ui/CloseButton';
import styles from '../styles/inviteScreenStyles';

const InviteScreenHeader = ({ title, onClose }) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <CloseButton onPress={onClose} />
      </View>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerRight}>
        {/* Empty space to center the title */}
      </View>
    </View>
  );
};

export default InviteScreenHeader;
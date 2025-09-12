import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CloseButton from './CloseButton';
import theme from '../../theme/themes';

const ScreenHeader = ({ 
  title, 
  count, 
  onClose, 
  showBorder = true,
  showCloseButton = true 
}) => {
  const displayTitle = count !== undefined ? `${title} (${count})` : title;

  return (
    <View style={[styles.header, showBorder && styles.headerBorder]}>
      {showCloseButton ? (
        <CloseButton onPress={onClose} style={styles.closeButton} />
      ) : (
        <View style={styles.headerSpacer} />
      )}
      
      <Text style={styles.title}>
        {displayTitle}
      </Text>
      
      <View style={styles.headerSpacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.vibeBlue,
  },
  closeButton: {
    zIndex: 10,
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40, // Same width as close button for balance
  },
});

export default ScreenHeader;
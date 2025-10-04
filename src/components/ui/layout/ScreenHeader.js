import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CloseButton from '../buttons/CloseButton';
import theme from '../../../theme/themes';

const ScreenHeader = ({
  title,
  count,
  onClose,
  showBorder = true,
  showCloseButton = true,
  rightButton = null, // Custom right-side button/component
}) => {
  const displayTitle = count !== undefined ? `${title} (${count})` : title;

  return (
    <View style={[styles.header, showBorder && styles.headerBorder]}>
      {showCloseButton ? (
        <CloseButton onPress={onClose} style={styles.closeButton} />
      ) : (
        <View style={styles.headerSpacer} />
      )}

      <Text style={styles.title}>{displayTitle}</Text>

      {rightButton ? (
        rightButton
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.headerBackground,
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  headerBorder: {
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.vibeBlue,
  },
  closeButton: {
    zIndex: 10,
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40, // Same width as close button for balance
  },
});

export default ScreenHeader;

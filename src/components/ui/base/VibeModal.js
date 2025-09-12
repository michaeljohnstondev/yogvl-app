import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../../theme/themes';

export default function VibeModal({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  scrollable = false,
  contentStyle,
  headerStyle,
}) {
  const ContentWrapper = scrollable ? ScrollView : View;
  const contentWrapperStyle = scrollable ? styles.scrollableContent : styles.content;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={theme.colors.backgroundGradient}
        style={styles.container}
      >
        {/* Header */}
        <View style={[styles.header, headerStyle]}>
          <Text style={styles.title}>{title}</Text>
          {showCloseButton && (
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          )}
        </View>

        {/* Content */}
        <ContentWrapper
          style={[contentWrapperStyle, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ContentWrapper>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  closeButtonText: {
    fontSize: 24,
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  scrollableContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
});
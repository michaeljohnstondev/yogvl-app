import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenHeader from '../layout/ScreenHeader';
import theme from '../../../theme/themes';

export default function VibeModal({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  scrollable = false,
  contentStyle,
}) {
  const ContentWrapper = scrollable ? ScrollView : View;
  const contentWrapperStyle = scrollable
    ? styles.scrollableContent
    : styles.content;

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
        <ScreenHeader
          title={title}
          onClose={onClose}
          showCloseButton={showCloseButton}
          setStatusBar={false}
        />

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

/**
 * VibeAppWrapper - Global app wrapper component
 *
 * ⚠️  IMPORTANT: This component should ONLY be used once at the App.js level!
 * ⚠️  DO NOT wrap individual screens or components with VibeAppWrapper
 * ⚠️  It provides global styling, status bar, and background for the entire app
 *
 * Usage: Already implemented in App.js - do not use elsewhere
 */
import React, { createContext, useState, useContext } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import theme from '../../../theme/themes';

// Context for managing status bar background
const StatusBarContext = createContext();

export const useStatusBar = () => {
  const context = useContext(StatusBarContext);
  if (!context) {
    throw new Error('useStatusBar must be used within VibeAppWrapper');
  }
  return context;
};

export default function VibeAppWrapper({
  children,
  edges = ['top', 'left', 'right'],
}) {
  const [statusBarBg, setStatusBarBg] = useState(theme.colors.headerBackground);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBarContext.Provider value={{ statusBarBg, setStatusBarBg }}>
        <View style={{ flex: 1, backgroundColor: statusBarBg }}>
          <StatusBar style="light" />
          <SafeAreaView style={styles.safeArea} edges={edges}>
            <KeyboardAvoidingView
              style={styles.keyboardView}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={0}
            >
              <LinearGradient
                colors={theme.colors.backgroundGradient}
                style={styles.contentWrapper}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                {children}
              </LinearGradient>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </StatusBarContext.Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentWrapper: {
    flex: 1,
  },
});

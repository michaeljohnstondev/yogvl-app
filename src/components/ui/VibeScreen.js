/**
 * VibeScreen - Global app wrapper component
 * 
 * ⚠️  IMPORTANT: This component should ONLY be used once at the App.js level!
 * ⚠️  DO NOT wrap individual screens or components with VibeScreen
 * ⚠️  It provides global styling, status bar, and background for the entire app
 * 
 * Usage: Already implemented in App.js - do not use elsewhere
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../theme/themes';

export default function VibeScreen({ children, edges = ['top', 'left', 'right'] }) {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={edges}>
      <LinearGradient
        colors={theme.colors.backgroundGradient}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <StatusBar style="light" />
      {children}
    </SafeAreaView>
  );
}


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


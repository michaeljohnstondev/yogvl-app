import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import theme from '../../themes/themes';

const VibeSegmentedControl = ({ options, selectedValue, onSelect, style }) => {
  return (
    <View style={[styles.container, style]}>
      {options.map((option, index) => (
        <Pressable
          key={option.value}
          style={({ pressed }) => [
            styles.segment,
            index === 0 && styles.firstSegment,
            index === options.length - 1 && styles.lastSegment,
            selectedValue === option.value && styles.selectedSegment,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => onSelect(option.value)}
        >
          <Text
            style={[
              styles.segmentText,
              selectedValue === option.value && styles.selectedSegmentText,
            ]}
          >
            {option.icon && `${option.icon} `}
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.inputBorder,
    borderRadius: theme.sizes.borderRadius,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstSegment: {
    borderTopLeftRadius: theme.sizes.borderRadius - 2,
    borderBottomLeftRadius: theme.sizes.borderRadius - 2,
  },
  lastSegment: {
    borderTopRightRadius: theme.sizes.borderRadius - 2,
    borderBottomRightRadius: theme.sizes.borderRadius - 2,
  },
  selectedSegment: {
    backgroundColor: theme.colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
  },
  selectedSegmentText: {
    color: theme.colors.textPrimary,
  },
});

export default VibeSegmentedControl;

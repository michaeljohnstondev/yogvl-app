import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { StyleSheet } from 'react-native';

const VibeStatsGrid = ({ stats, onStatPress, enableTouch = false }) => {
  return (
    <View style={styles.quickStats}>
      {stats.map((stat, index) => {
        const StatComponent =
          stat.onPress && enableTouch ? TouchableOpacity : View;

        return (
          <StatComponent
            key={index}
            style={styles.statItem}
            onPress={stat.onPress}
          >
            <Text style={styles.statNumber}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </StatComponent>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00C6FF',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
});

export default VibeStatsGrid;
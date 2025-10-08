import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventCard from '../events/components/EventCard';
import ScreenHeader from '../components/ui/layout/ScreenHeader';
import theme from '../theme/themes';

export default function EventListScreen({ navigation, route }) {
  const { title, events } = route.params;

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <ScreenHeader title={title} onClose={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {events.map((event, index) => (
          <View key={event.id || index} style={styles.eventItem}>
            <EventCard
              {...event}
              onPress={() => {
                navigation.navigate('EventDetail', {
                  eventId: event.id,
                });
              }}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  eventItem: {
    marginBottom: 16,
  },
});

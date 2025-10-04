import React, { useState, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { PanGestureHandler } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

export default function VibeCarousel({ data, renderItem, scrollViewRef, height = 180 }) {
  const [isScrolling, setIsScrolling] = useState(false);
  const carouselRef = useRef(null);

  return (
    <View style={styles.container}>
      <Carousel
        width={width * 0.95}
        height={height}
        autoPlay={false}
        data={data}
        scrollAnimationDuration={600}
        loop={false}
        renderItem={({ item }) => renderItem(item, isScrolling)}
        sliderWidth={Dimensions.get('window').width}
        itemWidth={Dimensions.get('window').width * 0.9}
        contentContainerCustomStyle={{ paddingBottom: 30 }}
        // Configure gesture handler to allow parent ScrollView vertical scrolling
        panGestureHandlerProps={{
          activeOffsetX: [-10, 10], // Only capture horizontal gestures
          failOffsetY: [-5, 5], // Fail on vertical movement to allow ScrollView
          shouldCancelWhenOutside: true,
        }}
        // Enable simultaneous gesture recognition with parent ScrollView
        simultaneousHandlers={scrollViewRef}
        onScrollBegin={() => setIsScrolling(true)}
        onScrollEnd={() => {
          // Small delay to ensure scroll has fully ended
          setTimeout(() => setIsScrolling(false), 100);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
    alignItems: 'center',
    overflow: 'visible',
  },
});

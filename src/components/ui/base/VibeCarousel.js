import React, { useState, useRef } from 'react';
import { Dimensions, StyleSheet, View, ScrollView } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { PanGestureHandler } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

// Simple horizontal scroll alternative - much more scroll-friendly
function SimpleHorizontalScroll({ data, renderItem, height }) {
  const cardWidth = width * 0.92;
  const cardSpacing = width * 0.04;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate={0.85} // Smooth, controlled deceleration
      disableIntervalMomentum={true} // Prevent multi-card jumps
      snapToInterval={cardWidth + cardSpacing} // Snap to each card + spacing
      snapToAlignment="start"
      style={{ width }}
      contentContainerStyle={{
        paddingHorizontal: cardSpacing, // 5% padding on each side
        paddingVertical: 10, // Vertical padding for consistent spacing
      }}
    >
      {data.map((item, index) => (
        <View
          key={index}
          style={{
            width: cardWidth,
            marginRight: index < data.length - 1 ? cardSpacing : 0, // 5% spacing between cards
          }}
        >
          {renderItem(item, false)}
        </View>
      ))}
    </ScrollView>
  );
}

export default function VibeCarousel({ data, renderItem, scrollViewRef, height = 180, useSimpleScroll = true }) {
  const [isScrolling, setIsScrolling] = useState(false);
  const carouselRef = useRef(null);

  // For single items, just render the item directly without carousel wrapper
  // This completely avoids any gesture conflicts
  if (!data || data.length === 1) {
    return (
      <View style={[styles.container, { height }]}>
        {data && data.length === 1 && renderItem(data[0], false)}
      </View>
    );
  }

  // Use simple ScrollView for better vertical scroll compatibility
  if (useSimpleScroll) {
    return (
      <View style={styles.container}>
        <SimpleHorizontalScroll data={data} renderItem={renderItem} height={height} />
      </View>
    );
  }

  // Fallback to reanimated carousel (kept for backward compatibility)
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
        // Configure gesture handler to STRONGLY favor vertical scrolling
        panGestureHandlerProps={{
          activeOffsetX: [-50, 50], // Require VERY significant horizontal movement
          failOffsetY: [-20, 20], // Allow lots of vertical tolerance
          activeOffsetY: undefined, // Don't restrict vertical movement at all
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
    marginBottom: 10, // Consistent spacing between carousel sections
    alignItems: 'center',
    overflow: 'visible',
  },
});

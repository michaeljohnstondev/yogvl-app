import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';

/**
 * Slides a bottom bar out of the way while the user scrolls down and brings
 * it back when they scroll up or reach the top — the content gets the full
 * screen while browsing, the action is one flick away.
 *
 * Returns `onScroll` for the ScrollView and `style` for the bar.
 * `distance` should be at least the bar's height so it fully clears.
 */
const TOP_ZONE = 24; // always show near the top
const JITTER = 6; // ignore tiny finger wobbles

export function useHideOnScroll(distance = 220) {
  const translateY = useRef(new Animated.Value(0)).current;
  const lastY = useRef(0);
  const hidden = useRef(false);

  const animateTo = useCallback(
    (hide) => {
      if (hidden.current === hide) return;
      hidden.current = hide;
      Animated.timing(translateY, {
        toValue: hide ? distance : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    },
    [translateY, distance]
  );

  const onScroll = useCallback(
    (e) => {
      const y = e.nativeEvent.contentOffset.y;
      const dy = y - lastY.current;
      lastY.current = y;
      if (y <= TOP_ZONE) animateTo(false);
      else if (dy > JITTER) animateTo(true);
      else if (dy < -JITTER) animateTo(false);
    },
    [animateTo]
  );

  return { onScroll, style: { transform: [{ translateY }] } };
}

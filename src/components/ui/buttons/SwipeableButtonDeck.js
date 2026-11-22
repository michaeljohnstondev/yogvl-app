/**
 * SwipeableButtonDeck — one button slot that swipes horizontally between
 * several full-width buttons, with page dots underneath.
 *
 * Used on Home so admins can swipe the sticky CREATE AN EVENT button over to
 * ADMIN TOOLS without giving up extra screen space. With a single button it
 * renders that button plainly (no swipe, no dots).
 *
 * buttons: [{ key, label, onPress, variant }]
 */
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import VibeButton from '../base/VibeButton';
import { useTheme } from '../../../theme/ThemeContext';

export default function SwipeableButtonDeck({ buttons, style }) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);

  if (buttons.length === 1) {
    const [b] = buttons;
    return <VibeButton label={b.label} onPress={b.onPress} variant={b.variant} style={style} />;
  }

  const handleScrollEnd = (e) => {
    if (!width) return;
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={style} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
        >
          {buttons.map((b) => (
            <View key={b.key} style={{ width }}>
              <VibeButton label={b.label} onPress={b.onPress} variant={b.variant} />
            </View>
          ))}
        </ScrollView>
      )}
      <View style={styles.dots}>
        {buttons.map((b, i) => (
          <View
            key={b.key}
            style={[
              styles.dot,
              { backgroundColor: i === page ? theme.semantic.accent : theme.semantic.textMuted },
              i === page && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.5,
  },
  dotActive: {
    width: 16,
    opacity: 1,
  },
});

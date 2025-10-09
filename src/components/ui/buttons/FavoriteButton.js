import React from 'react';
import { Pressable, Text, View, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../../theme/themes';
import { StyleSheet } from 'react-native';

const FavoriteButton = ({
  isFavorite,
  isLoading,
  onAdd,
  onRemove,
  style,
}) => {
  const handlePress = () => {
    if (isLoading) return;
    if (isFavorite) {
      onRemove?.();
    } else {
      onAdd?.();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isLoading}
      style={({ pressed }) => [
        { opacity: pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <View style={[
        styles.outerBorder,
        isFavorite && styles.outerBorderFavorited
      ]}>
        <View style={[
          styles.innerBorder,
          isFavorite && styles.innerBorderFavorited
        ]}>
          <View style={styles.buttonContent}>
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Text style={styles.buttonText}>
                {isFavorite ? '⭐ FAVORITED' : '☆ ADD TO FAVORITES'}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  outerBorder: {
    borderBottomWidth: 4,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: theme.colors.vibeBlue,
    borderRadius: theme.sizes.borderRadius,
    marginVertical: 4,
  },
  outerBorderFavorited: {
    borderColor: theme.colors.vibeYellow,
  },
  innerBorder: {
    backgroundColor: '#0072A3', // Dark blue from gradient right side
    borderRadius: theme.sizes.borderRadius - 4,
    padding: 2,
  },
  innerBorderFavorited: {
    backgroundColor: '#FF8C00', // Dark orange from gradient right side
  },
  buttonContent: {
    backgroundColor: 'transparent',
    borderRadius: theme.sizes.borderRadius - 4,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: theme.fonts.main,
    textAlign: 'center',
  },
});

export default FavoriteButton;

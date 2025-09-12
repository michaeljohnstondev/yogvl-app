import React from 'react';
import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native';
import theme from '../../theme/themes';

const ProfileSectionCard = ({ 
  title, 
  children, 
  style, 
  containerStyle,
  titleStyle 
}) => {
  return (
    <View style={[styles.section, style]}>
      <View style={[styles.container, containerStyle]}>
        {title && (
          <Text style={[styles.title, titleStyle]}>{title}</Text>
        )}
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
    marginHorizontal: 20,
  },
  container: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default ProfileSectionCard;
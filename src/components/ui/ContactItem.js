import React from 'react';
import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native';
import theme from '../../theme/themes';

const ContactItem = ({ 
  icon, 
  children, 
  text,
  textStyle,
  style,
  isLast = false 
}) => {
  return (
    <View style={[styles.contactItem, isLast && { marginBottom: 0 }, style]}>
      <Text style={styles.contactIcon}>{icon}</Text>
      {children || <Text style={[styles.contactText, textStyle]}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 198, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 198, 255, 0.2)',
  },
  contactIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
});

export default ContactItem;
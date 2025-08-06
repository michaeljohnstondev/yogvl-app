import { Platform, Alert } from 'react-native';

export default function VibeAlert(title, message) {
  console.log(`${title}: ${message}`);
  
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

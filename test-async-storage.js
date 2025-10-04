import AsyncStorage from '@react-native-async-storage/async-storage';

async function testStorage() {
  console.log('Testing AsyncStorage...');
  
  // Write
  await AsyncStorage.setItem('test_key', JSON.stringify({
    message: 'Hello World',
    timestamp: Date.now()
  }));
  console.log('✅ Written to AsyncStorage');
  
  // Read
  const value = await AsyncStorage.getItem('test_key');
  console.log('✅ Read from AsyncStorage:', value);
  
  // Clean up
  await AsyncStorage.removeItem('test_key');
  console.log('✅ Cleaned up');
}

testStorage().catch(console.error);

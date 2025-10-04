// Test script to debug interest removal
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDLC_TEnKlBs07j2aY8jO0jo6ou68KJGb0",
  authDomain: "big-vibe-studios.firebaseapp.com",
  projectId: "big-vibe-studios",
  storageBucket: "big-vibe-studios.firebasestorage.app",
  messagingSenderId: "410125148132",
  appId: "1:410125148132:web:e787c5d9dd0cb6e778a5c7",
  measurementId: "G-MJDX1QTYKE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testRemoveInterest() {
  const userId = 'kTOzcRs6BuQfL1F7n1jTLaDt3DA3'; // Replace with your test user ID
  
  console.log('\n🔍 Checking current state...\n');
  
  // Check user's interests
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const userData = userSnap.data();
    const interests = userData?.preferences?.interests || [];
    console.log('User interests:', interests);
    console.log('Interest count:', interests.length);
  }
  
  // Check studio ID
  const studioId = userSnap.data()?.userdata?.studios?.default?.studioId;
  console.log('\nStudio ID:', studioId);
  
  // Check interest index for a sample interest
  if (interests.length > 0 && studioId) {
    const sampleInterest = interests[0].toLowerCase();
    console.log('\nChecking interest index for:', sampleInterest);
    
    const interestRef = doc(db, 'studios', studioId, 'interests', sampleInterest);
    const interestSnap = await getDoc(interestRef);
    
    if (interestSnap.exists()) {
      console.log('Interest index data:', interestSnap.data());
    } else {
      console.log('❌ Interest index document does not exist');
    }
  }
}

testRemoveInterest().catch(console.error);

// FILE: scripts/seedVenues.js
// One-time script to populate the venue database
// Run this manually in development to seed the venues

import { VenueService } from '../services/VenueService';

export const seedVenues = async () => {
  try {
    console.log('Starting venue seeding process...');
    await VenueService.seedGreenvilleVenues();
    console.log('✅ Venue seeding completed successfully!');

    // You can run this from the React Native debugger console:
    // seedVenues();

    return { success: true, message: 'Venues seeded successfully' };
  } catch (error) {
    console.error('❌ Error seeding venues:', error);
    return { success: false, error: error.message };
  }
};

// For debugging - expose globally
if (__DEV__) {
  global.seedVenues = seedVenues;
  global.VenueService = VenueService;
}

import { setDoc, doc } from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { StudioService } from '../services/StudioService';

export const migrateStudiosToFirebase = async () => {
  try {
    console.log('Starting studio migration to Firebase...');
    
    // Get hardcoded studios
    const hardcodedStudios = StudioService.getHardcodedStudios();
    console.log(`Found ${hardcodedStudios.length} hardcoded studios to migrate`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const studio of hardcodedStudios) {
      try {
        // Transform hardcoded studio data to Firebase format
        const studioData = {
          id: studio.id,
          name: studio.name,
          city: studio.city,
          state: studio.state,
          country: studio.country || 'USA',
          region: studio.region,
          status: studio.isActive === false ? 'inactive' : 'active',
          isActive: studio.isActive !== false,
          coordinates: studio.coordinates || null,
          coversTowns: studio.coversTowns || [],
          description: studio.description || null,
          createdAt: new Date(),
          createdBy: 'migration_script',
          // Legacy fields for compatibility
          originalStatus: studio.status,
          migratedFrom: 'hardcoded_data',
        };

        // Write to Firebase
        await setDoc(doc(db, 'studios', studio.id), studioData);
        
        console.log(`✅ Migrated: ${studio.name} (${studio.city}, ${studio.state})`);
        migratedCount++;
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${studio.name}:`, error);
        errors.push({
          studio: studio.name,
          error: error.message
        });
        skippedCount++;
      }
    }

    const summary = {
      total: hardcodedStudios.length,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errors
    };

    console.log('\n📊 Migration Summary:');
    console.log(`Total studios: ${summary.total}`);
    console.log(`Successfully migrated: ${summary.migrated}`);
    console.log(`Skipped/Failed: ${summary.skipped}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(({ studio, error }) => {
        console.log(`  - ${studio}: ${error}`);
      });
    }

    console.log('\n✅ Studio migration completed!');
    return summary;
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// For debugging - expose globally
if (__DEV__) {
  global.migrateStudios = migrateStudiosToFirebase;
}
#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Use Firebase CLI credentials
const firebaseCredsPath = path.join(os.homedir(), '.config', 'firebase', 'deniz_suelio_com_application_default_credentials.json');

// Set up credentials
process.env.GOOGLE_APPLICATION_CREDENTIALS = firebaseCredsPath;

// Initialize with application default credentials
admin.initializeApp({
  projectId: 'suelio-ar'
});

const db = admin.firestore();
const USER_ID = process.argv[2] || 'qaCPu4bNgYOFsjQaSRjjMb4fJRf2';
const DAYS_BACK = 30;

// Calculate date 30 days ago
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - DAYS_BACK);

console.log(`Starting export for user: ${USER_ID}`);
console.log(`Filtering data from: ${thirtyDaysAgo.toISOString()}`);
console.log('---');

/**
 * Converts Firestore Timestamp to ISO string
 */
function convertTimestamp(value) {
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return value;
}

/**
 * Converts Firestore GeoPoint to simple object
 */
function convertGeoPoint(value) {
  if (value && typeof value.latitude === 'number' && typeof value.longitude === 'number') {
    return {
      latitude: value.latitude,
      longitude: value.longitude
    };
  }
  return value;
}

/**
 * Recursively transforms Firestore document data
 */
function transformDocument(data) {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(transformDocument);
  }

  if (typeof data === 'object') {
    // Check for Timestamp
    if (typeof data.toDate === 'function') {
      return convertTimestamp(data);
    }

    // Check for GeoPoint
    if (typeof data.latitude === 'number' && typeof data.longitude === 'number' && Object.keys(data).length === 2) {
      return convertGeoPoint(data);
    }

    // Recursively transform nested objects
    const transformed = {};
    for (const [key, value] of Object.entries(data)) {
      transformed[key] = transformDocument(value);
    }
    return transformed;
  }

  return data;
}

/**
 * Exports a collection to JSON file
 */
async function exportCollection(collectionName, outputFileName, timestampField = 'timestamp') {
  console.log(`Exporting ${collectionName}...`);

  try {
    // Simple query by userId only (avoid compound index requirement)
    const snapshot = await db
      .collection(collectionName)
      .where('userId', '==', USER_ID)
      .get();

    const documents = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const transformed = transformDocument(data);

      // Client-side date filtering
      const docTime = transformed[timestampField] || transformed.serverTimestamp || transformed.createdAt || transformed.arrivalDate;
      if (docTime) {
        const docDate = new Date(docTime);
        if (docDate >= thirtyDaysAgo) {
          documents.push({
            id: doc.id,
            ...transformed
          });
        }
      } else {
        // Include docs without timestamps
        documents.push({
          id: doc.id,
          ...transformed
        });
      }
    });

    // Sort by timestamp descending
    documents.sort((a, b) => {
      const timeA = a[timestampField] || a.serverTimestamp || a.createdAt || a.arrivalDate;
      const timeB = b[timestampField] || b.serverTimestamp || b.createdAt || b.arrivalDate;

      if (!timeA || !timeB) return 0;
      return new Date(timeB) - new Date(timeA);
    });

    // Ensure data directory exists
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write to file
    const outputPath = path.join(dataDir, outputFileName);
    fs.writeFileSync(outputPath, JSON.stringify(documents, null, 2));

    console.log(`✓ ${collectionName}: ${documents.length} records exported to ${outputFileName}`);
    return documents.length;
  } catch (error) {
    console.error(`✗ Error exporting ${collectionName}:`, error.message);
    throw error;
  }
}

/**
 * Main export function
 */
async function exportAllData() {
  try {
    const startTime = Date.now();

    // Export each collection
    const locationsCount = await exportCollection('user_locations', 'locations.json', 'serverTimestamp');
    const motionCount = await exportCollection('user_motion_activities', 'motion.json', 'timestamp');
    const visitsCount = await exportCollection('user_visits', 'visits.json', 'arrivalDate');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('---');
    console.log('Export Summary:');
    console.log(`  Locations: ${locationsCount} records`);
    console.log(`  Motion Activities: ${motionCount} records`);
    console.log(`  Visits: ${visitsCount} records`);
    console.log(`  Total: ${locationsCount + motionCount + visitsCount} records`);
    console.log(`  Duration: ${duration}s`);
    console.log('---');
    console.log('Export completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  }
}

// Run the export
exportAllData();

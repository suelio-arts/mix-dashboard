/**
 * Firestore Data Browser - Shared Utilities
 *
 * Generic Firestore fetching and data conversion utilities.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
  connectFirestoreEmulator
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';

// Firebase configuration (matches existing pattern)
const firebaseConfig = {
  apiKey: "AIzaSyDdX8nqLN8H9gKxPqBx8JZQz8fM0x_0Zxo",
  authDomain: "suelio-ar.firebaseapp.com",
  projectId: "suelio-ar",
  storageBucket: "suelio-ar.firebasestorage.app",
  messagingSenderId: "807518951165",
  appId: "1:807518951165:web:8f4f4f4f4f4f4f4f4f4f4f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const functions = getFunctions(app);

// Connect to emulators if running locally
// Disabled - use production Firebase instead
// if (window.location.hostname === 'localhost') {
//   try {
//     connectFirestoreEmulator(db, 'localhost', 8080);
//     connectFunctionsEmulator(functions, 'localhost', 5001);
//     console.log('Connected to Firebase emulators');
//   } catch (e) {
//     // Already connected or emulators not running
//     console.log('Emulator connection:', e.message);
//   }
// }

// Export Firebase instances for external use
export { db, functions, httpsCallable };

/**
 * Convert Firestore field types to JavaScript primitives
 * @param {any} value - Firestore field value
 * @returns {any} Converted value
 */
function convertValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  // Firestore Timestamp
  if (value && typeof value.toDate === 'function') {
    return value.toDate();
  }

  // Firestore GeoPoint
  if (value && typeof value.latitude === 'number' && typeof value.longitude === 'number') {
    return { lat: value.latitude, lng: value.longitude };
  }

  // DocumentReference - extract path info
  if (value && value.path && typeof value.id === 'string') {
    return {
      _ref: true,
      path: value.path,
      id: value.id,
      collection: value.parent?.id || value.path.split('/')[0]
    };
  }

  // Array
  if (Array.isArray(value)) {
    return value.map(convertValue);
  }

  // Object (nested)
  if (typeof value === 'object') {
    const converted = {};
    for (const key in value) {
      converted[key] = convertValue(value[key]);
    }
    return converted;
  }

  return value;
}

/**
 * Convert entire Firestore document data
 * @param {Object} data - Raw Firestore document data
 * @returns {Object} Converted data
 */
function convertDocumentData(data) {
  const converted = {};
  for (const key in data) {
    converted[key] = convertValue(data[key]);
  }
  return converted;
}

/**
 * Fetch documents from a Firestore collection
 * @param {string} collectionName - Name of the collection
 * @param {Object} options - Query options
 * @param {string} [options.orderByField] - Field to order by
 * @param {string} [options.orderDirection='desc'] - Order direction ('asc' or 'desc')
 * @param {number} [options.maxResults=100] - Maximum number of results
 * @returns {Promise<Array>} Array of documents with id and converted data
 */
export async function fetchCollection(collectionName, options = {}) {
  const {
    orderByField,
    orderDirection = 'desc',
    maxResults = 100
  } = options;

  try {
    const collectionRef = collection(db, collectionName);

    let q;
    if (orderByField) {
      q = query(
        collectionRef,
        orderBy(orderByField, orderDirection),
        limit(maxResults)
      );
    } else {
      q = query(collectionRef, limit(maxResults));
    }

    const querySnapshot = await getDocs(q);
    const documents = [];

    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      documents.push({
        id: docSnapshot.id,
        ...convertDocumentData(data)
      });
    });

    return documents;
  } catch (error) {
    console.error(`Error fetching collection ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Resolve a DocumentReference to its data
 * @param {Object} ref - Reference object with path property
 * @returns {Promise<Object|null>} Document data or null if not found
 */
export async function resolveReference(ref) {
  if (!ref || !ref._ref || !ref.path) {
    return null;
  }

  try {
    const docRef = doc(db, ref.path);
    const docSnapshot = await getDoc(docRef);

    if (!docSnapshot.exists()) {
      return null;
    }

    return {
      id: docSnapshot.id,
      ...convertDocumentData(docSnapshot.data())
    };
  } catch (error) {
    console.error(`Error resolving reference ${ref.path}:`, error);
    return null;
  }
}

/**
 * Resolve multiple references in parallel
 * @param {Array} refs - Array of reference objects
 * @returns {Promise<Array>} Array of resolved documents (nulls filtered out)
 */
export async function resolveReferences(refs) {
  if (!Array.isArray(refs)) {
    return [];
  }

  const resolved = await Promise.all(refs.map(resolveReference));
  return resolved.filter(doc => doc !== null);
}

/**
 * Format a Date object to a readable string
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date)) {
    return '—';
  }
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format a GeoPoint object to a readable string
 * @param {Object} geoPoint - Object with lat and lng properties
 * @returns {string} Formatted coordinate string
 */
export function formatGeoPoint(geoPoint) {
  if (!geoPoint || typeof geoPoint.lat !== 'number') {
    return '—';
  }
  return `${geoPoint.lat.toFixed(6)}, ${geoPoint.lng.toFixed(6)}`;
}

/**
 * Truncate text to a maximum length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text with ellipsis if needed
 */
export function truncateText(text, maxLength = 100) {
  if (!text || typeof text !== 'string') {
    return '—';
  }
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
  if (text === null || text === undefined) {
    return '';
  }
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/**
 * Fetch a single document by collection and ID
 * @param {string} collectionName - Name of the collection
 * @param {string} docId - Document ID
 * @returns {Promise<Object|null>} Document data with id, or null if not found
 */
export async function fetchDocument(collectionName, docId) {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnapshot = await getDoc(docRef);

    if (!docSnapshot.exists()) {
      return null;
    }

    return {
      id: docSnapshot.id,
      ...convertDocumentData(docSnapshot.data())
    };
  } catch (error) {
    console.error(`Error fetching document ${collectionName}/${docId}:`, error);
    throw error;
  }
}

/**
 * Fetch documents from a subcollection
 * @param {string} parentCollection - Parent collection name
 * @param {string} parentDocId - Parent document ID
 * @param {string} subcollectionName - Subcollection name
 * @param {Object} options - Query options (same as fetchCollection)
 * @returns {Promise<Array>} Array of documents with id and converted data
 */
export async function fetchSubcollection(parentCollection, parentDocId, subcollectionName, options = {}) {
  const {
    orderByField,
    orderDirection = 'desc',
    maxResults = 100
  } = options;

  try {
    const subcollectionRef = collection(db, parentCollection, parentDocId, subcollectionName);

    let q;
    if (orderByField) {
      q = query(
        subcollectionRef,
        orderBy(orderByField, orderDirection),
        limit(maxResults)
      );
    } else {
      q = query(subcollectionRef, limit(maxResults));
    }

    const querySnapshot = await getDocs(q);
    const documents = [];

    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      documents.push({
        id: docSnapshot.id,
        ...convertDocumentData(data)
      });
    });

    return documents;
  } catch (error) {
    console.error(`Error fetching subcollection ${parentCollection}/${parentDocId}/${subcollectionName}:`, error);
    throw error;
  }
}

/**
 * Auto-detect columns from an array of documents
 * @param {Array} docs - Array of document objects
 * @param {number} maxColumns - Maximum number of columns to return
 * @returns {Array<{key: string, label: string, type: string}>} Column definitions
 */
export function autoDetectColumns(docs, maxColumns = 8) {
  if (!docs || docs.length === 0) {
    return [];
  }

  // Count field occurrences and determine types
  const fieldStats = {};

  for (const doc of docs) {
    for (const [key, value] of Object.entries(doc)) {
      if (!fieldStats[key]) {
        fieldStats[key] = { count: 0, types: new Set() };
      }
      fieldStats[key].count++;

      // Determine type
      if (value === null || value === undefined) {
        fieldStats[key].types.add('null');
      } else if (value instanceof Date) {
        fieldStats[key].types.add('date');
      } else if (value && value._ref) {
        fieldStats[key].types.add('reference');
      } else if (value && typeof value.lat === 'number' && typeof value.lng === 'number') {
        fieldStats[key].types.add('geopoint');
      } else if (Array.isArray(value)) {
        fieldStats[key].types.add('array');
      } else if (typeof value === 'object') {
        fieldStats[key].types.add('object');
      } else if (typeof value === 'boolean') {
        fieldStats[key].types.add('boolean');
      } else if (typeof value === 'number') {
        fieldStats[key].types.add('number');
      } else {
        fieldStats[key].types.add('string');
      }
    }
  }

  // Priority fields that should appear first
  const priorityFields = ['id', 'name', 'title', 'displayName', 'createdAt', 'updatedAt'];

  // Sort fields: priority first, then by occurrence count
  const sortedFields = Object.entries(fieldStats)
    .sort(([keyA, statsA], [keyB, statsB]) => {
      const priorityA = priorityFields.indexOf(keyA);
      const priorityB = priorityFields.indexOf(keyB);

      // If both have priority, sort by priority order
      if (priorityA !== -1 && priorityB !== -1) {
        return priorityA - priorityB;
      }
      // Priority fields first
      if (priorityA !== -1) return -1;
      if (priorityB !== -1) return 1;

      // Then by count (descending)
      return statsB.count - statsA.count;
    })
    .slice(0, maxColumns);

  // Convert to column definitions
  return sortedFields.map(([key, stats]) => {
    const types = Array.from(stats.types);
    const primaryType = types.find(t => t !== 'null') || 'string';

    return {
      key,
      label: formatFieldLabel(key),
      type: primaryType
    };
  });
}

/**
 * Format a field key as a human-readable label
 * @param {string} key - Field key (e.g., 'createdAt', 'user_name')
 * @returns {string} Formatted label (e.g., 'Created At', 'User Name')
 */
export function formatFieldLabel(key) {
  return key
    // Insert space before capitals in camelCase
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Replace underscores with spaces
    .replace(/_/g, ' ')
    // Capitalize first letter of each word
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Format a value for display in the table
 * @param {any} value - The value to format
 * @param {string} type - The detected type
 * @returns {string} HTML string for display
 */
export function formatValueForDisplay(value, type) {
  if (value === null || value === undefined) {
    return '<span class="text-muted">—</span>';
  }

  switch (type) {
    case 'date':
      return formatDate(value);

    case 'geopoint':
      return formatGeoPoint(value);

    case 'reference':
      return `<span class="reference" title="${escapeHtml(value.path)}">${escapeHtml(value.id)}</span>`;

    case 'boolean':
      return value
        ? '<span class="badge badge-success">Yes</span>'
        : '<span class="badge badge-default">No</span>';

    case 'array':
      return `<span class="badge badge-count">${value.length} items</span>`;

    case 'object':
      const keys = Object.keys(value);
      return `<span class="badge badge-count">${keys.length} fields</span>`;

    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value);

    default:
      return escapeHtml(truncateText(String(value), 60));
  }
}

// Export convertDocumentData for external use
export { convertDocumentData, convertValue };

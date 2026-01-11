/**
 * Narrative History Visualization
 *
 * Displays user listening history for narratives.
 * Note: Currently requires manual Firebase configuration.
 * Future: Will integrate with admin-dashboard-foundation for proper auth.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration (matches export-firebase-data.js pattern)
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

/**
 * Fetch narrative history for a specific user
 * @param {string} userId - Firebase user ID
 * @param {number} maxResults - Maximum number of results to fetch
 * @returns {Promise<Array>} Array of narrative history documents
 */
export async function fetchUserNarrativeHistory(userId, maxResults = 50) {
  try {
    const historyRef = collection(db, 'narrative_history');
    const q = query(
      historyRef,
      where('userId', '==', userId),
      orderBy('listenedAt', 'desc'),
      limit(maxResults)
    );

    const querySnapshot = await getDocs(q);
    const history = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        id: doc.id,
        ...data,
        listenedAt: data.listenedAt?.toDate() || new Date()
      });
    });

    return history;
  } catch (error) {
    console.error('Error fetching narrative history:', error);
    throw error;
  }
}

/**
 * Fetch all narrative history across all users
 * @param {number} maxResults - Maximum number of results to fetch
 * @returns {Promise<Array>} Array of narrative history documents
 */
export async function fetchAllNarrativeHistory(maxResults = 100) {
  try {
    const historyRef = collection(db, 'narrative_history');
    const q = query(
      historyRef,
      orderBy('listenedAt', 'desc'),
      limit(maxResults)
    );

    const querySnapshot = await getDocs(q);
    const history = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        id: doc.id,
        ...data,
        listenedAt: data.listenedAt?.toDate() || new Date()
      });
    });

    return history;
  } catch (error) {
    console.error('Error fetching all narrative history:', error);
    throw error;
  }
}

/**
 * Calculate listening statistics
 * @param {Array} history - Array of narrative history documents
 * @returns {Object} Statistics object
 */
export function calculateStats(history) {
  if (!history || history.length === 0) {
    return {
      totalNarratives: 0,
      uniquePlaces: 0,
      totalDuration: 0,
      averageDuration: 0,
      themes: []
    };
  }

  const uniquePlaces = new Set(history.map(h => h.placeId)).size;
  const totalDuration = history.reduce((sum, h) => sum + (h.durationSeconds || 0), 0);
  const allThemes = history.flatMap(h => h.themes || []);
  const themeCounts = {};

  allThemes.forEach(theme => {
    themeCounts[theme] = (themeCounts[theme] || 0) + 1;
  });

  const topThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([theme, count]) => ({ theme, count }));

  return {
    totalNarratives: history.length,
    uniquePlaces,
    totalDuration,
    averageDuration: totalDuration / history.length,
    themes: topThemes
  };
}

/**
 * Format duration in seconds to human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(seconds) {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format timestamp to readable date
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!(date instanceof Date)) {
    return 'Invalid date';
  }
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

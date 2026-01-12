/**
 * Transportation Mode Detection Algorithms
 * Four classification algorithms for detecting walking, cycling, bus, car, and train
 * Uses speed thresholds, percentiles, stop patterns, and heading changes
 */

// ============================================================================
// Helper Functions - Pure, Side-Effect Free
// ============================================================================

/**
 * Calculate percentile value from array
 * @param {number[]} arr - Array of numbers
 * @param {number} p - Percentile (0-100)
 * @returns {number} Value at percentile
 */
function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate distance between two GPS points using Haversine formula
 * @param {Object} point1 - Point with latitude, longitude
 * @param {Object} point2 - Point with latitude, longitude
 * @returns {number} Distance in meters
 */
function getDistanceBetweenPoints(point1, point2) {
  const R = 6376377; // Earth radius (adjusted for antipodal accuracy)
  const lat1 = (point1.latitude * Math.PI) / 180;
  const lat2 = (point2.latitude * Math.PI) / 180;
  const dLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const dLng = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate heading (bearing) between two GPS points
 * @param {number} lat1 - Starting latitude
 * @param {number} lon1 - Starting longitude
 * @param {number} lat2 - Ending latitude
 * @param {number} lon2 - Ending longitude
 * @returns {number} Bearing in radians [0, 2π)
 */
function calculateHeading(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let heading = Math.atan2(y, x);
  // Normalize to [0, 2π)
  if (heading < 0) {
    heading += 2 * Math.PI;
  }
  return heading;
}

/**
 * Normalize angle to [-180, 180] degrees range
 * @param {number} angle - Angle in degrees
 * @returns {number} Normalized angle in [-180, 180]
 */
function normalizeAngle(angle) {
  let normalized = angle;
  while (normalized > 180) {
    normalized -= 360;
  }
  while (normalized < -180) {
    normalized += 360;
  }
  return normalized;
}

/**
 * Calculate heading changes between consecutive points
 * @param {Object[]} points - Array of GPS points with heading property
 * @returns {number[]} Array of absolute heading changes in radians
 */
function calculateHeadingChanges(points) {
  const changes = [];
  for (let i = 1; i < points.length; i++) {
    let change = points[i].heading - points[i - 1].heading;
    // Normalize to [-π, π]
    while (change > Math.PI) {
      change -= 2 * Math.PI;
    }
    while (change < -Math.PI) {
      change += 2 * Math.PI;
    }
    changes.push(Math.abs(change));
  }
  return changes;
}

/**
 * Find stops in trajectory where speed falls below threshold
 * @param {Object[]} points - Array of GPS points with speed and timestamp
 * @param {number} speedThreshold - Speed threshold in m/s (default 0.5)
 * @returns {Object[]} Array of stops with startIndex, endIndex, duration, distance
 */
function findStops(points, speedThreshold = 0.5) {
  const stops = [];
  let stopStart = null;

  for (let i = 0; i < points.length; i++) {
    // Support both m/s (speed) and km/h (speedKmh) properties
    let speed = points[i].speed;
    if (speed === undefined && points[i].speedKmh !== undefined) {
      speed = points[i].speedKmh / 3.6; // Convert km/h to m/s
    }
    if (speed === undefined) {
      speed = 0; // Treat missing speed as stopped
    }

    if (speed < speedThreshold) {
      if (stopStart === null) {
        stopStart = i;
      }
    } else {
      if (stopStart !== null) {
        stops.push({
          startIndex: stopStart,
          endIndex: i - 1,
          duration: (points[i - 1].timestamp - points[stopStart].timestamp) / 1000,
          distance:
            stopStart > 0
              ? getDistanceBetweenPoints(points[stopStart - 1], points[i])
              : 0,
        });
        stopStart = null;
      }
    }
  }

  if (stopStart !== null) {
    const lastIndex = points.length - 1;
    stops.push({
      startIndex: stopStart,
      endIndex: lastIndex,
      duration: (points[lastIndex].timestamp - points[stopStart].timestamp) / 1000,
      distance:
        stopStart > 0 ? getDistanceBetweenPoints(points[stopStart - 1], points[lastIndex]) : 0,
    });
  }

  return stops;
}

// ============================================================================
// Classification Algorithms
// ============================================================================

/**
 * Baseline algorithm - Simple speed thresholds
 * Walking: 1-7 km/h
 * Cycling: 7-25 km/h
 * Bus/Car: 25-80 km/h
 * Train: 80-200 km/h
 *
 * @param {Object[]} speedData - Array of points with speedKmh property
 * @returns {string} Classification: 'walking', 'cycling', 'bus-or-car', 'train', or 'unknown'
 */
function baselineClassify(speedData) {
  if (!speedData || speedData.length === 0) {
    return 'unknown';
  }

  const speeds = speedData.map((p) => p.speedKmh);
  const maxSpeed = Math.max(...speeds);

  if (maxSpeed < 7) return 'walking';
  if (maxSpeed < 25) return 'cycling';
  if (maxSpeed < 80) return 'bus-or-car';
  if (maxSpeed < 200) return 'train';
  return 'unknown';
}

/**
 * Percentile95 algorithm - Outlier-resistant classification
 * Uses 95th percentile instead of max speed for robustness
 * Research shows Kappa of 0.66 accuracy
 *
 * @param {Object[]} speedData - Array of points with speedKmh property
 * @returns {string} Classification: 'walking', 'cycling', 'bus-or-car', 'train', or 'unknown'
 */
function percentile95Classify(speedData) {
  if (!speedData || speedData.length === 0) {
    return 'unknown';
  }

  const speeds = speedData.map((p) => p.speedKmh);
  const p95Speed = percentile(speeds, 95);

  if (p95Speed < 7) return 'walking';
  if (p95Speed < 25) return 'cycling';
  if (p95Speed < 80) return 'bus-or-car';
  if (p95Speed < 200) return 'train';
  return 'unknown';
}

/**
 * Stop pattern algorithm - Distinguish bus from car
 * Buses: frequent stops every 400-800m with > 1 stop/km
 * Cars: infrequent, irregular stops
 *
 * @param {Object[]} gpsData - Array of points with latitude, longitude, speedKmh
 * @returns {string|null} 'bus', 'car', or null if not automotive range
 */
function stopPatternClassify(gpsData) {
  if (!gpsData || gpsData.length === 0) {
    return null;
  }

  const stops = findStops(gpsData);
  const speeds = gpsData.map((p) => p.speedKmh);
  const maxSpeed = Math.max(...speeds);

  // Must be in automotive range to use stop pattern
  if (maxSpeed < 25 || maxSpeed > 80) {
    return null;
  }

  if (stops.length === 0) {
    return 'car'; // No stops = likely car
  }

  // Calculate total distance traveled
  let totalDistance = 0;
  for (let i = 0; i < gpsData.length - 1; i++) {
    totalDistance += getDistanceBetweenPoints(gpsData[i], gpsData[i + 1]);
  }

  // Average distance between stops
  const avgDistanceBetweenStops = totalDistance / Math.max(1, stops.length);

  // Stop frequency (stops per km)
  const stopFrequency = stops.length / (totalDistance / 1000);

  // Buses typically stop every 400-800 meters
  const isBusRange = avgDistanceBetweenStops > 300 && avgDistanceBetweenStops < 1000;

  if (stopFrequency > 1) {
    return 'bus'; // More than 1 stop per km = likely bus
  }

  if (isBusRange && stops.length >= 2) {
    return 'bus';
  }

  return 'car';
}

/**
 * Heading change algorithm - Fixed vs variable routes
 * Fixed routes (train/bus): low heading variance (< 30° std dev)
 * Variable routes (car): high heading variance (> 30° std dev)
 *
 * @param {Object[]} gpsData - Array of points with latitude, longitude, heading
 * @returns {string|null} 'fixed-route', 'variable-route', 'uncertain', or null
 */
function headingChangeClassify(gpsData) {
  if (!gpsData || gpsData.length < 2) {
    return null;
  }

  const headingChanges = calculateHeadingChanges(gpsData);

  if (headingChanges.length === 0) {
    return null;
  }

  // Convert to degrees
  const headingChangesDegrees = headingChanges.map((c) => (c * 180) / Math.PI);

  // Calculate mean heading change
  const meanHeadingChange = headingChangesDegrees.reduce((a, b) => a + b) / headingChangesDegrees.length;

  // Calculate standard deviation
  const variance = headingChangesDegrees.reduce((sum, change) => sum + Math.pow(change - meanHeadingChange, 2), 0)
    / headingChangesDegrees.length;
  const stdDev = Math.sqrt(variance);

  // Fixed routes have low heading variance
  if (meanHeadingChange < 3 && stdDev < 15) {
    return 'fixed-route';
  }

  // Variable routes (car, urban driving)
  if (meanHeadingChange > 5 || stdDev > 20) {
    return 'variable-route';
  }

  return 'uncertain';
}

// ============================================================================
// Confusion Matrix and Metrics Functions
// ============================================================================

/**
 * Build confusion matrix from predictions
 * @param {Object[]} predictions - Array of {actual, predicted} objects
 * @returns {Object} Confusion matrix with modes as keys
 */
function buildConfusionMatrix(predictions) {
  const modes = ['walking', 'cycling', 'bus', 'car', 'train'];
  const matrix = {};

  for (const actual of modes) {
    matrix[actual] = {};
    for (const predicted of modes) {
      matrix[actual][predicted] = 0;
    }
  }

  for (const pred of predictions) {
    if (pred.actual && pred.predicted) {
      matrix[pred.actual][pred.predicted]++;
    }
  }

  return matrix;
}

/**
 * Calculate overall accuracy from confusion matrix
 * @param {Object} matrix - Confusion matrix
 * @returns {number} Accuracy as decimal (0-1)
 */
function calculateAccuracy(matrix) {
  let correct = 0;
  let total = 0;

  for (const actual in matrix) {
    if (matrix[actual][actual]) {
      correct += matrix[actual][actual];
    }
    for (const predicted in matrix[actual]) {
      total += matrix[actual][predicted];
    }
  }

  return total > 0 ? correct / total : 0;
}

/**
 * Calculate precision for a specific classification class
 * @param {Object} matrix - Confusion matrix
 * @param {string} className - Class name (e.g., 'walking')
 * @returns {number} Precision as decimal (0-1)
 */
function calculatePrecision(matrix, className) {
  let truePositives = matrix[className]?.[className] || 0;
  let predicted = 0;

  for (const actual in matrix) {
    predicted += matrix[actual][className] || 0;
  }

  return predicted > 0 ? truePositives / predicted : 0;
}

/**
 * Calculate recall for a specific classification class
 * @param {Object} matrix - Confusion matrix
 * @param {string} className - Class name (e.g., 'walking')
 * @returns {number} Recall as decimal (0-1)
 */
function calculateRecall(matrix, className) {
  let truePositives = matrix[className]?.[className] || 0;
  let actual = 0;

  for (const predicted in matrix[className]) {
    actual += matrix[className][predicted] || 0;
  }

  return actual > 0 ? truePositives / actual : 0;
}

// ============================================================================
// Exports for Node.js and Module Systems
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Classification algorithms
    baselineClassify,
    percentile95Classify,
    stopPatternClassify,
    headingChangeClassify,
    // Helper functions
    percentile,
    getDistanceBetweenPoints,
    calculateHeading,
    normalizeAngle,
    calculateHeadingChanges,
    findStops,
    // Metrics functions
    buildConfusionMatrix,
    calculateAccuracy,
    calculatePrecision,
    calculateRecall,
  };
}

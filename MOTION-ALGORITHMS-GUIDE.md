# Transportation Mode Detection Algorithms - Implementation Guide

## Project Context

This document guides the implementation of transportation mode detection algorithms for the MIX Dashboard motion analysis system. The comprehensive test suite is already written in `/js/__tests__/motion-algorithms.test.js`.

## Overview of Algorithms

### Algorithm 1: Baseline (Speed Thresholds)

**Location**: `motion-algorithms.js` → `classifyByBaseline(points)`

**Logic**:
- Extract all speed values from trajectory points
- Find maximum speed in dataset
- Classify based on thresholds:
  - Max speed < 7 km/h → Walking
  - Max speed < 25 km/h → Cycling
  - Max speed < 80 km/h → Bus or Car (ambiguous)
  - Max speed < 200 km/h → Train
  - Max speed ≥ 200 km/h → Unknown

**Expected Input**:
```javascript
[
  { speedKmh: 5.2, timestamp: 1234567890, ... },
  { speedKmh: 6.1, timestamp: 1234567900, ... },
  ...
]
```

**Expected Output**: String
- 'walking' | 'cycling' | 'bus-or-car' | 'train' | 'unknown'

**Test Cases**:
- Walking trajectory (max ~7 km/h) → 'walking'
- Cycling trajectory (max ~20 km/h) → 'cycling'
- Bus trajectory (max ~30 km/h) → 'bus-or-car'
- Car trajectory (max ~50 km/h) → 'bus-or-car'
- Train trajectory (max ~100 km/h) → 'train'
- Stationary (speed = 0) → 'walking'
- Boundary cases (speed exactly at threshold)

**Limitations**:
- Cannot distinguish bus from car
- Vulnerable to GPS noise and speed spikes
- Accuracy: ~60-80% on clean data

---

### Algorithm 2: Percentile95 (Outlier-Resistant)

**Location**: `motion-algorithms.js` → `classifyByPercentile95(points)`

**Logic**:
- Extract all speed values from trajectory points
- Calculate 95th percentile speed (filters outliers)
- Classify based on same thresholds as baseline but using p95 instead of max:
  - P95 speed < 7 km/h → Walking
  - P95 speed < 25 km/h → Cycling
  - P95 speed < 80 km/h → Bus or Car
  - P95 speed < 200 km/h → Train

**Helper Function**: Percentile calculation
```javascript
function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}
```

**Expected Input**: Same as baseline

**Expected Output**: String (same classifications)

**Improvements Over Baseline**:
- Robust to speed spikes (e.g., single GPS error)
- Handles measurement noise better
- Research shows Kappa of 0.66 (moderate agreement)
- Better accuracy in urban environments with GPS degradation

**Test Cases**:
- Walking with speed spike (spike to 50 km/h) → still 'walking'
- Cycling with noisy GPS (±2 km/h random noise) → 'cycling'
- Bus with outliers → 'bus-or-car'
- Percentile validation: p95 ≤ max speed
- Accuracy improvement on noisy data vs baseline

---

### Algorithm 3: Stop Pattern (Bus vs Car Detection)

**Location**: `motion-algorithms.js` → `classifyByStopPattern(points)`

**Logic**:
1. Check if speed range is automotive (25-80 km/h)
   - If not, return `null` (not applicable)
2. Find all stops (periods where speed < 0.5 m/s)
3. If no stops, classify as 'car'
4. If stops exist:
   - Calculate total journey distance (Haversine)
   - Calculate average distance between stops
   - If avg distance 300-1000m and multiple stops → 'bus'
   - If stops/km > 1 → 'bus'
   - Otherwise → 'car'

**Helper Functions Required**:

```javascript
function findStops(points, speedThreshold = 0.5) {
  // Return array of stop objects:
  // [{ startIndex, endIndex, duration, distance }, ...]
}

function getDistanceBetweenPoints(point1, point2) {
  // Haversine formula for lat/lng distance
  // Returns meters
}
```

**Expected Input**: Points with:
- `speedKmh`: Speed in km/h
- `latitude`, `longitude`: Geographic coordinates
- `timestamp`: Milliseconds since epoch

**Expected Output**: String | null
- 'bus' | 'car' | null (for non-automotive speeds)

**Bus Characteristics**:
- Regular stops every 400-800m (pick-up/drop-off)
- Frequent stops (>1 per km is typical)
- Fixed route following main streets
- Predictable stop locations

**Car Characteristics**:
- Infrequent, irregular stops
- Stop distance varies widely
- Can take any route (backroads, direct, etc.)

**Test Cases**:
- Bus trajectory (900s duration) → 'bus' (multiple stops)
- Car trajectory → 'car' (few or no stops)
- Stop detection and distance calculation
- No-stop trajectories handled correctly
- Walking/cycling trajectories return `null`
- Reasonable stop duration (<5 minutes)

---

### Algorithm 4: Heading Change (Fixed-Route Detection)

**Location**: `motion-algorithms.js` → `classifyByHeadingChange(points)`

**Logic**:
1. Calculate heading changes between consecutive points
2. Convert to degrees, normalize to [-180°, 180°]
3. Calculate statistics:
   - Mean heading change
   - Standard deviation of heading changes
4. Classify based on thresholds:
   - Mean < 3° AND StdDev < 15° → 'fixed-route' (train/bus)
   - Mean > 5° OR StdDev > 20° → 'variable-route' (car)
   - Otherwise → 'uncertain'

**Helper Function**: Heading change calculation
```javascript
function calculateHeadingChanges(points) {
  const changes = [];
  for (let i = 1; i < points.length; i++) {
    let change = points[i].heading - points[i - 1].heading;
    // Normalize to [-π, π]
    while (change > Math.PI) change -= 2 * Math.PI;
    while (change < -Math.PI) change += 2 * Math.PI;
    changes.push(Math.abs(change));
  }
  return changes; // In radians
}
```

**Circular Statistics**:
- Headings are circular data (0° = 360°)
- Mean heading change: average of absolute angular differences
- Standard deviation: sqrt(mean((change - mean)²))

**Expected Input**: Points with:
- `heading`: Bearing in radians (0 to 2π)
- OR `latitude`, `longitude`: To calculate heading between consecutive points

**Expected Output**: String
- 'fixed-route' | 'variable-route' | 'uncertain'

**Fixed-Route Characteristics** (Train/Bus):
- Follow predetermined tracks/routes
- Turn only at designated stops/stations
- Heading changes minimal and predictable
- Example: Train on straight track has 0° heading variance

**Variable-Route Characteristics** (Car):
- Navigate freely through streets
- Turn frequently to reach destination
- Heading changes variable and unpredictable
- Example: Urban driving has high heading variance

**Test Cases**:
- Train trajectory → 'fixed-route' (straight line, low variance)
- Bus trajectory → 'fixed-route' (follows main street)
- Car trajectory → 'variable-route' (erratic turns)
- Straight-line trajectory → 'fixed-route'
- Erratic trajectory → 'variable-route'
- Heading normalization validation [-π, π]
- Standard deviation calculation
- Distinguishing fixed vs variable routes

---

## Confusion Matrix and Metrics

**Location**: `motion-algorithms.js` → Utility functions

### Matrix Building
```javascript
function buildConfusionMatrix(predictions) {
  // predictions: [{ actual: 'walking', predicted: 'bus' }, ...]
  // Returns: { walking: { walking: 5, cycling: 1, ... }, ... }
}
```

### Accuracy Calculation
```javascript
function calculateAccuracy(matrix) {
  // (TP + TN) / Total
  // Returns: number between 0 and 1
}
```

### Precision (Per-Class)
```javascript
function calculatePrecision(matrix, mode) {
  // TP / (TP + FP)
  // How many predicted instances were correct
}
```

### Recall (Per-Class)
```javascript
function calculateRecall(matrix, mode) {
  // TP / (TP + FN)
  // What fraction of actual instances were predicted
}
```

### F1 Score
```javascript
const f1 = 2 * ((precision * recall) / (precision + recall));
```

---

## Implementation Checklist

- [ ] Create `/Users/suelio/Local/mix/mix-dashboard/js/motion-algorithms.js`
- [ ] Implement `classifyByBaseline(points)`
  - [ ] Extract speeds in km/h
  - [ ] Find maximum speed
  - [ ] Apply threshold logic
  - [ ] Return mode classification string

- [ ] Implement `classifyByPercentile95(points)`
  - [ ] Implement or import percentile function
  - [ ] Calculate 95th percentile speed
  - [ ] Apply threshold logic (same as baseline)

- [ ] Implement `classifyByStopPattern(points)`
  - [ ] Check automotive speed range
  - [ ] Implement `findStops()` helper
  - [ ] Implement `getDistanceBetweenPoints()` (Haversine)
  - [ ] Calculate distances between stops
  - [ ] Apply bus vs car logic

- [ ] Implement `classifyByHeadingChange(points)`
  - [ ] Implement `calculateHeadingChanges()` helper
  - [ ] Handle circular normalization [-π, π]
  - [ ] Calculate mean and std dev of heading changes
  - [ ] Apply fixed/variable route logic

- [ ] Implement confusion matrix functions
  - [ ] `buildConfusionMatrix(predictions)`
  - [ ] `calculateAccuracy(matrix)`
  - [ ] `calculatePrecision(matrix, mode)`
  - [ ] `calculateRecall(matrix, mode)`

- [ ] Run test suite: `npm test`
- [ ] Verify all 42+ tests pass
- [ ] Review test coverage
- [ ] Optional: Optimize performance for large datasets

---

## Testing Strategy

### TDD Approach (Already Implemented)
1. ✗ Tests written and failing (current state)
2. Implement algorithms to make tests pass
3. ✓ All tests passing (green state)
4. Optional: Refactor for performance

### Test Execution
```bash
# Install Jest
npm install --save-dev jest

# Run all tests
npm test

# Watch mode (re-run on changes)
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test
jest --testNamePattern="Baseline"
```

### Expected Coverage
- **Baseline**: 8 tests (edge cases, accuracy)
- **Percentile95**: 6 tests (outliers, robustness)
- **Stop Pattern**: 7 tests (bus/car detection)
- **Heading Change**: 7 tests (fixed/variable routes)
- **Metrics**: 8 tests (confusion matrix, F1)
- **Edge Cases**: 8 tests (empty, single point, etc.)
- **Integration**: 4 tests (end-to-end scenarios)

---

## Key Formulas and Constants

### Speed Thresholds
```
Walking:    1-7 km/h    (1.4 m/s avg)
Cycling:    7-25 km/h   (5.5 m/s avg)
Bus/Car:   25-80 km/h   (8-12 m/s avg)
Train:     80-200 km/h  (18 m/s avg)
```

### Stop Detection
```
Speed threshold:     0.5 m/s (1.8 km/h)
Bus stop interval:   400-800 meters
Bus stop frequency:  >1 per km
```

### Heading Variance
```
Fixed-route threshold: mean < 3°, stdev < 15°
Variable-route:        mean > 5° or stdev > 20°
```

### Haversine Distance
```javascript
R = 6371000 // Earth radius in meters
distance = 2R × arcsin(√(sin²(Δlat/2) + cos(lat1)×cos(lat2)×sin²(Δlng/2)))
```

---

## Performance Notes

- **Percentile calculation**: O(n log n) sorting
- **Distance calculation**: O(n) for full trajectory
- **Heading changes**: O(n) for all points
- **Stop detection**: O(n) with linear scan
- **Large dataset**: 1000-point trajectory should process in <100ms

---

## Data Format Notes

### Input Points Format
```javascript
{
  timestamp,        // Milliseconds since epoch
  latitude,         // Decimal degrees
  longitude,        // Decimal degrees
  speedKmh,         // Speed in km/h
  speed,            // Optional: Speed in m/s
  heading,          // Optional: Radians (0 to 2π)
  headingDegrees,   // Optional: Degrees (0 to 360)
  accuracy          // Optional: Meters (GPS accuracy)
}
```

### Output Formats
```javascript
// Baseline, Percentile95
'walking' | 'cycling' | 'bus-or-car' | 'train' | 'unknown'

// Stop Pattern
'bus' | 'car' | null

// Heading Change
'fixed-route' | 'variable-route' | 'uncertain'

// Confusion Matrix
{
  walking: { walking: 5, cycling: 1, ... },
  cycling: { walking: 1, cycling: 4, ... },
  ...
}
```

---

## References and Research

- **Kappa Coefficient (0.66)**: Moderate agreement between human labels and Percentile95 algorithm
- **Stop Pattern Research**: Transit agencies report bus stops every 300-800m in urban areas
- **Heading Variance**: Fixed-route transport follows predictable paths with <5° variance
- **GPS Accuracy**: Standard GPS accuracy ~5-10m, causing speed spikes on short segments

---

## Next Steps

1. Read through the test file: `/Users/suelio/Local/mix/mix-dashboard/js/__tests__/motion-algorithms.test.js`
2. Understand the expected behavior from each test case
3. Implement the algorithms one by one
4. Run `npm test` to verify implementation
5. Optimize if needed for large-scale data processing
6. Consider edge cases in production (lost signals, tunnel traversal, etc.)

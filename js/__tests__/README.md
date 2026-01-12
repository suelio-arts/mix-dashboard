# Transportation Mode Detection Algorithm Tests

This directory contains comprehensive test suites for transportation mode detection algorithms used in the MIX Dashboard motion analysis system.

## Overview

The test suite validates four distinct transportation mode classification algorithms:

### 1. Baseline Algorithm
Simple speed threshold-based classification
- **Walking**: 1-7 km/h
- **Cycling**: 7-25 km/h
- **Bus/Car**: 25-80 km/h
- **Train**: 80-200 km/h

**Pros**: Simple, fast
**Cons**: Cannot distinguish bus from car, sensitive to GPS noise and speed spikes

### 2. Percentile95 Algorithm
Uses 95th percentile speed instead of maximum speed for outlier-resistant classification
- More robust to GPS measurement noise and speed spikes
- Research shows Kappa of 0.66 (moderate agreement)
- Better discrimination in noisy urban environments

**Pros**: Robust to outliers, improved accuracy in noisy conditions
**Cons**: Requires careful percentile threshold tuning

### 3. Stop Pattern Algorithm
Differentiates bus from car using stop frequency and distance between stops
- **Buses**: Frequent stops every 400-800 meters
- **Cars**: Variable, infrequent stops

**Pros**: Can distinguish bus from car
**Cons**: Requires sufficient journey length to establish pattern

### 4. Heading Change Algorithm
Differentiates fixed-route (train/bus) from variable-route (car) using heading variance
- **Trains/Buses**: Low heading variance (<30 degrees average change)
- **Cars**: Higher heading variance (>30 degrees average change)

**Pros**: Distinguishes fixed-route from variable-route transport
**Cons**: Ineffective in short segments or straight roads

## Test File: motion-algorithms.test.js

### Test Structure

The test suite is organized into 6 main sections:

#### 1. Test Data Generators (Utility Functions)

These helper functions generate realistic GPS trajectories for each transportation mode:

- **`generateTrajectory(mode, duration, interval)`**
  - Creates simulated GPS data with realistic speed and heading patterns
  - Includes Gaussian noise to simulate real GPS measurement error
  - Modes: 'walking', 'cycling', 'bus', 'car', 'train'
  - Duration in seconds, interval between points in seconds

- **`gaussianRandom(mean, stdev)`**
  - Box-Muller transform for realistic Gaussian noise
  - Used to add measurement noise to simulated trajectories

- **`percentile(arr, p)`**
  - Calculates the pth percentile of an array
  - Used by Percentile95 algorithm

- **`calculateHeadingChanges(points)`**
  - Computes angular changes between consecutive points
  - Normalizes to [-π, π] for proper circular statistics

- **`findStops(points, speedThreshold)`**
  - Identifies periods when speed < 0.5 m/s
  - Returns array of stop objects with duration and distance

- **`getDistanceBetweenPoints(point1, point2)`**
  - Haversine formula for great-circle distance
  - Returns distance in meters

#### 2. Baseline Algorithm Tests

```javascript
// Test basic speed threshold classification
test('should classify walking trajectory correctly', () => { ... })
test('should classify cycling trajectory correctly', () => { ... })
test('should classify bus trajectory as bus-or-car', () => { ... })
test('should classify car trajectory as bus-or-car', () => { ... })
test('should classify train trajectory correctly', () => { ... })

// Edge cases
test('should handle stationary trajectory (speed = 0)', () => { ... })
test('should handle very fast speeds', () => { ... })
test('should handle edge case: speed at threshold boundary', () => { ... })

// Accuracy metrics
test('should calculate accuracy for baseline algorithm', () => { ... })
```

#### 3. Percentile95 Algorithm Tests

```javascript
// Robustness to outliers
test('should be more robust to speed spikes than baseline', () => { ... })
test('should correctly classify walking with noisy GPS', () => { ... })
test('should correctly classify cycling with outliers', () => { ... })

// Percentile calculation validation
test('should handle 95th percentile calculation correctly', () => { ... })
test('should validate that percentile < max speed', () => { ... })

// Improved accuracy on noisy data
test('should improve accuracy over baseline on noisy data', () => { ... })
```

#### 4. Stop Pattern Algorithm Tests

```javascript
// Bus identification
test('should identify bus trajectory by frequent stops', () => { ... })

// Car identification
test('should identify car trajectory by infrequent stops', () => { ... })

// Stop detection
test('should detect stops correctly in trajectory', () => { ... })
test('should calculate distance between stops', () => { ... })

// Edge cases
test('should handle trajectory with no stops', () => { ... })
test('should return null for non-automotive speed ranges', () => { ... })

// Validation
test('should differentiate between bus and car stop patterns', () => { ... })
test('should validate stop duration is reasonable', () => { ... })
```

#### 5. Heading Change Algorithm Tests

```javascript
// Fixed-route detection
test('should identify train as fixed-route by low heading variance', () => { ... })
test('should identify bus as fixed-route by low heading variance', () => { ... })

// Variable-route detection
test('should identify car as variable-route by high heading variance', () => { ... })

// Heading calculation validation
test('should calculate heading changes correctly', () => { ... })
test('should normalize heading changes to [-π, π]', () => { ... })

// Validation
test('should distinguish fixed vs variable routes', () => { ... })
test('should handle straight-line trajectory', () => { ... })
test('should handle erratic trajectory', () => { ... })
test('should calculate standard deviation of heading changes', () => { ... })
```

#### 6. Confusion Matrix and Metrics

Tests for classification metrics and model evaluation:

```javascript
// Matrix operations
test('should build confusion matrix correctly', () => { ... })
test('should calculate accuracy from confusion matrix', () => { ... })

// Per-class metrics
test('should calculate precision for each mode', () => { ... })
test('should calculate recall for each mode', () => { ... })

// F1 score
test('should calculate F1 score', () => { ... })

// Classification report generation
test('should generate classification report', () => { ... })
```

#### 7. Edge Cases and Error Handling

Robustness tests for unusual inputs:

```javascript
test('should handle empty trajectory', () => { ... })
test('should handle single-point trajectory', () => { ... })
test('should handle all-zero speeds', () => { ... })
test('should handle all-same speeds', () => { ... })
test('should handle negative speeds gracefully', () => { ... })
test('should handle very large timestamps', () => { ... })
test('should handle identical latitude/longitude points', () => { ... })
test('should handle antipodal points', () => { ... })
```

#### 8. Integration Tests

End-to-end tests combining multiple algorithms:

```javascript
test('should classify all modes correctly using baseline algorithm', () => { ... })
test('should provide consistent results for same trajectory', () => { ... })
test('should process large trajectory efficiently', () => { ... })
test('should handle mixed trajectory (multiple modes)', () => { ... })
```

## Running the Tests

### Prerequisites

Install Jest:
```bash
npm install --save-dev jest
```

### Configuration

Add to `package.json`:
```json
{
  "devDependencies": {
    "jest": "^29.0.0"
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Execute Tests

Run all tests:
```bash
npm test
```

Run tests in watch mode (re-run on file changes):
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

Run specific test suite:
```bash
jest motion-algorithms.test.js
```

Run tests matching a pattern:
```bash
jest --testNamePattern="Baseline"
```

## Expected Test Results

All tests are currently **designed to FAIL** because the algorithms are not yet implemented.

This is the TDD (Test-Driven Development) approach:
1. ✗ Tests fail (red phase)
2. Implement algorithms
3. ✓ Tests pass (green phase)
4. Refactor code (refactor phase)

When the algorithms are implemented in a `motion-algorithms.js` file, tests will pass.

## Sample Test Output (Expected When Failing)

```
 FAIL  js/__tests__/motion-algorithms.test.js
  Transportation Mode Detection Algorithms
    Baseline Algorithm - Speed Thresholds
      ✕ should classify walking trajectory correctly (5ms)
      ✕ should classify cycling trajectory correctly (3ms)
      ✕ should classify bus trajectory as bus-or-car (4ms)
      ...
    Percentile95 Algorithm - Outlier-Resistant Classification
      ✕ should be more robust to speed spikes than baseline (2ms)
      ...

Test Suites: 1 failed, 1 total
Tests: 42 failed, 42 total
Time: 2.345s
```

## Implementing the Algorithms

To make these tests pass, create `/Users/suelio/Local/mix/mix-dashboard/js/motion-algorithms.js` with:

```javascript
// Export these functions:
module.exports = {
  classifyByBaseline,
  classifyByPercentile95,
  classifyByStopPattern,
  classifyByHeadingChange,
  buildConfusionMatrix,
  calculateAccuracy,
  calculatePrecision,
  calculateRecall,
};
```

Each function should match the expected behavior defined in the tests.

## Key Testing Concepts Used

### 1. Test Data Generators
Realistic trajectory generation with:
- Gaussian noise for natural variation
- Mode-specific speed and heading parameters
- Stop patterns for bus trajectories
- Haversine distance calculations

### 2. Helper Functions
Stateless utility functions for:
- Statistical calculations (percentile, mean, stdev)
- Circular statistics (heading normalization)
- Geographic calculations (distance)
- Stop detection and pattern analysis

### 3. Assertions
Each test validates:
- Correct classification results
- Property existence and type
- Numeric bounds and relationships
- Edge case handling
- Consistency and determinism

### 4. Confusion Matrix
Standard ML metrics:
- Accuracy: (TP + TN) / Total
- Precision: TP / (TP + FP)
- Recall: TP / (TP + FN)
- F1: 2 × (Precision × Recall) / (Precision + Recall)

## Performance Considerations

- Test suite has 42+ test cases
- Large trajectory test processes 1000+ points
- All tests should complete in < 5 seconds total
- Each trajectory generation takes ~10-50ms

## References

- **Kappa Coefficient**: Measure of inter-rater agreement (0.66 is "moderate")
- **Haversine Formula**: Great-circle distance between points on Earth
- **Gaussian Distribution**: Natural model for GPS measurement noise
- **Circular Statistics**: Proper handling of angular data (headings)
- **Confusion Matrix**: Standard tool for evaluating classification performance

## Notes

- Tests use Jest's built-in assertion library
- No external dependencies required beyond Jest
- Tests are framework-agnostic (pure JavaScript logic)
- Trajectories are deterministic given a seed (for reproducibility)
- All calculations use SI units (meters, seconds, radians)

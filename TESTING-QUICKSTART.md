# Motion Algorithms - Testing Quick Start Guide

## Files Created

### 1. Test Suite
**Location**: `/Users/suelio/Local/mix/mix-dashboard/js/__tests__/motion-algorithms.test.js`
- 42+ comprehensive test cases
- All tests currently **FAILING** (TDD approach)
- Tests cover 4 algorithms: baseline, percentile95, stopPattern, headingChange
- Includes edge cases, metrics, and integration tests

### 2. Documentation
**Location**: `/Users/suelio/Local/mix/mix-dashboard/js/__tests__/README.md`
- Complete test suite documentation
- How to run tests
- Expected behavior for each algorithm
- Helper functions reference

### 3. Implementation Guide
**Location**: `/Users/suelio/Local/mix/mix-dashboard/MOTION-ALGORITHMS-GUIDE.md`
- Detailed algorithm descriptions
- Implementation checklist
- Input/output specifications
- Key formulas and constants

---

## Quick Start: Running Tests

### Step 1: Install Jest
```bash
cd /Users/suelio/Local/mix/mix-dashboard
npm install --save-dev jest
```

### Step 2: Add Test Scripts to package.json
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:baseline": "jest --testNamePattern=Baseline",
    "test:percentile": "jest --testNamePattern=Percentile95",
    "test:stops": "jest --testNamePattern='Stop Pattern'",
    "test:heading": "jest --testNamePattern='Heading Change'"
  }
}
```

### Step 3: Run Tests
```bash
# Run all tests (will all fail initially)
npm test

# Run tests in watch mode
npm run test:watch

# Run coverage report
npm run test:coverage

# Run specific algorithm tests
npm run test:baseline
npm run test:percentile
npm run test:stops
npm run test:heading
```

---

## Expected Test Results (Initial - All Failing)

```
FAIL  js/__tests__/motion-algorithms.test.js (1.234s)

Transportation Mode Detection Algorithms
  Test Data Generators
    ✓ Helper functions work correctly (12ms)
  Baseline Algorithm - Speed Thresholds
    ✕ should classify walking trajectory correctly (3ms)
    ✕ should classify cycling trajectory correctly (2ms)
    ✕ should classify bus trajectory as bus-or-car (2ms)
    ✕ should classify car trajectory as bus-or-car (2ms)
    ✕ should classify train trajectory correctly (3ms)
    ✕ should handle stationary trajectory (2ms)
    ✕ should handle very fast speeds (1ms)
    ✕ should handle edge case: speed at threshold boundary (1ms)
    ✕ should calculate accuracy for baseline algorithm (4ms)
  Percentile95 Algorithm - Outlier-Resistant Classification
    ✕ should be more robust to speed spikes than baseline (2ms)
    ... (more failures)

Test Suites: 1 failed, 1 total
Tests: 42 failed, 42 total
Time: 2.456s
```

---

## Implementation Workflow

### Phase 1: Create Algorithms File
```bash
# Create the file (stub with exports)
cat > /Users/suelio/Local/mix/mix-dashboard/js/motion-algorithms.js << 'EOF'
/**
 * Transportation Mode Detection Algorithms
 * Placeholder for algorithm implementations
 */

function classifyByBaseline(points) {
  // TODO: Implement
  throw new Error('Not implemented');
}

function classifyByPercentile95(points) {
  // TODO: Implement
  throw new Error('Not implemented');
}

function classifyByStopPattern(points) {
  // TODO: Implement
  throw new Error('Not implemented');
}

function classifyByHeadingChange(points) {
  // TODO: Implement
  throw new Error('Not implemented');
}

module.exports = {
  classifyByBaseline,
  classifyByPercentile95,
  classifyByStopPattern,
  classifyByHeadingChange,
};
EOF
```

### Phase 2: Implement Algorithms One at a Time

**Algorithm 1: Baseline** (Simplest)
- Extract max speed
- Apply thresholds
- Return classification
- Estimated: 15-20 lines of code

**Algorithm 2: Percentile95** (Build on Baseline)
- Copy baseline
- Add percentile function
- Use percentile instead of max
- Estimated: 20-25 lines of code

**Algorithm 3: Stop Pattern** (Requires helpers)
- Implement Haversine distance
- Find stops in trajectory
- Calculate stop frequency
- Apply bus/car logic
- Estimated: 50-60 lines of code

**Algorithm 4: Heading Change** (Most complex)
- Calculate heading changes between points
- Normalize circular math [-π, π]
- Calculate statistics (mean, stdev)
- Apply classification logic
- Estimated: 40-50 lines of code

### Phase 3: Metrics Functions
- Build confusion matrix
- Calculate accuracy, precision, recall
- Estimated: 30-40 lines of code

**Total estimated code**: 150-200 lines

### Phase 4: Run Tests
```bash
npm test
```

Repeat phases 2-4 until all tests pass.

---

## Test by Test Implementation

### Baseline Tests (8 tests)
```javascript
test('should classify walking trajectory correctly')
test('should classify cycling trajectory correctly')
test('should classify bus trajectory as bus-or-car')
test('should classify car trajectory as bus-or-car')
test('should classify train trajectory correctly')
test('should handle stationary trajectory (speed = 0)')
test('should handle very fast speeds')
test('should handle edge case: speed at threshold boundary')
test('should calculate accuracy for baseline algorithm')
```

**Implementation order**:
1. Core classification logic (handles first 5 tests)
2. Edge case handling (tests 6-8)
3. Accuracy calculation (test 9)

### Percentile95 Tests (6 tests)
```javascript
test('should be more robust to speed spikes than baseline')
test('should correctly classify walking with noisy GPS')
test('should correctly classify cycling with outliers')
test('should distinguish cycling from bus with percentile method')
test('should handle 95th percentile calculation correctly')
test('should improve accuracy over baseline on noisy data')
test('should validate that percentile < max speed')
```

### Stop Pattern Tests (7 tests)
```javascript
test('should identify bus trajectory by frequent stops')
test('should identify car trajectory by infrequent stops')
test('should detect stops correctly in trajectory')
test('should calculate distance between stops')
test('should handle trajectory with no stops')
test('should return null for non-automotive speed ranges')
test('should differentiate between bus and car stop patterns')
test('should validate stop duration is reasonable')
```

**Implementation tips**:
- `findStops()`: Scan for speed < 0.5 m/s
- `getDistanceBetweenPoints()`: Haversine formula
- Group consecutive stops together

### Heading Change Tests (7 tests)
```javascript
test('should identify train as fixed-route')
test('should identify bus as fixed-route')
test('should identify car as variable-route')
test('should calculate heading changes correctly')
test('should normalize heading changes to [-π, π]')
test('should distinguish fixed vs variable routes')
test('should handle straight-line trajectory')
test('should handle erratic trajectory')
test('should calculate standard deviation of heading changes')
```

**Implementation tips**:
- Use atan2 for heading between consecutive points
- Normalize angles with: `while (angle > π) angle -= 2π`
- Calculate stdev: `sqrt(mean((x - mean)²))`

---

## Debugging Tips

### 1. Failing Test Analysis
When a test fails, examine:
- What the test expects
- What your implementation returns
- Use `console.log()` in tests to debug

Example:
```bash
# Run single failing test with verbose output
jest --testNamePattern="should classify walking" --verbose
```

### 2. Data Inspection
The test suite generates realistic trajectories. Inspect them:
```javascript
// Add to your implementation to see sample data:
const testWalking = generateTrajectory('walking', 300);
console.log('Sample walking trajectory:', testWalking.slice(0, 3));
console.log('Max speed:', Math.max(...testWalking.map(p => p.speedKmh)));
```

### 3. Edge Cases
Pay special attention to:
- Empty arrays
- Single-element arrays
- All values identical
- Extreme values (0, very large)
- Boundary conditions (speed exactly at threshold)

### 4. Math Validation
For Haversine and heading calculations:
- Test with known distances (e.g., equator to pole = 10,000km)
- Verify angles normalize to [-π, π]
- Check that distances are always positive

---

## File Structure

```
/Users/suelio/Local/mix/mix-dashboard/
├── js/
│   ├── motion-algorithms.js          ← TO BE IMPLEMENTED
│   ├── narrative-history.js
│   ├── narrative-settings.js
│   └── __tests__/
│       ├── motion-algorithms.test.js ← WRITTEN (42+ tests)
│       └── README.md                 ← TEST DOCUMENTATION
├── package.json                       ← UPDATE WITH TEST SCRIPTS
├── MOTION-ALGORITHMS-GUIDE.md         ← IMPLEMENTATION GUIDE
├── TESTING-QUICKSTART.md              ← THIS FILE
└── ... other files
```

---

## Success Criteria

### All Tests Passing
```
PASS  js/__tests__/motion-algorithms.test.js (2.345s)

Transportation Mode Detection Algorithms
  Baseline Algorithm - Speed Thresholds
    ✓ should classify walking trajectory correctly (4ms)
    ✓ should classify cycling trajectory correctly (3ms)
    ✓ should classify bus trajectory as bus-or-car (3ms)
    ✓ should classify car trajectory as bus-or-car (4ms)
    ✓ should classify train trajectory correctly (5ms)
    ✓ should handle stationary trajectory (2ms)
    ✓ should handle very fast speeds (1ms)
    ✓ should handle edge case: speed at threshold boundary (1ms)
    ✓ should calculate accuracy for baseline algorithm (6ms)
  ... (all 42+ tests passing)

Test Suites: 1 passed, 1 total
Tests: 42 passed, 42 total
Time: 2.567s
Snapshots: 0 total
```

### Code Quality
- No console.log() statements in production code
- Clear, readable implementation
- Proper error handling
- Comments for complex logic

### Performance
- All 42 tests complete in < 5 seconds
- Each trajectory generation in < 50ms
- Distance calculations in < 100ms per point

---

## Reference: Algorithm Parameters

### Speed Thresholds
| Mode | Min (km/h) | Max (km/h) |
|------|-----------|-----------|
| Walking | 0 | 7 |
| Cycling | 7 | 25 |
| Bus/Car | 25 | 80 |
| Train | 80 | 200 |

### Stop Detection Parameters
| Parameter | Value |
|-----------|-------|
| Speed threshold | 0.5 m/s (1.8 km/h) |
| Bus stop spacing | 400-800 m |
| Bus stop frequency | > 1 per km |
| Max stop duration | 5 minutes |

### Heading Variance Thresholds
| Route Type | Mean Change | Std Dev |
|-----------|------------|---------|
| Fixed | < 3° | < 15° |
| Variable | > 5° OR > 20° | > 20° |
| Uncertain | Between above | - |

---

## Next Steps

1. **Understand the tests**: Read `js/__tests__/README.md`
2. **Learn the algorithms**: Read `MOTION-ALGORITHMS-GUIDE.md`
3. **Create algorithms file**: `js/motion-algorithms.js`
4. **Implement one algorithm at a time**
5. **Run tests**: `npm test` after each implementation
6. **Verify all tests pass**
7. **Optional: Optimize performance**
8. **Integrate with dashboard visualization**

---

## Quick Reference: Test Generators

The test file includes helper functions you can use in your implementation:

```javascript
// Generate realistic trajectory
const walkingData = generateTrajectory('walking', 300);
// Returns array of 30 points (300s / 10s interval)

// Calculate percentile
const p95 = percentile([1,2,3,4,5], 95); // 4.6

// Find stops
const stops = findStops(points); // [{startIdx, endIdx, duration, distance}, ...]

// Calculate distance
const dist = getDistanceBetweenPoints({latitude: 0, longitude: 0},
                                       {latitude: 0, longitude: 180}); // ~20M km

// Heading changes
const changes = calculateHeadingChanges(points); // Array in radians
```

All these are already implemented in the test file for your reference!

---

## Questions?

Refer to:
- Test cases in `motion-algorithms.test.js` for expected behavior
- `MOTION-ALGORITHMS-GUIDE.md` for detailed algorithm specifications
- `js/__tests__/README.md` for test suite documentation

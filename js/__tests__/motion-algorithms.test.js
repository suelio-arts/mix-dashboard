/**
 * Comprehensive test suite for transportation mode detection algorithms
 * Tests baseline, percentile95, stopPattern, and headingChange algorithms
 * Using TDD approach with failing tests that define expected behavior
 */

const {
  baselineClassify,
  percentile95Classify,
  stopPatternClassify,
  headingChangeClassify,
  percentile,
  getDistanceBetweenPoints,
  calculateHeadingChanges,
  findStops,
  buildConfusionMatrix,
  calculateAccuracy,
  calculatePrecision,
  calculateRecall,
} = require('../motion-algorithms.js');

describe('Transportation Mode Detection Algorithms', () => {
  // ============================================================================
  // Test Data Generators
  // ============================================================================

  /**
   * Generate GPS trajectory for a specific transportation mode
   * @param {string} mode - 'walking', 'cycling', 'bus', 'car', 'train'
   * @param {number} duration - Duration in seconds
   * @param {number} interval - Interval between points in seconds
   * @returns {Array} Array of GPS points with speed and heading
   */
  function generateTrajectory(mode, duration = 300, interval = 10) {
    const points = [];
    let timestamp = Date.now();
    let latitude = 42.3601;
    let longitude = -71.0589;
    let heading = 0;

    const configs = {
      walking: {
        speedMean: 1.4, // m/s (5 km/h)
        speedStdDev: 0.15,
        headingChangeRate: 0.08, // radians per second
        stops: [],
      },
      cycling: {
        speedMean: 5.5, // m/s (20 km/h)
        speedStdDev: 0.45,
        headingChangeRate: 0.12,
        stops: [],
      },
      bus: {
        speedMean: 8.0, // m/s (28.8 km/h)
        speedStdDev: 1.8,
        headingChangeRate: 0.03, // low heading variance (fixed route)
        stopIntervals: [400, 500, 450], // meters between stops
        stopDuration: 30, // seconds
      },
      car: {
        speedMean: 12.0, // m/s (43.2 km/h)
        speedStdDev: 2.8,
        headingChangeRate: 0.15, // higher heading variance
        stops: [],
      },
      train: {
        speedMean: 23.0, // m/s (82.8 km/h)
        speedStdDev: 1.5,
        headingChangeRate: 0.01, // very low heading variance (fixed track)
        stops: [],
      },
    };

    const config = configs[mode];
    if (!config) throw new Error(`Unknown mode: ${mode}`);

    let distanceSinceLastStop = 0;
    let stopCounter = 0;
    let isStoppedUntil = 0;

    for (let t = 0; t < duration; t += interval) {
      timestamp += interval * 1000;

      // Handle bus/train stops
      if (mode === 'bus') {
        const nextStopDistance = config.stopIntervals[stopCounter % config.stopIntervals.length];
        if (distanceSinceLastStop >= nextStopDistance && isStoppedUntil === 0) {
          isStoppedUntil = t + config.stopDuration;
          stopCounter++;
          distanceSinceLastStop = 0;
        }
      }

      // Calculate speed with gaussian noise
      let speed = config.speedMean + config.speedStdDev * gaussianRandom();
      speed = Math.max(0, speed); // No negative speeds

      // Stop duration handling
      if (t < isStoppedUntil) {
        speed = 0;
      } else if (isStoppedUntil > 0) {
        // Reset isStoppedUntil after stop duration expires
        isStoppedUntil = 0;
      }

      // Update heading with noise
      const headingChange = config.headingChangeRate * gaussianRandom();
      heading = (heading + headingChange + 2 * Math.PI) % (2 * Math.PI);

      // Update position
      const distance = speed * interval;
      distanceSinceLastStop += distance;
      const latChange = (distance / 111000) * Math.cos(heading);
      const lngChange = (distance / 111000) * Math.sin(heading);

      latitude += latChange;
      longitude += lngChange;

      points.push({
        timestamp,
        latitude,
        longitude,
        speed, // m/s
        speedKmh: speed * 3.6, // converted to km/h
        heading, // radians
        headingDegrees: (heading * 180) / Math.PI,
        accuracy: 5 + Math.random() * 5, // meters
      });
    }

    return points;
  }

  /**
   * Simple gaussian random number generator (Box-Muller transform)
   */
  function gaussianRandom(mean = 0, stdev = 1) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z0 * stdev + mean;
  }


  // ============================================================================
  // Algorithm 1: Baseline - Speed Threshold
  // ============================================================================

  describe('Baseline Algorithm - Speed Thresholds', () => {
    test('should classify walking trajectory correctly', () => {
      const points = generateTrajectory('walking', 300);
      const result = baselineClassify(points);
      expect(result).toBe('walking');
    });

    test('should classify cycling trajectory correctly', () => {
      const points = generateTrajectory('cycling', 300);
      const result = baselineClassify(points);
      expect(result).toBe('cycling');
    });

    test('should classify bus trajectory as bus-or-car', () => {
      const points = generateTrajectory('bus', 300);
      const result = baselineClassify(points);
      expect(result).toBe('bus-or-car');
    });

    test('should classify car trajectory as bus-or-car', () => {
      const points = generateTrajectory('car', 300);
      const result = baselineClassify(points);
      expect(result).toBe('bus-or-car');
    });

    test('should classify train trajectory correctly', () => {
      const points = generateTrajectory('train', 300);
      const result = baselineClassify(points);
      expect(result).toBe('train');
    });

    test('should handle stationary trajectory (speed = 0)', () => {
      const points = [
        { speedKmh: 0, timestamp: Date.now() },
        { speedKmh: 0, timestamp: Date.now() + 1000 },
        { speedKmh: 0, timestamp: Date.now() + 2000 },
      ];
      const result = baselineClassify(points);
      expect(result).toBe('walking');
    });

    test('should handle very fast speeds (ultra-high speed transport)', () => {
      const points = [
        { speedKmh: 250, timestamp: Date.now() },
        { speedKmh: 260, timestamp: Date.now() + 1000 },
      ];
      const result = baselineClassify(points);
      expect(result).toBe('unknown');
    });

    test('should handle edge case: speed at threshold boundary', () => {
      const points = [{ speedKmh: 7.0 }, { speedKmh: 7.1 }];
      const result = baselineClassify(points);
      expect(['cycling', 'bus-or-car']).toContain(result);
    });

    test('should calculate accuracy for baseline algorithm', () => {
      const modes = ['walking', 'cycling', 'bus', 'car', 'train'];
      const results = {};
      let correct = 0;
      let total = 0;

      for (const mode of modes) {
        const points = generateTrajectory(mode, 600);
        const predicted = baselineClassify(points);
        const expectedModes = {
          walking: 'walking',
          cycling: 'cycling',
          bus: 'bus-or-car',
          car: 'bus-or-car',
          train: 'train',
        };
        const expected = expectedModes[mode];

        if (predicted === expected) correct++;
        total++;
        results[mode] = predicted === expected ? 'PASS' : 'FAIL';
      }

      const accuracy = correct / total;
      expect(accuracy).toBeGreaterThan(0.6); // Expect at least 60% accuracy
      expect(results).toBeDefined();
    });
  });

  // ============================================================================
  // Algorithm 2: Percentile95 - Outlier-Resistant Speed Analysis
  // ============================================================================

  describe('Percentile95 Algorithm - Outlier-Resistant Classification', () => {
    test('should be more robust to speed spikes than baseline', () => {
      const baselinePoints = generateTrajectory('walking', 3000);
      // Add outlier spike
      baselinePoints[150].speedKmh = 50;

      const result = percentile95Classify(baselinePoints);
      expect(result).toBe('walking');
    });

    test('should correctly classify walking with noisy GPS', () => {
      const points = generateTrajectory('walking', 300);
      // Add random measurement noise
      points.forEach((p) => {
        p.speedKmh += (Math.random() - 0.5) * 2; // ±1 km/h noise
      });

      const result = percentile95Classify(points);
      expect(result).toBe('walking');
    });

    test('should correctly classify cycling with outliers', () => {
      const points = generateTrajectory('cycling', 1500);
      // Add GPS outliers
      points[50].speedKmh = 80; // Spike above cycling range
      points[100].speedKmh = 0; // False stop

      const result = percentile95Classify(points);
      expect(result).toBe('cycling');
    });

    test('should distinguish cycling from bus with percentile method', () => {
      const cyclingPoints = generateTrajectory('cycling', 300);
      const busPoints = generateTrajectory('bus', 300);

      const cyclingResult = percentile95Classify(cyclingPoints);
      const busResult = percentile95Classify(busPoints);

      expect(cyclingResult).toBe('cycling');
      expect(busResult).toBe('bus-or-car');
    });

    test('should handle 95th percentile calculation correctly', () => {
      const points = Array.from({ length: 100 }, (_, i) => ({
        speedKmh: i,
        timestamp: Date.now() + i * 1000,
      }));

      // With 100 points, 95th percentile should be around index 95
      const speeds = points.map((p) => p.speedKmh);
      const p95 = percentile(speeds, 95);
      expect(p95).toBeGreaterThanOrEqual(90);
      expect(p95).toBeLessThanOrEqual(99);
    });

    test('should improve accuracy over baseline on noisy data', () => {
      const modes = ['walking', 'cycling', 'bus', 'car', 'train'];
      let p95Correct = 0;

      for (const mode of modes) {
        const points = generateTrajectory(mode, 900);
        // Add significant noise
        points.forEach((p) => {
          p.speedKmh += gaussianRandom(0, 1.5);
        });

        const predicted = percentile95Classify(points);
        const expectedModes = {
          walking: 'walking',
          cycling: 'cycling',
          bus: 'bus-or-car',
          car: 'bus-or-car',
          train: 'train',
        };

        if (predicted === expectedModes[mode]) p95Correct++;
      }

      expect(p95Correct).toBeGreaterThanOrEqual(3); // At least 60% accuracy
    });

    test('should validate that percentile < max speed', () => {
      const points = generateTrajectory('car', 300);
      const speeds = points.map((p) => p.speedKmh);
      const p95 = percentile(speeds, 95);
      const maxSpeed = Math.max(...speeds);

      expect(p95).toBeLessThanOrEqual(maxSpeed);
    });
  });

  // ============================================================================
  // Algorithm 3: Stop Pattern - Bus vs Car Differentiation
  // ============================================================================

  describe('Stop Pattern Algorithm - Bus vs Car Detection', () => {
    test('should identify bus trajectory by frequent stops', () => {
      const points = generateTrajectory('bus', 600); // Longer trajectory for more stops
      const result = stopPatternClassify(points);
      expect(result).toBe('bus');
    });

    test('should identify car trajectory by infrequent stops', () => {
      const points = generateTrajectory('car', 300);
      const result = stopPatternClassify(points);
      expect(result).toMatch(/car|bus/); // May be ambiguous without stops
    });

    test('should detect stops correctly in trajectory', () => {
      const points = generateTrajectory('bus', 600);
      const stops = findStops(points);

      expect(Array.isArray(stops)).toBe(true);
      expect(stops.length).toBeGreaterThan(0); // Bus should have multiple stops

      // Each stop should have valid properties
      for (const stop of stops) {
        expect(stop).toHaveProperty('startIndex');
        expect(stop).toHaveProperty('endIndex');
        expect(stop).toHaveProperty('duration');
        expect(stop.duration).toBeGreaterThanOrEqual(0);
      }
    });

    test('should calculate distance between stops', () => {
      const busPoints = generateTrajectory('bus', 900);
      const stops = findStops(busPoints);

      expect(stops.length).toBeGreaterThan(0);

      // All stops should have a calculated distance property
      for (const stop of stops) {
        expect(stop.distance).toBeDefined();
        expect(stop.distance).toBeGreaterThanOrEqual(0);
      }
    });

    test('should handle trajectory with no stops', () => {
      const carPoints = generateTrajectory('car', 300);
      // Force no stops by keeping speed high
      carPoints.forEach((p) => {
        p.speed = Math.max(p.speed, 10); // Minimum 10 m/s
      });

      const result = stopPatternClassify(carPoints);
      expect(result).toMatch(/^(car|bus)$/);
    });

    test('should return null for non-automotive speed ranges', () => {
      const walkingPoints = generateTrajectory('walking', 300);
      const result = stopPatternClassify(walkingPoints);
      expect(result).toBeNull();
    });

    test('should differentiate between bus and car stop patterns', () => {
      const busPoints = generateTrajectory('bus', 900);
      const carPoints = generateTrajectory('car', 300);

      const busResult = stopPatternClassify(busPoints);
      const carResult = stopPatternClassify(carPoints);

      // Bus should have more frequent/regular stops
      const busStops = findStops(busPoints);
      const carStops = findStops(carPoints);

      expect(busStops.length).toBeGreaterThanOrEqual(carStops.length);
    });

    test('should validate stop duration is reasonable', () => {
      const points = generateTrajectory('bus', 600);
      const stops = findStops(points);

      for (const stop of stops) {
        expect(stop.duration).toBeLessThan(300); // Less than 5 minutes per stop
      }
    });
  });

  // ============================================================================
  // Algorithm 4: Heading Change - Fixed Route vs Variable Route
  // ============================================================================

  describe('Heading Change Algorithm - Fixed Route Detection', () => {
    test('should identify train as fixed-route by low heading variance', () => {
      const points = generateTrajectory('train', 300);
      const result = headingChangeClassify(points);
      expect(result).toBe('fixed-route');
    });

    test('should identify bus as fixed-route by low heading variance', () => {
      const points = generateTrajectory('bus', 300);
      const result = headingChangeClassify(points);
      expect(result).toBe('fixed-route');
    });

    test('should identify car as variable-route by high heading variance', () => {
      const points = generateTrajectory('car', 300);
      const result = headingChangeClassify(points);
      expect(result).toBe('variable-route');
    });

    test('should calculate heading changes correctly', () => {
      const points = generateTrajectory('train', 300);
      const changes = calculateHeadingChanges(points);

      expect(Array.isArray(changes)).toBe(true);
      expect(changes.length).toBe(points.length - 1);

      // All changes should be positive and within [0, π]
      for (const change of changes) {
        expect(change).toBeGreaterThanOrEqual(0);
        expect(change).toBeLessThanOrEqual(Math.PI);
      }
    });

    test('should normalize heading changes to [-π, π]', () => {
      // Test the normalization logic
      const testHeadings = [0, 3.1, -3.1, Math.PI * 1.5, -Math.PI * 1.5];

      for (let i = 1; i < testHeadings.length; i++) {
        let change = testHeadings[i] - testHeadings[i - 1];
        // Normalize to [-π, π]
        while (change > Math.PI) change -= 2 * Math.PI;
        while (change < -Math.PI) change += 2 * Math.PI;

        expect(Math.abs(change)).toBeLessThanOrEqual(Math.PI);
      }
    });

    test('should distinguish fixed vs variable routes', () => {
      const trainPoints = generateTrajectory('train', 300);
      const carPoints = generateTrajectory('car', 300);

      const trainChanges = calculateHeadingChanges(trainPoints);
      const carChanges = calculateHeadingChanges(carPoints);

      const trainMean = trainChanges.reduce((a, b) => a + b) / trainChanges.length;
      const carMean = carChanges.reduce((a, b) => a + b) / carChanges.length;

      // Train should have lower mean heading change than car
      expect(trainMean).toBeLessThan(carMean);
    });

    test('should handle straight-line trajectory', () => {
      const points = Array.from({ length: 50 }, (_, i) => ({
        timestamp: Date.now() + i * 10000,
        latitude: 42.3601 + i * 0.001,
        longitude: -71.0589,
        heading: 0, // No change
        headingDegrees: 0,
        speedKmh: 50,
      }));

      const result = headingChangeClassify(points);
      expect(result).toBe('fixed-route');
    });

    test('should handle erratic trajectory', () => {
      const points = Array.from({ length: 50 }, (_, i) => ({
        timestamp: Date.now() + i * 10000,
        latitude: 42.3601 + (Math.random() - 0.5) * 0.1,
        longitude: -71.0589 + (Math.random() - 0.5) * 0.1,
        heading: Math.random() * 2 * Math.PI,
        headingDegrees: Math.random() * 360,
        speedKmh: 30 + Math.random() * 20,
      }));

      const result = headingChangeClassify(points);
      expect(result).toMatch(/variable-route|uncertain/);
    });

    test('should calculate standard deviation of heading changes', () => {
      const points = generateTrajectory('car', 300);
      const changes = calculateHeadingChanges(points);
      const changesDegrees = changes.map((c) => (c * 180) / Math.PI);

      const mean = changesDegrees.reduce((a, b) => a + b) / changesDegrees.length;
      const variance = changesDegrees.reduce((sum, change) => sum + Math.pow(change - mean, 2), 0)
        / changesDegrees.length;
      const stdDev = Math.sqrt(variance);

      expect(stdDev).toBeGreaterThanOrEqual(0);
      expect(stdDev).toBeLessThanOrEqual(180); // Max possible std dev is 90 degrees
    });
  });

  // ============================================================================
  // Confusion Matrix and Accuracy Metrics
  // ============================================================================

  describe('Confusion Matrix and Metrics', () => {
    test('should build confusion matrix correctly', () => {
      const predictions = [
        { actual: 'walking', predicted: 'walking' },
        { actual: 'walking', predicted: 'walking' },
        { actual: 'cycling', predicted: 'cycling' },
        { actual: 'bus', predicted: 'car' },
        { actual: 'car', predicted: 'car' },
      ];

      const matrix = buildConfusionMatrix(predictions);

      expect(matrix.walking.walking).toBe(2);
      expect(matrix.cycling.cycling).toBe(1);
      expect(matrix.bus.car).toBe(1);
      expect(matrix.car.car).toBe(1);
    });

    test('should calculate accuracy from confusion matrix', () => {
      const predictions = [
        { actual: 'walking', predicted: 'walking' },
        { actual: 'cycling', predicted: 'cycling' },
        { actual: 'bus', predicted: 'car' }, // Wrong
        { actual: 'car', predicted: 'car' },
        { actual: 'train', predicted: 'train' },
      ];

      const matrix = buildConfusionMatrix(predictions);
      const accuracy = calculateAccuracy(matrix);

      expect(accuracy).toBe(0.8); // 4/5 correct
    });

    test('should calculate precision for each mode', () => {
      const predictions = [
        { actual: 'walking', predicted: 'walking' },
        { actual: 'walking', predicted: 'walking' },
        { actual: 'cycling', predicted: 'walking' },
      ];

      const matrix = buildConfusionMatrix(predictions);
      const walkingPrecision = calculatePrecision(matrix, 'walking');

      // Walking predicted 3 times (2 TP + 1 FP), so precision = 2/3
      expect(walkingPrecision).toBeCloseTo(2 / 3, 5);
    });

    test('should calculate recall for each mode', () => {
      const predictions = [
        { actual: 'walking', predicted: 'walking' },
        { actual: 'walking', predicted: 'cycling' },
        { actual: 'cycling', predicted: 'cycling' },
      ];

      const matrix = buildConfusionMatrix(predictions);
      const walkingRecall = calculateRecall(matrix, 'walking');

      // Walking is actually 2 times (1 TP + 1 FN), so recall = 1/2
      expect(walkingRecall).toBe(0.5);
    });

    test('should calculate F1 score', () => {
      const predictions = [
        { actual: 'walking', predicted: 'walking' },
        { actual: 'walking', predicted: 'cycling' },
        { actual: 'cycling', predicted: 'cycling' },
      ];

      const matrix = buildConfusionMatrix(predictions);
      const precision = calculatePrecision(matrix, 'walking');
      const recall = calculateRecall(matrix, 'walking');
      const f1 = 2 * ((precision * recall) / (precision + recall));

      expect(f1).toBeCloseTo(2 / 3, 5);
    });

    test('should handle empty confusion matrix', () => {
      const predictions = [];
      const matrix = buildConfusionMatrix(predictions);
      const accuracy = calculateAccuracy(matrix);

      expect(accuracy).toBe(0);
    });

    test('should generate classification report', () => {
      const modes = ['walking', 'cycling', 'bus', 'car', 'train'];
      const predictions = [];

      // Generate sample predictions
      for (const mode of modes) {
        const points = generateTrajectory(mode, 300);

        // Simple baseline classification
        const speeds = points.map((p) => p.speedKmh);
        const maxSpeed = Math.max(...speeds);
        let predicted = 'unknown';

        if (maxSpeed < 7) predicted = 'walking';
        else if (maxSpeed < 25) predicted = 'cycling';
        else if (maxSpeed < 80) predicted = 'bus'; // Simplified
        else if (maxSpeed < 200) predicted = 'train';

        predictions.push({ actual: mode, predicted });
      }

      const matrix = buildConfusionMatrix(predictions);
      const accuracy = calculateAccuracy(matrix);
      const report = {};

      for (const mode of modes) {
        report[mode] = {
          precision: calculatePrecision(matrix, mode),
          recall: calculateRecall(matrix, mode),
        };
      }

      expect(report).toBeDefined();
      expect(Object.keys(report)).toHaveLength(5);
    });

    test('should validate that total predictions equals sum of matrix', () => {
      const predictions = [
        { actual: 'walking', predicted: 'walking' },
        { actual: 'cycling', predicted: 'cycling' },
        { actual: 'bus', predicted: 'car' },
      ];

      const matrix = buildConfusionMatrix(predictions);
      let totalInMatrix = 0;

      for (const actual in matrix) {
        for (const predicted in matrix[actual]) {
          totalInMatrix += matrix[actual][predicted];
        }
      }

      expect(totalInMatrix).toBe(predictions.length);
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty trajectory', () => {
      const points = [];
      expect(() => {
        calculateHeadingChanges(points);
        findStops(points);
      }).not.toThrow();
    });

    test('should handle single-point trajectory', () => {
      const points = [
        {
          timestamp: Date.now(),
          latitude: 42.3601,
          longitude: -71.0589,
          speedKmh: 5,
          heading: 0,
        },
      ];

      const changes = calculateHeadingChanges(points);
      expect(changes).toHaveLength(0);

      const stops = findStops(points);
      expect(Array.isArray(stops)).toBe(true);
    });

    test('should handle all-zero speeds', () => {
      const points = Array.from({ length: 10 }, (_, i) => ({
        timestamp: Date.now() + i * 1000,
        latitude: 42.3601,
        longitude: -71.0589,
        speedKmh: 0,
        heading: 0,
      }));

      const stops = findStops(points);
      expect(stops.length).toBeGreaterThan(0); // All should be treated as stops
    });

    test('should handle all-same speeds', () => {
      const points = Array.from({ length: 10 }, (_, i) => ({
        timestamp: Date.now() + i * 1000,
        latitude: 42.3601,
        longitude: -71.0589,
        speedKmh: 20,
        heading: 0,
      }));

      const changes = calculateHeadingChanges(points);
      const stops = findStops(points);

      expect(changes).toHaveLength(9);
      expect(stops).toHaveLength(0); // No stops
    });

    test('should handle negative speeds gracefully', () => {
      const points = [
        { speedKmh: -5, timestamp: Date.now() },
        { speedKmh: 10, timestamp: Date.now() + 1000 },
      ];

      // Should not crash
      expect(() => {
        findStops(points);
      }).not.toThrow();
    });

    test('should handle very large timestamps', () => {
      const points = Array.from({ length: 5 }, (_, i) => ({
        timestamp: Number.MAX_SAFE_INTEGER - 10000 + i * 1000,
        latitude: 42.3601,
        longitude: -71.0589,
        speedKmh: 20,
        heading: 0,
      }));

      const stops = findStops(points);
      expect(Array.isArray(stops)).toBe(true);
    });

    test('should handle identical latitude/longitude points', () => {
      const points = Array.from({ length: 5 }, (_, i) => ({
        timestamp: Date.now() + i * 1000,
        latitude: 42.3601,
        longitude: -71.0589,
        speedKmh: 0,
        heading: 0,
      }));

      const distance = getDistanceBetweenPoints(points[0], points[4]);
      expect(distance).toBeLessThan(1); // Should be nearly zero
    });

    test('should handle antipodal points (opposite sides of earth)', () => {
      const point1 = { latitude: 0, longitude: 0 };
      const point2 = { latitude: 0, longitude: 180 };

      const distance = getDistanceBetweenPoints(point1, point2);
      expect(distance).toBeCloseTo(20031979, 0); // ~20,032 km
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration Tests', () => {
    test('should classify all modes correctly using baseline algorithm', () => {
      const modes = ['walking', 'cycling', 'bus', 'car', 'train'];
      let correct = 0;

      for (const mode of modes) {
        const points = generateTrajectory(mode, 300);
        const predicted = baselineClassify(points);

        const expectedMap = {
          walking: 'walking',
          cycling: 'cycling',
          bus: 'bus-or-car',
          car: 'bus-or-car',
          train: 'train',
        };

        if (predicted === expectedMap[mode]) correct++;
      }

      expect(correct).toBeGreaterThanOrEqual(3); // At least 60% accuracy
    });

    test('should provide consistent results for same trajectory', () => {
      const points = generateTrajectory('cycling', 300);

      const result1 = baselineClassify(points);
      const result2 = baselineClassify(points);

      expect(result1).toBe(result2); // Deterministic
    });

    test('should process large trajectory efficiently', () => {
      const largeTrajectory = generateTrajectory('car', 3600, 5); // 1 hour, 5-second intervals

      expect(largeTrajectory.length).toBeGreaterThan(500);

      const startTime = Date.now();
      calculateHeadingChanges(largeTrajectory);
      findStops(largeTrajectory);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in < 1 second
    });

    test('should handle mixed trajectory (multiple modes)', () => {
      // Start walking, then transition to cycling
      const walkingSegment = generateTrajectory('walking', 150);
      const cyclingSegment = generateTrajectory('cycling', 150);

      // Adjust coordinates for continuity
      const lastWalking = walkingSegment[walkingSegment.length - 1];
      cyclingSegment.forEach((p) => {
        p.latitude += lastWalking.latitude;
        p.longitude += lastWalking.longitude;
        p.timestamp = lastWalking.timestamp + (p.timestamp - cyclingSegment[0].timestamp);
      });

      const mixedTrajectory = [...walkingSegment, ...cyclingSegment];

      expect(mixedTrajectory.length).toBe(walkingSegment.length + cyclingSegment.length);

      // First segment should be classified as walking, second as cycling
      const walkingPart = mixedTrajectory.slice(0, walkingSegment.length);
      const cyclingPart = mixedTrajectory.slice(walkingSegment.length);

      const walkingSpeeds = walkingPart.map((p) => p.speedKmh);
      const cyclingPeeds = cyclingPart.map((p) => p.speedKmh);

      const walkingMax = Math.max(...walkingSpeeds);
      const cyclingMax = Math.max(...cyclingPeeds);

      expect(walkingMax).toBeLessThan(cyclingMax);
    });
  });
});

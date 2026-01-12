/**
 * Transportation Mode Detection Algorithms
 * Comparing 4 different approaches to classify transportation modes from GPS data
 */

// Transportation mode categories
const TRANSPORT_MODES = {
    WALKING: 'walking',
    CYCLING: 'cycling',
    BUS: 'bus',
    CAR: 'car',
    TRAIN: 'train'
};

// Ground truth labels from sensor data
function getSensorTransportMode(motion) {
    if (!motion) return 'unknown';
    if (motion.isWalking || motion.isRunning) return TRANSPORT_MODES.WALKING;
    if (motion.isCycling) return TRANSPORT_MODES.CYCLING;
    if (motion.isAutomotive) return 'automotive'; // Could be bus, car, or train
    if (motion.isStationary) return 'stationary';
    return 'unknown';
}

/**
 * ALGORITHM 1: Baseline Speed Thresholds
 * Simple speed-based classification using fixed thresholds
 */
function classifyBaseline(speedData) {
    return speedData.map(point => {
        const speed = point.speed; // m/s

        if (speed < 0.15) return 'stationary';
        if (speed < 2.0) return TRANSPORT_MODES.WALKING;
        if (speed < 8.0) return TRANSPORT_MODES.CYCLING;
        if (speed < 15.0) return TRANSPORT_MODES.BUS;
        if (speed < 25.0) return TRANSPORT_MODES.CAR;
        return TRANSPORT_MODES.TRAIN;
    });
}

/**
 * ALGORITHM 2: Percentile-based Speed Analysis (95th percentile)
 * Uses 95th percentile speed over sliding window to distinguish sustained speed
 */
function classifyPercentile95(speedData, windowSize = 5) {
    return speedData.map((point, idx) => {
        // Get window of speeds
        const start = Math.max(0, idx - Math.floor(windowSize / 2));
        const end = Math.min(speedData.length, idx + Math.ceil(windowSize / 2));
        const windowSpeeds = speedData.slice(start, end).map(p => p.speed).sort((a, b) => a - b);

        // Calculate 95th percentile
        const percentile95Index = Math.floor(windowSpeeds.length * 0.95);
        const speed95 = windowSpeeds[percentile95Index];

        if (speed95 < 0.15) return 'stationary';
        if (speed95 < 2.0) return TRANSPORT_MODES.WALKING;
        if (speed95 < 6.0) return TRANSPORT_MODES.CYCLING;
        if (speed95 < 13.0) return TRANSPORT_MODES.BUS;
        if (speed95 < 22.0) return TRANSPORT_MODES.CAR;
        return TRANSPORT_MODES.TRAIN;
    });
}

/**
 * ALGORITHM 3: Stop Pattern Analysis
 * Analyzes frequency of stops to distinguish bus (frequent stops) from car/train
 */
function classifyStopPattern(speedData, windowSize = 10) {
    return speedData.map((point, idx) => {
        // Get window
        const start = Math.max(0, idx - Math.floor(windowSize / 2));
        const end = Math.min(speedData.length, idx + Math.ceil(windowSize / 2));
        const window = speedData.slice(start, end);

        // Count stops (speed < 0.5 m/s)
        const stops = window.filter(p => p.speed < 0.5).length;
        const stopFrequency = stops / window.length;

        // Calculate average speed when moving (speed > 0.5 m/s)
        const movingSpeeds = window.filter(p => p.speed >= 0.5).map(p => p.speed);
        const avgMovingSpeed = movingSpeeds.length > 0
            ? movingSpeeds.reduce((sum, s) => sum + s, 0) / movingSpeeds.length
            : 0;

        // Classification logic
        if (point.speed < 0.15) return 'stationary';
        if (avgMovingSpeed < 2.0) return TRANSPORT_MODES.WALKING;
        if (avgMovingSpeed < 8.0) return TRANSPORT_MODES.CYCLING;

        // Use stop frequency to distinguish bus from car/train
        if (stopFrequency > 0.3) {
            // Frequent stops = likely bus
            return TRANSPORT_MODES.BUS;
        } else {
            // Less frequent stops = car or train
            if (avgMovingSpeed > 20.0) {
                return TRANSPORT_MODES.TRAIN;
            } else {
                return TRANSPORT_MODES.CAR;
            }
        }
    });
}

/**
 * ALGORITHM 4: Heading Change Analysis
 * Uses rate of heading/direction changes to distinguish straight-line (train) from variable (car/bus)
 */
function classifyHeadingChange(speedData, windowSize = 10) {
    return speedData.map((point, idx) => {
        // Get window
        const start = Math.max(0, idx - Math.floor(windowSize / 2));
        const end = Math.min(speedData.length, idx + Math.ceil(windowSize / 2));
        const window = speedData.slice(start, end);

        // Calculate heading changes
        let totalHeadingChange = 0;
        for (let i = 1; i < window.length; i++) {
            const prev = window[i - 1];
            const curr = window[i];

            // Calculate bearing between points
            const bearing1 = calculateBearing(
                prev.prevPoint.latitude, prev.prevPoint.longitude,
                prev.latitude, prev.longitude
            );
            const bearing2 = calculateBearing(
                curr.prevPoint.latitude, curr.prevPoint.longitude,
                curr.latitude, curr.longitude
            );

            // Calculate change in bearing
            let change = Math.abs(bearing2 - bearing1);
            if (change > 180) change = 360 - change; // Normalize to 0-180

            totalHeadingChange += change;
        }

        const avgHeadingChange = window.length > 1 ? totalHeadingChange / (window.length - 1) : 0;
        const avgSpeed = window.reduce((sum, p) => sum + p.speed, 0) / window.length;

        // Classification
        if (point.speed < 0.15) return 'stationary';
        if (avgSpeed < 2.0) return TRANSPORT_MODES.WALKING;
        if (avgSpeed < 8.0) return TRANSPORT_MODES.CYCLING;

        // Use heading variance to distinguish between modes
        if (avgHeadingChange < 5) {
            // Very straight path = likely train
            return TRANSPORT_MODES.TRAIN;
        } else if (avgHeadingChange < 20) {
            // Moderately straight = car
            return TRANSPORT_MODES.CAR;
        } else {
            // Variable path = bus (more turns in urban environment)
            return TRANSPORT_MODES.BUS;
        }
    });
}

/**
 * Calculate bearing between two points
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360; // Normalize to 0-360
}

/**
 * Build confusion matrix for an algorithm's predictions
 */
function buildConfusionMatrix(predictions, groundTruth, modes) {
    const matrix = {};
    modes.forEach(mode => {
        matrix[mode] = {};
        modes.forEach(m => matrix[mode][m] = 0);
    });

    for (let i = 0; i < predictions.length; i++) {
        const predicted = predictions[i];
        const actual = groundTruth[i];

        if (matrix[actual] && matrix[actual][predicted] !== undefined) {
            matrix[actual][predicted]++;
        }
    }

    return matrix;
}

/**
 * Calculate accuracy metrics from confusion matrix
 */
function calculateAccuracyMetrics(confusionMatrix, modes) {
    let totalCorrect = 0;
    let total = 0;
    const perClassAccuracy = {};

    modes.forEach(mode => {
        let classTotal = 0;
        let classCorrect = 0;

        modes.forEach(predicted => {
            const count = confusionMatrix[mode][predicted] || 0;
            classTotal += count;
            if (mode === predicted) {
                classCorrect = count;
            }
        });

        total += classTotal;
        totalCorrect += classCorrect;
        perClassAccuracy[mode] = classTotal > 0 ? (classCorrect / classTotal) * 100 : 0;
    });

    const overallAccuracy = total > 0 ? (totalCorrect / total) * 100 : 0;

    return {
        overallAccuracy,
        perClassAccuracy
    };
}

/**
 * Run all algorithms and compare results
 */
function compareAlgorithms(speedData) {
    const startTime = performance.now();

    // Run all algorithms
    const baselinePredictions = classifyBaseline(speedData);
    const baselineTime = performance.now() - startTime;

    const percentile95Predictions = classifyPercentile95(speedData);
    const percentile95Time = performance.now() - startTime - baselineTime;

    const stopPatternPredictions = classifyStopPattern(speedData);
    const stopPatternTime = performance.now() - startTime - baselineTime - percentile95Time;

    const headingChangePredictions = classifyHeadingChange(speedData);
    const headingChangeTime = performance.now() - startTime - baselineTime - percentile95Time - stopPatternTime;

    // Note: We don't have ground truth for bus/car/train distinction from sensor data
    // So we'll create simplified ground truth based on sensor + speed
    const groundTruth = speedData.map(point => {
        const motion = typeof findNearestMotion !== 'undefined'
            ? findNearestMotion(point.timestamp, window.motionData)
            : window.findNearestMotion(point.timestamp, window.motionData);
        const sensorMode = getSensorTransportMode(motion);

        // For automotive, we need to infer bus/car/train from speed
        if (sensorMode === 'automotive') {
            if (point.speed > 25) return TRANSPORT_MODES.TRAIN;
            if (point.speed > 15) return TRANSPORT_MODES.CAR;
            return TRANSPORT_MODES.BUS;
        }

        return sensorMode;
    });

    // Build confusion matrices (include all possible modes)
    const modes = [TRANSPORT_MODES.WALKING, TRANSPORT_MODES.CYCLING, TRANSPORT_MODES.BUS,
                   TRANSPORT_MODES.CAR, TRANSPORT_MODES.TRAIN, 'stationary', 'unknown'];

    const baselineMatrix = buildConfusionMatrix(baselinePredictions, groundTruth, modes);
    const percentile95Matrix = buildConfusionMatrix(percentile95Predictions, groundTruth, modes);
    const stopPatternMatrix = buildConfusionMatrix(stopPatternPredictions, groundTruth, modes);
    const headingChangeMatrix = buildConfusionMatrix(headingChangePredictions, groundTruth, modes);

    // Calculate metrics
    const baselineMetrics = calculateAccuracyMetrics(baselineMatrix, modes);
    const percentile95Metrics = calculateAccuracyMetrics(percentile95Matrix, modes);
    const stopPatternMetrics = calculateAccuracyMetrics(stopPatternMatrix, modes);
    const headingChangeMetrics = calculateAccuracyMetrics(headingChangeMatrix, modes);

    return {
        algorithms: {
            baseline: {
                name: 'Baseline Speed Thresholds',
                description: 'Simple fixed speed thresholds',
                predictions: baselinePredictions,
                confusionMatrix: baselineMatrix,
                metrics: baselineMetrics,
                processingTime: baselineTime
            },
            percentile95: {
                name: '95th Percentile Speed',
                description: 'Uses 95th percentile in sliding window',
                predictions: percentile95Predictions,
                confusionMatrix: percentile95Matrix,
                metrics: percentile95Metrics,
                processingTime: percentile95Time
            },
            stopPattern: {
                name: 'Stop Pattern Analysis',
                description: 'Analyzes frequency of stops',
                predictions: stopPatternPredictions,
                confusionMatrix: stopPatternMatrix,
                metrics: stopPatternMetrics,
                processingTime: stopPatternTime
            },
            headingChange: {
                name: 'Heading Change Analysis',
                description: 'Analyzes direction changes',
                predictions: headingChangePredictions,
                confusionMatrix: headingChangeMatrix,
                metrics: headingChangeMetrics,
                processingTime: headingChangeTime
            }
        },
        modes,
        groundTruth
    };
}

// Make functions available globally for use in dashboard
if (typeof window !== 'undefined') {
    window.compareAlgorithms = compareAlgorithms;
    window.TRANSPORT_MODES = TRANSPORT_MODES;
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        compareAlgorithms,
        TRANSPORT_MODES
    };
}

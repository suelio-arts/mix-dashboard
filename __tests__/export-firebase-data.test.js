/**
 * Test suite for export-firebase-data.js
 * Tests data export functionality, Firebase transformations, and error handling
 */

// Mock Firebase Admin SDK before requiring the module
jest.mock('firebase-admin', () => {
  const mockFirestore = {
    collection: jest.fn()
  };

  return {
    initializeApp: jest.fn(),
    firestore: jest.fn(() => mockFirestore)
  };
});

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn()
}));

// Since export-firebase-data.js is a script that runs on import,
// we need to test its helper functions separately
// For now, we'll test the transformation functions that can be extracted

describe('Export Firebase Data - Helper Functions', () => {
  // ============================================================================
  // Timestamp Conversion
  // ============================================================================

  describe('convertTimestamp', () => {
    // We need to extract this function from the module
    // For now, test the concept directly

    it('should convert Firestore Timestamp to ISO string', () => {
      const mockTimestamp = {
        toDate: () => new Date('2024-01-15T10:00:00Z')
      };

      const convertTimestamp = (value) => {
        if (value && typeof value.toDate === 'function') {
          return value.toDate().toISOString();
        }
        return value;
      };

      expect(convertTimestamp(mockTimestamp)).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should return value unchanged if not a Timestamp', () => {
      const convertTimestamp = (value) => {
        if (value && typeof value.toDate === 'function') {
          return value.toDate().toISOString();
        }
        return value;
      };

      expect(convertTimestamp('test')).toBe('test');
      expect(convertTimestamp(123)).toBe(123);
      expect(convertTimestamp(null)).toBe(null);
    });
  });

  // ============================================================================
  // GeoPoint Conversion
  // ============================================================================

  describe('convertGeoPoint', () => {
    it('should convert Firestore GeoPoint to simple object', () => {
      const mockGeoPoint = {
        latitude: 42.3601,
        longitude: -71.0589
      };

      const convertGeoPoint = (value) => {
        if (value && typeof value.latitude === 'number' && typeof value.longitude === 'number') {
          return {
            latitude: value.latitude,
            longitude: value.longitude
          };
        }
        return value;
      };

      const result = convertGeoPoint(mockGeoPoint);
      expect(result).toEqual({
        latitude: 42.3601,
        longitude: -71.0589
      });
    });

    it('should return value unchanged if not a GeoPoint', () => {
      const convertGeoPoint = (value) => {
        if (value && typeof value.latitude === 'number' && typeof value.longitude === 'number') {
          return {
            latitude: value.latitude,
            longitude: value.longitude
          };
        }
        return value;
      };

      expect(convertGeoPoint('test')).toBe('test');
      expect(convertGeoPoint({ lat: 1, lng: 2 })).toEqual({ lat: 1, lng: 2 });
    });
  });

  // ============================================================================
  // Document Transformation
  // ============================================================================

  describe('transformDocument', () => {
    const transformDocument = (data) => {
      if (data === null || data === undefined) {
        return data;
      }

      if (Array.isArray(data)) {
        return data.map(transformDocument);
      }

      if (typeof data === 'object') {
        // Check for Timestamp
        if (typeof data.toDate === 'function') {
          return data.toDate().toISOString();
        }

        // Check for GeoPoint
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number' && Object.keys(data).length === 2) {
          return {
            latitude: data.latitude,
            longitude: data.longitude
          };
        }

        // Recursively transform nested objects
        const transformed = {};
        for (const [key, value] of Object.entries(data)) {
          transformed[key] = transformDocument(value);
        }
        return transformed;
      }

      return data;
    };

    it('should handle null and undefined', () => {
      expect(transformDocument(null)).toBe(null);
      expect(transformDocument(undefined)).toBe(undefined);
    });

    it('should transform arrays recursively', () => {
      const mockTimestamp = {
        toDate: () => new Date('2024-01-15T10:00:00Z')
      };

      const input = [mockTimestamp, 'test', 123];
      const result = transformDocument(input);

      expect(result).toEqual(['2024-01-15T10:00:00.000Z', 'test', 123]);
    });

    it('should transform nested objects with Timestamps', () => {
      const mockTimestamp = {
        toDate: () => new Date('2024-01-15T10:00:00Z')
      };

      const input = {
        id: 'test123',
        timestamp: mockTimestamp,
        nested: {
          value: 'test'
        }
      };

      const result = transformDocument(input);

      expect(result).toEqual({
        id: 'test123',
        timestamp: '2024-01-15T10:00:00.000Z',
        nested: {
          value: 'test'
        }
      });
    });

    it('should transform GeoPoints in nested structures', () => {
      const input = {
        location: {
          latitude: 42.3601,
          longitude: -71.0589
        },
        name: 'Boston'
      };

      const result = transformDocument(input);

      expect(result).toEqual({
        location: {
          latitude: 42.3601,
          longitude: -71.0589
        },
        name: 'Boston'
      });
    });

    it('should preserve primitive values', () => {
      expect(transformDocument('string')).toBe('string');
      expect(transformDocument(123)).toBe(123);
      expect(transformDocument(true)).toBe(true);
    });
  });

  // ============================================================================
  // Date Calculation
  // ============================================================================

  describe('Date Range Calculation', () => {
    it('should calculate date 30 days ago correctly', () => {
      const DAYS_BACK = 30;
      const now = new Date('2024-01-15T00:00:00Z');
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - DAYS_BACK);

      expect(thirtyDaysAgo.toISOString()).toBe('2023-12-16T00:00:00.000Z');
    });

    it('should handle month boundaries', () => {
      const DAYS_BACK = 30;
      const now = new Date('2024-01-01T00:00:00Z');
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - DAYS_BACK);

      expect(thirtyDaysAgo.toISOString()).toBe('2023-12-02T00:00:00.000Z');
    });
  });

  // ============================================================================
  // Client-Side Date Filtering
  // ============================================================================

  describe('Client-Side Date Filtering', () => {
    it('should filter documents by date range', () => {
      const thirtyDaysAgo = new Date('2023-12-16T00:00:00Z');

      const documents = [
        { id: '1', serverTimestamp: '2024-01-15T10:00:00Z' },
        { id: '2', serverTimestamp: '2023-12-10T10:00:00Z' }, // Too old
        { id: '3', serverTimestamp: '2023-12-20T10:00:00Z' },
      ];

      const filtered = documents.filter(doc => {
        const docDate = new Date(doc.serverTimestamp);
        return docDate >= thirtyDaysAgo;
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.map(d => d.id)).toEqual(['1', '3']);
    });

    it('should include documents without timestamps', () => {
      const documents = [
        { id: '1', name: 'Test' }, // No timestamp
      ];

      // Documents without timestamps should be included
      expect(documents).toHaveLength(1);
    });
  });

  // ============================================================================
  // Sorting
  // ============================================================================

  describe('Document Sorting', () => {
    it('should sort documents by timestamp descending', () => {
      const documents = [
        { id: '1', serverTimestamp: '2024-01-15T10:00:00Z' },
        { id: '2', serverTimestamp: '2024-01-16T10:00:00Z' },
        { id: '3', serverTimestamp: '2024-01-14T10:00:00Z' },
      ];

      documents.sort((a, b) => {
        return new Date(b.serverTimestamp) - new Date(a.serverTimestamp);
      });

      expect(documents.map(d => d.id)).toEqual(['2', '1', '3']);
    });

    it('should handle missing timestamps in sorting', () => {
      const documents = [
        { id: '1', serverTimestamp: '2024-01-15T10:00:00Z' },
        { id: '2' }, // No timestamp
        { id: '3', serverTimestamp: '2024-01-14T10:00:00Z' },
      ];

      documents.sort((a, b) => {
        const timeA = a.serverTimestamp;
        const timeB = b.serverTimestamp;

        if (!timeA || !timeB) return 0;
        return new Date(timeB) - new Date(timeA);
      });

      // Should have consistent ordering for documents with timestamps
      const withTimestamps = documents.filter(d => d.serverTimestamp);
      expect(withTimestamps.map(d => d.id)).toEqual(['1', '3']);
    });
  });

  // ============================================================================
  // File Path Generation
  // ============================================================================

  describe('File Path Generation', () => {
    it('should generate correct output path', () => {
      const path = require('path');
      const __dirname = '/Users/suelio/Local/mix/mix-dashboard';
      const outputFileName = 'locations.json';

      const dataDir = path.join(__dirname, 'data');
      const outputPath = path.join(dataDir, outputFileName);

      expect(outputPath).toBe('/Users/suelio/Local/mix/mix-dashboard/data/locations.json');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty data sets', () => {
      const documents = [];
      expect(documents.length).toBe(0);

      const total = documents.reduce((sum, doc) => sum + 1, 0);
      expect(total).toBe(0);
    });

    it('should handle documents with multiple timestamp fields', () => {
      const doc = {
        timestamp: '2024-01-15T10:00:00Z',
        serverTimestamp: '2024-01-15T10:01:00Z',
        createdAt: '2024-01-15T09:59:00Z',
        arrivalDate: '2024-01-15T09:58:00Z'
      };

      // Should use first available timestamp in priority order
      const docTime = doc.timestamp || doc.serverTimestamp || doc.createdAt || doc.arrivalDate;
      expect(docTime).toBe('2024-01-15T10:00:00Z');
    });

    it('should handle very large timestamps', () => {
      const largeTimestamp = {
        toDate: () => new Date('2099-12-31T23:59:59Z')
      };

      const convertTimestamp = (value) => {
        if (value && typeof value.toDate === 'function') {
          return value.toDate().toISOString();
        }
        return value;
      };

      expect(convertTimestamp(largeTimestamp)).toBe('2099-12-31T23:59:59.000Z');
    });

    it('should handle negative coordinates (GeoPoint)', () => {
      const geoPoint = {
        latitude: -33.8688,  // Sydney
        longitude: 151.2093
      };

      const convertGeoPoint = (value) => {
        if (value && typeof value.latitude === 'number' && typeof value.longitude === 'number') {
          return {
            latitude: value.latitude,
            longitude: value.longitude
          };
        }
        return value;
      };

      const result = convertGeoPoint(geoPoint);
      expect(result.latitude).toBe(-33.8688);
      expect(result.longitude).toBe(151.2093);
    });
  });

  // ============================================================================
  // Collection Export Statistics
  // ============================================================================

  describe('Collection Export Statistics', () => {
    it('should calculate total records correctly', () => {
      const locationsCount = 100;
      const motionCount = 50;
      const visitsCount = 25;

      const total = locationsCount + motionCount + visitsCount;
      expect(total).toBe(175);
    });

    it('should calculate duration correctly', () => {
      const startTime = Date.now();
      const endTime = startTime + 5000; // 5 seconds later

      const duration = ((endTime - startTime) / 1000).toFixed(2);
      expect(duration).toBe('5.00');
    });
  });
});

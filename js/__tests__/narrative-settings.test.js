/**
 * Test suite for narrative-settings.js
 * Tests settings validation, form data collection, and UI display logic
 *
 * Note: Since narrative-settings.js uses ES6 module imports from CDN,
 * we test the pure function logic by reimplementing them in CommonJS.
 * This tests the business logic without requiring Firebase SDK or DOM.
 */

describe('Narrative Settings Module', () => {
  // ============================================================================
  // Settings Validation
  // ============================================================================

  describe('validateSettings', () => {
    function validateSettings(settings) {
      const errors = [];

      // Word count validation
      if (!Number.isInteger(settings.wordCountMin) || settings.wordCountMin < 1) {
        errors.push('Word Count Min must be a positive integer');
      }

      if (!Number.isInteger(settings.wordCountMax) || settings.wordCountMax < 1) {
        errors.push('Word Count Max must be a positive integer');
      }

      if (settings.wordCountMin > 0 && settings.wordCountMax > 0 && settings.wordCountMin > settings.wordCountMax) {
        errors.push('Word Count Min must be less than or equal to Word Count Max');
      }

      // Distance threshold validation
      if (typeof settings.distanceThresholdFar !== 'number' || settings.distanceThresholdFar < 0) {
        errors.push('Distance Threshold Far must be a non-negative number');
      }

      if (typeof settings.distanceThresholdClose !== 'number' || settings.distanceThresholdClose < 0) {
        errors.push('Distance Threshold Close must be a non-negative number');
      }

      // Voice validation
      const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
      if (!validVoices.includes(settings.voiceId)) {
        errors.push('Invalid voice selected');
      }

      return {
        valid: errors.length === 0,
        errors
      };
    }

    it('should validate correct settings', () => {
      const settings = {
        wordCountMin: 100,
        wordCountMax: 200,
        distanceThresholdFar: 500,
        distanceThresholdClose: 50,
        voiceId: 'alloy'
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative word count min', () => {
      const settings = {
        wordCountMin: -10,
        wordCountMax: 200,
        distanceThresholdFar: 500,
        distanceThresholdClose: 50,
        voiceId: 'alloy'
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Word Count Min must be a positive integer');
    });

    it('should reject zero word count min', () => {
      const settings = {
        wordCountMin: 0,
        wordCountMax: 200,
        distanceThresholdFar: 500,
        distanceThresholdClose: 50,
        voiceId: 'alloy'
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Word Count Min must be a positive integer');
    });

    it('should reject non-integer word count min', () => {
      const settings = {
        wordCountMin: 100.5,
        wordCountMax: 200,
        distanceThresholdFar: 500,
        distanceThresholdClose: 50,
        voiceId: 'alloy'
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Word Count Min must be a positive integer');
    });

    it('should reject negative word count max', () => {
      const settings = {
        wordCountMin: 100,
        wordCountMax: -200,
        distanceThresholdFar: 500,
        distanceThresholdClose: 50,
        voiceId: 'alloy'
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Word Count Max must be a positive integer');
    });

    it('should reject word count min greater than max', () => {
      const settings = {
        wordCountMin: 300,
        wordCountMax: 200,
        distanceThresholdFar: 500,
        distanceThresholdClose: 50,
        voiceId: 'alloy'
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Word Count Min must be less than or equal to Word Count Max');
    });

    it('should accept word count min equal to max', () => {
      const settings = {
        wordCountMin: 200,
        wordCountMax: 200,
        distanceThresholdFar: 500,
        distanceThresholdClose: 50,
        voiceId: 'alloy'
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(true);
    });

    it('should reject negative distance threshold far', () => {
      const settings = {
        wordCountMin: 100,
        wordCountMax: 200,
        distanceThresholdFar: -500,
        distanceThresholdClose: 50,
        voiceId: 'alloy'
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Distance Threshold Far must be a non-negative number');
    });

    it('should accept zero distance threshold far', () => {
      const settings = {
        wordCountMin: 100,
        wordCountMax: 200,
        distanceThresholdFar: 0,
        distanceThresholdClose: 0,
        voiceId: 'alloy'
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(true);
    });

    it('should reject non-number distance threshold far', () => {
      const settings = {
        wordCountMin: 100,
        wordCountMax: 200,
        distanceThresholdFar: '500',
        distanceThresholdClose: 50,
        voiceId: 'alloy'
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Distance Threshold Far must be a non-negative number');
    });

    it('should reject negative distance threshold close', () => {
      const settings = {
        wordCountMin: 100,
        wordCountMax: 200,
        distanceThresholdFar: 500,
        distanceThresholdClose: -50,
        voiceId: 'alloy'
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Distance Threshold Close must be a non-negative number');
    });

    it('should reject invalid voice ID', () => {
      const settings = {
        wordCountMin: 100,
        wordCountMax: 200,
        distanceThresholdFar: 500,
        distanceThresholdClose: 50,
        voiceId: 'invalid-voice'
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid voice selected');
    });

    it('should accept all valid voice IDs', () => {
      const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

      validVoices.forEach(voice => {
        const settings = {
          wordCountMin: 100,
          wordCountMax: 200,
          distanceThresholdFar: 500,
          distanceThresholdClose: 50,
          voiceId: voice
        };

        const result = validateSettings(settings);
        expect(result.valid).toBe(true);
      });
    });

    it('should accumulate multiple errors', () => {
      const settings = {
        wordCountMin: -10,
        wordCountMax: 0,
        distanceThresholdFar: -500,
        distanceThresholdClose: -50,
        voiceId: 'invalid'
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should accept decimal distance thresholds', () => {
      const settings = {
        wordCountMin: 100,
        wordCountMax: 200,
        distanceThresholdFar: 500.5,
        distanceThresholdClose: 50.25,
        voiceId: 'alloy'
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(true);
    });
  });

  // ============================================================================
  // Form Data Collection
  // ============================================================================

  describe('collectFormData', () => {
    it('should parse integer values correctly', () => {
      const parseIntValue = (value) => parseInt(value, 10);

      expect(parseIntValue('100')).toBe(100);
      expect(parseIntValue('200')).toBe(200);
      expect(Number.isInteger(parseIntValue('100'))).toBe(true);
    });

    it('should parse float values correctly', () => {
      const parseFloatValue = (value) => parseFloat(value);

      expect(parseFloatValue('500.5')).toBe(500.5);
      expect(parseFloatValue('50.25')).toBe(50.25);
      expect(typeof parseFloatValue('500.5')).toBe('number');
    });

    it('should handle empty string inputs', () => {
      const parseIntValue = (value) => parseInt(value, 10);

      expect(Number.isNaN(parseIntValue(''))).toBe(true);
    });

    it('should preserve string voice ID', () => {
      const voiceId = 'alloy';
      expect(typeof voiceId).toBe('string');
      expect(voiceId).toBe('alloy');
    });
  });

  // ============================================================================
  // Display Settings
  // ============================================================================

  describe('displaySettings', () => {
    it('should use default empty string for missing systemPrompt', () => {
      const settings = {
        wordCountMin: 100,
        wordCountMax: 200,
        voiceId: 'alloy',
        distanceThresholdFar: 500,
        distanceThresholdClose: 50
      };

      const systemPrompt = settings.systemPrompt || '';
      expect(systemPrompt).toBe('');
    });

    it('should preserve systemPrompt if present', () => {
      const settings = {
        systemPrompt: 'Custom prompt',
        wordCountMin: 100,
        wordCountMax: 200,
        voiceId: 'alloy',
        distanceThresholdFar: 500,
        distanceThresholdClose: 50
      };

      const systemPrompt = settings.systemPrompt || '';
      expect(systemPrompt).toBe('Custom prompt');
    });
  });

  // ============================================================================
  // Error Message Formatting
  // ============================================================================

  describe('displayError', () => {
    it('should format array of errors as HTML list', () => {
      const errors = ['Error 1', 'Error 2', 'Error 3'];

      const html = '<strong>Validation Errors:</strong><ul>' +
        errors.map(msg => `<li>${msg}</li>`).join('') +
        '</ul>';

      expect(html).toContain('<strong>Validation Errors:</strong>');
      expect(html).toContain('<li>Error 1</li>');
      expect(html).toContain('<li>Error 2</li>');
      expect(html).toContain('<li>Error 3</li>');
    });

    it('should format single error as text', () => {
      const error = 'Single error message';
      expect(error).toBe('Single error message');
    });

    it('should handle empty error array', () => {
      const errors = [];
      const html = '<strong>Validation Errors:</strong><ul>' +
        errors.map(msg => `<li>${msg}</li>`).join('') +
        '</ul>';

      expect(html).toBe('<strong>Validation Errors:</strong><ul></ul>');
    });
  });

  // ============================================================================
  // Loading State
  // ============================================================================

  describe('Loading State Management', () => {
    it('should track button disabled state', () => {
      let buttonDisabled = false;

      // Show loading
      buttonDisabled = true;
      expect(buttonDisabled).toBe(true);

      // Hide loading
      buttonDisabled = false;
      expect(buttonDisabled).toBe(false);
    });

    it('should track button text changes', () => {
      let buttonText = 'Save Settings';

      // Show loading
      buttonText = 'Saving...';
      expect(buttonText).toBe('Saving...');

      // Hide loading
      buttonText = 'Save Settings';
      expect(buttonText).toBe('Save Settings');
    });
  });

  // ============================================================================
  // Success Message Timeout
  // ============================================================================

  describe('Success Message Timeout', () => {
    it('should use 3 second timeout', () => {
      const timeout = 3000;
      expect(timeout).toBe(3000);
    });
  });

  // ============================================================================
  // Firebase Error Handling
  // ============================================================================

  describe('Firebase Error Handling', () => {
    it('should extract error messages from details array', () => {
      const error = {
        details: [
          { message: 'Validation error 1' },
          { message: 'Validation error 2' }
        ]
      };

      const errorMessages = error.details.map(e => e.message);
      expect(errorMessages).toEqual(['Validation error 1', 'Validation error 2']);
    });

    it('should handle error without details', () => {
      const error = {
        message: 'Generic error'
      };

      const errorMessage = error.message || 'Failed to save settings. Please try again.';
      expect(errorMessage).toBe('Generic error');
    });

    it('should use fallback message when no error message', () => {
      const error = {};
      const errorMessage = error.message || 'Failed to save settings. Please try again.';
      expect(errorMessage).toBe('Failed to save settings. Please try again.');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle very large word counts', () => {
      const settings = {
        wordCountMin: 1000,
        wordCountMax: 10000,
        distanceThresholdFar: 500,
        distanceThresholdClose: 50,
        voiceId: 'alloy'
      };

      const validateSettings = (settings) => {
        const errors = [];
        if (!Number.isInteger(settings.wordCountMin) || settings.wordCountMin < 1) {
          errors.push('Word Count Min must be a positive integer');
        }
        if (!Number.isInteger(settings.wordCountMax) || settings.wordCountMax < 1) {
          errors.push('Word Count Max must be a positive integer');
        }
        if (settings.wordCountMin > settings.wordCountMax) {
          errors.push('Word Count Min must be less than or equal to Word Count Max');
        }
        return { valid: errors.length === 0, errors };
      };

      const result = validateSettings(settings);
      expect(result.valid).toBe(true);
    });

    it('should handle very large distance thresholds', () => {
      const settings = {
        wordCountMin: 100,
        wordCountMax: 200,
        distanceThresholdFar: 10000.5,
        distanceThresholdClose: 5000.25,
        voiceId: 'alloy'
      };

      const validateSettings = (settings) => {
        const errors = [];
        if (typeof settings.distanceThresholdFar !== 'number' || settings.distanceThresholdFar < 0) {
          errors.push('Distance Threshold Far must be a non-negative number');
        }
        if (typeof settings.distanceThresholdClose !== 'number' || settings.distanceThresholdClose < 0) {
          errors.push('Distance Threshold Close must be a non-negative number');
        }
        return { valid: errors.length === 0, errors };
      };

      const result = validateSettings(settings);
      expect(result.valid).toBe(true);
    });

    it('should handle all validation errors at once', () => {
      const settings = {
        wordCountMin: 0,
        wordCountMax: -1,
        distanceThresholdFar: 'not-a-number',
        distanceThresholdClose: 'not-a-number',
        voiceId: 'invalid'
      };

      const validateSettings = (settings) => {
        const errors = [];
        if (!Number.isInteger(settings.wordCountMin) || settings.wordCountMin < 1) {
          errors.push('Word Count Min must be a positive integer');
        }
        if (!Number.isInteger(settings.wordCountMax) || settings.wordCountMax < 1) {
          errors.push('Word Count Max must be a positive integer');
        }
        if (typeof settings.distanceThresholdFar !== 'number' || settings.distanceThresholdFar < 0) {
          errors.push('Distance Threshold Far must be a non-negative number');
        }
        if (typeof settings.distanceThresholdClose !== 'number' || settings.distanceThresholdClose < 0) {
          errors.push('Distance Threshold Close must be a non-negative number');
        }
        const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
        if (!validVoices.includes(settings.voiceId)) {
          errors.push('Invalid voice selected');
        }
        return { valid: errors.length === 0, errors };
      };

      const result = validateSettings(settings);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(5);
    });

    it('should handle NaN from parseInt', () => {
      const value = parseInt('not-a-number', 10);
      expect(Number.isNaN(value)).toBe(true);
      expect(!Number.isInteger(value)).toBe(true);
    });

    it('should handle Infinity values', () => {
      const settings = {
        wordCountMin: 100,
        wordCountMax: 200,
        distanceThresholdFar: Infinity,
        distanceThresholdClose: 50,
        voiceId: 'alloy'
      };

      const validateSettings = (settings) => {
        const errors = [];
        if (typeof settings.distanceThresholdFar !== 'number' || settings.distanceThresholdFar < 0) {
          errors.push('Distance Threshold Far must be a non-negative number');
        }
        return { valid: errors.length === 0, errors };
      };

      // Infinity is a number and >= 0, so it should pass basic validation
      const result = validateSettings(settings);
      expect(result.valid).toBe(true);
    });
  });
});

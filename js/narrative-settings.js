/**
 * Narrative Settings Management
 *
 * Handles loading, validating, saving, and displaying narrative settings
 * from Firebase Functions endpoints.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';

// Firebase configuration (matches admin.html)
const firebaseConfig = {
    apiKey: "AIzaSyDOAuOCT4_N2-erb_lWPYYdv1buhYvMXcg",
    authDomain: "suelio-ar.firebaseapp.com",
    projectId: "suelio-ar",
    storageBucket: "suelio-ar.firebasestorage.app",
    messagingSenderId: "807518951165",
    appId: "1:807518951165:web:18da6bc6729a0bddc69999"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app, 'us-central1');

/**
 * Load narrative settings from Firebase Functions
 * @returns {Promise<Object>} Settings object or default values
 */
export async function loadSettings() {
    try {
        const getSettingsFunction = httpsCallable(functions, 'getSettings');
        const response = await getSettingsFunction({});
        return response.data.settings;
    } catch (error) {
        console.error('Error loading settings:', error);
        throw error;
    }
}

/**
 * Validate settings object
 * @param {Object} settings - Settings to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateSettings(settings) {
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

/**
 * Save settings via Firebase Functions
 * @param {Object} settings - Settings object to save
 * @returns {Promise<Object>} Response from Firebase
 */
export async function saveSettings(settings) {
    try {
        const updateSettingsFunction = httpsCallable(functions, 'updateSettings');
        const response = await updateSettingsFunction(settings);
        return response.data;
    } catch (error) {
        console.error('Error saving settings:', error);
        throw error;
    }
}

/**
 * Display settings in form fields
 * @param {Object} settings - Settings object to display
 */
export function displaySettings(settings) {
    document.getElementById('system-prompt').value = settings.systemPrompt || '';
    document.getElementById('word-count-min').value = settings.wordCountMin;
    document.getElementById('word-count-max').value = settings.wordCountMax;
    document.getElementById('voice-select').value = settings.voiceId;
    document.getElementById('distance-threshold-far').value = settings.distanceThresholdFar;
    document.getElementById('distance-threshold-close').value = settings.distanceThresholdClose;
}

/**
 * Collect form data from UI
 * @returns {Object} Settings object from form
 */
export function collectFormData() {
    return {
        systemPrompt: document.getElementById('system-prompt').value,
        wordCountMin: parseInt(document.getElementById('word-count-min').value, 10),
        wordCountMax: parseInt(document.getElementById('word-count-max').value, 10),
        voiceId: document.getElementById('voice-select').value,
        distanceThresholdFar: parseFloat(document.getElementById('distance-threshold-far').value),
        distanceThresholdClose: parseFloat(document.getElementById('distance-threshold-close').value)
    };
}

/**
 * Display error message in UI
 * @param {string|string[]} message - Error message(s) to display
 */
export function displayError(message) {
    const errorContainer = document.getElementById('settings-message');
    errorContainer.className = 'settings-message error';
    if (Array.isArray(message)) {
        errorContainer.innerHTML = '<strong>Validation Errors:</strong><ul>' +
            message.map(msg => `<li>${msg}</li>`).join('') +
            '</ul>';
    } else {
        errorContainer.textContent = message;
    }
    errorContainer.style.display = 'block';
}

/**
 * Display success message in UI
 * @param {string} message - Success message to display
 */
export function displaySuccess(message) {
    const successContainer = document.getElementById('settings-message');
    successContainer.className = 'settings-message success';
    successContainer.textContent = message;
    successContainer.style.display = 'block';

    // Auto-hide success message after 3 seconds
    setTimeout(() => {
        successContainer.style.display = 'none';
    }, 3000);
}

/**
 * Show loading state
 */
export function showLoading() {
    const button = document.getElementById('save-settings-btn');
    button.disabled = true;
    button.textContent = 'Saving...';
}

/**
 * Hide loading state
 */
export function hideLoading() {
    const button = document.getElementById('save-settings-btn');
    button.disabled = false;
    button.textContent = 'Save Settings';
}

/**
 * Initialize narrative settings tab
 */
export async function initializeSettingsTab() {
    const form = document.getElementById('settings-form');
    if (!form) {
        console.error('Settings form not found');
        return;
    }

    // Load initial settings
    try {
        const settings = await loadSettings();
        displaySettings(settings);
    } catch (error) {
        console.error('Failed to load initial settings:', error);
        displayError('Failed to load settings. Please refresh the page.');
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Collect and validate
        const settings = collectFormData();
        const validation = validateSettings(settings);

        if (!validation.valid) {
            displayError(validation.errors);
            return;
        }

        // Try to save
        showLoading();
        try {
            await saveSettings(settings);
            displaySuccess('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);

            // Handle Firebase validation errors
            if (error.details && Array.isArray(error.details)) {
                const errorMessages = error.details.map(e => e.message);
                displayError(errorMessages);
            } else {
                displayError(error.message || 'Failed to save settings. Please try again.');
            }
        } finally {
            hideLoading();
        }
    });
}

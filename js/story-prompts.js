/**
 * Story Prompts Module
 * Handles loading and saving story voice settings via Firebase Functions
 */

import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';
import { OpenAIVoiceId, OPENAI_VOICE_IDS, FUNCTIONS, DOM_IDS } from './constants.js';

let currentStoryId = null;
let functionsInstance = null;

// Helper to get DOM element by ID constant
const getEl = (id) => document.getElementById(id);

/**
 * Populate voice dropdown from constants
 */
function populateVoiceDropdown() {
    const select = getEl(DOM_IDS.VOICE_ID);
    if (!select) return;

    select.innerHTML = OPENAI_VOICE_IDS.map(voiceId => {
        const displayName = voiceId.charAt(0).toUpperCase() + voiceId.slice(1);
        return `<option value="${voiceId}">${displayName}</option>`;
    }).join('');
}

/**
 * Show message in the stories message area
 */
function showMessage(text, isError = false) {
    const msgEl = document.getElementById('stories-message');
    if (!msgEl) return;

    msgEl.textContent = text;
    msgEl.className = `settings-message ${isError ? 'error' : 'success'}`;
    msgEl.style.display = 'block';

    if (!isError) {
        setTimeout(() => {
            msgEl.style.display = 'none';
        }, 3000);
    }
}

/**
 * Load story prompts from backend
 */
async function loadStoryPrompts(storyId) {
    if (!functionsInstance || !storyId) return;

    currentStoryId = storyId;

    try {
        const getStoryPrompts = httpsCallable(functionsInstance, FUNCTIONS.GET_STORY_PROMPTS);
        const result = await getStoryPrompts({ storyId });

        const data = result.data;
        getEl('story-title').value = data.title || '';
        getEl(DOM_IDS.NARRATIVE_PROMPT).value = data.systemPrompt || '';
        getEl(DOM_IDS.PLACE_PICKER_PROMPT).value = data.placePickerPrompt || '';
        getEl(DOM_IDS.VOICE_ID).value = data.openAIVoiceId || OpenAIVoiceId.ONYX;
        getEl('story-word-count-min').value = data.wordCountMin || 75;
        getEl('story-word-count-max').value = data.wordCountMax || 150;
        getEl('beat-history-count').value = data.beatHistoryCount || 3;
        getEl('story-published').checked = data.published || false;
    } catch (error) {
        console.error('Failed to load story prompts:', error);
        showMessage(`Failed to load story: ${error.message}`, true);
    }
}

/**
 * Save story prompts to backend
 */
async function saveStoryPrompts() {
    if (!functionsInstance || !currentStoryId) return;

    try {
        const updateStoryPrompts = httpsCallable(functionsInstance, FUNCTIONS.UPDATE_STORY_PROMPTS);
        await updateStoryPrompts({
            storyId: currentStoryId,
            title: getEl('story-title').value,
            systemPrompt: getEl(DOM_IDS.NARRATIVE_PROMPT).value,
            placePickerPrompt: getEl(DOM_IDS.PLACE_PICKER_PROMPT).value,
            openAIVoiceId: getEl(DOM_IDS.VOICE_ID).value,
            wordCountMin: parseInt(getEl('story-word-count-min').value) || 75,
            wordCountMax: parseInt(getEl('story-word-count-max').value) || 150,
            beatHistoryCount: parseInt(getEl('beat-history-count').value) || 3,
            published: getEl('story-published').checked,
        });

        showMessage('Story settings saved!');
    } catch (error) {
        console.error('Failed to save story prompts:', error);
        showMessage(`Failed to save: ${error.message}`, true);
    }
}

/**
 * Show the create story form
 */
function showCreateForm() {
    const form = document.getElementById('create-story-form');
    const titleInput = document.getElementById('new-story-title');
    if (form) {
        form.style.display = 'block';
    }
    if (titleInput) {
        titleInput.focus();
    }
}

/**
 * Hide the create story form and clear the input
 */
function hideCreateForm() {
    const form = document.getElementById('create-story-form');
    const titleInput = document.getElementById('new-story-title');
    if (form) {
        form.style.display = 'none';
    }
    if (titleInput) {
        titleInput.value = '';
    }
}

/**
 * Refresh the stories list dropdown
 * @param {string|null} selectStoryId Optional story ID to auto-select after refresh
 */
async function refreshStoriesList(selectStoryId = null) {
    const listStories = httpsCallable(functionsInstance, FUNCTIONS.LIST_STORIES);
    const result = await listStories();
    const stories = result.data;
    const selector = getEl(DOM_IDS.STORY_SELECTOR);

    if (selector && stories.length > 0) {
        selector.innerHTML = stories.map(s =>
            `<option value="${s.id}">${s.title}</option>`
        ).join('');

        if (selectStoryId) {
            selector.value = selectStoryId;
        }
    }
    return stories;
}

/**
 * Create a new story
 */
async function createNewStory() {
    const titleInput = document.getElementById('new-story-title');
    const createBtn = document.getElementById('confirm-create-btn');

    if (!titleInput || !functionsInstance) return;

    const title = titleInput.value.trim();
    if (!title) {
        showMessage('Story title is required', true);
        return;
    }

    try {
        // Disable button during API call
        if (createBtn) {
            createBtn.disabled = true;
        }

        const createStory = httpsCallable(functionsInstance, FUNCTIONS.CREATE_STORY);
        const result = await createStory({ title });
        const newStoryId = result.data.storyId;

        // Hide form
        hideCreateForm();

        // Show success message
        showMessage('Story created!');

        // Refresh stories list and select the new story
        await refreshStoriesList(newStoryId);

        // Load the new story's prompts
        await loadStoryPrompts(newStoryId);
    } catch (error) {
        console.error('Failed to create story:', error);
        showMessage(`Failed to create story: ${error.message}`, true);
    } finally {
        // Re-enable button
        if (createBtn) {
            createBtn.disabled = false;
        }
    }
}

/**
 * Initialize the stories tab
 * @param {Functions} functions Firebase Functions instance
 */
export async function initializeStoriesTab(functions) {
    functionsInstance = functions;

    // Populate voice dropdown
    populateVoiceDropdown();

    // Setup event listeners
    const selector = getEl(DOM_IDS.STORY_SELECTOR);
    if (selector) {
        selector.addEventListener('change', (e) => {
            loadStoryPrompts(e.target.value);
        });
    }

    const saveBtn = document.getElementById('save-story-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveStoryPrompts);
    }

    const createBtn = document.getElementById('create-story-btn');
    if (createBtn) {
        createBtn.addEventListener('click', showCreateForm);
    }

    const cancelCreateBtn = document.getElementById('cancel-create-btn');
    if (cancelCreateBtn) {
        cancelCreateBtn.addEventListener('click', hideCreateForm);
    }

    const confirmCreateBtn = document.getElementById('confirm-create-btn');
    if (confirmCreateBtn) {
        confirmCreateBtn.addEventListener('click', createNewStory);
    }

    // Load stories list
    try {
        const stories = await refreshStoriesList();

        // Load first story's prompts
        if (stories.length > 0) {
            loadStoryPrompts(stories[0].id);
        }
    } catch (error) {
        console.error('Failed to load stories list:', error);
        showMessage(`Failed to load stories: ${error.message}`, true);
    }
}

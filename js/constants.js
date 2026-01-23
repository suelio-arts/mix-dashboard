/**
 * Dashboard Constants
 * Mirrors backend constants/voice.ts for type-safe frontend operations
 */

/**
 * OpenAI Voice IDs - mirrors backend constants/voice.ts
 */
export const OpenAIVoiceId = {
    ALLOY: "alloy",
    ECHO: "echo",
    FABLE: "fable",
    ONYX: "onyx",
    NOVA: "nova",
    SHIMMER: "shimmer",
};

export const OPENAI_VOICE_IDS = Object.values(OpenAIVoiceId);

/**
 * Firebase function names - type-safe callable references
 */
export const FUNCTIONS = {
    GET_STORY_PROMPTS: "getStoryPrompts",
    UPDATE_STORY_PROMPTS: "updateStoryPrompts",
    LIST_STORIES: "listStories",
    CREATE_STORY: "createStory",
};

/**
 * DOM element IDs for story prompts form
 */
export const DOM_IDS = {
    STORY_SELECTOR: "story-selector",
    NARRATIVE_PROMPT: "narrative-prompt",
    PLACE_PICKER_PROMPT: "place-picker-prompt",
    VOICE_ID: "voice-id",
    WORD_COUNT_MIN: "word-count-min",
    WORD_COUNT_MAX: "word-count-max",
    STORY_SAVE_STATUS: "story-save-status",
};

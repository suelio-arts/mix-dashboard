// AUTO-GENERATED FILE - DO NOT EDIT
// Generated from mix-backend/functions/src/utils/types.ts
// Generator: generate-jsdoc.ts
// Source hash: 2aaab489e94fc4bc
// Generated at: 2026-01-24T20:46:33.852Z
//
// Regenerate: cd mix-backend/functions && npm run schema:generate:jsdoc
//
// Usage: Add /** @type {LayerSchema} */ before variables for IntelliSense

/**
 * @typedef {Object} GeoPoint
 * @property {number} latitude
 * @property {number} longitude
 */

/**
 * @typedef {Object} GeoLocation
 * @property {Object} point
 * @property {(number|undefined)} [altitude]
 */

/**
 * @typedef {Object} GeoPosition
 * @property {Object} location
 * @property {Object} transform
 */

/**
 * @typedef {'mp3'|'mp4'|'usdz'} FileType
 */

/**
 * @typedef {'private'|'public'|'draft'} Availability
 */

/**
 * @typedef {'plays'|'art'} LayerType
 */

/**
 * @typedef {'draft'|'public'} ElementVisibility
 */

/**
 * @typedef {Object} UserLocation
 * @property {number} lat
 * @property {number} lng
 */

/**
 * @typedef {Object} AudioData
 * @property {string} url
 * @property {number} durationSeconds
 */

/**
 * @typedef {Object} TourAudio
 * @property {string} audioUrl
 * @property {number} durationSeconds
 * @property {string} narrationText
 */

/**
 * @typedef {Object} ModelColor
 * @property {number} red
 * @property {number} green
 * @property {number} blue
 * @property {number} alpha
 */

/**
 * @typedef {Object} Content
 * @property {string} id
 * @property {Object} model
 * @property {Object} media
 */

/**
 * @typedef {Object} GeoPolygon
 * @property {Object[]} points
 */

/**
 * @typedef {Object} GeoPolygonPoint
 * @property {number} latitude
 * @property {number} longitude
 */

/**
 * @typedef {Object} DigitalElementContent
 * @property {'digital'} type
 * @property {string[]} placements
 * @property {(string[]|undefined)} [localPlacements]
 * @property {Object[]} accessAreas
 * @property {string[]} creators
 * @property {boolean} requiresProximity
 */

/**
 * @typedef {Object} PhysicalElementContent
 * @property {'physical'} type
 * @property {(string[]|undefined)} [referenceUrls]
 * @property {number} checkInRadius
 */

/**
 * @typedef {Object} Layer
 * @property {string} id
 * @property {string} name
 * @property {(string|undefined)} [description]
 * @property {Object} location
 * @property {(string|undefined)} [headerImage]
 * @property {(string|undefined)} [locationDescription]
 * @property {(Object|undefined)} [area]
 * @property {(string[]|undefined)} [creators]
 * @property {(string|undefined)} [availability]
 * @property {(string|undefined)} [experienceType]
 * @property {(number|undefined)} [duration]
 * @property {(number|undefined)} [numberOfStops]
 * @property {(boolean|undefined)} [hasGamification]
 * @property {(boolean|undefined)} [hasARPreview]
 * @property {(string|undefined)} [tagline]
 * @property {(string[]|undefined)} [requiredPermissions]
 * @property {(string|undefined)} [layerType]
 * @property {(string[]|undefined)} [filterTags]
 * @property {(number|undefined)} [createdAt]
 * @property {(number|undefined)} [updatedAt]
 * @property {(Object.<string, Object>|undefined)} [translations]
 */

/**
 * @typedef {Object} Element
 * @property {string} id
 * @property {string} name
 * @property {Object} location
 * @property {number} latitude
 * @property {number} longitude
 * @property {(string[]|undefined)} [placements]
 * @property {(string[]|undefined)} [localPlacements]
 * @property {(string|undefined)} [imagePath]
 * @property {(string|undefined)} [description]
 * @property {(Object[]|undefined)} [accessAreas]
 * @property {(string[]|undefined)} [creators]
 * @property {string[]} editors
 * @property {(string|undefined)} [layer]
 * @property {('draft'|'public'|undefined)} [visibility]
 * @property {(boolean|undefined)} [requiresLocation]
 * @property {(Object|undefined)} [content]
 * @property {(Object|undefined)} [tourAudio]
 * @property {(number|undefined)} [createdAt]
 * @property {(number|undefined)} [updatedAt]
 */

/**
 * @typedef {Object} Placement
 * @property {string} id
 * @property {Object} content
 * @property {Object} placement
 * @property {(number|undefined)} [createdAt]
 */

/**
 * @typedef {Object} File
 * @property {string} id
 * @property {string} filePath
 * @property {'mp3'|'mp4'|'usdz'} type
 * @property {(string|undefined)} [previewImagePath]
 * @property {(string|undefined)} [name]
 * @property {string[]} creators
 * @property {(string|undefined)} [owner]
 * @property {'private'|'public'|'draft'} availability
 * @property {(number|undefined)} [createdAt]
 */

/**
 * @typedef {Object} Creator
 * @property {string} id
 * @property {string} name
 * @property {(string|undefined)} [description]
 * @property {(string|undefined)} [locationText]
 * @property {(string|undefined)} [imagePath]
 * @property {(string|undefined)} [link]
 * @property {(string|undefined)} [associatedUserId]
 * @property {(number|undefined)} [createdAt]
 */

/**
 * @typedef {Object} Story
 * @property {string} id
 * @property {string} title
 * @property {(string|undefined)} [description]
 * @property {(number|undefined)} [duration]
 * @property {(string|undefined)} [coverImagePath]
 * @property {string[]} creators
 * @property {(boolean|undefined)} [published]
 * @property {(Object|undefined)} [location]
 * @property {(string[]|undefined)} [tags]
 * @property {(Object|undefined)} [content]
 * @property {(Object.<string, Object>|undefined)} [translations]
 * @property {(number|undefined)} [createdAt]
 */

/**
 * @typedef {Object} SpatialStory
 * @property {string} id
 * @property {string} title
 * @property {(string|undefined)} [description]
 * @property {number} createdAt
 * @property {Object} content
 * @property {(Object.<string, Object>|undefined)} [translations]
 */

/**
 * @typedef {Object} SpatialBeat
 * @property {string} id
 * @property {string} storyId
 * @property {Object} storyLocation
 * @property {Object} userLocation
 * @property {string} narrativeText
 * @property {string[]} relevantUrls
 * @property {Object} audio
 * @property {number} generatedAt
 */

/**
 * @typedef {Object} LayerSimple
 * @property {string} id
 * @property {string} name
 * @property {(string|undefined)} [description]
 * @property {Object} center
 * @property {(Object[]|undefined)} [boundary]
 * @property {(string|undefined)} [layerType]
 * @property {(string[]|undefined)} [filterTags]
 * @property {(string[]|undefined)} [requiredPermissions]
 * @property {number} createdAt
 * @property {number} updatedAt
 * @property {(Object.<string, Object>|undefined)} [translations]
 */

/**
 * @typedef {Object} TourCheckInRequest
 * @property {string} elementId
 * @property {string} layerId
 * @property {number} latitude
 * @property {number} longitude
 */

/**
 * @typedef {Object} TourCheckInResponse
 * @property {boolean} success
 * @property {number} visitCount
 * @property {boolean} isNewVisit
 * @property {number} timestamp
 * @property {(string|undefined)} [error]
 */

/**
 * @typedef {Object} GetLayerRequest
 * @property {string} layerId
 */

/**
 * @typedef {Object} GetLayersByIdsRequest
 * @property {string[]} layerIds
 */

/**
 * @typedef {Object} GetElementsForRegionRequest
 * @property {string} layerId
 * @property {number} minLat
 * @property {number} maxLat
 * @property {number} minLng
 * @property {number} maxLng
 * @property {(boolean|undefined)} [includeVisitData]
 */

/**
 * @typedef {Object} GetStoryRequest
 * @property {string} storyId
 */

/**
 * @typedef {Object} GetStoriesByIdsRequest
 * @property {string[]} storyIds
 */

/**
 * @typedef {Object} GetFilesRequest
 * @property {(number|undefined)} [pageSize]
 * @property {(string|undefined)} [pageToken]
 * @property {('usdz'|'audio'|'video'|'text'|undefined)} [type]
 * @property {('public'|'private'|undefined)} [availability]
 * @property {(string|undefined)} [owner]
 */

/**
 * @typedef {Object} GetFileRequest
 * @property {string} fileId
 */

/**
 * @typedef {Object} GetFilesByIdsRequest
 * @property {string[]} fileIds
 */

/**
 * @typedef {Object} GetCreatorRequest
 * @property {string} creatorId
 */

/**
 * @typedef {Object} GetCreatorsByIdsRequest
 * @property {string[]} creatorIds
 */

/**
 * @typedef {Object} GenerateSpatialBeatRequest
 * @property {number} lat
 * @property {number} lng
 * @property {(string|undefined)} [storyId]
 * @property {(string|undefined)} [language]
 */

/**
 * @typedef {Object} GenerateSpatialBeatResponse
 * @property {boolean} success
 * @property {Object} beat
 */

/**
 * @typedef {Object} GetBeatHistoryResponse
 * @property {boolean} success
 * @property {Object[]} beats
 * @property {(string|undefined)} [nextPageToken]
 * @property {boolean} hasMore
 */

/**
 * @typedef {Object} LocationData
 * @property {number} latitude
 * @property {number} longitude
 * @property {number} timestamp
 * @property {(number|undefined)} [altitude]
 * @property {(number|undefined)} [accuracy]
 * @property {(number|undefined)} [speed]
 * @property {(number|undefined)} [heading]
 * @property {(string|undefined)} [userId]
 * @property {(string|undefined)} [sessionId]
 * @property {string} source
 * @property {(number|undefined)} [batteryLevel]
 * @property {(boolean|undefined)} [isCharging]
 * @property {(number|undefined)} [confidence]
 * @property {boolean} backgroundCollected
 * @property {boolean} dataSharingConsent
 * @property {(number|undefined)} [horizontalAccuracy]
 * @property {(boolean|undefined)} [isARSession]
 */

/**
 * @typedef {Object} VisitData
 * @property {number} latitude
 * @property {number} longitude
 * @property {number} timestamp
 * @property {(number|undefined)} [horizontalAccuracy]
 * @property {(number|undefined)} [arrivalDate]
 * @property {(number|undefined)} [departureDate]
 * @property {(string|undefined)} [userId]
 * @property {boolean} dataSharingConsent
 */

/**
 * @typedef {Object} VoiceConfig
 * @property {string} systemPrompt
 * @property {(string|undefined)} [placePickerPrompt]
 * @property {'alloy'|'echo'|'fable'|'onyx'|'nova'|'shimmer'} openAIVoiceId
 * @property {number} wordCountMin
 * @property {number} wordCountMax
 * @property {number} beatHistoryCount
 */

/**
 * @typedef {Object} PointLocation
 * @property {'point'} type
 * @property {string} name
 * @property {number} lat
 * @property {number} lng
 */

/**
 * @typedef {Object} RegionLocation
 * @property {'region'} type
 * @property {string} name
 * @property {Object[]} polygon
 * @property {Object} center
 */

/**
 * @typedef {Object} DiscourseParameters
 * @property {'historian'|'character-witness'|'casual-observer'} narratorPerspective
 * @property {'immediate'|'reflective'|'future-looking'} temporalStandpoint
 * @property {(string|undefined)} [focalCharacter]
 * @property {'ominous'|'hopeful'|'matter-of-fact'} tone
 */

/**
 * @typedef {Object} NarrativeGrammar
 * @property {number} beatId
 * @property {string} canonicalEvent
 * @property {string[]} narrativeConstraints
 * @property {(string[]|undefined)} [decisionPoints]
 */

/**
 * @typedef {Object} Beat
 * @property {string} storyId
 * @property {string} userId
 * @property {number} beatNumber
 * @property {string} narratedText
 * @property {(string|undefined)} [audioUrl]
 * @property {Object} discourseParameters
 * @property {Object[]} referencedLocations
 * @property {string[]} keyDecisionsMade
 * @property {number} generatedAt
 * @property {Object[]} userLocationHistoryAtGeneration
 */

/**
 * @typedef {Object} StoryMemory
 * @property {string} userId
 * @property {string} storyId
 * @property {Object[]} beatsHeard
 * @property {Object} narrativeState
 * @property {number} updatedAt
 */

/**
 * @typedef {Object} EnrichedLocation
 * @property {string} name
 * @property {number} latitude
 * @property {number} longitude
 * @property {string} wikipediaUrl
 * @property {string} extract
 * @property {string} category
 * @property {number} distance
 */

/**
 * @typedef {Object} RateLimitDocument
 * @property {number} elementCount
 * @property {number} placementCount
 * @property {number|*} windowStart
 */

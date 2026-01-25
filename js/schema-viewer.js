/**
 * Schema Viewer Module
 * Loads generated schema data and renders Mermaid ER diagram
 */

// State
let schemaData = null;
let currentZoom = 1.0;
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;

// DOM Elements
const elements = {
    metaInfo: () => document.getElementById('meta-info'),
    mermaidDiagram: () => document.getElementById('mermaid-diagram'),
    diagramWrapper: () => document.getElementById('diagram-wrapper'),
    entityName: () => document.getElementById('entity-name'),
    entityBadge: () => document.getElementById('entity-badge'),
    panelContent: () => document.getElementById('panel-content'),
    zoomLevel: () => document.getElementById('zoom-level'),
};

/**
 * Load schema data from generated JSON file
 */
async function loadSchemaData() {
    try {
        const response = await fetch('js/schema-data.generated.json');
        if (!response.ok) {
            throw new Error(`Failed to load schema data: ${response.status}`);
        }
        schemaData = await response.json();
        return schemaData;
    } catch (error) {
        console.error('Failed to load schema data:', error);
        showError('Failed to load schema data. Run `npm run schema:generate:viz` first.');
        return null;
    }
}

/**
 * Show error message in diagram panel
 */
function showError(message) {
    const diagram = elements.mermaidDiagram();
    if (diagram) {
        diagram.innerHTML = `<div class="error-message">${message}</div>`;
    }
}

/**
 * Update meta info display
 */
function updateMetaInfo() {
    const meta = elements.metaInfo();
    if (!meta || !schemaData) return;

    const date = new Date(schemaData.generatedAt);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    meta.textContent = `Generated: ${formattedDate} | Hash: ${schemaData.sourceHash}`;
}

/**
 * Initialize Mermaid and render diagram
 */
async function renderDiagram() {
    if (!schemaData?.mermaid) {
        showError('No diagram data available');
        return;
    }

    // Initialize Mermaid with custom config
    mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: {
            primaryColor: '#e2e8f0',
            primaryTextColor: '#1e293b',
            primaryBorderColor: '#94a3b8',
            lineColor: '#64748b',
            secondaryColor: '#f1f5f9',
            tertiaryColor: '#f8fafc',
            fontSize: '14px',
        },
        er: {
            diagramPadding: 20,
            layoutDirection: 'TB',
            minEntityWidth: 100,
            minEntityHeight: 75,
            entityPadding: 15,
            useMaxWidth: true,
        },
    });

    const diagram = elements.mermaidDiagram();
    if (!diagram) return;

    try {
        // Clear previous content
        diagram.innerHTML = '';

        // Render new diagram
        const { svg } = await mermaid.render('schema-er-diagram', schemaData.mermaid);
        diagram.innerHTML = svg;

        // Add click handlers to entities
        addEntityClickHandlers();
    } catch (error) {
        console.error('Failed to render diagram:', error);
        showError(`Failed to render diagram: ${error.message}`);
    }
}

/**
 * Add click handlers to entity elements in the SVG
 */
function addEntityClickHandlers() {
    const diagram = elements.mermaidDiagram();
    if (!diagram) return;

    // Find all entity nodes in the SVG
    const entityGroups = diagram.querySelectorAll('g.entity');

    entityGroups.forEach(group => {
        // Get entity name from the text content
        const textEl = group.querySelector('text');
        if (!textEl) return;

        const entityName = textEl.textContent?.trim();
        if (!entityName || !schemaData?.entities[entityName]) return;

        // Make clickable
        group.style.cursor = 'pointer';
        group.addEventListener('click', () => showEntityDetails(entityName));

        // Add hover effect
        group.addEventListener('mouseenter', () => {
            const rect = group.querySelector('rect');
            if (rect) rect.style.filter = 'brightness(0.95)';
        });
        group.addEventListener('mouseleave', () => {
            const rect = group.querySelector('rect');
            if (rect) rect.style.filter = '';
        });
    });
}

/**
 * Show entity details in the side panel
 */
function showEntityDetails(entityName) {
    const entity = schemaData?.entities[entityName];
    if (!entity) return;

    // Update header
    const nameEl = elements.entityName();
    const badgeEl = elements.entityBadge();
    if (nameEl) nameEl.textContent = entity.displayName;
    if (badgeEl) {
        badgeEl.textContent = entity.isCore ? 'Core Entity' : 'Supporting Type';
        badgeEl.className = `entity-badge ${entity.isCore ? 'core' : 'supporting'}`;
    }

    // Build content
    const content = elements.panelContent();
    if (!content) return;

    let html = '';

    // Fields section
    html += '<div class="detail-section">';
    html += '<h3>Fields</h3>';
    html += '<div class="field-list">';

    for (const field of entity.fields) {
        const requiredClass = field.required ? 'required' : 'optional';
        const refClass = field.isReference ? 'reference' : '';

        html += `
            <div class="field-item ${refClass}">
                <span class="field-name">${field.name}</span>
                <span class="field-type-badge ${requiredClass}">${field.type}</span>
                ${field.required ? '<span class="required-badge">required</span>' : ''}
            </div>
        `;
    }

    html += '</div></div>';

    // Relationships section
    if (entity.relationships.length > 0) {
        html += '<div class="detail-section">';
        html += '<h3>Relationships</h3>';
        html += '<div class="relationship-list">';

        for (const rel of entity.relationships) {
            const typeLabel = rel.type.replace(/-/g, ' ');
            html += `
                <div class="relationship-item">
                    <span class="rel-arrow">&rarr;</span>
                    <span class="rel-target" onclick="window.showEntityDetails('${rel.target}')">${rel.target}</span>
                    <span class="rel-type">${typeLabel}</span>
                    <span class="rel-label">via ${rel.label}</span>
                </div>
            `;
        }

        html += '</div></div>';
    }

    content.innerHTML = html;
}

// Expose to window for click handlers
window.showEntityDetails = showEntityDetails;

/**
 * Zoom controls
 */
function updateZoom() {
    const wrapper = elements.diagramWrapper();
    const levelEl = elements.zoomLevel();

    if (wrapper) {
        wrapper.style.transform = `scale(${currentZoom})`;
        wrapper.style.transformOrigin = 'top left';
    }

    if (levelEl) {
        levelEl.textContent = `${Math.round(currentZoom * 100)}%`;
    }
}

function zoomIn() {
    currentZoom = Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP);
    updateZoom();
}

function zoomOut() {
    currentZoom = Math.max(MIN_ZOOM, currentZoom - ZOOM_STEP);
    updateZoom();
}

function zoomReset() {
    currentZoom = 1.0;
    updateZoom();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    document.getElementById('zoom-in-btn')?.addEventListener('click', zoomIn);
    document.getElementById('zoom-out-btn')?.addEventListener('click', zoomOut);
    document.getElementById('zoom-reset-btn')?.addEventListener('click', zoomReset);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === '+' || e.key === '=') zoomIn();
        if (e.key === '-') zoomOut();
        if (e.key === '0') zoomReset();
    });
}

/**
 * Initialize the viewer
 */
async function init() {
    setupEventListeners();

    // Load schema data
    const data = await loadSchemaData();
    if (!data) return;

    // Update meta info
    updateMetaInfo();

    // Render diagram
    await renderDiagram();

    // Show first core entity by default
    const firstCore = Object.values(data.entities).find(e => e.isCore);
    if (firstCore) {
        showEntityDetails(firstCore.displayName);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

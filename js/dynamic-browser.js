/**
 * Dynamic Firestore Browser
 *
 * Handles routing, data fetching, and rendering for the dynamic browse page.
 * URL patterns:
 *   /browse.html                                → Collections list
 *   /browse.html?collection=layers              → Documents list
 *   /browse.html?collection=elements&doc=abc123 → Document detail
 *   /browse.html?collection=elements&doc=abc123&sub=placements → Subcollection
 */

import {
  functions,
  httpsCallable,
  fetchCollection,
  fetchDocument,
  fetchSubcollection,
  autoDetectColumns,
  formatValueForDisplay,
  escapeHtml,
  formatDate
} from './firestore-browser.js';

// Cloud Functions for collection discovery
const listCollectionsFn = httpsCallable(functions, 'listCollections');
const listSubcollectionsFn = httpsCallable(functions, 'listSubcollections');

// DOM elements
const mainContent = document.getElementById('main-content');
const breadcrumb = document.getElementById('breadcrumb');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');

// Icon mapping for common collections
const collectionIcons = {
  layers: '🗺️',
  elements: '📍',
  creators: '👤',
  files: '📁',
  users: '👥',
  stories: '📖',
  tour_visits: '🚶',
  narrative_history: '📚',
  engagement_stats: '📊',
  location_records: '📍',
  motion_records: '🏃',
  experiences: '✨',
  narrative_settings: '⚙️',
  temp_models: '🎨',
  fiction_story_templates: '📝'
};

// Default icon for unknown collections
const defaultIcon = '📄';

/**
 * Parse URL parameters
 */
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    collection: params.get('collection'),
    doc: params.get('doc'),
    sub: params.get('sub')
  };
}

/**
 * Update URL without page reload
 */
function updateUrl(params) {
  const url = new URL(window.location);

  // Clear existing params
  url.searchParams.delete('collection');
  url.searchParams.delete('doc');
  url.searchParams.delete('sub');

  // Set new params
  if (params.collection) url.searchParams.set('collection', params.collection);
  if (params.doc) url.searchParams.set('doc', params.doc);
  if (params.sub) url.searchParams.set('sub', params.sub);

  window.history.pushState({}, '', url);
}

/**
 * Show loading state
 */
function showLoading() {
  mainContent.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  `;
}

/**
 * Show error state
 */
function showError(message) {
  mainContent.innerHTML = `
    <div class="error">
      <strong>Error:</strong> ${escapeHtml(message)}
    </div>
  `;
}

/**
 * Show empty state
 */
function showEmpty(icon, title, message) {
  mainContent.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

/**
 * Update breadcrumb navigation
 */
function updateBreadcrumb(params) {
  let html = '<a href="index.html">Home</a>';
  html += ' <span class="breadcrumb-sep">›</span> ';
  html += '<a href="browse.html">Collections</a>';

  if (params.collection) {
    html += ' <span class="breadcrumb-sep">›</span> ';
    if (params.doc) {
      html += `<a href="browse.html?collection=${encodeURIComponent(params.collection)}">${escapeHtml(params.collection)}</a>`;
    } else {
      html += `<span class="breadcrumb-current">${escapeHtml(params.collection)}</span>`;
    }
  }

  if (params.doc) {
    html += ' <span class="breadcrumb-sep">›</span> ';
    if (params.sub) {
      html += `<a href="browse.html?collection=${encodeURIComponent(params.collection)}&doc=${encodeURIComponent(params.doc)}">${escapeHtml(params.doc.substring(0, 12))}...</a>`;
    } else {
      html += `<span class="breadcrumb-current">${escapeHtml(params.doc.substring(0, 20))}${params.doc.length > 20 ? '...' : ''}</span>`;
    }
  }

  if (params.sub) {
    html += ' <span class="breadcrumb-sep">›</span> ';
    html += `<span class="breadcrumb-current">${escapeHtml(params.sub)}</span>`;
  }

  breadcrumb.innerHTML = html;
}

// ============================================================================
// COLLECTIONS LIST VIEW
// ============================================================================

async function renderCollectionsList() {
  pageTitle.textContent = 'Collections';
  pageSubtitle.textContent = 'Browse all Firestore collections';
  updateBreadcrumb({});
  showLoading();

  try {
    const result = await listCollectionsFn();
    const collections = result.data.collections;

    if (!collections || collections.length === 0) {
      showEmpty('📂', 'No Collections', 'No Firestore collections found.');
      return;
    }

    // Sort collections alphabetically
    collections.sort((a, b) => a.id.localeCompare(b.id));

    const html = `
      <div class="nav-grid">
        ${collections.map(col => `
          <a href="browse.html?collection=${encodeURIComponent(col.id)}" class="nav-card">
            <div class="nav-card-icon">${collectionIcons[col.id] || defaultIcon}</div>
            <div class="nav-card-title">${escapeHtml(col.id)}</div>
            <div class="nav-card-description">Browse ${escapeHtml(col.id)} documents</div>
          </a>
        `).join('')}
      </div>
    `;

    mainContent.innerHTML = html;
  } catch (error) {
    console.error('Error fetching collections:', error);
    showError(`Failed to load collections: ${error.message}`);
  }
}

// ============================================================================
// DOCUMENTS LIST VIEW
// ============================================================================

async function renderDocumentsList(collectionName) {
  pageTitle.textContent = collectionName;
  pageSubtitle.textContent = `Browse documents in ${collectionName}`;
  updateBreadcrumb({ collection: collectionName });
  showLoading();

  try {
    // Determine ordering field based on collection
    const orderingFields = {
      layers: 'createdAt',
      elements: 'createdAt',
      creators: 'createdAt',
      files: 'uploadedAt',
      users: 'createdAt',
      stories: 'createdAt',
      tour_visits: 'visitedAt',
      narrative_history: 'listenedAt',
      experiences: 'listenedAt'
    };

    const orderByField = orderingFields[collectionName];
    const docs = await fetchCollection(collectionName, { orderByField, maxResults: 100 });

    if (!docs || docs.length === 0) {
      showEmpty('📭', 'No Documents', `No documents found in ${collectionName}.`);
      return;
    }

    // Auto-detect columns
    const columns = autoDetectColumns(docs);

    const html = `
      <div class="table-container">
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                ${columns.map(col => `<th>${escapeHtml(col.label)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${docs.map(doc => `
                <tr class="clickable" data-doc-id="${escapeHtml(doc.id)}" data-collection="${escapeHtml(collectionName)}">
                  ${columns.map(col => `<td>${formatValueForDisplay(doc[col.key], col.type)}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <p class="result-count">${docs.length} document${docs.length !== 1 ? 's' : ''}</p>
    `;

    mainContent.innerHTML = html;

    // Add click handlers for rows
    mainContent.querySelectorAll('tr.clickable').forEach(row => {
      row.addEventListener('click', () => {
        const docId = row.dataset.docId;
        const collection = row.dataset.collection;
        navigateTo({ collection, doc: docId });
      });
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    showError(`Failed to load documents: ${error.message}`);
  }
}

// ============================================================================
// DOCUMENT DETAIL VIEW
// ============================================================================

async function renderDocumentDetail(collectionName, docId) {
  pageTitle.textContent = docId;
  pageSubtitle.textContent = `Document in ${collectionName}`;
  updateBreadcrumb({ collection: collectionName, doc: docId });
  showLoading();

  try {
    // Fetch document and subcollections in parallel
    const [docData, subcollectionsResult] = await Promise.all([
      fetchDocument(collectionName, docId),
      listSubcollectionsFn({ documentPath: `${collectionName}/${docId}` }).catch(() => ({ data: { subcollections: [] } }))
    ]);

    if (!docData) {
      showError(`Document not found: ${collectionName}/${docId}`);
      return;
    }

    const subcollections = subcollectionsResult.data.subcollections || [];

    const html = `
      <div class="detail-layout">
        ${subcollections.length > 0 ? `
          <div class="subcollections-bar">
            <span class="subcollections-label">Subcollections:</span>
            ${subcollections.map(sub => `
              <a href="browse.html?collection=${encodeURIComponent(collectionName)}&doc=${encodeURIComponent(docId)}&sub=${encodeURIComponent(sub.id)}" class="subcollection-btn">
                ${escapeHtml(sub.id)}
              </a>
            `).join('')}
          </div>
        ` : ''}

        <div class="json-inspector">
          <div class="json-header">
            <span class="json-title">Document Data</span>
            <button class="copy-btn" id="copy-json-btn">Copy JSON</button>
          </div>
          <div class="json-content">
            <pre id="json-tree">${formatJsonTree(docData)}</pre>
          </div>
        </div>
      </div>
    `;

    mainContent.innerHTML = html;

    // Add copy button handler
    document.getElementById('copy-json-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(JSON.stringify(docData, null, 2));
      const btn = document.getElementById('copy-json-btn');
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy JSON', 2000);
    });

  } catch (error) {
    console.error('Error fetching document:', error);
    showError(`Failed to load document: ${error.message}`);
  }
}

// ============================================================================
// SUBCOLLECTION VIEW
// ============================================================================

async function renderSubcollection(collectionName, docId, subcollectionName) {
  pageTitle.textContent = subcollectionName;
  pageSubtitle.textContent = `Subcollection of ${collectionName}/${docId.substring(0, 12)}...`;
  updateBreadcrumb({ collection: collectionName, doc: docId, sub: subcollectionName });
  showLoading();

  try {
    const docs = await fetchSubcollection(collectionName, docId, subcollectionName, { maxResults: 100 });

    if (!docs || docs.length === 0) {
      showEmpty('📭', 'No Documents', `No documents found in ${subcollectionName}.`);
      return;
    }

    // Auto-detect columns
    const columns = autoDetectColumns(docs);

    const html = `
      <div class="table-container">
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                ${columns.map(col => `<th>${escapeHtml(col.label)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${docs.map(doc => `
                <tr>
                  ${columns.map(col => `<td>${formatValueForDisplay(doc[col.key], col.type)}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <p class="result-count">${docs.length} document${docs.length !== 1 ? 's' : ''}</p>
    `;

    mainContent.innerHTML = html;

  } catch (error) {
    console.error('Error fetching subcollection:', error);
    showError(`Failed to load subcollection: ${error.message}`);
  }
}

// ============================================================================
// JSON TREE FORMATTING
// ============================================================================

function formatJsonTree(obj, indent = 0) {
  const padding = '  '.repeat(indent);

  if (obj === null) return `<span class="json-null">null</span>`;
  if (obj === undefined) return `<span class="json-undefined">undefined</span>`;

  if (obj instanceof Date) {
    return `<span class="json-date">"${formatDate(obj)}"</span>`;
  }

  if (typeof obj === 'boolean') {
    return `<span class="json-boolean">${obj}</span>`;
  }

  if (typeof obj === 'number') {
    return `<span class="json-number">${obj}</span>`;
  }

  if (typeof obj === 'string') {
    const escaped = escapeHtml(obj);
    // Check if it's a URL
    if (obj.match(/^https?:\/\//)) {
      return `<span class="json-string">"<a href="${escaped}" target="_blank" class="json-link">${escaped}</a>"</span>`;
    }
    return `<span class="json-string">"${escaped}"</span>`;
  }

  if (obj._ref) {
    return `<span class="json-reference" title="${escapeHtml(obj.path)}">"ref:${escapeHtml(obj.id)}"</span>`;
  }

  if (obj.lat !== undefined && obj.lng !== undefined) {
    return `<span class="json-geopoint">GeoPoint(${obj.lat.toFixed(6)}, ${obj.lng.toFixed(6)})</span>`;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';

    let result = '[\n';
    obj.forEach((item, i) => {
      result += padding + '  ' + formatJsonTree(item, indent + 1);
      if (i < obj.length - 1) result += ',';
      result += '\n';
    });
    result += padding + ']';
    return result;
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';

    let result = '{\n';
    keys.forEach((key, i) => {
      result += `${padding}  <span class="json-key">"${escapeHtml(key)}"</span>: ${formatJsonTree(obj[key], indent + 1)}`;
      if (i < keys.length - 1) result += ',';
      result += '\n';
    });
    result += padding + '}';
    return result;
  }

  return String(obj);
}

// ============================================================================
// NAVIGATION & ROUTING
// ============================================================================

function navigateTo(params) {
  updateUrl(params);
  route();
}

async function route() {
  const params = getUrlParams();

  if (params.collection && params.doc && params.sub) {
    await renderSubcollection(params.collection, params.doc, params.sub);
  } else if (params.collection && params.doc) {
    await renderDocumentDetail(params.collection, params.doc);
  } else if (params.collection) {
    await renderDocumentsList(params.collection);
  } else {
    await renderCollectionsList();
  }
}

// Handle browser back/forward
window.addEventListener('popstate', route);

// Initial route
route();

/**
 * Table Utilities - Rendering and Sorting
 *
 * Vanilla JS table rendering with sortable columns.
 */

import { escapeHtml, formatDate, formatGeoPoint, truncateText } from './firestore-browser.js';

/**
 * Column configuration type
 * @typedef {Object} ColumnConfig
 * @property {string} key - Data key to display
 * @property {string} label - Column header label
 * @property {string} [type] - Value type: 'text', 'date', 'geopoint', 'number', 'badge', 'thumbnail', 'reference'
 * @property {number} [truncate] - Max characters for text truncation
 * @property {Function} [render] - Custom render function (value, row) => string
 */

/**
 * Current sort state
 */
let currentSort = {
  key: null,
  direction: 'asc'
};

/**
 * Get the value for sorting from a row
 * @param {Object} row - Data row
 * @param {string} key - Column key
 * @returns {any} Value for sorting
 */
function getSortValue(row, key) {
  const value = row[key];

  if (value === null || value === undefined) {
    return '';
  }

  // Date
  if (value instanceof Date) {
    return value.getTime();
  }

  // GeoPoint
  if (typeof value === 'object' && 'lat' in value) {
    return value.lat;
  }

  // Reference
  if (typeof value === 'object' && value._ref) {
    return value.id || '';
  }

  // Array - sort by length
  if (Array.isArray(value)) {
    return value.length;
  }

  return value;
}

/**
 * Sort data by column
 * @param {Array} data - Array of data rows
 * @param {string} key - Column key to sort by
 * @param {string} direction - 'asc' or 'desc'
 * @returns {Array} Sorted array (new array, original unchanged)
 */
export function sortData(data, key, direction) {
  return [...data].sort((a, b) => {
    const aVal = getSortValue(a, key);
    const bVal = getSortValue(b, key);

    let comparison = 0;

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return direction === 'desc' ? -comparison : comparison;
  });
}

/**
 * Format a cell value based on type
 * @param {any} value - Cell value
 * @param {ColumnConfig} column - Column configuration
 * @param {Object} row - Full data row
 * @returns {string} HTML string for cell content
 */
function formatCellValue(value, column, row) {
  // Custom renderer
  if (column.render) {
    return column.render(value, row);
  }

  if (value === null || value === undefined) {
    return '<span class="text-muted">—</span>';
  }

  switch (column.type) {
    case 'date':
      return escapeHtml(formatDate(value));

    case 'geopoint':
      return escapeHtml(formatGeoPoint(value));

    case 'number':
      return escapeHtml(String(value));

    case 'badge':
      const badgeClass = getBadgeClass(value);
      return `<span class="badge ${badgeClass}">${escapeHtml(value)}</span>`;

    case 'thumbnail':
      if (!value) return '<span class="text-muted">—</span>';
      return `<img src="${escapeHtml(value)}" class="thumbnail" alt="" loading="lazy" onerror="this.style.display='none'">`;

    case 'reference':
      if (value && value._ref) {
        return `<span class="reference">${escapeHtml(value.collection)}/${escapeHtml(value.id)}</span>`;
      }
      return '<span class="text-muted">—</span>';

    case 'references':
      if (Array.isArray(value)) {
        return `<span class="badge badge-count">${value.length}</span>`;
      }
      return '<span class="text-muted">0</span>';

    default:
      const text = String(value);
      if (column.truncate && text.length > column.truncate) {
        return escapeHtml(truncateText(text, column.truncate));
      }
      return escapeHtml(text);
  }
}

/**
 * Get badge class based on value
 * @param {string} value - Badge value
 * @returns {string} CSS class
 */
function getBadgeClass(value) {
  const lowerValue = String(value).toLowerCase();

  if (lowerValue === 'public' || lowerValue === 'now' || lowerValue === 'active') {
    return 'badge-success';
  }
  if (lowerValue === 'private' || lowerValue === 'draft') {
    return 'badge-warning';
  }
  if (lowerValue === 'soon' || lowerValue === 'pending') {
    return 'badge-info';
  }

  return 'badge-default';
}

/**
 * Render a data table
 * @param {string} containerId - DOM element ID to render into
 * @param {Array} data - Array of data rows
 * @param {Array<ColumnConfig>} columns - Column configurations
 * @param {Object} [options] - Render options
 * @param {Function} [options.onRowClick] - Row click handler (row) => void
 * @param {Function} [options.onSort] - Sort callback (key, direction) => void
 */
export function renderTable(containerId, data, columns, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container #${containerId} not found`);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>No data found</p>
      </div>
    `;
    return;
  }

  // Build table HTML
  const headerCells = columns.map(col => {
    const isSorted = currentSort.key === col.key;
    const sortIcon = isSorted
      ? (currentSort.direction === 'asc' ? ' ↑' : ' ↓')
      : '';
    return `<th data-key="${escapeHtml(col.key)}" class="sortable">${escapeHtml(col.label)}${sortIcon}</th>`;
  }).join('');

  const rows = data.map(row => {
    const cells = columns.map(col => {
      const value = row[col.key];
      return `<td>${formatCellValue(value, col, row)}</td>`;
    }).join('');

    const clickable = options.onRowClick ? 'class="clickable"' : '';
    return `<tr ${clickable} data-id="${escapeHtml(row.id)}">${cells}</tr>`;
  }).join('');

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>${headerCells}</tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;

  // Add sort handlers
  container.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;

      if (currentSort.key === key) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.key = key;
        currentSort.direction = 'asc';
      }

      if (options.onSort) {
        options.onSort(currentSort.key, currentSort.direction);
      }
    });
  });

  // Add row click handlers
  if (options.onRowClick) {
    container.querySelectorAll('tbody tr').forEach(tr => {
      tr.addEventListener('click', () => {
        const id = tr.dataset.id;
        const row = data.find(r => r.id === id);
        if (row) {
          options.onRowClick(row);
        }
      });
    });
  }
}

/**
 * Show loading state in container
 * @param {string} containerId - DOM element ID
 * @param {string} [message='Loading...'] - Loading message
 */
export function showLoading(containerId, message = 'Loading...') {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>${escapeHtml(message)}</p></div>`;
  }
}

/**
 * Show error state in container
 * @param {string} containerId - DOM element ID
 * @param {string} message - Error message
 */
export function showError(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
  }
}

/**
 * Reset sort state
 */
export function resetSort() {
  currentSort = { key: null, direction: 'asc' };
}

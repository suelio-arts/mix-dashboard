/**
 * Engagement Analytics Module
 * Weekly engagement stats dashboard with data fetching, chart rendering, table rendering, CSV export, and filtering
 */

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Fetch engagement statistics from Firebase Cloud Function
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {string} authToken - Firebase authentication token
 * @returns {Promise<Object>} Engagement data with weeklyStats and dailyBreakdown
 */
async function getEngagementStats(startDate, endDate, authToken) {
  const endpoint = 'https://us-central1-mix-prod.cloudfunctions.net/getEngagementStats';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ startDate, endDate }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate response structure
    if (!data.weeklyStats || !data.dailyBreakdown) {
      throw new Error('Invalid response structure: missing required fields');
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch engagement stats:', error);
    throw error;
  }
}

// ============================================================================
// Chart Rendering
// ============================================================================

let engagementChartInstance = null;

/**
 * Create Chart.js time-series chart for engagement metrics
 * @param {string} canvasId - Canvas element ID
 * @param {Object} data - Engagement data with dailyBreakdown array
 * @param {Object} dateRange - Object with startDate and endDate
 */
function createEngagementChart(canvasId, data, dateRange) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas element with id "${canvasId}" not found`);
    return;
  }

  // Destroy previous chart instance
  if (engagementChartInstance) {
    engagementChartInstance.destroy();
    engagementChartInstance = null;
  }

  const ctx = canvas.getContext('2d');

  // Prepare data arrays
  const labels = data.dailyBreakdown.map(d => d.date);
  const narrativesData = data.dailyBreakdown.map(d => d.narrativesHeard);
  const minutesData = data.dailyBreakdown.map(d => d.totalMinutesListened);

  // Create chart
  engagementChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Narratives Heard',
          data: narrativesData,
          borderColor: '#2E86AB',
          backgroundColor: 'rgba(46, 134, 171, 0.1)',
          yAxisID: 'y',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Minutes Listened',
          data: minutesData,
          borderColor: '#A23B72',
          backgroundColor: 'rgba(162, 59, 114, 0.1)',
          yAxisID: 'y1',
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y;
                if (context.dataset.label === 'Minutes Listened') {
                  label += ' min';
                }
              }
              return label;
            },
          },
        },
        legend: {
          display: true,
          position: 'top',
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Week',
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Narratives Heard (count)',
          },
          beginAtZero: true,
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Minutes Listened (minutes)',
          },
          grid: {
            drawOnChartArea: false,
          },
          beginAtZero: true,
        },
      },
    },
  });
}

// ============================================================================
// Table Rendering
// ============================================================================

let currentTableData = [];
let currentSort = { column: null, ascending: true };

/**
 * Render user breakdown table
 * @param {string} tableId - Table element ID
 * @param {Array} userData - Array of user engagement data objects
 */
function renderUserBreakdownTable(tableId, userData) {
  const table = document.getElementById(tableId);
  if (!table) {
    console.error(`Table element with id "${tableId}" not found`);
    return;
  }

  currentTableData = userData;

  const tbody = table.querySelector('tbody');
  if (!tbody) {
    console.error(`Table body not found in table "${tableId}"`);
    return;
  }

  // Clear existing rows
  tbody.innerHTML = '';

  // Handle empty data
  if (!userData || userData.length === 0) {
    const emptyRow = tbody.insertRow();
    const cell = emptyRow.insertCell();
    cell.colSpan = 5;
    cell.textContent = 'No data available';
    cell.style.textAlign = 'center';
    cell.style.padding = '20px';
    return;
  }

  // Populate rows
  userData.forEach(row => {
    const tr = tbody.insertRow();

    // User ID
    const userIdCell = tr.insertCell();
    userIdCell.textContent = row.userId;

    // Week
    const weekCell = tr.insertCell();
    weekCell.textContent = row.week;

    // Narratives Heard
    const narrativesCell = tr.insertCell();
    narrativesCell.textContent = formatNumber(row.narrativesHeard);

    // Total Minutes
    const minutesCell = tr.insertCell();
    minutesCell.textContent = formatNumber(row.totalMinutes);

    // Unique Places
    const placesCell = tr.insertCell();
    placesCell.textContent = formatNumber(row.uniquePlaces);
  });

  // Set up column sorting
  setupTableSorting(tableId);
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US');
}

/**
 * Setup table sorting functionality
 * @param {string} tableId - Table element ID
 */
function setupTableSorting(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const headers = table.querySelectorAll('th[data-sort]');

  headers.forEach(header => {
    header.style.cursor = 'pointer';
    header.onclick = function() {
      const column = this.getAttribute('data-sort');
      sortTable(tableId, column);
    };
  });
}

/**
 * Sort table by column
 * @param {string} tableId - Table element ID
 * @param {string} column - Column name to sort by
 */
function sortTable(tableId, column) {
  // Toggle sort direction if clicking same column
  if (currentSort.column === column) {
    currentSort.ascending = !currentSort.ascending;
  } else {
    currentSort.column = column;
    currentSort.ascending = true;
  }

  // Sort data
  const sortedData = [...currentTableData].sort((a, b) => {
    let valA = a[column];
    let valB = b[column];

    // Handle date sorting
    if (column === 'week') {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    }

    // Handle numeric sorting
    if (typeof valA === 'number' && typeof valB === 'number') {
      return currentSort.ascending ? valA - valB : valB - valA;
    }

    // Handle string sorting
    if (typeof valA === 'string' && typeof valB === 'string') {
      return currentSort.ascending
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    // Fallback comparison
    if (valA < valB) return currentSort.ascending ? -1 : 1;
    if (valA > valB) return currentSort.ascending ? 1 : -1;
    return 0;
  });

  // Re-render table with sorted data
  renderUserBreakdownTable(tableId, sortedData);
}

/**
 * Filter table by user IDs
 * @param {string} tableId - Table element ID
 * @param {Array<string>} userIds - Array of user IDs to filter by (empty = show all)
 */
function filterTableByUser(tableId, userIds) {
  if (!userIds || userIds.length === 0) {
    // Show all users
    renderUserBreakdownTable(tableId, currentTableData);
    return;
  }

  // Filter data
  const filteredData = currentTableData.filter(row => userIds.includes(row.userId));
  renderUserBreakdownTable(tableId, filteredData);
}

// ============================================================================
// CSV Export
// ============================================================================

/**
 * Export engagement data to CSV file
 * @param {Array} data - User breakdown data to export
 * @param {string} startDate - Start date for filename
 * @param {string} endDate - End date for filename
 */
function exportToCSV(data, startDate, endDate) {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // CSV headers
  const headers = ['userId', 'week', 'narrativesHeard', 'totalMinutes', 'uniquePlaces'];

  // Build CSV content with RFC 4180 compliance
  const csvRows = [];

  // Add BOM for UTF-8
  csvRows.push('\uFEFF' + headers.join(','));

  // Add data rows
  data.forEach(row => {
    const values = headers.map(header => {
      let value = row[header];

      // Handle null/undefined
      if (value === null || value === undefined) {
        value = '';
      }

      // Convert to string
      value = String(value);

      // Escape values containing commas, quotes, or newlines
      if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
        // Escape quotes by doubling them
        value = value.replace(/"/g, '""');
        // Wrap in quotes
        value = `"${value}"`;
      }

      return value;
    });

    csvRows.push(values.join(','));
  });

  // Join with CRLF (RFC 4180)
  const csvContent = csvRows.join('\r\n');

  // Create blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  // Create download link
  const link = document.createElement('a');
  link.href = url;
  link.download = `engagement-analytics-${startDate}-to-${endDate}.csv`;
  link.style.display = 'none';

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Filtering
// ============================================================================

let filterDebounceTimer = null;

/**
 * Apply date range filter with debouncing
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {Function} onUpdate - Callback function to execute after filter applied
 */
function applyDateRangeFilter(startDate, endDate, onUpdate) {
  // Validate chronological order
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    alert('Error: Start date must be before end date');
    return;
  }

  // Debounce rapid changes (300ms)
  clearTimeout(filterDebounceTimer);

  filterDebounceTimer = setTimeout(() => {
    // Show loading state
    showLoadingState(true);

    // Update URL params for persistence
    updateURLParams({ startDate, endDate });

    // Execute callback
    if (typeof onUpdate === 'function') {
      onUpdate(startDate, endDate);
    }
  }, 300);
}

/**
 * Show/hide loading state
 * @param {boolean} isLoading - Whether to show loading state
 */
function showLoadingState(isLoading) {
  const elements = document.querySelectorAll('.filter-group button, #export-csv');
  elements.forEach(el => {
    el.disabled = isLoading;
    if (isLoading) {
      el.style.opacity = '0.6';
      el.style.cursor = 'wait';
    } else {
      el.style.opacity = '1';
      el.style.cursor = 'pointer';
    }
  });
}

/**
 * Update URL parameters without reloading page
 * @param {Object} params - Parameters to update in URL
 */
function updateURLParams(params) {
  if (typeof URLSearchParams === 'undefined' || typeof window === 'undefined') {
    return; // Not in browser environment
  }

  const urlParams = new URLSearchParams(window.location.search);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      urlParams.set(key, value);
    } else {
      urlParams.delete(key);
    }
  }

  const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
  window.history.replaceState({}, '', newUrl);
}

/**
 * Get URL parameters
 * @returns {Object} URL parameters as key-value pairs
 */
function getURLParams() {
  if (typeof URLSearchParams === 'undefined' || typeof window === 'undefined') {
    return {};
  }

  const urlParams = new URLSearchParams(window.location.search);
  const params = {};

  for (const [key, value] of urlParams.entries()) {
    params[key] = value;
  }

  return params;
}

// ============================================================================
// Exports
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getEngagementStats,
    createEngagementChart,
    renderUserBreakdownTable,
    exportToCSV,
    applyDateRangeFilter,
    filterTableByUser,
    setupTableSorting,
    sortTable,
    showLoadingState,
    updateURLParams,
    getURLParams,
  };
}

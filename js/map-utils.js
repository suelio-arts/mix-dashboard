/**
 * Map Utilities - Leaflet Helpers
 *
 * Leaflet map initialization and marker management.
 */

/**
 * Check if dark mode is enabled
 * @returns {boolean} True if dark mode is active
 */
export function isDarkMode() {
  return document.body.classList.contains('dark-mode');
}

/**
 * Get tile layer URL based on dark mode
 * @returns {string} Tile layer URL
 */
function getTileUrl() {
  return isDarkMode()
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
}

/**
 * Initialize a Leaflet map
 * @param {string} containerId - DOM element ID for the map
 * @param {Object} [options] - Map options
 * @param {Array} [options.center=[42.3601, -71.0589]] - Initial center [lat, lng]
 * @param {number} [options.zoom=12] - Initial zoom level
 * @returns {Object} Leaflet map instance
 */
export function initializeMap(containerId, options = {}) {
  const {
    center = [42.3601, -71.0589], // Boston default
    zoom = 12
  } = options;

  const map = L.map(containerId).setView(center, zoom);

  const tileLayer = L.tileLayer(getTileUrl(), {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
    detectRetina: true
  });

  tileLayer.addTo(map);

  // Store tile layer reference for dark mode switching
  map._customTileLayer = tileLayer;

  return map;
}

/**
 * Update map tiles for dark mode change
 * @param {Object} map - Leaflet map instance
 */
export function updateMapTiles(map) {
  if (map._customTileLayer) {
    map._customTileLayer.setUrl(getTileUrl());
  }
}

/**
 * Create a marker icon
 * @param {Object} [options] - Icon options
 * @param {string} [options.color='#3b82f6'] - Marker color
 * @param {boolean} [options.selected=false] - Whether marker is selected
 * @returns {Object} Leaflet divIcon
 */
function createMarkerIcon(options = {}) {
  const {
    color = '#3b82f6',
    selected = false
  } = options;

  const size = selected ? 16 : 12;
  const border = selected ? '3px solid #ffffff' : '2px solid #ffffff';
  const shadow = selected ? '0 2px 8px rgba(0,0,0,0.4)' : '0 1px 4px rgba(0,0,0,0.3)';

  return L.divIcon({
    className: 'element-marker',
    html: `<div style="
      background: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: ${border};
      box-shadow: ${shadow};
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

/**
 * Add element markers to the map
 * @param {Object} map - Leaflet map instance
 * @param {Array} elements - Array of element data with location
 * @param {Function} [onMarkerClick] - Click handler (element) => void
 * @returns {Array} Array of Leaflet markers
 */
export function addElementMarkers(map, elements, onMarkerClick) {
  const markers = [];

  elements.forEach(element => {
    // Support both { location: { lat, lng } } and { latitude, longitude }
    let lat, lng;

    if (element.location && typeof element.location.lat === 'number') {
      lat = element.location.lat;
      lng = element.location.lng;
    } else if (typeof element.latitude === 'number' && typeof element.longitude === 'number') {
      lat = element.latitude;
      lng = element.longitude;
    } else {
      return; // Skip elements without valid location
    }

    const color = element.visibility === 'draft' ? '#f59e0b' : '#3b82f6';

    const marker = L.marker([lat, lng], {
      icon: createMarkerIcon({ color })
    });

    // Store element reference on marker
    marker._elementData = element;
    marker._markerColor = color;

    if (onMarkerClick) {
      marker.on('click', () => {
        onMarkerClick(element, marker);
      });
    }

    // Tooltip with element name
    if (element.name) {
      marker.bindTooltip(element.name, {
        direction: 'top',
        offset: [0, -8]
      });
    }

    marker.addTo(map);
    markers.push(marker);
  });

  return markers;
}

/**
 * Update marker selection state
 * @param {Array} markers - Array of all markers
 * @param {Object} selectedMarker - The marker to select (or null to deselect all)
 */
export function updateMarkerSelection(markers, selectedMarker) {
  markers.forEach(marker => {
    const isSelected = marker === selectedMarker;
    const color = marker._markerColor || '#3b82f6';
    marker.setIcon(createMarkerIcon({ color, selected: isSelected }));
  });
}

/**
 * Fit map bounds to show all markers
 * @param {Object} map - Leaflet map instance
 * @param {Array} markers - Array of Leaflet markers
 * @param {Object} [options] - Bounds options
 * @param {number} [options.padding=50] - Padding in pixels
 * @param {number} [options.maxZoom=16] - Maximum zoom level
 */
export function fitBoundsToMarkers(map, markers, options = {}) {
  const {
    padding = 50,
    maxZoom = 16
  } = options;

  if (!markers || markers.length === 0) {
    return;
  }

  const group = L.featureGroup(markers);
  map.fitBounds(group.getBounds(), {
    padding: [padding, padding],
    maxZoom
  });
}

/**
 * Clear all markers from the map
 * @param {Object} map - Leaflet map instance
 * @param {Array} markers - Array of markers to remove
 */
export function clearMarkers(map, markers) {
  if (!markers) return;

  markers.forEach(marker => {
    map.removeLayer(marker);
  });
}

/**
 * Pan and zoom to a specific marker
 * @param {Object} map - Leaflet map instance
 * @param {Object} marker - Leaflet marker
 * @param {number} [zoom=16] - Zoom level
 */
export function panToMarker(map, marker, zoom = 16) {
  const latLng = marker.getLatLng();
  map.setView(latLng, zoom, { animate: true });
}

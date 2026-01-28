/**
 * Geometry utilities for working with Google Maps and GeoJSON
 */

// Conversion factor: square meters to acres
const SQ_METERS_TO_ACRES = 0.000247105;

/**
 * Convert Google Maps Polygon to GeoJSON Polygon
 * @param {google.maps.Polygon} polygon - Google Maps polygon
 * @returns {Object} GeoJSON Polygon object
 */
export function polygonToGeoJSON(polygon) {
  const path = polygon.getPath().getArray();
  const coordinates = path.map(p => [p.lng(), p.lat()]);

  // Close the ring (GeoJSON requires first and last points to match)
  if (coordinates.length > 0) {
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coordinates.push([...first]);
    }
  }

  return {
    type: 'Polygon',
    coordinates: [coordinates]
  };
}

/**
 * Convert GeoJSON Polygon to Google Maps LatLng array
 * @param {Object} geoJSON - GeoJSON Polygon object
 * @returns {Array} Array of {lat, lng} objects
 */
export function geoJSONToLatLngArray(geoJSON) {
  if (!geoJSON || geoJSON.type !== 'Polygon' || !geoJSON.coordinates?.[0]) {
    return [];
  }

  // Don't include the closing point (Google Maps handles this automatically)
  const coords = geoJSON.coordinates[0];
  const path = coords.slice(0, -1).map(([lng, lat]) => ({ lat, lng }));

  return path;
}

/**
 * Calculate area of a polygon using Google Maps Geometry library
 * @param {google.maps.Polygon} polygon - Google Maps polygon
 * @returns {Object} Area in square meters and acres
 */
export function calculatePolygonArea(polygon) {
  if (!window.google?.maps?.geometry?.spherical) {
    console.warn('Google Maps Geometry library not loaded');
    return { sqMeters: 0, acres: 0 };
  }

  const sqMeters = window.google.maps.geometry.spherical.computeArea(polygon.getPath());
  const acres = sqMeters * SQ_METERS_TO_ACRES;

  return {
    sqMeters: Math.round(sqMeters * 100) / 100,
    acres: Math.round(acres * 100) / 100
  };
}

/**
 * Calculate area from GeoJSON polygon
 * @param {Object} geoJSON - GeoJSON Polygon object
 * @returns {Object} Area in square meters and acres
 */
export function calculateGeoJSONArea(geoJSON) {
  if (!window.google?.maps?.geometry?.spherical) {
    console.warn('Google Maps Geometry library not loaded');
    return { sqMeters: 0, acres: 0 };
  }

  const path = geoJSONToLatLngArray(geoJSON);
  if (path.length < 3) return { sqMeters: 0, acres: 0 };

  const latLngs = path.map(p => new window.google.maps.LatLng(p.lat, p.lng));
  const sqMeters = window.google.maps.geometry.spherical.computeArea(latLngs);
  const acres = sqMeters * SQ_METERS_TO_ACRES;

  return {
    sqMeters: Math.round(sqMeters * 100) / 100,
    acres: Math.round(acres * 100) / 100
  };
}

/**
 * Calculate centroid of a polygon
 * @param {Object} geoJSON - GeoJSON Polygon object
 * @returns {Object|null} {lat, lng} centroid or null
 */
export function calculateCentroid(geoJSON) {
  if (!geoJSON || geoJSON.type !== 'Polygon' || !geoJSON.coordinates?.[0]) {
    return null;
  }

  const coords = geoJSON.coordinates[0];
  if (coords.length === 0) return null;

  let latSum = 0;
  let lngSum = 0;
  const n = coords.length - 1; // Exclude closing point

  for (let i = 0; i < n; i++) {
    lngSum += coords[i][0];
    latSum += coords[i][1];
  }

  return {
    lat: Math.round((latSum / n) * 1000000) / 1000000,
    lng: Math.round((lngSum / n) * 1000000) / 1000000
  };
}

/**
 * Check if a point is inside a polygon
 * @param {Object} point - {lat, lng} point
 * @param {Object} geoJSON - GeoJSON Polygon object
 * @returns {boolean} True if point is inside polygon
 */
export function isPointInPolygon(point, geoJSON) {
  if (!window.google?.maps?.geometry?.poly) {
    console.warn('Google Maps Geometry library not loaded');
    return false;
  }

  const path = geoJSONToLatLngArray(geoJSON);
  if (path.length < 3) return false;

  const latLng = new window.google.maps.LatLng(point.lat, point.lng);
  const polygon = new window.google.maps.Polygon({ paths: path });

  return window.google.maps.geometry.poly.containsLocation(latLng, polygon);
}

/**
 * Check if a land tract is inside a site polygon
 * Returns true if centroid OR any vertex is inside the site
 * @param {Object} landGeoJSON - Land tract GeoJSON Polygon
 * @param {Object} siteGeoJSON - Site GeoJSON Polygon
 * @returns {boolean} True if land is reasonably within site
 */
export function validateLandInSite(landGeoJSON, siteGeoJSON) {
  // First check centroid
  const centroid = calculateCentroid(landGeoJSON);
  if (centroid && isPointInPolygon(centroid, siteGeoJSON)) {
    return true;
  }

  // If centroid check fails, check if any vertex is inside
  // This handles edge cases where the centroid falls outside
  const landPath = geoJSONToLatLngArray(landGeoJSON);
  for (const point of landPath) {
    if (isPointInPolygon(point, siteGeoJSON)) {
      return true;
    }
  }

  return false;
}

/**
 * Get bounds from GeoJSON polygon
 * @param {Object} geoJSON - GeoJSON Polygon object
 * @returns {google.maps.LatLngBounds|null} Bounds or null
 */
export function getGeoJSONBounds(geoJSON) {
  if (!window.google?.maps?.LatLngBounds) {
    return null;
  }

  const path = geoJSONToLatLngArray(geoJSON);
  if (path.length === 0) return null;

  const bounds = new window.google.maps.LatLngBounds();
  path.forEach(p => bounds.extend(new window.google.maps.LatLng(p.lat, p.lng)));

  return bounds;
}

/**
 * Format acres for display
 * @param {number} acres - Acreage value
 * @param {boolean} includeSqFt - Include square feet in parentheses (default: true)
 * @returns {string} Formatted string
 */
export function formatAcres(acres, includeSqFt = true) {
  if (acres === null || acres === undefined) return '—';

  const sqFt = Math.round(acres * 43560);
  const formattedSqFt = sqFt.toLocaleString();

  let acreStr;
  if (acres < 0.01) {
    acreStr = acres.toFixed(4);
  } else if (acres < 1) {
    acreStr = acres.toFixed(3);
  } else if (acres < 10) {
    acreStr = acres.toFixed(2);
  } else {
    acreStr = acres.toFixed(1);
  }

  if (includeSqFt) {
    return `${acreStr} acres (${formattedSqFt} sq ft)`;
  }
  return `${acreStr} acres`;
}

/**
 * Validate polygon has minimum vertices
 * @param {Object} geoJSON - GeoJSON Polygon object
 * @returns {Object} Validation result
 */
export function validatePolygon(geoJSON) {
  if (!geoJSON || geoJSON.type !== 'Polygon') {
    return { valid: false, error: 'Invalid polygon type' };
  }

  const coords = geoJSON.coordinates?.[0];
  if (!coords || coords.length < 4) { // 3 points + closing point
    return { valid: false, error: 'Polygon must have at least 3 points' };
  }

  const area = calculateGeoJSONArea(geoJSON);
  if (area.sqMeters <= 0) {
    return { valid: false, error: 'Polygon area must be greater than zero' };
  }

  return { valid: true, area };
}

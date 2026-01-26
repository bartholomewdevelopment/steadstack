import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, DrawingManager, Polygon } from '@react-google-maps/api';
import MapToolbar from './MapToolbar';
import { useMaps } from './MapsProvider';
import { polygonToGeoJSON, geoJSONToLatLngArray, calculatePolygonArea, getGeoJSONBounds } from '../../utils/geometry';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '400px'
};

const defaultCenter = { lat: 30.2672, lng: -97.7431 }; // Austin, TX

const polygonOptions = {
  fillColor: '#22c55e',
  fillOpacity: 0.3,
  strokeColor: '#16a34a',
  strokeWeight: 2,
  clickable: true,
  editable: false,
  draggable: false,
  zIndex: 4
};

const editablePolygonOptions = {
  fillColor: '#22c55e',
  fillOpacity: 0.3,
  strokeColor: '#16a34a',
  strokeWeight: 2,
  clickable: true,
  editable: true,
  draggable: true,
  zIndex: 4
};

const drawingPolygonOptions = {
  fillColor: '#22c55e',
  fillOpacity: 0.2,
  strokeColor: '#16a34a',
  strokeWeight: 2
};

// Site boundary - green like in SiteMap
const referencePolygonOptions = {
  fillColor: '#22c55e',
  fillOpacity: 0.25,
  strokeColor: '#16a34a',
  strokeWeight: 3,
  clickable: false,
  editable: false,
  draggable: false,
  zIndex: 2
};

// Land tract type colors - same as SiteMap
const landPolygonColors = {
  PARCEL: { fill: '#3b82f6', stroke: '#2563eb' },
  FIELD: { fill: '#eab308', stroke: '#ca8a04' },
  PASTURE: { fill: '#22c55e', stroke: '#16a34a' },
  INFRASTRUCTURE: { fill: '#6b7280', stroke: '#4b5563' },
  OTHER: { fill: '#a855f7', stroke: '#9333ea' }
};

export default function PolygonDrawer({
  center = null,
  initialGeometry = null,
  referenceGeometry = null,
  existingTracts = [],
  onGeometryChange,
  onAreaChange,
  readOnly = false,
  mapType = 'hybrid'
}) {
  const { isLoaded } = useMaps();
  const [map, setMap] = useState(null);
  const [mode, setMode] = useState(MapToolbar.modes.VIEW);
  const [geometry, setGeometry] = useState(initialGeometry);
  const [drawingManager, setDrawingManager] = useState(null);
  const [drawingLibraryReady, setDrawingLibraryReady] = useState(false);
  const [polygonsReady, setPolygonsReady] = useState(false);

  const polygonRef = useRef(null);

  // Force polygon re-render after map is ready
  useEffect(() => {
    if (map) {
      setPolygonsReady(false);
      const timer = setTimeout(() => {
        setPolygonsReady(true);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [map]);

  // Check if drawing library is available after map loads
  useEffect(() => {
    if (isLoaded && window.google?.maps?.drawing) {
      setDrawingLibraryReady(true);
    } else if (isLoaded) {
      // Poll for drawing library (sometimes it loads slightly after isLoaded becomes true)
      const checkDrawing = setInterval(() => {
        if (window.google?.maps?.drawing) {
          setDrawingLibraryReady(true);
          clearInterval(checkDrawing);
        }
      }, 100);

      // Stop polling after 5 seconds
      setTimeout(() => clearInterval(checkDrawing), 5000);

      return () => clearInterval(checkDrawing);
    }
  }, [isLoaded]);

  // Update geometry when initialGeometry changes
  useEffect(() => {
    setGeometry(initialGeometry);
  }, [initialGeometry]);

  // Control drawing mode when mode or drawingManager changes
  useEffect(() => {
    if (!drawingManager || !window.google?.maps?.drawing) return;

    if (mode === MapToolbar.modes.DRAW && !geometry) {
      drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
    } else {
      drawingManager.setDrawingMode(null);
    }
  }, [mode, geometry, drawingManager]);

  // Fit bounds when map loads or geometry changes
  useEffect(() => {
    if (!map) return;

    if (geometry) {
      const bounds = getGeoJSONBounds(geometry);
      if (bounds) {
        map.fitBounds(bounds, { padding: 50 });
      }
    } else if (referenceGeometry) {
      const bounds = getGeoJSONBounds(referenceGeometry);
      if (bounds) {
        map.fitBounds(bounds, { padding: 50 });
      }
    } else if (center) {
      map.setCenter(center);
      map.setZoom(15);
    }
  }, [map, geometry, referenceGeometry, center]);

  const onMapLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  const onDrawingManagerLoad = useCallback((dm) => {
    setDrawingManager(dm);
  }, []);

  const handlePolygonComplete = useCallback((polygon) => {
    // Calculate area
    const area = calculatePolygonArea(polygon);

    // Convert to GeoJSON
    const geoJSON = polygonToGeoJSON(polygon);

    // Store geometry
    setGeometry(geoJSON);
    setMode(MapToolbar.modes.VIEW);

    // Remove the drawing (we'll render with our controlled Polygon)
    polygon.setMap(null);

    // Notify parent
    if (onGeometryChange) onGeometryChange(geoJSON);
    if (onAreaChange) onAreaChange(area);
  }, [onGeometryChange, onAreaChange]);

  const handlePolygonEdit = useCallback(() => {
    if (!polygonRef.current) return;

    const area = calculatePolygonArea(polygonRef.current);
    const geoJSON = polygonToGeoJSON(polygonRef.current);

    setGeometry(geoJSON);
    if (onGeometryChange) onGeometryChange(geoJSON);
    if (onAreaChange) onAreaChange(area);
  }, [onGeometryChange, onAreaChange]);

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
  }, []);

  const handleClear = useCallback(() => {
    setGeometry(null);
    setMode(MapToolbar.modes.VIEW);
    if (onGeometryChange) onGeometryChange(null);
    if (onAreaChange) onAreaChange({ sqMeters: 0, acres: 0 });
  }, [onGeometryChange, onAreaChange]);

  const handlePolygonLoad = useCallback((polygon) => {
    polygonRef.current = polygon;

    // Add listeners for editing
    if (window.google?.maps?.event) {
      window.google.maps.event.addListener(polygon.getPath(), 'set_at', handlePolygonEdit);
      window.google.maps.event.addListener(polygon.getPath(), 'insert_at', handlePolygonEdit);
      window.google.maps.event.addListener(polygon.getPath(), 'remove_at', handlePolygonEdit);
    }
  }, [handlePolygonEdit]);

  const mapCenter = center || defaultCenter;
  const path = geometry ? geoJSONToLatLngArray(geometry) : [];
  const referencePath = referenceGeometry ? geoJSONToLatLngArray(referenceGeometry) : [];
  const isEditing = mode === MapToolbar.modes.EDIT;
  const isDrawing = mode === MapToolbar.modes.DRAW && !geometry;

  // Debug logging
  console.log('PolygonDrawer polygonsReady:', polygonsReady, 'map:', !!map);
  console.log('PolygonDrawer referencePath:', referencePath.length);
  console.log('PolygonDrawer existingTracts:', existingTracts.length);

  if (!isLoaded) {
    return (
      <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-300 bg-gray-100" style={mapContainerStyle}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-300">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={15}
        onLoad={onMapLoad}
        mapTypeId={mapType}
        options={{
          mapTypeControl: true,
          mapTypeControlOptions: {
            position: window.google?.maps?.ControlPosition?.TOP_RIGHT
          },
          fullscreenControl: true,
          streetViewControl: false,
          zoomControl: true
        }}
      >
        {/* Invisible anchor polygon - DO NOT REMOVE - fixes rendering issue */}
        <Polygon
          paths={[
            { lat: 0.00001, lng: 0.00001 },
            { lat: 0.00001, lng: 0.00002 },
            { lat: 0.00002, lng: 0.00002 },
            { lat: 0.00002, lng: 0.00001 },
          ]}
          options={{
            fillOpacity: 0,
            strokeOpacity: 0,
            zIndex: -1
          }}
        />

        {/* Reference polygon (site boundary) - only render after map is ready */}
        {polygonsReady && referencePath.length > 0 && (
          <Polygon
            key={`reference-${referencePath.length}-${polygonsReady}`}
            paths={referencePath}
            options={referencePolygonOptions}
          />
        )}

        {/* Existing land tracts (read-only) - only render after map is ready */}
        {polygonsReady && existingTracts.map((tract) => {
          if (!tract.geometry) return null;
          const tractPath = geoJSONToLatLngArray(tract.geometry);
          if (tractPath.length === 0) return null;
          const colors = landPolygonColors[tract.type] || landPolygonColors.OTHER;
          return (
            <Polygon
              key={`existing-${tract.id}-${polygonsReady}`}
              paths={tractPath}
              options={{
                fillColor: colors.fill,
                fillOpacity: 0.3,
                strokeColor: colors.stroke,
                strokeWeight: 2,
                clickable: false,
                editable: false,
                draggable: false,
                zIndex: 3
              }}
            />
          );
        })}

        {/* Main polygon - use key to force remount when switching edit mode */}
        {polygonsReady && path.length > 0 && (
          <Polygon
            key={isEditing ? 'polygon-edit' : 'polygon-view'}
            paths={path}
            options={isEditing ? editablePolygonOptions : polygonOptions}
            onLoad={handlePolygonLoad}
          />
        )}

        {/* Drawing manager - only render when drawing library is available */}
        {!readOnly && drawingLibraryReady && (
          <DrawingManager
            onLoad={onDrawingManagerLoad}
            onPolygonComplete={handlePolygonComplete}
            drawingMode={isDrawing ? window.google.maps.drawing.OverlayType.POLYGON : null}
            options={{
              drawingControl: false,
              polygonOptions: drawingPolygonOptions
            }}
          />
        )}
      </GoogleMap>

      {/* Toolbar */}
      {!readOnly && (
        <MapToolbar
          mode={mode}
          onModeChange={handleModeChange}
          onClear={handleClear}
          hasPolygon={!!geometry}
        />
      )}
    </div>
  );
}

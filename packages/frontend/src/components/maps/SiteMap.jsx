import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, Polygon, InfoWindow } from '@react-google-maps/api';
import { useMaps } from './MapsProvider';
import { geoJSONToLatLngArray, getGeoJSONBounds, formatAcres } from '../../utils/geometry';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '300px'
};

const defaultCenter = { lat: 30.2672, lng: -97.7431 };

const sitePolygonOptions = {
  fillColor: '#22c55e',
  fillOpacity: 0.2,
  strokeColor: '#16a34a',
  strokeWeight: 2,
  clickable: true,
  zIndex: 1
};

const landPolygonColors = {
  PARCEL: { fill: '#3b82f6', stroke: '#2563eb' },
  FIELD: { fill: '#eab308', stroke: '#ca8a04' },
  PASTURE: { fill: '#22c55e', stroke: '#16a34a' },
  INFRASTRUCTURE: { fill: '#6b7280', stroke: '#4b5563' },
  OTHER: { fill: '#a855f7', stroke: '#9333ea' }
};

export default function SiteMap({
  siteGeometry = null,
  landTracts = [],
  center = null,
  onSiteClick,
  onLandClick,
  selectedLandId = null,
  showLabels = true,
  height = '400px',
  mapType = 'hybrid'
}) {
  const { isLoaded } = useMaps();
  const [map, setMap] = useState(null);
  const [infoWindow, setInfoWindow] = useState(null);
  const [polygonsReady, setPolygonsReady] = useState(false);

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

  // Fit bounds when map loads - use timeout to ensure map is fully ready
  useEffect(() => {
    if (!map) return;

    // Small delay to ensure Google Maps is fully initialized
    const timeoutId = setTimeout(() => {
      // First try to fit to site geometry
      if (siteGeometry) {
        const bounds = getGeoJSONBounds(siteGeometry);
        if (bounds) {
          map.fitBounds(bounds, { padding: 50 });
          return;
        }
      }

      // If no site geometry, try to fit to land tracts
      if (landTracts && landTracts.length > 0) {
        const firstTractWithGeometry = landTracts.find(t => t.geometry);
        if (firstTractWithGeometry) {
          const bounds = getGeoJSONBounds(firstTractWithGeometry.geometry);
          if (bounds) {
            map.fitBounds(bounds, { padding: 50 });
            return;
          }
        }
      }

      // Fall back to center point
      if (center) {
        map.setCenter(center);
        map.setZoom(15);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [map, siteGeometry, landTracts, center]);

  const onMapLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  const handleSiteClick = useCallback((e) => {
    if (onSiteClick) {
      onSiteClick(e);
    }
  }, [onSiteClick]);

  const handleLandClick = useCallback((tract, e) => {
    if (onLandClick) {
      onLandClick(tract);
    }

    // Show info window
    setInfoWindow({
      position: e.latLng,
      tract
    });
  }, [onLandClick]);

  const sitePath = siteGeometry ? geoJSONToLatLngArray(siteGeometry) : [];

  // Compute initial center - prefer provided center, then compute from geometry
  const computeInitialCenter = () => {
    if (center) return center;

    // Try to get center from first land tract
    if (landTracts && landTracts.length > 0) {
      const firstTract = landTracts.find(t => t.geometry || t.centroid);
      if (firstTract?.centroid) {
        return firstTract.centroid;
      }
      if (firstTract?.geometry) {
        const path = geoJSONToLatLngArray(firstTract.geometry);
        if (path.length > 0) {
          // Use first point as approximate center
          return path[0];
        }
      }
    }

    return defaultCenter;
  };

  const initialCenter = computeInitialCenter();

  if (!isLoaded) {
    return (
      <div className="relative w-full rounded-lg overflow-hidden border border-gray-300 bg-gray-100" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-gray-300" style={{ height }}>
      <GoogleMap
        mapContainerStyle={{ ...mapContainerStyle, height }}
        center={initialCenter}
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

        {/* Site boundary - only render after map is ready */}
        {polygonsReady && sitePath.length > 0 && (
          <Polygon
            key={`site-boundary-${sitePath.length}`}
            paths={sitePath}
            options={sitePolygonOptions}
            onClick={handleSiteClick}
          />
        )}

        {/* Land tracts - only render after map is ready */}
        {polygonsReady && landTracts.map((tract) => {
          if (!tract.geometry) {
            return null;
          }

          const path = geoJSONToLatLngArray(tract.geometry);
          if (path.length === 0) {
            return null;
          }

          const colors = landPolygonColors[tract.type] || landPolygonColors.OTHER;
          const isSelected = tract.id === selectedLandId;

          return (
            <Polygon
              key={tract.id}
              paths={path}
              options={{
                fillColor: colors.fill,
                fillOpacity: isSelected ? 0.5 : 0.3,
                strokeColor: colors.stroke,
                strokeWeight: isSelected ? 3 : 2,
                strokeOpacity: isSelected ? 1 : 0.8,
                clickable: true,
                zIndex: isSelected ? 3 : 2
              }}
              onClick={(e) => handleLandClick(tract, e)}
            />
          );
        })}

        {/* Info Window for land tracts */}
        {infoWindow && (
          <InfoWindow
            position={infoWindow.position}
            onCloseClick={() => setInfoWindow(null)}
          >
            <div className="p-2 min-w-32">
              <h3 className="font-semibold text-gray-900">{infoWindow.tract.name}</h3>
              <p className="text-sm text-gray-600">{infoWindow.tract.type}</p>
              <p className="text-sm text-gray-600">{formatAcres(infoWindow.tract.areaAcres)}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Legend */}
      {landTracts.length > 0 && showLabels && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Land Types</h4>
          <div className="space-y-1">
            {Object.entries(landPolygonColors).map(([type, colors]) => {
              const hasType = landTracts.some(t => t.type === type);
              if (!hasType) return null;

              return (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm border"
                    style={{
                      backgroundColor: colors.fill,
                      borderColor: colors.stroke
                    }}
                  />
                  <span className="text-xs text-gray-600">{type}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

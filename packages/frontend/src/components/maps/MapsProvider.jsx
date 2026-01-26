import { createContext, useContext } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

// IMPORTANT: This MUST be defined outside the component and be a stable reference
// The library requires this to be a constant array
const GOOGLE_MAPS_LIBRARIES = ['drawing', 'geometry'];

const MapsContext = createContext({ isLoaded: false, loadError: null });

export function useMaps() {
  return useContext(MapsContext);
}

export default function MapsProvider({ children }) {
  // Support both variable names
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
    // Prevent duplicate loads
    id: 'google-map-script'
  });

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Maps Not Configured</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add VITE_MAPS_API_KEY to packages/frontend/.env
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 rounded-lg border-2 border-dashed border-red-300">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-red-900">Maps Error</h3>
          <p className="mt-1 text-sm text-red-500">
            Failed to load Google Maps
          </p>
        </div>
      </div>
    );
  }

  return (
    <MapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </MapsContext.Provider>
  );
}

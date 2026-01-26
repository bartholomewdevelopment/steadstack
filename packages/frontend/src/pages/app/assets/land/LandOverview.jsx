import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LandNav } from '../../../../components/land';
import { MapsProvider, SiteMap } from '../../../../components/maps';
import { sitesApi, landTractsApi } from '../../../../services/api';
import { useSite } from '../../../../contexts/SiteContext';
import { formatAcres } from '../../../../utils/geometry';

export default function LandOverview() {
  const { currentSite, sites } = useSite();
  const [stats, setStats] = useState(null);
  const [siteData, setSiteData] = useState(null);
  const [landTracts, setLandTracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [currentSite]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const params = currentSite?.id ? { siteId: currentSite.id } : {};

      // Fetch stats
      const statsRes = await landTractsApi.getStats(params);
      setStats(statsRes.data);

      // Fetch current site details with boundary
      if (currentSite?.id) {
        const siteRes = await sitesApi.get(currentSite.id);
        setSiteData(siteRes.data?.site);

        // Fetch land tracts for current site
        const tractsRes = await landTractsApi.list({ siteId: currentSite.id, status: 'active' });
        setLandTracts(tractsRes.data?.tracts || []);
      } else {
        setSiteData(null);
        setLandTracts([]);
      }
    } catch (error) {
      console.error('Error fetching land data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sitesWithBoundary = sites?.filter(s => s.boundaryGeometry) || [];
  const sitesWithoutBoundary = sites?.filter(s => !s.boundaryGeometry) || [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Land Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your sites, parcels, fields, and pastures
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/app/assets/land/sites/new"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              + Add Site
            </Link>
            <Link
              to="/app/assets/land/tracts/new"
              className={`inline-flex items-center px-4 py-2 rounded-md shadow-sm text-sm font-medium ${
                sitesWithBoundary.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              onClick={(e) => {
                if (sitesWithBoundary.length === 0) e.preventDefault();
              }}
              title={sitesWithBoundary.length === 0 ? 'Create a site with a boundary first' : ''}
            >
              + Add Land Tract
            </Link>
          </div>
        </div>
      </div>

      <LandNav />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 rounded-full bg-green-100">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Sites</p>
                  <p className="text-2xl font-bold text-gray-900">{sites?.length || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 rounded-full bg-blue-100">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Land Tracts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.active || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 rounded-full bg-yellow-100">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Acreage</p>
                  <p className="text-2xl font-bold text-gray-900">{formatAcres(stats?.totalAcres)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 rounded-full bg-purple-100">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">With Boundaries</p>
                  <p className="text-2xl font-bold text-gray-900">{sitesWithBoundary.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Map & Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {currentSite ? currentSite.name : 'All Sites'} Map
                </h2>
              </div>
              <div className="p-4" style={{ height: '400px' }}>
                <MapsProvider>
                  {siteData?.boundaryGeometry ? (
                    <SiteMap
                      siteGeometry={siteData.boundaryGeometry}
                      landTracts={landTracts}
                      center={siteData.coordinates ? {
                        lat: siteData.coordinates.latitude,
                        lng: siteData.coordinates.longitude
                      } : null}
                      onLandClick={(tract) => {
                        window.location.href = `/app/assets/land/tracts/${tract.id}`;
                      }}
                      height="100%"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No Boundary Set</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {currentSite
                            ? 'Draw a boundary to see the map'
                            : 'Select a site or create one with a boundary'
                          }
                        </p>
                        {currentSite && (
                          <Link
                            to={`/app/assets/land/sites/${currentSite.id}`}
                            className="mt-3 inline-flex items-center text-sm text-green-600 hover:text-green-700"
                          >
                            Edit Site Boundary →
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </MapsProvider>
              </div>
            </div>

            {/* Land Type Breakdown */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Land by Type</h2>
              </div>
              <div className="p-4">
                {stats?.byType && Object.entries(stats.byType).map(([type, data]) => (
                  <div key={type} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${
                        type === 'FIELD' ? 'bg-yellow-500' :
                        type === 'PASTURE' ? 'bg-green-500' :
                        type === 'PARCEL' ? 'bg-blue-500' :
                        type === 'INFRASTRUCTURE' ? 'bg-gray-500' :
                        'bg-purple-500'
                      }`} />
                      <span className="text-sm font-medium text-gray-700">{type}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{data.count}</p>
                      <p className="text-xs text-gray-500">{formatAcres(data.acres)}</p>
                    </div>
                  </div>
                ))}
                {(!stats?.byType || Object.values(stats.byType).every(t => t.count === 0)) && (
                  <p className="text-sm text-gray-500 text-center py-4">No land tracts yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Sites Needing Boundaries */}
          {sitesWithoutBoundary.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Sites Without Boundaries</h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    The following sites need boundaries before you can add land tracts:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {sitesWithoutBoundary.map(site => (
                      <li key={site.id}>
                        <Link
                          to={`/app/assets/land/sites/${site.id}`}
                          className="text-sm text-yellow-800 hover:text-yellow-900 underline"
                        >
                          {site.name} — Draw Boundary →
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

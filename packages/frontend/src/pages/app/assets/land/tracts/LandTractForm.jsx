import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { MapsProvider, PolygonDrawer } from '../../../../../components/maps';
import { landTractsApi, sitesApi } from '../../../../../services/api';
import { useSite } from '../../../../../contexts/SiteContext';
import { calculateCentroid, formatAcres } from '../../../../../utils/geometry';

const landTypes = [
  { value: 'PARCEL', label: 'Parcel', description: 'Legal subdivision or lot' },
  { value: 'FIELD', label: 'Field', description: 'Cultivated or crop area' },
  { value: 'PASTURE', label: 'Pasture', description: 'Grazing area' },
  { value: 'INFRASTRUCTURE', label: 'Infrastructure', description: 'Buildings, roads, utilities' },
  { value: 'OTHER', label: 'Other', description: 'Other land use' },
];

export default function LandTractForm() {
  const { tractId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { sites } = useSite();

  const isEditing = !!tractId;
  const initialSiteId = searchParams.get('siteId') || '';

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    siteId: initialSiteId,
    name: '',
    code: '',
    type: 'FIELD',
    notes: '',
    tags: [],
    soil: {
      type: '',
      ph: '',
      notes: '',
    },
  });

  const [geometry, setGeometry] = useState(null);
  const [area, setArea] = useState({ sqMeters: 0, acres: 0 });
  const [selectedSite, setSelectedSite] = useState(null);
  const [existingTracts, setExistingTracts] = useState([]);

  const sitesWithBoundary = sites?.filter(s => s.boundaryGeometry) || [];

  useEffect(() => {
    if (isEditing) {
      fetchTract();
    }
  }, [tractId]);

  useEffect(() => {
    if (formData.siteId) {
      fetchSite(formData.siteId);
      fetchExistingTracts(formData.siteId);
    } else {
      setSelectedSite(null);
      setExistingTracts([]);
    }
  }, [formData.siteId]);

  const fetchTract = async () => {
    try {
      setLoading(true);
      const res = await landTractsApi.get(tractId);
      const tract = res.data?.tract;
      if (tract) {
        setFormData({
          siteId: tract.siteId,
          name: tract.name || '',
          code: tract.code || '',
          type: tract.type || 'FIELD',
          notes: tract.notes || '',
          tags: tract.tags || [],
          soil: tract.soil || { type: '', ph: '', notes: '' },
        });
        setGeometry(tract.geometry);
        setArea({ sqMeters: tract.areaSqMeters || 0, acres: tract.areaAcres || 0 });
      }
    } catch (error) {
      console.error('Error fetching tract:', error);
      setError('Failed to load land tract');
    } finally {
      setLoading(false);
    }
  };

  const fetchSite = async (siteId) => {
    try {
      const res = await sitesApi.get(siteId);
      setSelectedSite(res.data?.site);
    } catch (error) {
      console.error('Error fetching site:', error);
    }
  };

  const fetchExistingTracts = async (siteId) => {
    try {
      const res = await landTractsApi.list({ siteId });
      // Filter out the current tract if editing
      const tracts = res.data?.tracts || [];
      const filteredTracts = isEditing
        ? tracts.filter(t => t.id !== tractId)
        : tracts;
      setExistingTracts(filteredTracts);
    } catch (error) {
      console.error('Error fetching existing tracts:', error);
      setExistingTracts([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleGeometryChange = (newGeometry) => {
    setGeometry(newGeometry);
  };

  const handleAreaChange = (newArea) => {
    setArea(newArea);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.siteId) {
      setError('Please select a site');
      return;
    }

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!geometry) {
      setError('Please draw a boundary for this land tract');
      return;
    }

    // Note: Validation that tract is inside site boundary is optional
    // Users may want to draw tracts that extend slightly beyond the site boundary
    // The site boundary is shown as a gray reference polygon on the map

    try {
      setSaving(true);

      const centroid = calculateCentroid(geometry);

      const tractData = {
        siteId: formData.siteId,
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        type: formData.type,
        notes: formData.notes.trim() || undefined,
        tags: formData.tags,
        soil: formData.soil.type ? formData.soil : undefined,
        geometry,
        areaSqMeters: area.sqMeters,
        areaAcres: area.acres,
        centroid,
      };

      if (isEditing) {
        await landTractsApi.update(tractId, tractData);
      } else {
        await landTractsApi.create(tractData);
      }

      navigate('/app/assets/land/tracts');
    } catch (error) {
      console.error('Error saving tract:', error);
      setError(error.response?.data?.message || 'Failed to save land tract');
    } finally {
      setSaving(false);
    }
  };

  const mapCenter = selectedSite?.coordinates
    ? { lat: selectedSite.coordinates.latitude, lng: selectedSite.coordinates.longitude }
    : null;

  if (loading) {
    return (
      <div>
                <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          to="/app/assets/land/tracts"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to Land Tracts
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Land Tract' : 'Create Land Tract'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEditing ? 'Update land tract details and boundary' : 'Define a new land area within a site'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {sitesWithBoundary.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-yellow-800">No Sites Available</h3>
          <p className="mt-1 text-sm text-yellow-700">
            You need to create a site with a boundary before adding land tracts.
          </p>
          <Link
            to="/app/assets/land/sites/new"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
          >
            Create a Site
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Form Fields */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-lg shadow p-6 space-y-4">
                {/* Site Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Site <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="siteId"
                    value={formData.siteId}
                    onChange={handleInputChange}
                    disabled={isEditing}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100"
                    required
                  >
                    <option value="">Select a site...</option>
                    {sitesWithBoundary.map(site => (
                      <option key={site.id} value={site.id}>
                        {site.name} ({formatAcres(site.boundaryAreaAcres)})
                      </option>
                    ))}
                  </select>
                  {selectedSite && (
                    <p className="mt-1 text-xs text-gray-500">
                      Site boundary: {formatAcres(selectedSite.boundaryAreaAcres)}
                    </p>
                  )}
                </div>

                {/* Name & Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    placeholder="e.g., North Field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Code
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    maxLength={10}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 uppercase"
                    placeholder="e.g., NF01"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  >
                    {landTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    placeholder="Additional notes about this land tract..."
                  />
                </div>
              </div>

              {/* Soil Info */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Soil Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Soil Type</label>
                    <input
                      type="text"
                      name="soil.type"
                      value={formData.soil.type}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      placeholder="e.g., Clay loam"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">pH Level</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="14"
                      name="soil.ph"
                      value={formData.soil.ph}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      placeholder="e.g., 6.8"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Soil Notes</label>
                    <textarea
                      name="soil.notes"
                      value={formData.soil.notes}
                      onChange={handleInputChange}
                      rows={2}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      placeholder="Notes about soil condition..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Map */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Draw Boundary</h2>
                  <p className="text-sm text-gray-500">
                    Draw the land tract boundary within the site (green) - existing tracts shown in color
                  </p>
                </div>
                <div className="p-4" style={{ height: '500px' }}>
                  <MapsProvider>
                    {formData.siteId && selectedSite?.boundaryGeometry ? (
                      <PolygonDrawer
                        center={mapCenter}
                        initialGeometry={geometry}
                        referenceGeometry={selectedSite.boundaryGeometry}
                        existingTracts={existingTracts}
                        onGeometryChange={handleGeometryChange}
                        onAreaChange={handleAreaChange}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <div className="text-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          <h3 className="mt-2 text-sm font-medium text-gray-900">Select a Site</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            Choose a site to see its boundary and draw land tracts
                          </p>
                        </div>
                      </div>
                    )}
                  </MapsProvider>
                </div>
                {formData.siteId && (
                  <div className="px-4 pb-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">
                        {geometry ? 'Boundary Status: Set' : 'Boundary Status: Not Set'}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatAcres(area.acres)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/app/assets/land/tracts')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !geometry}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Land Tract' : 'Create Land Tract'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

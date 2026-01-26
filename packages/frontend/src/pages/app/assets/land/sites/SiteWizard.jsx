import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapsProvider, PolygonDrawer } from '../../../../../components/maps';
import { sitesApi } from '../../../../../services/api';
import { useSite } from '../../../../../contexts/SiteContext';
import { calculateCentroid, formatAcres } from '../../../../../utils/geometry';

const siteTypes = [
  { value: 'farm', label: 'Farm' },
  { value: 'ranch', label: 'Ranch' },
  { value: 'pasture', label: 'Pasture' },
  { value: 'barn', label: 'Barn' },
  { value: 'feedlot', label: 'Feedlot' },
  { value: 'greenhouse', label: 'Greenhouse' },
  { value: 'storage', label: 'Storage' },
  { value: 'other', label: 'Other' },
];

export default function SiteWizard() {
  const navigate = useNavigate();
  const { refreshSites } = useSite();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Details
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'farm',
    description: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
    },
    coordinates: {
      latitude: '',
      longitude: '',
    },
    connectedLandRuleAccepted: false,
  });

  // Step 2: Boundary
  const [boundaryGeometry, setBoundaryGeometry] = useState(null);
  const [boundaryArea, setBoundaryArea] = useState({ sqMeters: 0, acres: 0 });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
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
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            coordinates: {
              latitude: position.coords.latitude.toFixed(6),
              longitude: position.coords.longitude.toFixed(6),
            },
          }));
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('Unable to get current location');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
    }
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Site name is required');
      return;
    }

    if (!formData.connectedLandRuleAccepted) {
      setError('Please acknowledge the connected land rule');
      return;
    }

    if (!formData.coordinates.latitude || !formData.coordinates.longitude) {
      setError('Please enter coordinates or use current location');
      return;
    }

    setStep(2);
  };

  const handleGeometryChange = (geometry) => {
    setBoundaryGeometry(geometry);
  };

  const handleAreaChange = (area) => {
    setBoundaryArea(area);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      const centroid = boundaryGeometry ? calculateCentroid(boundaryGeometry) : null;

      const siteData = {
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        type: formData.type,
        description: formData.description.trim() || undefined,
        address: formData.address,
        coordinates: {
          latitude: parseFloat(formData.coordinates.latitude),
          longitude: parseFloat(formData.coordinates.longitude),
        },
        connectedLandRuleAccepted: formData.connectedLandRuleAccepted,
        boundaryGeometry: boundaryGeometry || undefined,
        boundaryAreaSqMeters: boundaryArea.sqMeters || undefined,
        boundaryAreaAcres: boundaryArea.acres || undefined,
        boundaryCentroid: centroid || undefined,
      };

      await sitesApi.create(siteData);
      await refreshSites();
      navigate('/app/assets/land/sites');
    } catch (error) {
      console.error('Error creating site:', error);
      setError(error.message || 'Failed to create site');
    } finally {
      setLoading(false);
    }
  };

  const mapCenter = formData.coordinates.latitude && formData.coordinates.longitude
    ? {
        lat: parseFloat(formData.coordinates.latitude),
        lng: parseFloat(formData.coordinates.longitude),
      }
    : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Site</h1>
        <p className="mt-1 text-sm text-gray-500">
          Step {step} of 2: {step === 1 ? 'Site Details' : 'Draw Boundary'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            1
          </div>
          <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-green-600' : 'bg-gray-200'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step >= 2 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            2
          </div>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-gray-500">Details</span>
          <span className="text-xs text-gray-500">Boundary</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleStep1Submit} className="bg-white shadow rounded-lg p-6">
          <div className="space-y-6">
            {/* Name & Code */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Site Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  placeholder="e.g., Main Ranch"
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
                  placeholder="e.g., MAIN"
                />
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Site Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              >
                {siteTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    placeholder="Street Address"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    placeholder="City"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    placeholder="State"
                  />
                  <input
                    type="text"
                    name="address.zipCode"
                    value={formData.address.zipCode}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    placeholder="ZIP"
                  />
                </div>
              </div>
            </div>

            {/* Coordinates */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Map Center <span className="text-red-500">*</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <input
                    type="number"
                    step="any"
                    name="coordinates.latitude"
                    value={formData.coordinates.latitude}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    placeholder="Latitude"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="any"
                    name="coordinates.longitude"
                    value={formData.coordinates.longitude}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    placeholder="Longitude"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Use Current Location
                  </button>
                </div>
              </div>
            </div>

            {/* Connected Land Rule */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="connectedLandRuleAccepted"
                  checked={formData.connectedLandRuleAccepted}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-700">
                  <strong>I understand</strong> that this Site represents <strong>one connected tract of land</strong>.
                  If my land is split into disconnected areas, I will create separate Sites for each area.
                </span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/app/assets/land/sites')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              Next: Draw Boundary
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900">Draw Site Boundary</h2>
            <p className="text-sm text-gray-500">
              Use the draw tool to outline your site's boundary on the map.
              You can skip this step and draw the boundary later.
            </p>
          </div>

          {/* Map */}
          <div className="h-96 mb-4">
            <MapsProvider>
              <PolygonDrawer
                center={mapCenter}
                initialGeometry={boundaryGeometry}
                onGeometryChange={handleGeometryChange}
                onAreaChange={handleAreaChange}
              />
            </MapsProvider>
          </div>

          {/* Boundary Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-6">
            <div className="flex items-center gap-2">
              {boundaryGeometry ? (
                <>
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-green-700">Boundary Complete</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm font-medium text-yellow-700">No Boundary Drawn</span>
                </>
              )}
            </div>
            <div className="text-sm text-gray-600">
              Calculated Acreage: <span className="font-semibold">{formatAcres(boundaryArea.acres)}</span>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Back
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Without Boundary'}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !boundaryGeometry}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Site'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

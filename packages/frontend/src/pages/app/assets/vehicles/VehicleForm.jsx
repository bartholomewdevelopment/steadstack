import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useSite } from '../../../../contexts/SiteContext';
import { vehiclesApi, sitesApi } from '../../../../services/api';

const vehicleTypes = [
  { value: 'TRUCK', label: 'Truck' },
  { value: 'TRACTOR', label: 'Tractor' },
  { value: 'ATV', label: 'ATV' },
  { value: 'UTV', label: 'UTV' },
  { value: 'TRAILER', label: 'Trailer' },
  { value: 'IMPLEMENT', label: 'Implement' },
  { value: 'OTHER', label: 'Other' },
];

const fuelTypes = [
  { value: 'GASOLINE', label: 'Gasoline' },
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'ELECTRIC', label: 'Electric' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'PROPANE', label: 'Propane' },
];

export default function VehicleForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentSite, sites } = useSite();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(isEditing);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    // Base asset fields
    name: '',
    siteId: currentSite?.id || '',
    status: 'ACTIVE',
    tags: '',
    acquiredAt: '',
    acquisitionCost: '',
    notes: '',
    // Vehicle-specific fields
    vehicleType: 'TRUCK',
    vin: '',
    plateNumber: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    fuelType: 'GASOLINE',
    fuelCapacity: '',
    odometerValue: '',
    odometerUnit: 'MILES',
    engineHours: '',
    insurancePolicy: '',
    insuranceExpiry: '',
    registrationExpiry: '',
  });

  useEffect(() => {
    if (isEditing) {
      fetchVehicle();
    }
  }, [id]);

  useEffect(() => {
    if (!isEditing && currentSite?.id && !formData.siteId) {
      setFormData((prev) => ({ ...prev, siteId: currentSite.id }));
    }
  }, [currentSite, isEditing]);

  const fetchVehicle = async () => {
    try {
      setFetchingData(true);
      const response = await vehiclesApi.get(id);
      const vehicle = response.data?.vehicle || response.vehicle || response;
      const asset = response.data?.asset || response.asset || {};

      setFormData({
        name: asset.name || `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        siteId: vehicle.siteId || '',
        status: asset.status || 'ACTIVE',
        tags: (asset.tags || []).join(', '),
        acquiredAt: asset.acquiredAt ? new Date(asset.acquiredAt._seconds ? asset.acquiredAt._seconds * 1000 : asset.acquiredAt).toISOString().split('T')[0] : '',
        acquisitionCost: asset.acquisitionCost || '',
        notes: asset.notes || '',
        vehicleType: vehicle.vehicleType || 'TRUCK',
        vin: vehicle.vin || '',
        plateNumber: vehicle.plateNumber || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        year: vehicle.year || new Date().getFullYear(),
        color: vehicle.color || '',
        fuelType: vehicle.fuelType || 'GASOLINE',
        fuelCapacity: vehicle.fuelCapacity || '',
        odometerValue: vehicle.odometer?.value || '',
        odometerUnit: vehicle.odometer?.unit || 'MILES',
        engineHours: vehicle.engineHours?.value || '',
        insurancePolicy: vehicle.insurancePolicy || '',
        insuranceExpiry: vehicle.insuranceExpiry ? new Date(vehicle.insuranceExpiry._seconds ? vehicle.insuranceExpiry._seconds * 1000 : vehicle.insuranceExpiry).toISOString().split('T')[0] : '',
        registrationExpiry: vehicle.registrationExpiry ? new Date(vehicle.registrationExpiry._seconds ? vehicle.registrationExpiry._seconds * 1000 : vehicle.registrationExpiry).toISOString().split('T')[0] : '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setFetchingData(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseFloat(value) : '') : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.make || !formData.model || !formData.siteId) {
      setError('Make, Model, and Site are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        // Asset fields
        name: formData.name || `${formData.year} ${formData.make} ${formData.model}`,
        siteId: formData.siteId,
        status: formData.status,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        acquiredAt: formData.acquiredAt || null,
        acquisitionCost: formData.acquisitionCost ? parseFloat(formData.acquisitionCost) : null,
        notes: formData.notes,
        // Vehicle fields
        vehicleType: formData.vehicleType,
        vin: formData.vin,
        plateNumber: formData.plateNumber,
        make: formData.make,
        model: formData.model,
        year: formData.year ? parseInt(formData.year) : null,
        color: formData.color,
        fuelType: formData.fuelType,
        fuelCapacity: formData.fuelCapacity ? parseFloat(formData.fuelCapacity) : null,
        odometer: formData.odometerValue ? {
          value: parseFloat(formData.odometerValue),
          unit: formData.odometerUnit,
          recordedAt: new Date().toISOString(),
        } : null,
        engineHours: formData.engineHours ? {
          value: parseFloat(formData.engineHours),
          recordedAt: new Date().toISOString(),
        } : null,
        insurancePolicy: formData.insurancePolicy,
        insuranceExpiry: formData.insuranceExpiry || null,
        registrationExpiry: formData.registrationExpiry || null,
      };

      if (isEditing) {
        await vehiclesApi.update(id, payload);
      } else {
        await vehiclesApi.create(payload);
      }

      navigate('/app/assets/vehicles');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <div className="space-y-6">
                <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading vehicle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/app/assets/vehicles" className="text-gray-500 hover:text-gray-700">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Vehicle' : 'Add Vehicle'}
          </h1>
          <p className="text-gray-600">
            {isEditing ? 'Update vehicle information' : 'Add a new vehicle to your assets'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
            {error}
          </div>
        )}

        {/* Vehicle Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Vehicle Details</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="label">Year</label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                min="1900"
                max="2100"
                className="input"
              />
            </div>
            <div>
              <label className="label">Make *</label>
              <input
                type="text"
                name="make"
                value={formData.make}
                onChange={handleChange}
                placeholder="Ford, John Deere, etc."
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Model *</label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="F-250, 5075E, etc."
                className="input"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Vehicle Type</label>
              <select name="vehicleType" value={formData.vehicleType} onChange={handleChange} className="input">
                {vehicleTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Color</label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                placeholder="Red, White, etc."
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Identification */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Identification</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">VIN</label>
              <input
                type="text"
                name="vin"
                value={formData.vin}
                onChange={handleChange}
                placeholder="Vehicle Identification Number"
                className="input font-mono"
                maxLength="17"
              />
            </div>
            <div>
              <label className="label">License Plate</label>
              <input
                type="text"
                name="plateNumber"
                value={formData.plateNumber}
                onChange={handleChange}
                placeholder="Plate number"
                className="input font-mono"
              />
            </div>
          </div>
        </div>

        {/* Usage & Fuel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Usage & Fuel</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="label">Odometer</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="odometerValue"
                  value={formData.odometerValue}
                  onChange={handleChange}
                  placeholder="0"
                  className="input flex-1"
                  min="0"
                />
                <select
                  name="odometerUnit"
                  value={formData.odometerUnit}
                  onChange={handleChange}
                  className="input w-24"
                >
                  <option value="MILES">mi</option>
                  <option value="KM">km</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Engine Hours</label>
              <input
                type="number"
                name="engineHours"
                value={formData.engineHours}
                onChange={handleChange}
                placeholder="For tractors/equipment"
                className="input"
                min="0"
              />
            </div>
            <div>
              <label className="label">Fuel Type</label>
              <select name="fuelType" value={formData.fuelType} onChange={handleChange} className="input">
                {fuelTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Location & Acquisition */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Location & Acquisition</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Site *</label>
              <select name="siteId" value={formData.siteId} onChange={handleChange} className="input" required>
                <option value="">Select a site</option>
                {sites?.map((site) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Acquired Date</label>
              <input
                type="date"
                name="acquiredAt"
                value={formData.acquiredAt}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Acquisition Cost</label>
              <input
                type="number"
                name="acquisitionCost"
                value={formData.acquisitionCost}
                onChange={handleChange}
                placeholder="0.00"
                className="input"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="label">Tags</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="Comma-separated tags"
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Insurance & Registration */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Insurance & Registration</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="label">Insurance Policy #</label>
              <input
                type="text"
                name="insurancePolicy"
                value={formData.insurancePolicy}
                onChange={handleChange}
                placeholder="Policy number"
                className="input"
              />
            </div>
            <div>
              <label className="label">Insurance Expiry</label>
              <input
                type="date"
                name="insuranceExpiry"
                value={formData.insuranceExpiry}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="label">Registration Expiry</label>
              <input
                type="date"
                name="registrationExpiry"
                value={formData.registrationExpiry}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Additional notes..."
            className="input"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link to="/app/assets/vehicles" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : isEditing ? 'Update Vehicle' : 'Add Vehicle'}
          </button>
        </div>
      </form>
    </div>
  );
}

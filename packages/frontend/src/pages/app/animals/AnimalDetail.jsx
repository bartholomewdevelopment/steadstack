import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { animalsApi, sitesApi } from '../../../services/api';

const speciesIcons = {
  cattle: '🐄',
  sheep: '🐑',
  goat: '🐐',
  pig: '🐷',
  horse: '🐴',
  poultry: '🐔',
  other: '🐾',
};

const statusColors = {
  active: 'bg-green-100 text-green-700',
  sold: 'bg-blue-100 text-blue-700',
  deceased: 'bg-gray-100 text-gray-700',
  transferred: 'bg-yellow-100 text-yellow-700',
  culled: 'bg-red-100 text-red-700',
};

export default function AnimalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState(null);
  const [site, setSite] = useState(null);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: '', reason: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchAnimal();
  }, [id]);

  const fetchAnimal = async () => {
    try {
      setLoading(true);
      const response = await animalsApi.get(id);
      // API returns { success, data: { animal } }
      const animalData = response.data?.animal || response.animal || response.data;
      setAnimal(animalData);

      // Fetch site and group names if we have IDs
      const siteId = animalData?.siteId?.id || (typeof animalData?.siteId === 'string' ? animalData.siteId : null);
      const groupId = animalData?.groupId?.id || (typeof animalData?.groupId === 'string' ? animalData.groupId : null);

      // Fetch related data in parallel
      const promises = [];
      if (siteId) {
        promises.push(
          sitesApi.get(siteId)
            .then(res => setSite(res.data?.site || res.site || res.data))
            .catch(() => setSite(null))
        );
      }
      if (groupId) {
        promises.push(
          animalsApi.getGroup(groupId)
            .then(res => setGroup(res.data?.group || res.group || res.data))
            .catch(() => setGroup(null))
        );
      }
      await Promise.all(promises);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!statusForm.status) return;

    setActionLoading(true);
    try {
      await animalsApi.updateStatus(id, statusForm);
      setShowStatusModal(false);
      fetchAnimal();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Remove this animal from the system?')) return;

    try {
      await animalsApi.delete(id);
      navigate('/app/animals');
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'Not set';

    let date;
    // Handle Firestore Timestamp objects
    if (dateValue.toDate) {
      date = dateValue.toDate();
    }
    // Handle seconds/nanoseconds format from Firestore
    else if (dateValue._seconds) {
      date = new Date(dateValue._seconds * 1000);
    }
    // Handle Date objects or strings
    else {
      date = new Date(dateValue);
    }

    if (isNaN(date.getTime())) return 'Not set';

    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatAge = () => {
    if (!animal?.age) return 'Unknown';
    const { years, months } = animal.age;
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
    }
    return `${months} month${months !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading animal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
          <p className="text-red-600">{error}</p>
          <Link to="/app/animals" className="mt-4 inline-block text-red-600 hover:text-red-700">
            Back to Livestock
          </Link>
        </div>
      </div>
    );
  }

  if (!animal) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/app/animals"
            className="text-gray-500 hover:text-gray-700 text-sm mb-2 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Livestock
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl">
              {speciesIcons[animal.species] || speciesIcons.other}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{animal.tagNumber}</h1>
              {animal.name && <p className="text-lg text-gray-600">{animal.name}</p>}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500 capitalize">{animal.species}</span>
                {animal.breed && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-sm text-gray-500">{animal.breed}</span>
                  </>
                )}
                <span
                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                    statusColors[animal.status]
                  }`}
                >
                  {animal.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            to={`/app/animals/${id}/edit`}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Edit
          </Link>
          {animal.status === 'active' && (
            <button
              onClick={() => setShowStatusModal(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Change Status
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
            <dl className="grid sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Gender</dt>
                <dd className="mt-1 text-gray-900 capitalize">{animal.gender}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                <dd className="mt-1 text-gray-900">{formatDate(animal.dateOfBirth)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Age</dt>
                <dd className="mt-1 text-gray-900">{formatAge()}</dd>
              </div>
              {animal.color && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Color</dt>
                  <dd className="mt-1 text-gray-900">{animal.color}</dd>
                </div>
              )}
              {animal.markings && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Markings</dt>
                  <dd className="mt-1 text-gray-900">{animal.markings}</dd>
                </div>
              )}
              {animal.weight?.value && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Weight</dt>
                  <dd className="mt-1 text-gray-900">
                    {animal.weight.value} {animal.weight.unit}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
            <dl className="grid sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Site</dt>
                <dd className="mt-1 text-gray-900">
                  {site?.name || animal.siteId?.name || 'Not assigned'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Group / Herd</dt>
                <dd className="mt-1 text-gray-900">
                  {group?.name || animal.groupId?.name ? (
                    <>
                      {group?.name || animal.groupId?.name}{' '}
                      <span className="text-gray-500">({group?.type || animal.groupId?.type || 'group'})</span>
                    </>
                  ) : (
                    'No group'
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Identification */}
          {(animal.registrationNumber || animal.electronicId) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Identification</h2>
              <dl className="grid sm:grid-cols-2 gap-4">
                {animal.registrationNumber && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Registration Number</dt>
                    <dd className="mt-1 text-gray-900">{animal.registrationNumber}</dd>
                  </div>
                )}
                {animal.electronicId && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Electronic ID (EID)</dt>
                    <dd className="mt-1 text-gray-900">{animal.electronicId}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Acquisition */}
          {animal.acquisition?.method && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Acquisition</h2>
              <dl className="grid sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Method</dt>
                  <dd className="mt-1 text-gray-900 capitalize">
                    {animal.acquisition.method.replace('_', ' ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Date</dt>
                  <dd className="mt-1 text-gray-900">{formatDate(animal.acquisitionDate)}</dd>
                </div>
                {animal.acquisition.source && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Source</dt>
                    <dd className="mt-1 text-gray-900">{animal.acquisition.source}</dd>
                  </div>
                )}
                {animal.acquisition.cost && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Cost</dt>
                    <dd className="mt-1 text-gray-900">
                      ${animal.acquisition.cost.toLocaleString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Notes */}
          {animal.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{animal.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                to={`/app/events/new?animalId=${animal._id}`}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Record Event
              </Link>
              <Link
                to={`/app/animals/${id}/edit`}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Edit Details
              </Link>
            </div>
          </div>

          {/* Lineage */}
          {(animal.sireId || animal.damId) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Lineage</h3>
              <dl className="space-y-3">
                {animal.sireId && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Sire</dt>
                    <dd className="mt-1">
                      <Link
                        to={`/app/animals/${animal.sireId._id}`}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        {animal.sireId.tagNumber}
                        {animal.sireId.name && ` (${animal.sireId.name})`}
                      </Link>
                    </dd>
                  </div>
                )}
                {animal.damId && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Dam</dt>
                    <dd className="mt-1">
                      <Link
                        to={`/app/animals/${animal.damId._id}`}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        {animal.damId.tagNumber}
                        {animal.damId.name && ` (${animal.damId.name})`}
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Record Info</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-900">{formatDate(animal.createdAt)}</dd>
              </div>
              {animal.createdBy && (
                <div>
                  <dt className="text-gray-500">Created by</dt>
                  <dd className="text-gray-900">
                    {animal.createdBy.displayName || animal.createdBy.email}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Last updated</dt>
                <dd className="text-gray-900">{formatDate(animal.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Danger Zone */}
          {animal.status === 'active' && (
            <div className="bg-white rounded-xl border border-red-200 p-6">
              <h3 className="font-semibold text-red-700 mb-4">Danger Zone</h3>
              <button
                onClick={handleDelete}
                className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
              >
                Remove Animal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Status</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                  className="input"
                >
                  <option value="">Select status...</option>
                  <option value="sold">Sold</option>
                  <option value="deceased">Deceased</option>
                  <option value="transferred">Transferred</option>
                  <option value="culled">Culled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={statusForm.reason}
                  onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Optional reason for status change..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChange}
                disabled={!statusForm.status || actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

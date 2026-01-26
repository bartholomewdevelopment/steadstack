import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminApi } from '../../services/api';

const statusColors = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

const planColors = {
  starter: 'bg-gray-100 text-gray-700',
  professional: 'bg-blue-100 text-blue-700',
};

export default function TenantDetail() {
  const { id } = useParams();
  const [tenant, setTenant] = useState(null);
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', plan: '', status: '' });

  useEffect(() => {
    fetchTenant();
  }, [id]);

  const fetchTenant = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getTenant(id);
      setTenant(response.tenant);
      setUsers(response.users);
      setSites(response.sites);
      setStats(response.stats);
      setEditForm({
        name: response.tenant.name,
        plan: response.tenant.plan,
        status: response.tenant.status,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!confirm('Suspend this tenant? All users will be suspended.')) return;

    setActionLoading(true);
    try {
      await adminApi.suspendTenant(id);
      fetchTenant();
    } catch (err) {
      alert('Failed to suspend: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!confirm('Activate this tenant?')) return;

    setActionLoading(true);
    try {
      await adminApi.activateTenant(id);
      fetchTenant();
    } catch (err) {
      alert('Failed to activate: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setActionLoading(true);
    try {
      await adminApi.updateTenant(id, editForm);
      setShowEditModal(false);
      fetchTenant();
    } catch (err) {
      alert('Failed to update: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading tenant...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
          <p className="text-red-600">{error}</p>
          <Link to="/admin/tenants" className="mt-4 inline-block text-red-600 hover:text-red-700">
            Back to Tenants
          </Link>
        </div>
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/admin/tenants" className="text-gray-500 hover:text-gray-700 text-sm mb-2 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Tenants
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-gray-500">{tenant.slug}</span>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${planColors[tenant.plan]}`}>
              {tenant.plan === 'starter' ? 'Free' : 'Full Access'}
            </span>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${statusColors[tenant.status]}`}>
              {tenant.status}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Edit
          </button>
          {tenant.status === 'suspended' ? (
            <button
              onClick={handleActivate}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              Activate
            </button>
          ) : (
            <button
              onClick={handleSuspend}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              Suspend
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Users</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.userCount || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Sites</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.siteCount || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Events</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.eventCount || 0}</p>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tenant Details</h2>
        <dl className="grid md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-gray-900">{formatDate(tenant.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="mt-1 text-gray-900">{formatDate(tenant.updatedAt)}</dd>
          </div>
          {tenant.status === 'trial' && tenant.trialEndsAt && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Trial Ends</dt>
              <dd className="mt-1 text-gray-900">{formatDate(tenant.trialEndsAt)}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-gray-500">Timezone</dt>
            <dd className="mt-1 text-gray-900">{tenant.settings?.timezone || 'Not set'}</dd>
          </div>
        </dl>
      </div>

      {/* Users */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Users ({users.length})</h2>
        {users.length === 0 ? (
          <p className="text-gray-500">No users</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-500">User</th>
                  <th className="px-4 py-2 text-left text-gray-500">Role</th>
                  <th className="px-4 py-2 text-left text-gray-500">Status</th>
                  <th className="px-4 py-2 text-left text-gray-500">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user._id}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{user.displayName || 'No name'}</p>
                        <p className="text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-900">{user.role}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sites */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sites ({sites.length})</h2>
        {sites.length === 0 ? (
          <p className="text-gray-500">No sites</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {sites.map((site) => (
              <div key={site._id} className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{site.name}</p>
                <p className="text-sm text-gray-500">
                  {site.type} {site.acreage && `- ${site.acreage} acres`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Tenant</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select
                  value={editForm.plan}
                  onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                  className="input"
                >
                  <option value="starter">Free</option>
                  <option value="professional">Full Access</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="input"
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                {actionLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

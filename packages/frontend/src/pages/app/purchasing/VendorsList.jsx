import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { purchasingApi } from '../../../services/api';
import PurchasingNav from '../../../components/purchasing/PurchasingNav';

export default function VendorsList() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: '',
    email: '',
    phone: '',
    defaultPaymentTerms: 30,
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await purchasingApi.getVendors();
      setVendors(response.data?.vendors || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();
    if (!newVendor.name.trim()) {
      setError('Vendor name is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await purchasingApi.createVendor(newVendor);
      setShowAddModal(false);
      setNewVendor({ name: '', email: '', phone: '', defaultPaymentTerms: 30 });
      await fetchVendors();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PurchasingNav />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-600">Manage your suppliers and vendors</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          + Add Vendor
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Vendors List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading vendors...</p>
        </div>
      ) : vendors.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">🏪</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors yet</h3>
          <p className="text-gray-500 mb-4">Add your first vendor to start creating purchase orders</p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            + Add Vendor
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Terms
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{vendor.name}</p>
                        {vendor.code && <p className="text-sm text-gray-500">Code: {vendor.code}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {vendor.email && <p className="text-gray-900">{vendor.email}</p>}
                        {vendor.phone && <p className="text-gray-500">{vendor.phone}</p>}
                        {!vendor.email && !vendor.phone && <p className="text-gray-400">No contact info</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      Net {vendor.defaultPaymentTerms || 30}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        vendor.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {vendor.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Vendor</h3>
            <form onSubmit={handleAddVendor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  className="input"
                  placeholder="e.g., ABC Supply Co."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newVendor.email}
                  onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                  className="input"
                  placeholder="vendor@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newVendor.phone}
                  onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                  className="input"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms (Days)</label>
                <input
                  type="number"
                  value={newVendor.defaultPaymentTerms}
                  onChange={(e) => setNewVendor({ ...newVendor, defaultPaymentTerms: parseInt(e.target.value) || 30 })}
                  className="input"
                  min="0"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 btn-primary"
                >
                  {saving ? 'Adding...' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

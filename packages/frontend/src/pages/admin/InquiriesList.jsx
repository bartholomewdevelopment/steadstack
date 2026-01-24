import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../services/api';

const statusColors = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  converted: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
};

export default function InquiriesList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedInquiry, setSelectedInquiry] = useState(null);

  const currentStatus = searchParams.get('status') || '';
  const currentPage = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    fetchInquiries();
  }, [currentStatus, currentPage]);

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { page: currentPage, limit: 20 };
      if (currentStatus) params.status = currentStatus;

      const response = await adminApi.listInquiries(params);
      setInquiries(response.inquiries);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleStatusChange = async (inquiry, newStatus) => {
    try {
      await adminApi.updateInquiry(inquiry._id, { status: newStatus });
      fetchInquiries();
      if (selectedInquiry?._id === inquiry._id) {
        setSelectedInquiry({ ...selectedInquiry, status: newStatus });
      }
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleDelete = async (inquiry) => {
    if (!confirm('Delete this inquiry?')) return;

    try {
      await adminApi.deleteInquiry(inquiry._id);
      fetchInquiries();
      if (selectedInquiry?._id === inquiry._id) {
        setSelectedInquiry(null);
      }
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contact Inquiries</h1>
        <p className="text-gray-600">Manage leads from the marketing site</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={currentStatus}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="input py-2 min-w-[150px]"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="converted">Converted</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Inquiries List */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-500">Loading inquiries...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-600">{error}</p>
              <button onClick={fetchInquiries} className="mt-2 text-red-700 underline">
                Try again
              </button>
            </div>
          ) : inquiries.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No inquiries found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-200">
                {inquiries.map((inquiry) => (
                  <div
                    key={inquiry._id}
                    onClick={() => setSelectedInquiry(inquiry)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedInquiry?._id === inquiry._id ? 'bg-red-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{inquiry.name}</p>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[inquiry.status]}`}>
                            {inquiry.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{inquiry.email}</p>
                        {inquiry.farmName && (
                          <p className="text-sm text-gray-600 mt-1">{inquiry.farmName}</p>
                        )}
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">{inquiry.message}</p>
                      </div>
                      <div className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDate(inquiry.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Page {pagination.page} of {pagination.pages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFilterChange('page', String(currentPage - 1))}
                      disabled={currentPage <= 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => handleFilterChange('page', String(currentPage + 1))}
                      disabled={currentPage >= pagination.pages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedInquiry ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Inquiry Details</h3>
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-gray-900">{selectedInquiry.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1">
                    <a href={`mailto:${selectedInquiry.email}`} className="text-red-600 hover:text-red-700">
                      {selectedInquiry.email}
                    </a>
                  </dd>
                </div>
                {selectedInquiry.phone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1">
                      <a href={`tel:${selectedInquiry.phone}`} className="text-red-600 hover:text-red-700">
                        {selectedInquiry.phone}
                      </a>
                    </dd>
                  </div>
                )}
                {selectedInquiry.farmName && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Farm Name</dt>
                    <dd className="mt-1 text-gray-900">{selectedInquiry.farmName}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Source</dt>
                  <dd className="mt-1 text-gray-900 capitalize">{selectedInquiry.source?.replace('_', ' ')}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Message</dt>
                  <dd className="mt-1 text-gray-900 whitespace-pre-wrap">{selectedInquiry.message}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Received</dt>
                  <dd className="mt-1 text-gray-900">{formatDate(selectedInquiry.createdAt)}</dd>
                </div>
              </dl>

              {/* Actions */}
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
                  <select
                    value={selectedInquiry.status}
                    onChange={(e) => handleStatusChange(selectedInquiry, e.target.value)}
                    className="input py-2"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="converted">Converted</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <button
                  onClick={() => handleDelete(selectedInquiry)}
                  className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
                >
                  Delete Inquiry
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <p className="text-gray-500">Select an inquiry to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

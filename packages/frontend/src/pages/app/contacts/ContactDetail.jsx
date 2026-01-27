import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { contactsApi } from '../../../services/api';

const typeColors = {
  employee: 'bg-blue-100 text-blue-700',
  contractor: 'bg-purple-100 text-purple-700',
  vendor: 'bg-green-100 text-green-700',
  customer: 'bg-yellow-100 text-yellow-700',
  company: 'bg-gray-100 text-gray-700',
};

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchContact();
  }, [id]);

  const fetchContact = async () => {
    try {
      setLoading(true);
      const response = await contactsApi.get(id);
      setContact(response.data?.contact);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to deactivate this contact?')) return;

    try {
      await contactsApi.delete(id);
      navigate('/app/contacts');
    } catch (err) {
      setError(err.message);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return '-';
    return new Date(dateVal).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading contact...</p>
        </div>
      </div>
    );
  }

  if (error && !contact) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
          <p className="text-red-600">{error}</p>
          <Link to="/app/contacts" className="mt-4 inline-block text-red-600 hover:text-red-700">
            Back to Contacts
          </Link>
        </div>
      </div>
    );
  }

  if (!contact) return null;

  const address = contact.address;
  const hasAddress = address?.street || address?.city || address?.state;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/app/contacts"
            className="text-gray-500 hover:text-gray-700 text-sm mb-2 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Contacts
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{contact.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span
              className={`inline-flex px-3 py-1 text-sm font-medium rounded-full capitalize ${
                typeColors[contact.type] || 'bg-gray-100 text-gray-700'
              }`}
            >
              {contact.type}
            </span>
            {contact.code && <span className="text-sm text-gray-500">Code: {contact.code}</span>}
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            to={`/app/contacts/${id}/edit`}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2 border border-red-300 rounded-lg text-red-600 font-medium hover:bg-red-50"
          >
            Deactivate
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Contact Info Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Email</p>
          {contact.email ? (
            <a href={`mailto:${contact.email}`} className="text-lg font-medium text-red-600 hover:text-red-700">
              {contact.email}
            </a>
          ) : (
            <p className="text-lg font-medium text-gray-900">-</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Phone</p>
          {contact.phone ? (
            <a href={`tel:${contact.phone}`} className="text-lg font-medium text-gray-900 hover:text-red-600">
              {contact.phone}
            </a>
          ) : (
            <p className="text-lg font-medium text-gray-900">-</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Labor Rate</p>
          <p className="text-lg font-medium text-gray-900">
            {contact.laborRate ? formatCurrency(contact.laborRate) + '/hr' : '-'}
          </p>
        </div>
      </div>

      {/* Address */}
      {hasAddress && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
          <p className="text-gray-700">
            {address.street && <>{address.street}<br /></>}
            {address.city && <>{address.city}, </>}
            {address.state} {address.zip}
            {address.country && address.country !== 'USA' && <><br />{address.country}</>}
          </p>
        </div>
      )}

      {/* Type-specific Details */}
      {contact.type === 'vendor' && contact.vendorFields && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vendor Details</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Payment Terms</p>
              <p className="font-medium text-gray-900">
                {contact.vendorFields.paymentTerms?.replace(/_/g, ' ') || 'Net 30'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tax ID</p>
              <p className="font-medium text-gray-900">{contact.vendorFields.taxId || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">A/P Balance</p>
              <p className="font-medium text-gray-900">{formatCurrency(contact.vendorFields.balance)}</p>
            </div>
          </div>
        </div>
      )}

      {contact.type === 'customer' && contact.customerFields && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Details</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Payment Terms</p>
              <p className="font-medium text-gray-900">
                {contact.customerFields.paymentTerms?.replace(/_/g, ' ') || 'Net 30'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Credit Limit</p>
              <p className="font-medium text-gray-900">{formatCurrency(contact.customerFields.creditLimit)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">A/R Balance</p>
              <p className="font-medium text-gray-900">{formatCurrency(contact.customerFields.balance)}</p>
            </div>
          </div>
        </div>
      )}

      {(contact.type === 'employee' || contact.type === 'contractor') && contact.employeeFields && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {contact.type === 'employee' ? 'Employee' : 'Contractor'} Details
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Role</p>
              <p className="font-medium text-gray-900">{contact.employeeFields.role || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {contact.type === 'employee' ? 'Hire Date' : 'Start Date'}
              </p>
              <p className="font-medium text-gray-900">{formatDate(contact.employeeFields.hireDate)}</p>
            </div>
          </div>
        </div>
      )}

      {contact.type === 'company' && contact.companyFields && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Primary Contact</p>
              <p className="font-medium text-gray-900">{contact.companyFields.contactName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Website</p>
              {contact.companyFields.website ? (
                <a
                  href={contact.companyFields.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-red-600 hover:text-red-700"
                >
                  {contact.companyFields.website}
                </a>
              ) : (
                <p className="font-medium text-gray-900">-</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {contact.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Notes</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
        </div>
      )}
    </div>
  );
}

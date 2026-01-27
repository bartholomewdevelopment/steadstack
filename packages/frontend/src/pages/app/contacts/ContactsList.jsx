import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { contactsApi } from '../../../services/api';

const contactTypes = [
  { value: '', label: 'All Contacts' },
  { value: 'employee', label: 'Employees' },
  { value: 'contractor', label: 'Contractors' },
  { value: 'vendor', label: 'Vendors' },
  { value: 'customer', label: 'Customers' },
  { value: 'company', label: 'Companies' },
];

const typeColors = {
  employee: 'bg-blue-100 text-blue-700',
  contractor: 'bg-purple-100 text-purple-700',
  vendor: 'bg-green-100 text-green-700',
  customer: 'bg-yellow-100 text-yellow-700',
  company: 'bg-gray-100 text-gray-700',
};

export default function ContactsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const typeFilter = searchParams.get('type') || '';

  useEffect(() => {
    fetchContacts();
  }, [typeFilter]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const params = { activeOnly: 'true' };
      if (typeFilter) {
        params.type = typeFilter;
      }
      const response = await contactsApi.list(params);
      setContacts(response.data?.contacts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type) => {
    if (type) {
      setSearchParams({ type });
    } else {
      setSearchParams({});
    }
  };

  const filteredContacts = contacts.filter((c) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(searchLower) ||
      c.email?.toLowerCase().includes(searchLower) ||
      c.phone?.includes(search)
    );
  });

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500">Employees, contractors, vendors, and customers</p>
        </div>
        <Link to="/app/contacts/new" className="btn-primary">
          + New Contact
        </Link>
      </div>

      {/* Type Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 -mb-px">
          {contactTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => handleTypeChange(type.value)}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                typeFilter === type.value
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {type.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="input pl-10"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Contacts List */}
      {filteredContacts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first contact.
          </p>
          <div className="mt-6">
            <Link to="/app/contacts/new" className="btn-primary">
              + New Contact
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Phone
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Labor Rate
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      to={`/app/contacts/${contact.id}`}
                      className="font-medium text-gray-900 hover:text-red-600"
                    >
                      {contact.name}
                    </Link>
                    {contact.code && (
                      <span className="ml-2 text-xs text-gray-500">({contact.code})</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        typeColors[contact.type] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {contact.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{contact.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{contact.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    {contact.laborRate ? formatCurrency(contact.laborRate) + '/hr' : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/app/contacts/${contact.id}/edit`}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

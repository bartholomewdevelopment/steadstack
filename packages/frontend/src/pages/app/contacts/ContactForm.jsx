import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { contactsApi } from '../../../services/api';

const contactTypes = [
  { value: 'employee', label: 'Employee', desc: 'Farm workers, managers, owner' },
  { value: 'contractor', label: 'Contractor', desc: 'Outside workers hired for specific jobs' },
  { value: 'vendor', label: 'Vendor', desc: 'Suppliers you purchase from' },
  { value: 'customer', label: 'Customer', desc: 'People or businesses you sell to' },
  { value: 'company', label: 'Company', desc: 'Businesses and organizations' },
];

const paymentTermsOptions = [
  { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
  { value: 'NET_15', label: 'Net 15' },
  { value: 'NET_30', label: 'Net 30' },
  { value: 'NET_45', label: 'Net 45' },
  { value: 'NET_60', label: 'Net 60' },
];

export default function ContactForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    type: 'employee',
    name: '',
    code: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'USA',
    },
    laborRate: '',
    notes: '',
    // Vendor fields
    paymentTerms: 'NET_30',
    taxId: '',
    // Employee fields
    role: '',
    hireDate: '',
    // Company fields
    contactName: '',
    website: '',
  });

  useEffect(() => {
    if (isEditing) {
      fetchContact();
    }
  }, [id]);

  const fetchContact = async () => {
    try {
      setLoading(true);
      const response = await contactsApi.get(id);
      const contact = response.data?.contact;
      if (contact) {
        setForm({
          type: contact.type || 'employee',
          name: contact.name || '',
          code: contact.code || '',
          email: contact.email || '',
          phone: contact.phone || '',
          address: contact.address || { street: '', city: '', state: '', zip: '', country: 'USA' },
          laborRate: contact.laborRate || '',
          notes: contact.notes || '',
          paymentTerms: contact.vendorFields?.paymentTerms || contact.customerFields?.paymentTerms || 'NET_30',
          taxId: contact.vendorFields?.taxId || '',
          role: contact.employeeFields?.role || '',
          hireDate: contact.employeeFields?.hireDate
            ? new Date(contact.employeeFields.hireDate).toISOString().split('T')[0]
            : '',
          contactName: contact.companyFields?.contactName || '',
          website: contact.companyFields?.website || '',
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);

    try {
      const data = {
        type: form.type,
        name: form.name,
        code: form.code || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address,
        laborRate: form.laborRate ? parseFloat(form.laborRate) : 0,
        notes: form.notes || null,
      };

      // Add type-specific fields
      if (form.type === 'vendor') {
        data.paymentTerms = form.paymentTerms;
        data.taxId = form.taxId || null;
      }

      if (form.type === 'customer') {
        data.paymentTerms = form.paymentTerms;
      }

      if (form.type === 'employee' || form.type === 'contractor') {
        data.role = form.role || null;
        data.hireDate = form.hireDate || null;
      }

      if (form.type === 'company') {
        data.contactName = form.contactName || null;
        data.website = form.website || null;
      }

      if (isEditing) {
        await contactsApi.update(id, data);
      } else {
        await contactsApi.create(data);
      }

      navigate('/app/contacts');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/app/contacts"
          className="text-gray-500 hover:text-gray-700 text-sm mb-2 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Contacts
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Contact' : 'New Contact'}
        </h1>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact Type */}
        {!isEditing && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Type</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {contactTypes.map((type) => (
                <label
                  key={type.value}
                  className={`flex flex-col p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    form.type === type.value ? 'border-red-500 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="type"
                      value={type.value}
                      checked={form.type === type.value}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="sr-only"
                    />
                    <span className="font-medium text-gray-900">{type.label}</span>
                  </div>
                  <span className="text-xs text-gray-500 mt-1">{type.desc}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="Full name or company name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="input"
                placeholder="Optional ID code"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input"
                placeholder="(555) 555-5555"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Labor Rate ($/hr)</label>
              <input
                type="number"
                value={form.laborRate}
                onChange={(e) => setForm({ ...form, laborRate: e.target.value })}
                className="input"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
              <input
                type="text"
                value={form.address.street}
                onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={form.address.city}
                onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={form.address.state}
                onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
              <input
                type="text"
                value={form.address.zip}
                onChange={(e) => setForm({ ...form, address: { ...form.address, zip: e.target.value } })}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Type-specific fields */}
        {(form.type === 'vendor' || form.type === 'customer') && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {form.type === 'vendor' ? 'Vendor' : 'Customer'} Details
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                <select
                  value={form.paymentTerms}
                  onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                  className="input"
                >
                  {paymentTermsOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {form.type === 'vendor' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID (EIN)</label>
                  <input
                    type="text"
                    value={form.taxId}
                    onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                    className="input"
                    placeholder="XX-XXXXXXX"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {(form.type === 'employee' || form.type === 'contractor') && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {form.type === 'employee' ? 'Employee' : 'Contractor'} Details
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="input"
                  placeholder="e.g., Owner, Manager, Farmhand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {form.type === 'employee' ? 'Hire Date' : 'Start Date'}
                </label>
                <input
                  type="date"
                  value={form.hireDate}
                  onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                  className="input"
                />
              </div>
            </div>
          </div>
        )}

        {form.type === 'company' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Contact</label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  className="input"
                  placeholder="Contact person name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="input"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="input"
            rows={3}
            placeholder="Additional notes..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/app/contacts')}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 btn-primary py-3">
            {saving ? 'Saving...' : isEditing ? 'Update Contact' : 'Create Contact'}
          </button>
        </div>
      </form>
    </div>
  );
}

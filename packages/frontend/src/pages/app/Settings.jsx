import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSite } from '../../contexts/SiteContext';

export default function Settings() {
  const { user, userProfile, updateUserProfile } = useAuth();
  const { sites } = useSite();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'farm', label: 'Farm Settings' },
    { id: 'sites', label: 'Sites' },
    { id: 'team', label: 'Team' },
    { id: 'billing', label: 'Billing' },
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-6">Settings</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8 -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && <ProfileSettings user={user} userProfile={userProfile} />}
      {activeTab === 'farm' && <FarmSettings userProfile={userProfile} />}
      {activeTab === 'sites' && <SitesSettings sites={sites} />}
      {activeTab === 'team' && <TeamSettings userProfile={userProfile} />}
      {activeTab === 'billing' && <BillingSettings userProfile={userProfile} />}
    </div>
  );
}

function ProfileSettings({ user, userProfile }) {
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    // TODO: Implement save
    setTimeout(() => setSaving(false), 1000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Profile</h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-2xl font-bold">
              {user?.displayName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <button type="button" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Change photo
              </button>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG. Max 2MB</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Display Name</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="input bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
          </div>

          <div className="pt-4">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Password</h2>
        <p className="text-gray-600 text-sm mb-4">
          Password is managed through Firebase Authentication.
        </p>
        <button className="btn-secondary">
          Change Password
        </button>
      </div>
    </div>
  );
}

function FarmSettings({ userProfile }) {
  const tenant = userProfile?.tenant;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Farm Information</h2>

        <div className="space-y-4">
          <div>
            <label className="label">Farm Name</label>
            <input
              type="text"
              defaultValue={tenant?.name || ''}
              className="input"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Timezone</label>
              <select className="input">
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
              </select>
            </div>
            <div>
              <label className="label">Date Format</label>
              <select className="input">
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>

          <div className="pt-4">
            <button className="btn-primary">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SitesSettings({ sites }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Sites</h2>
          <button className="btn-primary text-sm">Add Site</button>
        </div>

        {sites.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No sites yet. Add your first site to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {sites.map((site) => (
              <div
                key={site._id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center font-medium">
                    {site.code || site.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{site.name}</p>
                    <p className="text-sm text-gray-500">
                      {site.type} {site.acreage && `• ${site.acreage} acres`}
                    </p>
                  </div>
                </div>
                <button className="text-sm text-primary-600 hover:text-primary-700">
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamSettings({ userProfile }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
          <button className="btn-primary text-sm">Invite Member</button>
        </div>

        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-medium">
                {userProfile?.displayName?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="font-medium text-gray-900">{userProfile?.displayName || 'You'}</p>
                <p className="text-sm text-gray-500">{userProfile?.email}</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
              Owner
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          Invite team members to help manage your farm. Available on Professional and Enterprise plans.
        </p>
      </div>
    </div>
  );
}

function BillingSettings({ userProfile }) {
  const tenant = userProfile?.tenant;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h2>

        <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg border border-primary-200">
          <div>
            <p className="font-semibold text-gray-900 capitalize">{tenant?.plan || 'Starter'} Plan</p>
            <p className="text-sm text-gray-600">
              {tenant?.status === 'trial' ? 'Trial period active' : 'Active subscription'}
            </p>
          </div>
          <button className="btn-primary text-sm">Upgrade</button>
        </div>

        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Sites</p>
            <p className="text-2xl font-bold text-gray-900">1 / 1</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Team Members</p>
            <p className="text-2xl font-bold text-gray-900">1 / 2</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Animals</p>
            <p className="text-2xl font-bold text-gray-900">0 / 50</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
        <p className="text-gray-500">No payment method on file.</p>
        <button className="btn-secondary mt-4">Add Payment Method</button>
      </div>
    </div>
  );
}

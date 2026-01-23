import { useState, useRef, useEffect } from 'react';
import { useSite } from '../../contexts/SiteContext';

export default function SiteSelector() {
  const { sites, currentSite, loading, selectSite, createSite } = useSite();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selector button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          </div>
          <div className="text-left min-w-0">
            <p className="text-xs text-gray-500">Current Site</p>
            <p className="text-sm font-medium text-gray-900 truncate">
              {currentSite?.name || 'No site selected'}
            </p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1 max-h-64 overflow-y-auto">
            {sites.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No sites yet
              </div>
            ) : (
              sites.map((site) => (
                <button
                  key={site._id}
                  onClick={() => {
                    selectSite(site);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 ${
                    currentSite?._id === site._id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                      currentSite?._id === site._id
                        ? 'bg-primary-100 text-primary-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {site.code || site.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {site.name}
                    </p>
                    {site.acreage && (
                      <p className="text-xs text-gray-500">{site.acreage} acres</p>
                    )}
                  </div>
                  {currentSite?._id === site._id && (
                    <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
          <div className="border-t border-gray-200 p-2">
            <button
              onClick={() => {
                setIsOpen(false);
                setShowCreateModal(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add New Site
            </button>
          </div>
        </div>
      )}

      {/* Create Site Modal */}
      {showCreateModal && (
        <CreateSiteModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createSite}
        />
      )}
    </div>
  );
}

function CreateSiteModal({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'farm',
    acreage: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onCreate({
        ...formData,
        acreage: formData.acreage ? parseFloat(formData.acreage) : undefined,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Site</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Site Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="North Pasture"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Code (optional)</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="input"
                placeholder="NP"
                maxLength={10}
              />
            </div>
            <div>
              <label className="label">Acreage</label>
              <input
                type="number"
                value={formData.acreage}
                onChange={(e) => setFormData({ ...formData, acreage: e.target.value })}
                className="input"
                placeholder="100"
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <div>
            <label className="label">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="input"
            >
              <option value="farm">Farm</option>
              <option value="ranch">Ranch</option>
              <option value="pasture">Pasture</option>
              <option value="barn">Barn</option>
              <option value="feedlot">Feedlot</option>
              <option value="greenhouse">Greenhouse</option>
              <option value="storage">Storage</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

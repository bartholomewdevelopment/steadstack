import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const SiteContext = createContext({});

export const useSite = () => useContext(SiteContext);

export function SiteProvider({ children }) {
  const { user, getIdToken } = useAuth();
  const [sites, setSites] = useState([]);
  const [currentSite, setCurrentSite] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch sites when user changes
  useEffect(() => {
    if (user) {
      fetchSites();
    } else {
      setSites([]);
      setCurrentSite(null);
      setLoading(false);
    }
  }, [user]);

  const fetchSites = async () => {
    try {
      const token = await getIdToken();
      const response = await fetch('/api/sites', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSites(data.data.sites);

        // Set current site from localStorage or first site
        const savedSiteId = localStorage.getItem('currentSiteId');
        const savedSite = data.data.sites.find((s) => s._id === savedSiteId);

        if (savedSite) {
          setCurrentSite(savedSite);
        } else if (data.data.sites.length > 0) {
          setCurrentSite(data.data.sites[0]);
          localStorage.setItem('currentSiteId', data.data.sites[0]._id);
        }
      }
    } catch (error) {
      console.error('Fetch sites error:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectSite = (site) => {
    setCurrentSite(site);
    localStorage.setItem('currentSiteId', site._id);
  };

  const createSite = async (siteData) => {
    const token = await getIdToken();
    const response = await fetch('/api/sites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(siteData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create site');
    }

    const data = await response.json();
    setSites((prev) => [...prev, data.data.site]);

    // If this is the first site, select it
    if (!currentSite) {
      selectSite(data.data.site);
    }

    return data.data.site;
  };

  const updateSite = async (siteId, updates) => {
    const token = await getIdToken();
    const response = await fetch(`/api/sites/${siteId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update site');
    }

    const data = await response.json();
    setSites((prev) =>
      prev.map((s) => (s._id === siteId ? data.data.site : s))
    );

    if (currentSite?._id === siteId) {
      setCurrentSite(data.data.site);
    }

    return data.data.site;
  };

  const value = {
    sites,
    currentSite,
    loading,
    selectSite,
    createSite,
    updateSite,
    refreshSites: fetchSites,
  };

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

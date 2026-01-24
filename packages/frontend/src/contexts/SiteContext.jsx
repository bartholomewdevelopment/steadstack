import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const SiteContext = createContext({});

export const useSite = () => useContext(SiteContext);

export function SiteProvider({ children }) {
  const { user, userProfile, getIdToken } = useAuth();
  const [sites, setSites] = useState([]);
  const [currentSite, setCurrentSite] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch sites when userProfile changes (need MongoDB user with tenant)
  useEffect(() => {
    if (user && userProfile?.tenant) {
      fetchSites();
    } else {
      // No user OR user exists but no profile yet
      setSites([]);
      setCurrentSite(null);
      setLoading(false);
    }
  }, [user, userProfile]);

  const fetchSites = async () => {
    try {
      const token = await getIdToken();
      const response = await fetch(`${API_BASE_URL}/sites`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSites(data.data.sites);

        // Set current site from localStorage or first site
        const savedSiteId = localStorage.getItem('currentSiteId');
        const savedSite = data.data.sites.find((s) => s.id === savedSiteId);

        if (savedSite) {
          setCurrentSite(savedSite);
        } else if (data.data.sites.length > 0) {
          setCurrentSite(data.data.sites[0]);
          localStorage.setItem('currentSiteId', data.data.sites[0].id);
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
    localStorage.setItem('currentSiteId', site.id);
  };

  const createSite = async (siteData) => {
    if (!userProfile?.tenant) {
      throw new Error('User profile not ready. Please try again.');
    }

    const token = await getIdToken();
    const response = await fetch(`${API_BASE_URL}/sites`, {
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
    const response = await fetch(`${API_BASE_URL}/sites/${siteId}`, {
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
      prev.map((s) => (s.id === siteId ? data.data.site : s))
    );

    if (currentSite?.id === siteId) {
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

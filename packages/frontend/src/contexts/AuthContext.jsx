import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../config/firebase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // MongoDB user data
  const [loading, setLoading] = useState(true);

  // Sync user with backend
  const syncUserWithBackend = async (firebaseUser, farmName = null) => {
    if (!firebaseUser) {
      setUserProfile(null);
      return null;
    }

    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ farmName }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.data.user);
        return data.data;
      } else {
        console.error('Failed to sync user with backend');
        return null;
      }
    } catch (error) {
      console.error('User sync error:', error);
      return null;
    }
  };

  // Get user profile from backend
  const fetchUserProfile = async (firebaseUser) => {
    if (!firebaseUser) return null;

    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.data.user);
        return data.data.user;
      }
      return null;
    } catch (error) {
      console.error('Fetch profile error:', error);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Try to fetch existing profile, if not found sync will create it
        const profile = await fetchUserProfile(firebaseUser);
        if (!profile) {
          await syncUserWithBackend(firebaseUser);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign up with email/password
  const signup = async (email, password, displayName, farmName) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    // Sync with backend (creates tenant)
    await syncUserWithBackend(result.user, farmName);
    return result;
  };

  // Sign in with email/password
  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await syncUserWithBackend(result.user);
    return result;
  };

  // Sign in with Google
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await syncUserWithBackend(result.user);
    return result;
  };

  // Sign out
  const logout = async () => {
    setUserProfile(null);
    return signOut(auth);
  };

  // Send password reset email
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  // Update user profile
  const updateUserProfile = async (updates) => {
    await updateProfile(auth.currentUser, updates);
    // Also update in backend
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
    }
  };

  // Get fresh ID token for API calls
  const getIdToken = async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  };

  const value = {
    user,
    userProfile,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    updateUserProfile,
    getIdToken,
    syncUserWithBackend,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

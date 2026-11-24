import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { apiFetch, getOfflineDrafts, removeOfflineDraft, setStoredOrgId } from '../lib/api';
import { AppModule, AuthUser, FacilityHierarchy, Organization } from '../types';

function formatAuthError(err: any, fallback: string): string {
  const code = String(err?.code || '');
  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Email & Password sign-in is not yet enabled in Firebase Console. Please use "Continue with Google" right now, or enable Email/Password under Firebase Console → Authentication → Sign-in method.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completion.';
    default:
      return err?.message || fallback;
  }
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  authLoading: boolean;
  user: AuthUser | null;
  organization: Organization | null;
  organizations: Organization[];
  modules: AppModule[];
  hierarchy: FacilityHierarchy;
  unreadCount: number;
  offlineDraftCount: number;
  error: string | null;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (
    fullName: string,
    email: string,
    password: string,
    designation?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  syncOfflineDrafts: () => Promise<number>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [modules, setModules] = useState<AppModule[]>([]);
  const [hierarchy, setHierarchy] = useState<FacilityHierarchy>({
    businessUnits: [],
    plants: [],
    departments: [],
    areas: [],
    locations: [],
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [offlineDraftCount, setOfflineDraftCount] = useState(getOfflineDrafts().length);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    try {
      setError(null);
      const [meData, hierData] = await Promise.all([
        apiFetch('/api/me'),
        apiFetch<FacilityHierarchy>('/api/hierarchy'),
      ]);
      setUser(meData.user);
      setOrganization(meData.organization);
      setOrganizations(meData.organizations || []);
      setModules(meData.modules || []);
      setUnreadCount(meData.unreadCount || 0);
      setHierarchy(hierData);
      if (meData.organization?.id) {
        setStoredOrgId(meData.organization.id);
      }
    } catch (err: any) {
      console.error('Failed to bootstrap ARSHIEL workspace:', err);
      setError(err?.message || 'Unable to connect to workspace server.');
    }
  }, []);

  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      console.error('Redirect auth check error:', err);
      setError(formatAuthError(err, 'Google sign-in redirect did not complete.'));
    });

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await loadWorkspace();
      } else {
        setUser(null);
        setOrganization(null);
        setOrganizations([]);
        setModules([]);
        setUnreadCount(0);
        setStoredOrgId(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, [loadWorkspace]);

  const loginWithGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      const code = String(err?.code || '');
      const isPopupUnsupported =
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/web-storage-unsupported';
      if (isPopupUnsupported) {
        await signInWithRedirect(auth, googleAuthProvider);
        return;
      }
      const friendly = formatAuthError(err, 'Google Sign-In failed.');
      setError(friendly);
      throw new Error(friendly);
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      const friendly = formatAuthError(err, 'Email sign-in failed.');
      setError(friendly);
      throw new Error(friendly);
    }
  };

  const registerWithEmail = async (
    fullName: string,
    email: string,
    password: string,
    designation?: string
  ) => {
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (fullName.trim()) {
        await updateProfile(cred.user, { displayName: fullName.trim() });
      }
      // Refresh ID token so backend provisioning sees displayName immediately
      await cred.user.getIdToken(true);
      await loadWorkspace();
      if (designation && designation.trim()) {
        try {
          await apiFetch('/api/me/profile', {
            method: 'PATCH',
            body: JSON.stringify({
              fullName: fullName.trim(),
              designation: designation.trim(),
            }),
          });
          await loadWorkspace();
        } catch {
          // Non-blocking profile enrichment
        }
      }
    } catch (err: any) {
      const friendly = formatAuthError(err, 'Registration failed.');
      setError(friendly);
      throw new Error(friendly);
    }
  };

  const logout = async () => {
    // 1. Best-effort backend audit log while session token is still valid
    try {
      if (auth.currentUser) {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      }
    } catch {
      // Proceed with client session termination even if offline
    }

    // 2. Clear client session storage and active workspace keys
    setStoredOrgId(null);
    try {
      sessionStorage.clear();
    } catch {
      // Ignore storage access restrictions
    }

    // 3. Invalidate Firebase session & clear cached tokens
    await signOut(auth);

    // 4. Immediately clear React workspace state
    setFirebaseUser(null);
    setUser(null);
    setOrganization(null);
    setOrganizations([]);
    setModules([]);
    setUnreadCount(0);
    setError(null);
  };

  const switchOrganization = async (orgId: string) => {
    setStoredOrgId(orgId);
    await loadWorkspace();
  };

  const syncOfflineDrafts = async () => {
    const drafts = getOfflineDrafts();
    let synced = 0;
    for (const d of drafts) {
      try {
        await apiFetch(d.endpoint, {
          method: d.method || 'POST',
          body: JSON.stringify(d.payload),
        });
        removeOfflineDraft(d.id);
        synced++;
      } catch (err) {
        console.error('Offline sync failed for draft:', d.id, err);
      }
    }
    setOfflineDraftCount(getOfflineDrafts().length);
    if (synced > 0) await loadWorkspace();
    return synced;
  };

  useEffect(() => {
    const onStorage = () => setOfflineDraftCount(getOfflineDrafts().length);
    window.addEventListener('storage', onStorage);
    const interval = setInterval(() => {
      setOfflineDraftCount(getOfflineDrafts().length);
    }, 3000);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        authLoading,
        user,
        organization,
        organizations,
        modules,
        hierarchy,
        unreadCount,
        offlineDraftCount,
        error,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        switchOrganization,
        refreshSession: loadWorkspace,
        syncOfflineDrafts,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

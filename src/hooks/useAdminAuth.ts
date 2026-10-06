import { useEffect, useState } from 'react';
import { DEFAULT_ADMIN_PASSWORD, ADMIN_PASSWORD_STORAGE_KEY, isAdminPasswordValid } from '../constants/admin';

/** Safely reads a value from localStorage (returns null when unavailable). */
function readStoredPassword(): string {
  try {
    return localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY) || DEFAULT_ADMIN_PASSWORD;
  } catch {
    return DEFAULT_ADMIN_PASSWORD;
  }
}

export interface AdminAuthState {
  adminPassword: string;
  isUnlocked: boolean;
  unlock: () => void;
  lock: () => void;
  /** Returns true when the candidate password is accepted. */
  verifyPassword: (candidate: string) => boolean;
  /** Persists a new admin password (also used by the reset-to-default flow). */
  updatePassword: (newPassword: string) => void;
}

/**
 * Manages the admin password for the protected irrigation-settings tab.
 * The password itself lives in localStorage; this hook exposes verification,
 * lock/unlock state and persistence in one place.
 */
export function useAdminAuth(): AdminAuthState {
  const [adminPassword, setAdminPassword] = useState<string>(readStoredPassword);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, adminPassword);
    } catch (err) {
      console.error('Failed to persist admin password:', err);
    }
  }, [adminPassword]);

  return {
    adminPassword,
    isUnlocked,
    unlock: () => setIsUnlocked(true),
    lock: () => setIsUnlocked(false),
    verifyPassword: (candidate: string) => isAdminPasswordValid(candidate, adminPassword),
    updatePassword: setAdminPassword,
  };
}

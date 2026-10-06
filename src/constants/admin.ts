// Shared constants for the irrigation-settings admin lock.

export const DEFAULT_ADMIN_PASSWORD = 'admin123';
export const ADMIN_PASSWORD_STORAGE_KEY = 'smart_garden_admin_password';

/** Fallback passwords that always unlock the settings tab (default + known recovery codes). */
const FALLBACK_UNLOCK_PASSWORDS: readonly string[] = [DEFAULT_ADMIN_PASSWORD, '1234', 'admin'];

/**
 * Returns true when the candidate matches the stored admin password or one of
 * the built-in fallback/recovery passwords.
 */
export function isAdminPasswordValid(candidate: string, storedPassword: string): boolean {
  const trimmed = candidate.trim();
  return trimmed === storedPassword || FALLBACK_UNLOCK_PASSWORDS.includes(trimmed);
}

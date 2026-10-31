/**
 * The address a Brief test send goes to, kept in this browser only. Each
 * user has their own key, so on a shared browser one admin's address never
 * becomes the next admin's default. A missing, blocked or malformed value
 * reads as null, which sends to the admin's own address. clear-api checks
 * the address again before it sends anything.
 *
 * localStorage can be read by any script on the origin, so this holds
 * nothing but the address. Encrypting it in the browser would leave the key
 * right beside it.
 */

const STORAGE_PREFIX = "clear-brief-test-recipient";
/** Same loose shape check and length cap as clear-api's. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

/** Trimmed and lower-cased, or null when it isn't an email address. */
export function normaliseTestRecipient(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_SHAPE.test(email) ? email : null;
}

export function readTestRecipient(userId: string): string | null {
  try {
    const stored = localStorage.getItem(storageKey(userId));
    return stored ? normaliseTestRecipient(stored) : null;
  } catch {
    return null;
  }
}

/** Stores a valid address, or forgets it for null. False when storage is blocked. */
export function writeTestRecipient(userId: string, email: string | null): boolean {
  try {
    if (email) localStorage.setItem(storageKey(userId), email);
    else localStorage.removeItem(storageKey(userId));
    return true;
  } catch {
    return false;
  }
}

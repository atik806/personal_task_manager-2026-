/**
 * Platform-adaptive key/value storage.
 * Native: expo-secure-store. Web: localStorage.
 * Used for the Supabase session (authStorage) and small prefs (theme).
 */

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const isWeb = Platform.OS === "web";

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn(`[storage] getItem failed (web): ${key}`, e);
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    console.warn(`[storage] getItem failed (native): ${key}`, e);
    return null;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      // storage full / private mode — surface instead of failing silently
      console.warn(`[storage] setItem failed (web): ${key}`, e);
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (e) {
    // A failed write here can silently drop the auth session (SecureStore has
    // size limits on some iOS releases), so it must not be invisible.
    console.warn(`[storage] setItem failed (native): ${key}`, e);
  }
}

async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[storage] removeItem failed (web): ${key}`, e);
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (e) {
    console.warn(`[storage] removeItem failed (native): ${key}`, e);
  }
}

/** Synchronous variant used for the very first route render on web. */
function getItemSync(key: string): string | null {
  if (!isWeb) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const storage = { getItem, setItem, removeItem, getItemSync };

export const AUTH_STORAGE_KEY = "daymark.supabase.session";
export const THEME_STORAGE_KEY = "daymark.theme.mode";

/** The storage adapter shape that @supabase/supabase-js `auth.storage` expects. */
export const authStorage = {
  getItem: (key: string) => getItem(key),
  setItem: (key: string, value: string) => setItem(key, value),
  removeItem: (key: string) => removeItem(key),
};

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
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // storage full / private mode — ignore
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // ignore
  }
}

async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
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

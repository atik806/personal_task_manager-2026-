/**
 * Platform-adaptive key/value storage.
 * Native: expo-secure-store. Web: localStorage.
 * Used for the Supabase session (authStorage) and small prefs (theme).
 *
 * SecureStore has a ~2048-byte per-value limit on iOS. Values larger than
 * CHUNK_THRESHOLD are split into `${key}.0`, `${key}.1`, … with a `${key}.count`
 * marker; getItem joins them back. Web always uses localStorage (no limit) and
 * never chunks writes, but reads chunks defensively in case a legacy value
 * written on native is ever read on web.
 */

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const isWeb = Platform.OS === "web";

/** Values longer than this are chunked (SecureStore ~2048 byte limit). */
const CHUNK_THRESHOLD = 1800;

/** Chunk size leaves headroom under SecureStore's byte limit for non-ASCII. */
const CHUNK_SIZE = 1500;

/** Suffix of the marker storing how many chunks a key was split into. */
const COUNT_SUFFIX = ".count";

function chunkKey(key: string, i: number): string {
  return `${key}.${i}`;
}

function countKey(key: string): string {
  return `${key}${COUNT_SUFFIX}`;
}

/** Delete any stored chunks + count marker for a key (native). No-op if none. */
async function removeNativeChunks(key: string): Promise<void> {
  const countRaw = await SecureStore.getItemAsync(countKey(key));
  if (countRaw !== null) {
    const count = Number(countRaw);
    if (Number.isInteger(count) && count > 0) {
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(chunkKey(key, i));
      }
    }
    await SecureStore.deleteItemAsync(countKey(key));
  }
}

/** Read + join a chunked value (native), or null if it isn't complete. */
async function readNativeChunks(key: string): Promise<string | null> {
  const countRaw = await SecureStore.getItemAsync(countKey(key));
  if (countRaw === null) return null;
  const count = Number(countRaw);
  if (!Number.isInteger(count) || count <= 0) return null;
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(chunkKey(key, i));
    if (part === null) return null;
    parts.push(part);
  }
  return parts.join("");
}

/** Delete any stored chunks + count marker for a key (web). No-op if none. */
function removeWebChunks(key: string): void {
  const countRaw = window.localStorage.getItem(`${key}${COUNT_SUFFIX}`);
  if (countRaw !== null) {
    const count = Number(countRaw);
    if (Number.isInteger(count) && count > 0) {
      for (let i = 0; i < count; i++) {
        window.localStorage.removeItem(`${key}.${i}`);
      }
    }
    window.localStorage.removeItem(`${key}${COUNT_SUFFIX}`);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      // Web never chunks writes, but read defensively in case a legacy native
      // value made its way here.
      const plain = window.localStorage.getItem(key);
      if (plain !== null) return plain;
      const countRaw = window.localStorage.getItem(`${key}${COUNT_SUFFIX}`);
      if (countRaw !== null) {
        const count = Number(countRaw);
        if (Number.isInteger(count) && count > 0) {
          const parts: string[] = [];
          for (let i = 0; i < count; i++) {
            const part = window.localStorage.getItem(`${key}.${i}`);
            if (part === null) return null;
            parts.push(part);
          }
          return parts.join("");
        }
      }
      return null;
    } catch (e) {
      console.warn(`[storage] getItem failed (web): ${key}`, e);
      return null;
    }
  }
  try {
    const chunks = await readNativeChunks(key);
    if (chunks !== null) return chunks;
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
    if (value.length > CHUNK_THRESHOLD) {
      // Drop any stale plain value so a failed chunk write can't resurrect it.
      await SecureStore.deleteItemAsync(key);
      await removeNativeChunks(key);
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]);
      }
      await SecureStore.setItemAsync(countKey(key), String(chunks.length));
    } else {
      await SecureStore.setItemAsync(key, value);
      // Clear stale chunks from an earlier large write of the same key.
      await removeNativeChunks(key);
    }
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
      removeWebChunks(key);
    } catch (e) {
      console.warn(`[storage] removeItem failed (web): ${key}`, e);
    }
    return;
  }
  try {
    await removeNativeChunks(key);
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

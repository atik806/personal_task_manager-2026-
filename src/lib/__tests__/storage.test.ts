/**
 * Regression tests for storage chunking (SecureStore ~2048-byte limit).
 * The module imports react-native + expo-secure-store, both mocked: a
 * Map-backed in-memory SecureStore and Platform.OS = "ios".
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import { storage } from "../storage";

const mockStore = new Map<string, string>();

vi.mock("expo-secure-store", () => ({
  getItemAsync: async (key: string) => mockStore.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    mockStore.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    mockStore.delete(key);
  },
}));

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

const LONG_VALUE = "x".repeat(4000); // 3 chunks @ 1500 chars

beforeEach(() => {
  mockStore.clear();
});

describe("storage (SecureStore chunking)", () => {
  it("stores values > threshold as chunk keys + a count marker", async () => {
    await storage.setItem("long", LONG_VALUE);
    expect(mockStore.get("long")).toBeUndefined(); // plain key dropped
    expect(mockStore.get("long.0")).toBe("x".repeat(1500));
    expect(mockStore.get("long.1")).toBe("x".repeat(1500));
    expect(mockStore.get("long.2")).toBe("x".repeat(1000));
    expect(mockStore.get("long.count")).toBe("3");
  });

  it("getItem reconstructs the exact original value", async () => {
    await storage.setItem("long", LONG_VALUE);
    expect(await storage.getItem("long")).toBe(LONG_VALUE);
  });

  it("stores short values under the plain key and returns them intact", async () => {
    await storage.setItem("short", "hello");
    expect(mockStore.get("short")).toBe("hello");
    expect(mockStore.has("short.count")).toBe(false);
    expect(mockStore.has("short.0")).toBe(false);
    expect(await storage.getItem("short")).toBe("hello");
  });

  it("removeItem deletes the plain key, count marker, and all chunks", async () => {
    await storage.setItem("long", LONG_VALUE);
    await storage.removeItem("long");
    expect(mockStore.has("long")).toBe(false);
    expect(mockStore.has("long.count")).toBe(false);
    expect(mockStore.has("long.0")).toBe(false);
    expect(mockStore.has("long.1")).toBe(false);
    expect(mockStore.has("long.2")).toBe(false);
    expect(await storage.getItem("long")).toBeNull();
  });

  it("removeItem on a plain (unchunked) value removes the plain key", async () => {
    await storage.setItem("short", "hello");
    await storage.removeItem("short");
    expect(mockStore.has("short")).toBe(false);
    expect(await storage.getItem("short")).toBeNull();
  });

  it("returns null for a missing key", async () => {
    expect(await storage.getItem("nope")).toBeNull();
  });
});

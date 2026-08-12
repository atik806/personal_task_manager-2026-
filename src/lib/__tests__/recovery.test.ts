/**
 * Regression tests for parseRecoveryUrl (password-recovery deep-link parsing).
 * Pure function — no RN imports.
 */
import { describe, it, expect } from "vitest";

import { parseRecoveryUrl } from "../recovery";

describe("parseRecoveryUrl", () => {
  it("parses tokens from a # fragment", () => {
    const url = "daymark://reset-password#access_token=abc&refresh_token=def&type=recovery";
    expect(parseRecoveryUrl(url)).toEqual({ access_token: "abc", refresh_token: "def" });
  });

  it("parses tokens from a ? query string", () => {
    const url = "daymark://reset-password?access_token=abc&refresh_token=def&type=recovery";
    expect(parseRecoveryUrl(url)).toEqual({ access_token: "abc", refresh_token: "def" });
  });

  it("prefers the # fragment when both fragment and query are present", () => {
    const url =
      "daymark://reset-password?access_token=query&refresh_token=query&type=recovery" +
      "#access_token=frag&refresh_token=frag&type=recovery";
    expect(parseRecoveryUrl(url)).toEqual({ access_token: "frag", refresh_token: "frag" });
  });

  it("requires type=recovery — rejects magiclink", () => {
    const url = "daymark://reset-password#access_token=abc&refresh_token=def&type=magiclink";
    expect(parseRecoveryUrl(url)).toBeNull();
  });

  it("requires type=recovery — rejects signup", () => {
    const url = "daymark://reset-password#access_token=abc&refresh_token=def&type=signup";
    expect(parseRecoveryUrl(url)).toBeNull();
  });

  it("requires type=recovery — rejects a missing type", () => {
    const url = "daymark://reset-password#access_token=abc&refresh_token=def";
    expect(parseRecoveryUrl(url)).toBeNull();
  });

  it("rejects when access_token is missing", () => {
    const url = "daymark://reset-password#refresh_token=def&type=recovery";
    expect(parseRecoveryUrl(url)).toBeNull();
  });

  it("rejects when refresh_token is missing", () => {
    const url = "daymark://reset-password#access_token=abc&type=recovery";
    expect(parseRecoveryUrl(url)).toBeNull();
  });

  it("rejects an expired expires_at", () => {
    const past = Math.floor(Date.now() / 1000) - 1000;
    const url = `daymark://reset-password#access_token=abc&refresh_token=def&type=recovery&expires_at=${past}`;
    expect(parseRecoveryUrl(url)).toBeNull();
  });

  it("accepts a not-yet-expired expires_at", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const url = `daymark://reset-password#access_token=abc&refresh_token=def&type=recovery&expires_at=${future}`;
    expect(parseRecoveryUrl(url)).toEqual({ access_token: "abc", refresh_token: "def" });
  });

  it("decodes URI-encoded values (e.g. %40 in an email-ish token)", () => {
    const url =
      "daymark://reset-password#access_token=user%40example.com&refresh_token=def&type=recovery";
    expect(parseRecoveryUrl(url)).toEqual({ access_token: "user@example.com", refresh_token: "def" });
  });

  it("returns null for empty/undefined input", () => {
    expect(parseRecoveryUrl(null)).toBeNull();
    expect(parseRecoveryUrl(undefined)).toBeNull();
    expect(parseRecoveryUrl("")).toBeNull();
    expect(parseRecoveryUrl("daymark://reset-password")).toBeNull();
  });
});

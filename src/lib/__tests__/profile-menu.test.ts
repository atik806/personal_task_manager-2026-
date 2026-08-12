import { describe, expect, it } from "vitest";

import { profileMenuReducer } from "../profile-menu";

describe("profileMenuReducer (TopNavbar account dropdown)", () => {
  it("toggles from closed to open", () => {
    expect(profileMenuReducer("closed", { type: "toggle" })).toBe("open");
  });

  it("toggles from open back to closed", () => {
    expect(profileMenuReducer("open", { type: "toggle" })).toBe("closed");
  });

  it("closes from open via backdrop", () => {
    expect(profileMenuReducer("open", { type: "close" })).toBe("closed");
  });

  it("closing an already-closed menu is a no-op", () => {
    expect(profileMenuReducer("closed", { type: "close" })).toBe("closed");
  });

  it("opening via the profile button always opens", () => {
    expect(profileMenuReducer("closed", { type: "open" })).toBe("open");
    expect(profileMenuReducer("open", { type: "open" })).toBe("open");
  });

  it("Escape close transitions are idempotent across repeated presses", () => {
    const state = [
      { type: "open" },
      { type: "close" },
      { type: "close" },
    ] as const;
    const reduced = state.reduce(profileMenuReducer, "closed");
    expect(reduced).toBe("closed");
  });

  it("repeated toggles alternate open/closed", () => {
    const toggled = [
      { type: "toggle" },
      { type: "toggle" },
      { type: "toggle" },
    ] as const;
    expect(toggled.reduce(profileMenuReducer, "closed")).toBe("open");
    expect(toggled.reduce(profileMenuReducer, "open")).toBe("closed");
  });
});

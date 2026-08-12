/**
 * Pure open/close state machine for the TopNavbar account dropdown.
 * Kept side-effect free so the transitions are unit-testable without a DOM.
 */
export type ProfileMenuState = "open" | "closed";

export type ProfileMenuAction =
  | { type: "toggle" }
  | { type: "open" }
  | { type: "close" };

export function profileMenuReducer(
  state: ProfileMenuState,
  action: ProfileMenuAction
): ProfileMenuState {
  switch (action.type) {
    case "toggle":
      return state === "open" ? "closed" : "open";
    case "open":
      return "open";
    case "close":
      return "closed";
  }
}

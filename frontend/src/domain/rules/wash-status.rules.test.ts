import { describe, expect, it } from "vitest";
import { isWashStatusTransitionAllowed, WASH_STATUS_TRANSITIONS } from "./wash-status.rules";

describe("wash status transitions", () => {
  it("allows only the next step in the wash flow", () => {
    expect(isWashStatusTransitionAllowed("pending", "in_progress")).toBe(true);
    expect(isWashStatusTransitionAllowed("in_progress", "completed")).toBe(true);
    expect(isWashStatusTransitionAllowed("completed", "delivered")).toBe(true);
  });

  it("rejects skips, backwards transitions, and changes after delivery", () => {
    expect(isWashStatusTransitionAllowed("pending", "completed")).toBe(false);
    expect(isWashStatusTransitionAllowed("in_progress", "pending")).toBe(false);
    expect(isWashStatusTransitionAllowed("completed", "in_progress")).toBe(false);
    expect(isWashStatusTransitionAllowed("delivered", "completed")).toBe(false);
    expect(isWashStatusTransitionAllowed("pending", "pending")).toBe(false);
    expect(isWashStatusTransitionAllowed("in_progress", "in_progress")).toBe(false);
    expect(isWashStatusTransitionAllowed("completed", "completed")).toBe(false);
    expect(isWashStatusTransitionAllowed("delivered", "delivered")).toBe(false);
  });

  it("does not offer a transition after delivery", () => {
    expect(WASH_STATUS_TRANSITIONS.delivered).toBeNull();
  });
});

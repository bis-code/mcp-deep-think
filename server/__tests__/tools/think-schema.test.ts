import { describe, it, expect } from "vitest";
import { z } from "zod";
import { thinkInputSchema } from "../../src/tools/think.js";

/**
 * Regression guard for the `think` tool's INPUT SCHEMA.
 *
 * Every other suite here exercises the store and the analyzer, which run well
 * after argument validation. So the schema itself was never asserted on, and a
 * caller that omitted one continuation hint had its whole call rejected —
 * `MCP error -32602 ... "path": ["nextThoughtNeeded"] ... "received":
 * "undefined"` — while the test suite stayed green. Observed 2026-08-31: seven
 * such rejections in a single session, each one throwing away a thought that
 * had already been composed.
 */
const schema = z.object(thinkInputSchema);

describe("think input schema", () => {
  it("accepts a call that omits nextThoughtNeeded, defaulting it to true", () => {
    const parsed = schema.parse({
      thought: "A caller that forgot one optional-in-spirit flag should not lose its thought.",
      thoughtNumber: 1,
      totalThoughts: 3,
    });
    expect(parsed.nextThoughtNeeded).toBe(true);
  });

  it("still honours an explicit false, so a chain can be ended deliberately", () => {
    const parsed = schema.parse({
      thought: "Done.",
      thoughtNumber: 3,
      totalThoughts: 3,
      nextThoughtNeeded: false,
    });
    expect(parsed.nextThoughtNeeded).toBe(false);
  });

  it("still honours an explicit true", () => {
    const parsed = schema.parse({
      thought: "Keep going.",
      thoughtNumber: 1,
      totalThoughts: 2,
      nextThoughtNeeded: true,
    });
    expect(parsed.nextThoughtNeeded).toBe(true);
  });

  it("keeps rejecting a wrong TYPE — defaulting is not the same as accepting anything", () => {
    expect(() =>
      schema.parse({
        thought: "x",
        thoughtNumber: 1,
        totalThoughts: 1,
        nextThoughtNeeded: "yes",
      }),
    ).toThrow();
  });

  it("still requires the fields that carry real meaning", () => {
    // thought/thoughtNumber/totalThoughts are NOT defaulted: a wrong sequence
    // number silently corrupts the recorded chain, which is worse than a clear
    // rejection. Only the continuation hint is inferable.
    expect(() => schema.parse({ thoughtNumber: 1, totalThoughts: 1 })).toThrow();
    expect(() => schema.parse({ thought: "x", totalThoughts: 1 })).toThrow();
    expect(() => schema.parse({ thought: "x", thoughtNumber: 1 })).toThrow();
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { ThoughtStore } from "../../src/engine/thought-store.js";
import { DEFAULT_CONFIG } from "../../src/config/schema.js";

describe("ThoughtStore", () => {
  let store: ThoughtStore;

  beforeEach(() => {
    store = new ThoughtStore({ ...DEFAULT_CONFIG });
  });

  describe("addThought", () => {
    it("should store a basic thought", () => {
      const stored = store.addThought({
        thought: "First thought",
        thoughtNumber: 1,
        totalThoughts: 3,
        nextThoughtNeeded: true,
      });

      expect(stored.thought).toBe("First thought");
      expect(stored.thoughtNumber).toBe(1);
      expect(stored.timestamp).toBeDefined();
      expect(stored.sessionId).toBeDefined();
    });

    it("should auto-adjust totalThoughts when thoughtNumber exceeds it", () => {
      const stored = store.addThought({
        thought: "Thought 5",
        thoughtNumber: 5,
        totalThoughts: 3,
        nextThoughtNeeded: true,
      });

      expect(stored.totalThoughts).toBe(5);
    });

    it("should store new fields (confidence, tags, assumptions, evidence)", () => {
      const stored = store.addThought({
        thought: "Detailed thought",
        thoughtNumber: 1,
        totalThoughts: 3,
        nextThoughtNeeded: true,
        confidence: 0.8,
        tags: ["architecture", "performance"],
        assumptions: ["Users prefer speed over accuracy"],
        evidence: ["Benchmark shows 2x improvement"],
      });

      expect(stored.confidence).toBe(0.8);
      expect(stored.tags).toEqual(["architecture", "performance"]);
      expect(stored.assumptions).toEqual(["Users prefer speed over accuracy"]);
      expect(stored.evidence).toEqual(["Benchmark shows 2x improvement"]);
    });

    it("should store dependsOn field", () => {
      store.addThought({ thought: "T1", thoughtNumber: 1, totalThoughts: 3, nextThoughtNeeded: true });
      const stored = store.addThought({
        thought: "T2 depends on T1",
        thoughtNumber: 2,
        totalThoughts: 3,
        nextThoughtNeeded: true,
        dependsOn: [1],
      });

      expect(stored.dependsOn).toEqual([1]);
    });
  });

  describe("getThought", () => {
    it("should retrieve a thought by number", () => {
      store.addThought({ thought: "T1", thoughtNumber: 1, totalThoughts: 2, nextThoughtNeeded: true });
      store.addThought({ thought: "T2", thoughtNumber: 2, totalThoughts: 2, nextThoughtNeeded: false });

      const t = store.getThought(2);
      expect(t?.thought).toBe("T2");
    });

    it("should return undefined for non-existent thought", () => {
      expect(store.getThought(99)).toBeUndefined();
    });
  });

  describe("getHistory", () => {
    it("should return all thoughts in order", () => {
      store.addThought({ thought: "T1", thoughtNumber: 1, totalThoughts: 3, nextThoughtNeeded: true });
      store.addThought({ thought: "T2", thoughtNumber: 2, totalThoughts: 3, nextThoughtNeeded: true });
      store.addThought({ thought: "T3", thoughtNumber: 3, totalThoughts: 3, nextThoughtNeeded: false });

      const history = store.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0]?.thought).toBe("T1");
      expect(history[2]?.thought).toBe("T3");
    });

    it("should return a copy (not a reference)", () => {
      store.addThought({ thought: "T1", thoughtNumber: 1, totalThoughts: 1, nextThoughtNeeded: false });
      const h1 = store.getHistory();
      const h2 = store.getHistory();
      expect(h1).not.toBe(h2);
    });
  });

  describe("revisions", () => {
    it("should store revision metadata", () => {
      store.addThought({ thought: "T1", thoughtNumber: 1, totalThoughts: 3, nextThoughtNeeded: true });
      const revised = store.addThought({
        thought: "T1 revised",
        thoughtNumber: 2,
        totalThoughts: 3,
        nextThoughtNeeded: true,
        isRevision: true,
        revisesThought: 1,
      });

      expect(revised.isRevision).toBe(true);
      expect(revised.revisesThought).toBe(1);
    });

    it("should not modify original thought when revising", () => {
      store.addThought({ thought: "Original", thoughtNumber: 1, totalThoughts: 2, nextThoughtNeeded: true });
      store.addThought({
        thought: "Revised",
        thoughtNumber: 2,
        totalThoughts: 2,
        nextThoughtNeeded: false,
        isRevision: true,
        revisesThought: 1,
      });

      const original = store.getThought(1);
      expect(original?.thought).toBe("Original");
    });
  });

  describe("branches", () => {
    it("should create a branch when branchFromThought and branchId are set", () => {
      store.addThought({ thought: "Main", thoughtNumber: 1, totalThoughts: 3, nextThoughtNeeded: true });
      store.addThought({
        thought: "Branch A",
        thoughtNumber: 2,
        totalThoughts: 3,
        nextThoughtNeeded: true,
        branchFromThought: 1,
        branchId: "approach-a",
      });

      expect(store.getBranchIds()).toContain("approach-a");
      expect(store.getBranch("approach-a")).toHaveLength(1);
    });

    it("should track multiple branches", () => {
      store.addThought({ thought: "Main", thoughtNumber: 1, totalThoughts: 3, nextThoughtNeeded: true });
      store.addThought({
        thought: "Branch A",
        thoughtNumber: 2,
        totalThoughts: 3,
        nextThoughtNeeded: true,
        branchFromThought: 1,
        branchId: "a",
      });
      store.addThought({
        thought: "Branch B",
        thoughtNumber: 3,
        totalThoughts: 3,
        nextThoughtNeeded: false,
        branchFromThought: 1,
        branchId: "b",
      });

      expect(store.getBranchIds()).toHaveLength(2);
      expect(store.getBranchIds()).toContain("a");
      expect(store.getBranchIds()).toContain("b");
    });

    it("should accumulate thoughts within the same branch", () => {
      store.addThought({ thought: "Main", thoughtNumber: 1, totalThoughts: 4, nextThoughtNeeded: true });
      store.addThought({
        thought: "Branch A - step 1",
        thoughtNumber: 2,
        totalThoughts: 4,
        nextThoughtNeeded: true,
        branchFromThought: 1,
        branchId: "a",
      });
      store.addThought({
        thought: "Branch A - step 2",
        thoughtNumber: 3,
        totalThoughts: 4,
        nextThoughtNeeded: false,
        branchFromThought: 1,
        branchId: "a",
      });

      expect(store.getBranch("a")).toHaveLength(2);
    });

    it("should return empty array for non-existent branch", () => {
      expect(store.getBranch("nonexistent")).toEqual([]);
    });
  });

  describe("strategy", () => {
    it("should start with config default strategy", () => {
      const storeWithStrategy = new ThoughtStore({
        ...DEFAULT_CONFIG,
        thinking: { ...DEFAULT_CONFIG.thinking, defaultStrategy: "first-principles" },
      });
      expect(storeWithStrategy.getActiveStrategy()).toBe("first-principles");
    });

    it("should start with null when no default", () => {
      expect(store.getActiveStrategy()).toBeNull();
    });

    it("should allow setting strategy", () => {
      store.setActiveStrategy("red-team");
      expect(store.getActiveStrategy()).toBe("red-team");
    });

    it("should allow clearing strategy", () => {
      store.setActiveStrategy("red-team");
      store.setActiveStrategy(null);
      expect(store.getActiveStrategy()).toBeNull();
    });
  });

  describe("serialize / restore", () => {
    it("should round-trip serialize and restore", () => {
      store.addThought({ thought: "T1", thoughtNumber: 1, totalThoughts: 2, nextThoughtNeeded: true, confidence: 0.9 });
      store.addThought({
        thought: "T2",
        thoughtNumber: 2,
        totalThoughts: 2,
        nextThoughtNeeded: false,
        branchFromThought: 1,
        branchId: "test-branch",
      });
      store.setActiveStrategy("convergent");

      const serialized = store.serialize();

      const newStore = new ThoughtStore({ ...DEFAULT_CONFIG });
      newStore.restore(serialized);

      expect(newStore.getHistory()).toHaveLength(2);
      expect(newStore.getBranchIds()).toContain("test-branch");
      expect(newStore.getActiveStrategy()).toBe("convergent");
      expect(newStore.getHistory()[0]?.confidence).toBe(0.9);
    });
  });

  describe("clear", () => {
    it("should remove all thoughts and branches", () => {
      store.addThought({ thought: "T1", thoughtNumber: 1, totalThoughts: 1, nextThoughtNeeded: false });
      store.clear();

      expect(store.getHistory()).toHaveLength(0);
      expect(store.getBranchIds()).toHaveLength(0);
    });
  });

  describe("session", () => {
    it("should generate a unique session ID", () => {
      const store2 = new ThoughtStore({ ...DEFAULT_CONFIG });
      expect(store.getSessionId()).not.toBe(store2.getSessionId());
    });
  });
});

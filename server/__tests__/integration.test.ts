import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ThoughtStore } from "../src/engine/thought-store.js";
import { Analyzer } from "../src/engine/analyzer.js";
import { FileStore } from "../src/persistence/file-store.js";
import { BUILT_IN_STRATEGIES } from "../src/engine/strategies.js";
import { DEFAULT_CONFIG } from "../src/config/schema.js";
import type { DeepThinkConfig, CheckpointData } from "../src/types.js";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

/**
 * Integration tests: full workflow through store + analyzer + persistence
 * Simulates what happens when an LLM calls the tools in sequence.
 */
describe("Integration: full reasoning workflow", () => {
  let store: ThoughtStore;
  let analyzer: Analyzer;
  let fileStore: FileStore;
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `mcp-dt-int-${randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
    store = new ThoughtStore({ ...DEFAULT_CONFIG });
    analyzer = new Analyzer(DEFAULT_CONFIG);
    fileStore = new FileStore(testDir, 10);
  });

  afterEach(() => {
    try { rmSync(testDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it("should support think -> reflect -> branch -> compare -> merge -> checkpoint -> load workflow", async () => {
    // Step 1: Think through a problem
    store.addThought({
      thought: "We need to decide on a caching strategy for our API. Options include Redis, Memcached, or in-memory caching.",
      thoughtNumber: 1,
      totalThoughts: 6,
      nextThoughtNeeded: true,
      confidence: 0.6,
      tags: ["caching", "architecture"],
      assumptions: ["Current response times are too slow"],
    });

    store.addThought({
      thought: "Redis provides persistence and data structures beyond simple key-value. Good for complex caching patterns.",
      thoughtNumber: 2,
      totalThoughts: 6,
      nextThoughtNeeded: true,
      confidence: 0.7,
      tags: ["caching", "redis"],
    });

    // Step 2: Branch to explore alternatives
    store.addThought({
      thought: "Redis approach: Use Redis with TTL-based expiration. Supports pub/sub for cache invalidation across instances.",
      thoughtNumber: 3,
      totalThoughts: 6,
      nextThoughtNeeded: true,
      branchFromThought: 2,
      branchId: "redis-approach",
      confidence: 0.8,
      tags: ["redis", "distributed"],
    });

    store.addThought({
      thought: "In-memory approach: Use Node.js Map with LRU eviction. Zero network overhead but no sharing between instances.",
      thoughtNumber: 4,
      totalThoughts: 6,
      nextThoughtNeeded: true,
      branchFromThought: 2,
      branchId: "in-memory-approach",
      confidence: 0.7,
      tags: ["in-memory", "performance"],
    });

    // Step 3: Reflect on progress
    const reflection = analyzer.analyze(
      store.getHistory(),
      store.getBranches(),
      null,
      "all"
    );

    expect(reflection.progress.totalThoughts).toBe(4);
    expect(reflection.progress.branchesExplored).toBe(2);
    expect(reflection.progress.averageConfidence).toBeCloseTo(0.7);

    // Step 4: Compare branches
    const branchA = store.getBranch("redis-approach");
    const branchB = store.getBranch("in-memory-approach");
    expect(branchA).toHaveLength(1);
    expect(branchB).toHaveLength(1);

    // Step 5: Merge
    store.addThought({
      thought: "[MERGE] Redis is the better choice for our distributed architecture. In-memory caching can supplement as L1 cache.",
      thoughtNumber: 5,
      totalThoughts: 6,
      nextThoughtNeeded: true,
      confidence: 0.9,
      tags: ["merge", "decision"],
    });

    // Step 6: Final thought
    store.addThought({
      thought: "Implementation plan: Redis as distributed L2 cache, in-memory LRU as L1. TTL 5 minutes for L1, 1 hour for L2.",
      thoughtNumber: 6,
      totalThoughts: 6,
      nextThoughtNeeded: false,
      confidence: 0.95,
      tags: ["implementation", "final"],
    });

    // Step 7: Checkpoint
    const state = store.serialize();
    const checkpoint: CheckpointData = {
      name: "caching-decision",
      timestamp: new Date().toISOString(),
      sessionId: store.getSessionId(),
      thoughtHistory: state.thoughtHistory,
      branches: state.branches,
      activeStrategy: state.activeStrategy,
      metadata: {},
    };

    await fileStore.save("caching-decision", checkpoint);

    // Step 8: Verify checkpoint
    const list = await fileStore.list();
    expect(list).toHaveLength(1);
    expect(list[0]!.name).toBe("caching-decision");

    // Step 9: Load checkpoint into fresh store
    const loaded = await fileStore.load("caching-decision");
    expect(loaded).not.toBeNull();

    const newStore = new ThoughtStore({ ...DEFAULT_CONFIG });
    newStore.restore({
      thoughtHistory: loaded!.thoughtHistory,
      branches: loaded!.branches,
      activeStrategy: loaded!.activeStrategy,
      sessionId: loaded!.sessionId,
    });

    expect(newStore.getHistory()).toHaveLength(6);
    expect(newStore.getBranchIds()).toContain("redis-approach");
    expect(newStore.getBranchIds()).toContain("in-memory-approach");

    // Step 10: Reflect on restored chain
    const postLoadReflection = analyzer.analyze(
      newStore.getHistory(),
      newStore.getBranches(),
      null,
      "progress"
    );
    expect(postLoadReflection.progress.totalThoughts).toBe(6);
    expect(postLoadReflection.progress.estimatedCompletion).toBe(100);
    expect(postLoadReflection.progress.confidenceTrend).toBe("rising");
  });

  it("should detect circular reasoning and provide actionable feedback", () => {
    store.addThought({
      thought: "We should use microservices because they scale better than monoliths",
      thoughtNumber: 1,
      totalThoughts: 5,
      nextThoughtNeeded: true,
    });

    store.addThought({
      thought: "The API gateway should route requests to individual services",
      thoughtNumber: 2,
      totalThoughts: 5,
      nextThoughtNeeded: true,
    });

    store.addThought({
      thought: "Microservices scale better than monoliths, which is why we should use them",
      thoughtNumber: 3,
      totalThoughts: 5,
      nextThoughtNeeded: true,
    });

    const result = analyzer.analyze(store.getHistory(), store.getBranches(), null, "patterns");
    const circular = result.patterns.filter(p => p.type === "circular");
    expect(circular.length).toBeGreaterThan(0);
    expect(circular[0]!.involvedThoughts).toContain(1);
    expect(circular[0]!.involvedThoughts).toContain(3);
  });

  it("should support strategy-guided reasoning", () => {
    // Set strategy
    store.setActiveStrategy("first-principles");
    expect(store.getActiveStrategy()).toBe("first-principles");

    // Verify strategy exists
    const strategy = BUILT_IN_STRATEGIES.find(s => s.name === "first-principles");
    expect(strategy).toBeDefined();
    expect(strategy!.steps.length).toBeGreaterThan(0);
    expect(strategy!.guidingQuestions.length).toBeGreaterThan(0);

    // Think with strategy
    store.addThought({
      thought: "Core assumption: users need real-time data. But do they? Let me challenge this.",
      thoughtNumber: 1,
      totalThoughts: 5,
      nextThoughtNeeded: true,
      strategy: "first-principles",
      confidence: 0.5,
      assumptions: ["Users need real-time data"],
    });

    // Reflect should note assumptions are being tracked
    const result = analyzer.analyze(store.getHistory(), store.getBranches(), "first-principles", "gaps");
    // With assumptions tracked, should NOT complain about missing assumptions
    expect(result.suggestions.some(s => s.includes("No assumptions"))).toBe(false);
  });
});

describe("Integration: config-driven workflow", () => {
  it("should flag anti-pattern violations from .deep-think.json config", () => {
    const config: DeepThinkConfig = {
      ...DEFAULT_CONFIG,
      practices: {
        rules: ["Always validate user input before processing"],
        antiPatterns: [
          "Never store API secrets in config files",
          "Avoid N+1 database queries",
        ],
        reviewChecklist: [],
      },
    };

    const store = new ThoughtStore(config);
    const analyzer = new Analyzer(config);

    store.addThought({
      thought: "We could store the API secrets directly in the config files for easier deployment",
      thoughtNumber: 1,
      totalThoughts: 3,
      nextThoughtNeeded: true,
    });

    store.addThought({
      thought: "For each user, query the database to get their permissions individually",
      thoughtNumber: 2,
      totalThoughts: 3,
      nextThoughtNeeded: true,
    });

    store.addThought({
      thought: "Use environment variables for sensitive configuration instead",
      thoughtNumber: 3,
      totalThoughts: 3,
      nextThoughtNeeded: false,
    });

    const result = analyzer.analyze(store.getHistory(), store.getBranches(), null, "all");
    expect(result.practiceViolations.length).toBeGreaterThan(0);

    // At least one violation should reference the secrets anti-pattern
    const secretsViolation = result.practiceViolations.find(v =>
      v.rule.toLowerCase().includes("secrets")
    );
    expect(secretsViolation).toBeDefined();
    expect(secretsViolation!.thoughtNumber).toBe(1);
  });

  it("should support custom strategies from config", () => {
    const config: DeepThinkConfig = {
      ...DEFAULT_CONFIG,
      strategies: {
        custom: [{
          name: "api-design",
          description: "For designing REST API endpoints",
          steps: [
            "Define the resource",
            "Choose HTTP methods",
            "Design request/response schemas",
            "Plan error responses",
          ],
          checkpoints: ["after schema design"],
        }],
      },
    };

    // Custom strategy should be available alongside built-ins
    const allStrategies = [
      ...BUILT_IN_STRATEGIES,
      ...config.strategies.custom.map(cs => ({
        name: cs.name,
        description: cs.description,
        steps: cs.steps,
        guidingQuestions: [] as string[],
        reflectChecks: [] as string[],
        whenToUse: cs.description,
      })),
    ];

    expect(allStrategies.find(s => s.name === "api-design")).toBeDefined();
    expect(allStrategies.find(s => s.name === "first-principles")).toBeDefined();
    expect(allStrategies.length).toBe(BUILT_IN_STRATEGIES.length + 1);
  });
});

describe("Integration: checkpoint persistence round-trip", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `mcp-dt-cp-${randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try { rmSync(testDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it("should preserve all thought metadata through save/load cycle", async () => {
    const store = new ThoughtStore({ ...DEFAULT_CONFIG });
    const fileStore = new FileStore(testDir, 5);

    // Add thought with ALL fields
    store.addThought({
      thought: "Complex thought with all metadata",
      thoughtNumber: 1,
      totalThoughts: 3,
      nextThoughtNeeded: true,
      confidence: 0.85,
      tags: ["architecture", "performance"],
      assumptions: ["Users are in US timezone"],
      evidence: ["Analytics show 90% US traffic"],
      dependsOn: [],
      strategy: "first-principles",
      isRevision: false,
    });

    store.addThought({
      thought: "Revised understanding based on new data",
      thoughtNumber: 2,
      totalThoughts: 3,
      nextThoughtNeeded: true,
      isRevision: true,
      revisesThought: 1,
      confidence: 0.9,
    });

    store.addThought({
      thought: "Branch: alternative approach using CDN",
      thoughtNumber: 3,
      totalThoughts: 3,
      nextThoughtNeeded: false,
      branchFromThought: 1,
      branchId: "cdn-approach",
      tags: ["cdn", "performance"],
    });

    store.setActiveStrategy("convergent");

    // Save
    const state = store.serialize();
    const checkpoint: CheckpointData = {
      name: "metadata-test",
      timestamp: new Date().toISOString(),
      sessionId: store.getSessionId(),
      thoughtHistory: state.thoughtHistory,
      branches: state.branches,
      activeStrategy: state.activeStrategy,
      metadata: { customField: "test-value" },
    };
    await fileStore.save("metadata-test", checkpoint);

    // Load into fresh store
    const loaded = await fileStore.load("metadata-test");
    expect(loaded).not.toBeNull();

    const restoredStore = new ThoughtStore({ ...DEFAULT_CONFIG });
    restoredStore.restore({
      thoughtHistory: loaded!.thoughtHistory,
      branches: loaded!.branches,
      activeStrategy: loaded!.activeStrategy,
      sessionId: loaded!.sessionId,
    });

    // Verify ALL metadata preserved
    const t1 = restoredStore.getThought(1);
    expect(t1?.confidence).toBe(0.85);
    expect(t1?.tags).toEqual(["architecture", "performance"]);
    expect(t1?.assumptions).toEqual(["Users are in US timezone"]);
    expect(t1?.evidence).toEqual(["Analytics show 90% US traffic"]);

    const t2 = restoredStore.getThought(2);
    expect(t2?.isRevision).toBe(true);
    expect(t2?.revisesThought).toBe(1);

    const t3 = restoredStore.getThought(3);
    expect(t3?.branchFromThought).toBe(1);
    expect(t3?.branchId).toBe("cdn-approach");

    expect(restoredStore.getBranchIds()).toContain("cdn-approach");
    expect(restoredStore.getActiveStrategy()).toBe("convergent");

    // Verify checkpoint metadata
    expect(loaded!.metadata).toEqual({ customField: "test-value" });
  });

  it("should handle multiple save/load cycles", async () => {
    const fileStore = new FileStore(testDir, 5);
    const store = new ThoughtStore({ ...DEFAULT_CONFIG });

    // Cycle 1: Save with 2 thoughts
    store.addThought({ thought: "T1", thoughtNumber: 1, totalThoughts: 5, nextThoughtNeeded: true });
    store.addThought({ thought: "T2", thoughtNumber: 2, totalThoughts: 5, nextThoughtNeeded: true });

    await fileStore.save("cycle-1", {
      name: "cycle-1",
      timestamp: new Date().toISOString(),
      sessionId: store.getSessionId(),
      ...store.serialize(),
      metadata: {},
    });

    // Cycle 2: Add more thoughts, save again
    store.addThought({ thought: "T3", thoughtNumber: 3, totalThoughts: 5, nextThoughtNeeded: true });

    await fileStore.save("cycle-2", {
      name: "cycle-2",
      timestamp: new Date().toISOString(),
      sessionId: store.getSessionId(),
      ...store.serialize(),
      metadata: {},
    });

    // Load cycle-1 (should have 2 thoughts)
    const cp1 = await fileStore.load("cycle-1");
    expect(cp1!.thoughtHistory).toHaveLength(2);

    // Load cycle-2 (should have 3 thoughts)
    const cp2 = await fileStore.load("cycle-2");
    expect(cp2!.thoughtHistory).toHaveLength(3);

    // List should show both
    const list = await fileStore.list();
    expect(list).toHaveLength(2);
  });
});

describe("Integration: strategies", () => {
  it("should have 6 built-in strategies with complete definitions", () => {
    expect(BUILT_IN_STRATEGIES).toHaveLength(6);

    const names = BUILT_IN_STRATEGIES.map(s => s.name);
    expect(names).toContain("first-principles");
    expect(names).toContain("red-team");
    expect(names).toContain("convergent");
    expect(names).toContain("divergent");
    expect(names).toContain("root-cause");
    expect(names).toContain("decision-matrix");

    for (const strategy of BUILT_IN_STRATEGIES) {
      expect(strategy.description).toBeTruthy();
      expect(strategy.steps.length).toBeGreaterThan(0);
      expect(strategy.guidingQuestions.length).toBeGreaterThan(0);
      expect(strategy.reflectChecks.length).toBeGreaterThan(0);
      expect(strategy.whenToUse).toBeTruthy();
    }
  });
});

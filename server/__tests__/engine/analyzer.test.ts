import { describe, it, expect } from "vitest";
import { tokenize, jaccardSimilarity, Analyzer } from "../../src/engine/analyzer.js";
import { DEFAULT_CONFIG } from "../../src/config/schema.js";
import type { StoredThought, DeepThinkConfig } from "../../src/types.js";

function makeThought(overrides: Partial<StoredThought> & { thought: string; thoughtNumber: number }): StoredThought {
  return {
    totalThoughts: 10,
    nextThoughtNeeded: true,
    timestamp: new Date().toISOString(),
    sessionId: "test-session",
    ...overrides,
  };
}

describe("tokenize", () => {
  it("should extract significant words", () => {
    const tokens = tokenize("The quick brown fox jumps over the lazy dog");
    expect(tokens.has("quick")).toBe(true);
    expect(tokens.has("brown")).toBe(true);
    expect(tokens.has("fox")).toBe(true);
    // Stop words removed
    expect(tokens.has("the")).toBe(false);
    expect(tokens.has("over")).toBe(false);
  });

  it("should lowercase all tokens", () => {
    const tokens = tokenize("Database MIGRATION Strategy");
    expect(tokens.has("database")).toBe(true);
    expect(tokens.has("migration")).toBe(true);
    expect(tokens.has("strategy")).toBe(true);
  });

  it("should filter short words (<=2 chars)", () => {
    const tokens = tokenize("I am a do it ok");
    expect(tokens.size).toBe(0);
  });

  it("should strip punctuation", () => {
    const tokens = tokenize("caching! strategy? (redis)");
    expect(tokens.has("caching")).toBe(true);
    expect(tokens.has("strategy")).toBe(true);
    expect(tokens.has("redis")).toBe(true);
  });
});

describe("jaccardSimilarity", () => {
  it("should return 1 for identical sets", () => {
    const set = new Set(["foo", "bar", "baz"]);
    expect(jaccardSimilarity(set, set)).toBe(1);
  });

  it("should return 0 for disjoint sets", () => {
    const a = new Set(["foo", "bar"]);
    const b = new Set(["baz", "qux"]);
    expect(jaccardSimilarity(a, b)).toBe(0);
  });

  it("should return correct similarity for overlapping sets", () => {
    const a = new Set(["foo", "bar", "baz"]);
    const b = new Set(["bar", "baz", "qux"]);
    // Intersection: {bar, baz} = 2, Union: {foo, bar, baz, qux} = 4
    expect(jaccardSimilarity(a, b)).toBeCloseTo(0.5);
  });

  it("should return 0 for two empty sets", () => {
    expect(jaccardSimilarity(new Set(), new Set())).toBe(0);
  });
});

describe("Analyzer", () => {
  const analyzer = new Analyzer(DEFAULT_CONFIG);

  describe("circular detection", () => {
    it("should detect highly similar non-adjacent thoughts", () => {
      const history: StoredThought[] = [
        makeThought({ thought: "We need to implement a caching layer for the database queries to improve performance", thoughtNumber: 1 }),
        makeThought({ thought: "The API endpoints should use REST conventions with proper status codes", thoughtNumber: 2 }),
        makeThought({ thought: "A caching layer for database queries would significantly improve our performance", thoughtNumber: 3 }),
      ];

      const result = analyzer.analyze(history, {}, null, "patterns");
      const circular = result.patterns.filter(p => p.type === "circular");
      expect(circular.length).toBeGreaterThan(0);
      expect(circular[0]?.involvedThoughts).toContain(1);
      expect(circular[0]?.involvedThoughts).toContain(3);
    });

    it("should not flag distinct thoughts", () => {
      const history: StoredThought[] = [
        makeThought({ thought: "The authentication system should use JWT tokens for stateless verification", thoughtNumber: 1 }),
        makeThought({ thought: "Database migrations must be reversible with rollback scripts", thoughtNumber: 2 }),
        makeThought({ thought: "The frontend should implement lazy loading for performance", thoughtNumber: 3 }),
      ];

      const result = analyzer.analyze(history, {}, null, "patterns");
      const circular = result.patterns.filter(p => p.type === "circular");
      expect(circular).toHaveLength(0);
    });
  });

  describe("contradiction detection", () => {
    it("should detect should/should not contradictions on similar topics", () => {
      const history: StoredThought[] = [
        makeThought({ thought: "We should use a microservices architecture for the payment system", thoughtNumber: 1 }),
        makeThought({ thought: "We should not use microservices for the payment system, monolith is better", thoughtNumber: 2 }),
      ];

      const result = analyzer.analyze(history, {}, null, "contradictions");
      const contradictions = result.patterns.filter(p => p.type === "contradiction");
      expect(contradictions.length).toBeGreaterThan(0);
    });

    it("should not flag unrelated should/should not statements", () => {
      const history: StoredThought[] = [
        makeThought({ thought: "We should implement caching for the API layer", thoughtNumber: 1 }),
        makeThought({ thought: "We should not deploy on Fridays as a policy", thoughtNumber: 2 }),
      ];

      const result = analyzer.analyze(history, {}, null, "contradictions");
      const contradictions = result.patterns.filter(p => p.type === "contradiction");
      expect(contradictions).toHaveLength(0);
    });
  });

  describe("gap analysis", () => {
    it("should suggest assumptions when none are tracked", () => {
      const history: StoredThought[] = [
        makeThought({ thought: "T1", thoughtNumber: 1 }),
        makeThought({ thought: "T2", thoughtNumber: 2 }),
        makeThought({ thought: "T3", thoughtNumber: 3 }),
      ];

      const result = analyzer.analyze(history, {}, null, "gaps");
      expect(result.suggestions.some(s => s.toLowerCase().includes("assumption"))).toBe(true);
    });

    it("should not suggest assumptions when they are tracked", () => {
      const history: StoredThought[] = [
        makeThought({ thought: "T1", thoughtNumber: 1, assumptions: ["Users need real-time data"] }),
        makeThought({ thought: "T2", thoughtNumber: 2 }),
        makeThought({ thought: "T3", thoughtNumber: 3 }),
      ];

      const result = analyzer.analyze(history, {}, null, "gaps");
      expect(result.suggestions.some(s => s.toLowerCase().includes("no assumptions"))).toBe(false);
    });

    it("should suggest branching for long linear chains", () => {
      const history: StoredThought[] = Array.from({ length: 9 }, (_, i) =>
        makeThought({ thought: `Thought ${i + 1}`, thoughtNumber: i + 1 })
      );

      const result = analyzer.analyze(history, {}, null, "gaps");
      expect(result.suggestions.some(s => s.toLowerCase().includes("branch"))).toBe(true);
    });
  });

  describe("practice violations", () => {
    it("should detect anti-pattern violations", () => {
      const config: DeepThinkConfig = {
        ...DEFAULT_CONFIG,
        practices: {
          ...DEFAULT_CONFIG.practices,
          antiPatterns: ["Never store secrets in config files"],
        },
      };

      const analyzerWithConfig = new Analyzer(config);
      const history: StoredThought[] = [
        makeThought({ thought: "We could store the API secrets in the config files for simplicity", thoughtNumber: 1 }),
      ];

      const result = analyzerWithConfig.analyze(history, {}, null, "all");
      expect(result.practiceViolations.length).toBeGreaterThan(0);
    });
  });

  describe("progress summary", () => {
    it("should calculate average confidence", () => {
      const history: StoredThought[] = [
        makeThought({ thought: "T1", thoughtNumber: 1, confidence: 0.8 }),
        makeThought({ thought: "T2", thoughtNumber: 2, confidence: 0.6 }),
        makeThought({ thought: "T3", thoughtNumber: 3, confidence: 0.7 }),
      ];

      const result = analyzer.analyze(history, {}, null, "progress");
      expect(result.progress.averageConfidence).toBeCloseTo(0.7);
    });

    it("should detect falling confidence trend", () => {
      const history: StoredThought[] = [
        makeThought({ thought: "T1", thoughtNumber: 1, confidence: 0.9 }),
        makeThought({ thought: "T2", thoughtNumber: 2, confidence: 0.8 }),
        makeThought({ thought: "T3", thoughtNumber: 3, confidence: 0.7 }),
        makeThought({ thought: "T4", thoughtNumber: 4, confidence: 0.5 }),
      ];

      const result = analyzer.analyze(history, {}, null, "progress");
      expect(result.progress.confidenceTrend).toBe("falling");
    });

    it("should detect rising confidence trend", () => {
      const history: StoredThought[] = [
        makeThought({ thought: "T1", thoughtNumber: 1, confidence: 0.4 }),
        makeThought({ thought: "T2", thoughtNumber: 2, confidence: 0.5 }),
        makeThought({ thought: "T3", thoughtNumber: 3, confidence: 0.7 }),
        makeThought({ thought: "T4", thoughtNumber: 4, confidence: 0.9 }),
      ];

      const result = analyzer.analyze(history, {}, null, "progress");
      expect(result.progress.confidenceTrend).toBe("rising");
    });

    it("should count unique topics from tags", () => {
      const history: StoredThought[] = [
        makeThought({ thought: "T1", thoughtNumber: 1, tags: ["auth", "security"] }),
        makeThought({ thought: "T2", thoughtNumber: 2, tags: ["auth", "performance"] }),
        makeThought({ thought: "T3", thoughtNumber: 3, tags: ["database"] }),
      ];

      const result = analyzer.analyze(history, {}, null, "progress");
      expect(result.progress.uniqueTopics).toBe(4); // auth, security, performance, database
    });

    it("should calculate estimated completion", () => {
      const history: StoredThought[] = [
        makeThought({ thought: "T1", thoughtNumber: 1, totalThoughts: 10 }),
        makeThought({ thought: "T2", thoughtNumber: 2, totalThoughts: 10 }),
        makeThought({ thought: "T5", thoughtNumber: 5, totalThoughts: 10 }),
      ];

      const result = analyzer.analyze(history, {}, null, "progress");
      expect(result.progress.estimatedCompletion).toBe(50);
    });

    it("should count branches explored", () => {
      const branches = {
        "option-a": [makeThought({ thought: "A1", thoughtNumber: 2 })],
        "option-b": [makeThought({ thought: "B1", thoughtNumber: 3 })],
      };

      const result = analyzer.analyze(
        [makeThought({ thought: "Main", thoughtNumber: 1 })],
        branches,
        null,
        "progress"
      );
      expect(result.progress.branchesExplored).toBe(2);
    });
  });

  describe("empty history", () => {
    it("should handle empty history gracefully in all focus modes", () => {
      for (const focus of ["all", "progress", "contradictions", "gaps", "patterns"] as const) {
        const result = analyzer.analyze([], {}, null, focus);
        expect(result.progress.totalThoughts).toBe(0);
      }
    });
  });
});

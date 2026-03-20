import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ThoughtStore } from "../engine/thought-store.js";
import type { DeepThinkConfig, ThinkResponse } from "../types.js";
import { FileStore } from "../persistence/file-store.js";

export function registerThinkTool(server: McpServer, store: ThoughtStore, config: DeepThinkConfig, fileStore: FileStore): void {
  server.registerTool(
    "think",
    {
      title: "Think",
      description: `Record a reasoning step in a structured thought chain. Enhanced replacement for sequential thinking.

This tool helps analyze problems through a flexible, persistent thinking process that adapts and evolves.
Each thought can build on, question, or revise previous insights as understanding deepens.

When to use:
- Breaking down complex problems into steps
- Planning and design with room for revision
- Analysis that might need course correction
- Problems where the full scope isn't clear initially
- Tasks needing persistent context across sessions

Enhanced features beyond sequential thinking:
- Confidence tracking (0-1) on each thought
- Semantic tags for cross-thought analysis
- Assumptions and evidence tracking
- Strategy-guided thinking
- Active feedback on reasoning patterns

Parameters:
- thought: Your current thinking step (analysis, revision, question, realization, hypothesis)
- nextThoughtNeeded: True if more thinking needed, even past the estimated end
- thoughtNumber: Current position in sequence (1-indexed)
- totalThoughts: Current estimate of thoughts needed (adjustable up/down)
- confidence: How confident you are in this step (0-1, optional)
- tags: Semantic labels for this thought (optional)
- assumptions: Explicit assumptions being made (optional)
- evidence: Supporting evidence or references (optional)
- isRevision: Whether this revises previous thinking
- revisesThought: Which thought number is being reconsidered
- branchFromThought: Branching point thought number
- branchId: Branch identifier
- needsMoreThoughts: Signal to extend beyond totalThoughts

You should:
1. Start with an initial estimate of thoughts needed, but adjust freely
2. Track confidence — it helps the reflect tool detect issues
3. Tag thoughts for better cross-thought analysis
4. Make assumptions explicit — they're checked during reflection
5. Only set nextThoughtNeeded to false when truly satisfied`,
      inputSchema: {
        thought: z.string().describe("Your current thinking step"),
        nextThoughtNeeded: z.boolean().describe("Whether another thought step is needed"),
        thoughtNumber: z.number().int().min(1).describe("Current thought number"),
        totalThoughts: z.number().int().min(1).describe("Estimated total thoughts needed"),
        confidence: z.number().min(0).max(1).optional().describe("Confidence in this step (0-1)"),
        tags: z.array(z.string()).optional().describe("Semantic tags for this thought"),
        assumptions: z.array(z.string()).optional().describe("Assumptions being made"),
        evidence: z.array(z.string()).optional().describe("Supporting evidence"),
        isRevision: z.boolean().optional().describe("Whether this revises previous thinking"),
        revisesThought: z.number().int().min(1).optional().describe("Which thought is being reconsidered"),
        branchFromThought: z.number().int().min(1).optional().describe("Branching point thought number"),
        branchId: z.string().optional().describe("Branch identifier"),
        needsMoreThoughts: z.boolean().optional().describe("If more thoughts are needed beyond estimate"),
        strategy: z.string().optional().describe("Reasoning strategy to apply"),
        dependsOn: z.array(z.number().int().min(1)).optional().describe("Thought numbers this depends on"),
      },
      outputSchema: {
        thoughtNumber: z.number(),
        totalThoughts: z.number(),
        nextThoughtNeeded: z.boolean(),
        branches: z.array(z.string()),
        thoughtHistoryLength: z.number(),
        activeStrategy: z.string().nullable(),
        feedback: z.array(z.string()),
      },
    },
    async (args) => {
      if (args.strategy) {
        store.setActiveStrategy(args.strategy);
      }

      const stored = store.addThought(args);
      const history = store.getHistory();
      const feedback: string[] = [];

      // Feedback: chain length warning
      if (history.length > config.thinking.maxThoughts * 0.8) {
        feedback.push(`Approaching thought limit (${history.length}/${config.thinking.maxThoughts}). Consider reflecting or concluding.`);
      }

      // Feedback: confidence dropping
      if (history.length >= 3) {
        const recent = history.slice(-3);
        const confidences = recent.map(t => t.confidence).filter((c): c is number => c !== undefined);
        if (confidences.length >= 2) {
          const trend = confidences[confidences.length - 1]! - confidences[0]!;
          if (trend < -0.3) {
            feedback.push("Confidence has dropped significantly in recent thoughts. Consider using 'reflect' to analyze the chain.");
          }
        }
      }

      // Feedback: no tags being used
      if (history.length >= 5 && history.every(t => !t.tags || t.tags.length === 0)) {
        feedback.push("Tip: Adding tags to thoughts improves the quality of 'reflect' analysis.");
      }

      // Auto-checkpoint every N thoughts
      const autoEvery = config.thinking.autoCheckpointEvery;
      if (autoEvery > 0 && history.length > 0 && history.length % autoEvery === 0) {
        const state = store.serialize();
        const cpName = `auto-${Date.now()}`;
        await fileStore.save(cpName, {
          name: cpName,
          timestamp: new Date().toISOString(),
          sessionId: store.getSessionId(),
          thoughtHistory: state.thoughtHistory,
          branches: state.branches,
          activeStrategy: state.activeStrategy,
          metadata: {},
          projectPath: process.cwd(),
        });
        feedback.push(`Auto-checkpoint saved: ${cpName} (every ${autoEvery} thoughts)`);
      }

      const response: ThinkResponse = {
        thoughtNumber: stored.thoughtNumber,
        totalThoughts: stored.totalThoughts,
        nextThoughtNeeded: stored.nextThoughtNeeded,
        branches: store.getBranchIds(),
        thoughtHistoryLength: history.length,
        activeStrategy: store.getActiveStrategy(),
        feedback,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }],
        structuredContent: response as unknown as Record<string, unknown>,
      };
    }
  );
}

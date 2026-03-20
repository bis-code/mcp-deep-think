import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ThoughtStore } from "../engine/thought-store.js";
import type { DeepThinkConfig, ReflectionResult } from "../types.js";
import { Analyzer } from "../engine/analyzer.js";

export function registerReflectTool(server: McpServer, store: ThoughtStore, config: DeepThinkConfig): void {
  const analyzer = new Analyzer(config);

  server.registerTool(
    "reflect",
    {
      title: "Reflect",
      description: `Analyze the thought chain to detect patterns, issues, and gaps. This is the key differentiator from sequential thinking — it actively reads and analyzes your reasoning.

Use reflect to:
- Check if you're going in circles (circular reasoning detection)
- Find contradictions between thoughts
- Get a progress summary
- Identify gaps in your analysis
- Check your reasoning against project-specific best practices (if .deep-think.json is configured)

Focus modes:
- "all": Full analysis (default)
- "progress": How far along and what's been covered
- "contradictions": Find conflicting thoughts
- "gaps": What reasoning steps are missing
- "patterns": Detect circular reasoning, anchoring, scope creep

The quality of reflection improves when thoughts include tags, confidence scores, and assumptions.`,
      inputSchema: {
        focus: z.enum(["all", "progress", "contradictions", "gaps", "patterns"]).optional().describe("What aspect to analyze (default: all)"),
      },
    },
    async (args) => {
      const history = store.getHistory();

      if (history.length === 0) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ summary: "No thoughts to reflect on yet.", patterns: [], suggestions: ["Start thinking first using the 'think' tool."], practiceViolations: [], progress: { totalThoughts: 0, uniqueTopics: 0, branchesExplored: 0, averageConfidence: null, confidenceTrend: "unknown", estimatedCompletion: 0 } }, null, 2) }],
        };
      }

      const focus = args.focus ?? "all";
      const result = analyzer.analyze(history, store.getBranches(), store.getActiveStrategy(), focus);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}

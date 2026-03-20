import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ThoughtStore } from "../engine/thought-store.js";
import type { DeepThinkConfig, BranchInfo, BranchComparison, MergeResult } from "../types.js";
import { tokenize, jaccardSimilarity } from "../engine/analyzer.js";

export function registerBranchTool(server: McpServer, store: ThoughtStore, _config: DeepThinkConfig): void {
  server.registerTool(
    "branch",
    {
      title: "Branch",
      description: `Manage thought branches — create, list, compare, and merge alternative reasoning paths.

Use branching when:
- You want to explore multiple approaches in parallel
- A decision point has several viable options
- You need to compare trade-offs between alternatives

Operations:
- create: Start a new branch from any thought (use the think tool with branchFromThought)
- list: Show all branches with summaries
- compare: Compare two branches to find agreements, disagreements, and unique insights
- merge: Synthesize branches into a conclusion, recording which approach won and why`,
      inputSchema: {
        operation: z.enum(["list", "compare", "merge"]).describe("Branch operation to perform"),
        branchA: z.string().optional().describe("First branch ID (for compare/merge)"),
        branchB: z.string().optional().describe("Second branch ID (for compare/merge)"),
        mergeConclusion: z.string().optional().describe("Your synthesis conclusion (for merge)"),
        winningBranch: z.string().optional().describe("Which branch's approach won (for merge)"),
        rationale: z.string().optional().describe("Why this branch won (for merge)"),
      },
    },
    async (args) => {
      switch (args.operation) {
        case "list": {
          const branches = store.getBranches();
          const branchInfos: BranchInfo[] = Object.entries(branches).map(([id, thoughts]) => ({
            id,
            fromThought: thoughts[0]?.branchFromThought ?? 0,
            thoughtCount: thoughts.length,
            summary: thoughts.length > 0
              ? thoughts[thoughts.length - 1]!.thought.slice(0, 100) + (thoughts[thoughts.length - 1]!.thought.length > 100 ? "..." : "")
              : "(empty branch)",
          }));

          return {
            content: [{ type: "text" as const, text: JSON.stringify({ branches: branchInfos }, null, 2) }],
          };
        }

        case "compare": {
          if (!args.branchA || !args.branchB) {
            return {
              isError: true,
              content: [{ type: "text" as const, text: "compare requires branchA and branchB" }],
            };
          }

          const thoughtsA = store.getBranch(args.branchA);
          const thoughtsB = store.getBranch(args.branchB);

          if (thoughtsA.length === 0 || thoughtsB.length === 0) {
            return {
              isError: true,
              content: [{ type: "text" as const, text: `Branch not found: ${thoughtsA.length === 0 ? args.branchA : args.branchB}` }],
            };
          }

          const tokensA = thoughtsA.map(t => tokenize(t.thought));
          const tokensB = thoughtsB.map(t => tokenize(t.thought));

          const agreements: string[] = [];
          const disagreements: string[] = [];
          const uniqueToA: string[] = [];
          const uniqueToB: string[] = [];

          for (const tA of thoughtsA) {
            let bestSim = 0;
            let bestMatch = "";
            for (const tB of thoughtsB) {
              const sim = jaccardSimilarity(tokenize(tA.thought), tokenize(tB.thought));
              if (sim > bestSim) {
                bestSim = sim;
                bestMatch = tB.thought.slice(0, 80);
              }
            }
            if (bestSim > 0.4) {
              agreements.push(tA.thought.slice(0, 80));
            } else {
              uniqueToA.push(tA.thought.slice(0, 80));
            }
          }

          for (const tB of thoughtsB) {
            let bestSim = 0;
            for (const tA of thoughtsA) {
              const sim = jaccardSimilarity(tokenize(tB.thought), tokenize(tA.thought));
              if (sim > bestSim) bestSim = sim;
            }
            if (bestSim <= 0.4) {
              uniqueToB.push(tB.thought.slice(0, 80));
            }
          }

          const comparison: BranchComparison = {
            branchA: args.branchA,
            branchB: args.branchB,
            agreements,
            disagreements,
            uniqueToA,
            uniqueToB,
          };

          return {
            content: [{ type: "text" as const, text: JSON.stringify(comparison, null, 2) }],
          };
        }

        case "merge": {
          if (!args.mergeConclusion) {
            return {
              isError: true,
              content: [{ type: "text" as const, text: "merge requires mergeConclusion" }],
            };
          }

          const history = store.getHistory();
          const mergeThoughtNumber = history.length + 1;

          store.addThought({
            thought: `[MERGE] ${args.mergeConclusion}`,
            thoughtNumber: mergeThoughtNumber,
            totalThoughts: mergeThoughtNumber,
            nextThoughtNeeded: false,
            tags: ["merge"],
          });

          const result: MergeResult = {
            mergedFrom: [args.branchA ?? "", args.branchB ?? ""].filter(Boolean),
            conclusion: args.mergeConclusion,
            winningBranch: args.winningBranch ?? null,
            rationale: args.rationale ?? "",
            mergedThoughtNumber: mergeThoughtNumber,
          };

          return {
            content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
          };
        }
      }
    }
  );
}

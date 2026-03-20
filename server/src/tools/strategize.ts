import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ThoughtStore } from "../engine/thought-store.js";
import type { DeepThinkConfig, Strategy } from "../types.js";
import { BUILT_IN_STRATEGIES } from "../engine/strategies.js";

export function registerStrategizeTool(server: McpServer, store: ThoughtStore, config: DeepThinkConfig): void {
  server.registerTool(
    "strategize",
    {
      title: "Strategize",
      description: `Switch reasoning frameworks to guide your thinking process. Different problems benefit from different thinking strategies.

Built-in strategies:
- first-principles: Decompose assumptions and rebuild from ground truth
- red-team: Attack your own conclusions to find weaknesses
- convergent: Narrow from many options to one decision
- divergent: Generate ideas freely without judgment
- root-cause: Systematic investigation (5 whys, elimination)
- decision-matrix: Weighted criteria comparison

Custom strategies from .deep-think.json are also available if configured.

Operations:
- set: Activate a strategy (influences think feedback and reflect analysis)
- get: Show the current active strategy with its guidance
- list: Show all available strategies`,
      inputSchema: {
        operation: z.enum(["set", "get", "list"]).describe("Strategy operation"),
        strategy: z.string().optional().describe("Strategy name (for set)"),
      },
    },
    async (args) => {
      const allStrategies = getAllStrategies(config);

      switch (args.operation) {
        case "list": {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ strategies: allStrategies.map(s => ({ name: s.name, description: s.description, whenToUse: s.whenToUse })) }, null, 2) }],
          };
        }

        case "get": {
          const active = store.getActiveStrategy();
          if (!active) {
            return {
              content: [{ type: "text" as const, text: JSON.stringify({ activeStrategy: null, message: "No strategy active. Use 'set' to activate one." }, null, 2) }],
            };
          }

          const strategy = allStrategies.find(s => s.name === active);
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ activeStrategy: strategy ?? { name: active, description: "Unknown strategy" } }, null, 2) }],
          };
        }

        case "set": {
          if (!args.strategy) {
            return {
              isError: true,
              content: [{ type: "text" as const, text: "set requires a strategy name" }],
            };
          }

          const exists = allStrategies.some(s => s.name === args.strategy);
          if (!exists) {
            return {
              isError: true,
              content: [{ type: "text" as const, text: `Unknown strategy: ${args.strategy}. Use 'list' to see available strategies.` }],
            };
          }

          store.setActiveStrategy(args.strategy!);
          const strategy = allStrategies.find(s => s.name === args.strategy);

          return {
            content: [{ type: "text" as const, text: JSON.stringify({ activated: args.strategy, steps: strategy?.steps, guidingQuestions: strategy?.guidingQuestions }, null, 2) }],
          };
        }
      }
    }
  );
}

function getAllStrategies(config: DeepThinkConfig): Strategy[] {
  const custom: Strategy[] = config.strategies.custom.map(cs => ({
    name: cs.name,
    description: cs.description,
    steps: cs.steps,
    guidingQuestions: [],
    reflectChecks: [],
    whenToUse: cs.description,
  }));

  return [...BUILT_IN_STRATEGIES, ...custom];
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ThoughtStore } from "../engine/thought-store.js";
import type { DeepThinkConfig, CheckpointData, CheckpointInfo } from "../types.js";
import { FileStore } from "../persistence/file-store.js";

export function registerCheckpointTool(server: McpServer, store: ThoughtStore, config: DeepThinkConfig, fileStore: FileStore): void {

  server.registerTool(
    "checkpoint",
    {
      title: "Checkpoint",
      description: `Save and restore reasoning state. Enables persistent thinking across sessions.

Use checkpoints to:
- Save progress before exploring a risky reasoning path
- Resume a thought chain after a session restart
- Create snapshots at key decision points
- Roll back to a previous state if reasoning goes off track

Operations:
- save: Snapshot the current thought chain, branches, and strategy
- load: Restore a previously saved checkpoint
- list: Show all available checkpoints
- delete: Remove a checkpoint`,
      inputSchema: {
        operation: z.enum(["save", "load", "list", "delete"]).describe("Checkpoint operation"),
        name: z.string().optional().describe("Checkpoint name (for save/load/delete)"),
      },
    },
    async (args) => {
      switch (args.operation) {
        case "save": {
          const name = args.name ?? `auto-${Date.now()}`;
          const state = store.serialize();
          const checkpoint: CheckpointData = {
            name,
            timestamp: new Date().toISOString(),
            sessionId: store.getSessionId(),
            thoughtHistory: state.thoughtHistory,
            branches: state.branches,
            activeStrategy: state.activeStrategy,
            metadata: {},
            projectPath: process.cwd(),
          };

          await fileStore.save(name, checkpoint);

          return {
            content: [{ type: "text" as const, text: JSON.stringify({ saved: name, thoughtCount: state.thoughtHistory.length }, null, 2) }],
          };
        }

        case "load": {
          if (!args.name) {
            return {
              isError: true,
              content: [{ type: "text" as const, text: "load requires a checkpoint name" }],
            };
          }

          const checkpoint = await fileStore.load(args.name);
          if (!checkpoint) {
            return {
              isError: true,
              content: [{ type: "text" as const, text: `Checkpoint not found: ${args.name}` }],
            };
          }

          store.restore({
            thoughtHistory: checkpoint.thoughtHistory,
            branches: checkpoint.branches,
            activeStrategy: checkpoint.activeStrategy,
            sessionId: checkpoint.sessionId,
          });

          return {
            content: [{ type: "text" as const, text: JSON.stringify({ loaded: args.name, thoughtCount: checkpoint.thoughtHistory.length }, null, 2) }],
          };
        }

        case "list": {
          const checkpoints = await fileStore.list();
          const infos: CheckpointInfo[] = checkpoints.map(cp => ({
            name: cp.name,
            timestamp: cp.timestamp,
            thoughtCount: cp.thoughtHistory.length,
            branchCount: Object.keys(cp.branches).length,
            strategy: cp.activeStrategy,
            projectPath: cp.projectPath,
          }));

          return {
            content: [{ type: "text" as const, text: JSON.stringify({ checkpoints: infos }, null, 2) }],
          };
        }

        case "delete": {
          if (!args.name) {
            return {
              isError: true,
              content: [{ type: "text" as const, text: "delete requires a checkpoint name" }],
            };
          }

          const deleted = await fileStore.delete(args.name);
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ deleted: args.name, success: deleted }, null, 2) }],
          };
        }
      }
    }
  );
}

#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ThoughtStore } from "./engine/thought-store.js";
import { registerThinkTool } from "./tools/think.js";
import { registerBranchTool } from "./tools/branch.js";
import { registerCheckpointTool } from "./tools/checkpoint.js";
import { registerReflectTool } from "./tools/reflect.js";
import { registerStrategizeTool } from "./tools/strategize.js";
import { loadConfig } from "./config/loader.js";
import { FileStore } from "./persistence/file-store.js";

const server = new McpServer({
  name: "mcp-deep-think",
  version: "0.1.0",
});

const config = loadConfig();
const store = new ThoughtStore(config);
const fileStore = new FileStore(config.persistence.directory, config.persistence.maxCheckpoints);

registerThinkTool(server, store, config, fileStore);
registerBranchTool(server, store, config);
registerCheckpointTool(server, store, config, fileStore);
registerReflectTool(server, store, config);
registerStrategizeTool(server, store, config);

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-deep-think server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});

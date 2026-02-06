import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../../src/config/loader.js";
import { DEFAULT_CONFIG } from "../../src/config/schema.js";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

describe("loadConfig", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `mcp-dt-cfg-${randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try { rmSync(testDir, { recursive: true, force: true }); } catch { /* ignore cleanup errors */ }
  });

  it("should return defaults when no config file exists", () => {
    const config = loadConfig(join(testDir, "nonexistent.json"));
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("should load and merge partial config", () => {
    const configPath = join(testDir, ".deep-think.json");
    writeFileSync(configPath, JSON.stringify({
      project: { name: "test-api" },
      thinking: { maxThoughts: 30 },
    }));

    const config = loadConfig(configPath);
    expect(config.project.name).toBe("test-api");
    expect(config.thinking.maxThoughts).toBe(30);
    // Defaults preserved for unspecified fields
    expect(config.thinking.autoCheckpointEvery).toBe(DEFAULT_CONFIG.thinking.autoCheckpointEvery);
    expect(config.persistence.directory).toBe(DEFAULT_CONFIG.persistence.directory);
  });

  it("should load practices rules", () => {
    const configPath = join(testDir, ".deep-think.json");
    writeFileSync(configPath, JSON.stringify({
      practices: {
        rules: ["Always validate inputs"],
        antiPatterns: ["Never use eval"],
      },
    }));

    const config = loadConfig(configPath);
    expect(config.practices.rules).toEqual(["Always validate inputs"]);
    expect(config.practices.antiPatterns).toEqual(["Never use eval"]);
  });

  it("should load custom strategies", () => {
    const configPath = join(testDir, ".deep-think.json");
    writeFileSync(configPath, JSON.stringify({
      strategies: {
        custom: [{
          name: "api-design",
          description: "Design an API endpoint",
          steps: ["Define resource", "Choose methods"],
          checkpoints: ["after schema"],
        }],
      },
    }));

    const config = loadConfig(configPath);
    expect(config.strategies.custom).toHaveLength(1);
    expect(config.strategies.custom[0]?.name).toBe("api-design");
  });

  it("should return defaults for invalid JSON", () => {
    const configPath = join(testDir, ".deep-think.json");
    writeFileSync(configPath, "not valid json {{{");

    const config = loadConfig(configPath);
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("should support env var override path", () => {
    const configPath = join(testDir, "custom-config.json");
    writeFileSync(configPath, JSON.stringify({ project: { name: "env-override" } }));

    const originalEnv = process.env.MCP_DEEP_THINK_CONFIG;
    process.env.MCP_DEEP_THINK_CONFIG = configPath;
    try {
      const config = loadConfig();
      expect(config.project.name).toBe("env-override");
    } finally {
      if (originalEnv === undefined) {
        delete process.env.MCP_DEEP_THINK_CONFIG;
      } else {
        process.env.MCP_DEEP_THINK_CONFIG = originalEnv;
      }
    }
  });
});

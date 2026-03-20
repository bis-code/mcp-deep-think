import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { DeepThinkConfig } from "../types.js";
import { DEFAULT_CONFIG } from "./schema.js";

export function loadConfig(configPath?: string): DeepThinkConfig {
  const path = configPath
    ?? process.env.MCP_DEEP_THINK_CONFIG
    ?? resolve(process.cwd(), ".deep-think.json");

  if (!existsSync(path)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as Partial<DeepThinkConfig>;
    return mergeConfig(DEFAULT_CONFIG, parsed);
  } catch {
    console.error(`Warning: Failed to parse config at ${path}, using defaults`);
    return { ...DEFAULT_CONFIG };
  }
}

function mergeConfig(defaults: DeepThinkConfig, overrides: Partial<DeepThinkConfig>): DeepThinkConfig {
  return {
    project: { ...defaults.project, ...overrides.project },
    thinking: { ...defaults.thinking, ...overrides.thinking },
    practices: {
      rules: overrides.practices?.rules ?? defaults.practices.rules,
      antiPatterns: overrides.practices?.antiPatterns ?? defaults.practices.antiPatterns,
      reviewChecklist: overrides.practices?.reviewChecklist ?? defaults.practices.reviewChecklist,
    },
    strategies: {
      custom: overrides.strategies?.custom ?? defaults.strategies.custom,
    },
    reflection: { ...defaults.reflection, ...overrides.reflection },
    persistence: { ...defaults.persistence, ...overrides.persistence },
  };
}

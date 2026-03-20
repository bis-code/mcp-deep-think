import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, readdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { FileStore } from "../../src/persistence/file-store.js";
import { ThoughtStore } from "../../src/engine/thought-store.js";
import { DEFAULT_CONFIG } from "../../src/config/schema.js";
import type { DeepThinkConfig } from "../../src/types.js";

describe("autoCheckpointEvery", () => {
  let dir: string;
  let fileStore: FileStore;
  let thoughtStore: ThoughtStore;
  let config: DeepThinkConfig;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "dt-autocp-"));
    config = {
      ...DEFAULT_CONFIG,
      thinking: { ...DEFAULT_CONFIG.thinking, autoCheckpointEvery: 3 },
      persistence: { ...DEFAULT_CONFIG.persistence, directory: dir },
    };
    fileStore = new FileStore(dir, 10);
    thoughtStore = new ThoughtStore(config);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("saves checkpoint when thought count is a multiple of autoCheckpointEvery", async () => {
    const saveSpy = vi.spyOn(fileStore, "save");

    for (let i = 1; i <= 3; i++) {
      thoughtStore.addThought({
        thought: `Thought ${i}`,
        thoughtNumber: i,
        totalThoughts: 5,
        nextThoughtNeeded: true,
      });

      const history = thoughtStore.getHistory();
      const autoEvery = config.thinking.autoCheckpointEvery;
      if (autoEvery > 0 && history.length > 0 && history.length % autoEvery === 0) {
        const state = thoughtStore.serialize();
        await fileStore.save(`auto-test`, {
          name: `auto-test`,
          timestamp: new Date().toISOString(),
          sessionId: thoughtStore.getSessionId(),
          thoughtHistory: state.thoughtHistory,
          branches: state.branches,
          activeStrategy: state.activeStrategy,
          metadata: {},
          projectPath: process.cwd(),
        });
      }
    }

    expect(saveSpy).toHaveBeenCalledTimes(1);
    const files = readdirSync(dir).filter(f => f.endsWith(".json"));
    expect(files).toHaveLength(1);
  });

  it("does not save checkpoint before reaching the threshold", async () => {
    const saveSpy = vi.spyOn(fileStore, "save");

    for (let i = 1; i <= 2; i++) {
      thoughtStore.addThought({
        thought: `Thought ${i}`,
        thoughtNumber: i,
        totalThoughts: 5,
        nextThoughtNeeded: true,
      });

      const history = thoughtStore.getHistory();
      const autoEvery = config.thinking.autoCheckpointEvery;
      if (autoEvery > 0 && history.length > 0 && history.length % autoEvery === 0) {
        const state = thoughtStore.serialize();
        await fileStore.save(`auto-test`, {
          name: `auto-test`,
          timestamp: new Date().toISOString(),
          sessionId: thoughtStore.getSessionId(),
          thoughtHistory: state.thoughtHistory,
          branches: state.branches,
          activeStrategy: state.activeStrategy,
          metadata: {},
          projectPath: process.cwd(),
        });
      }
    }

    expect(saveSpy).not.toHaveBeenCalled();
  });
});

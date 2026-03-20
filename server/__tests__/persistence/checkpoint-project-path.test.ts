import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { FileStore } from "../../src/persistence/file-store.js";
import type { CheckpointData } from "../../src/types.js";

describe("CheckpointData projectPath", () => {
  let dir: string;
  let store: FileStore;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "dt-test-"));
    store = new FileStore(dir, 10);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("saves and loads projectPath", async () => {
    const checkpoint: CheckpointData = {
      name: "test-cp",
      timestamp: new Date().toISOString(),
      sessionId: "test-session",
      thoughtHistory: [],
      branches: {},
      activeStrategy: null,
      metadata: {},
      projectPath: "/Users/me/my-project",
    };

    await store.save("test-cp", checkpoint);
    const loaded = await store.load("test-cp");

    expect(loaded).not.toBeNull();
    expect(loaded!.projectPath).toBe("/Users/me/my-project");
  });

  it("handles old checkpoints without projectPath", async () => {
    const oldCheckpoint = {
      name: "old-cp",
      timestamp: new Date().toISOString(),
      sessionId: "old-session",
      thoughtHistory: [],
      branches: {},
      activeStrategy: null,
      metadata: {},
    };

    await store.save("old-cp", oldCheckpoint as CheckpointData);
    const loaded = await store.load("old-cp");

    expect(loaded).not.toBeNull();
    expect(loaded!.projectPath).toBeUndefined();
  });
});

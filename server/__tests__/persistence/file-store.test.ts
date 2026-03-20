import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FileStore } from "../../src/persistence/file-store.js";
import type { CheckpointData } from "../../src/types.js";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

function makeCheckpoint(name: string, thoughtCount: number = 3): CheckpointData {
  return {
    name,
    timestamp: new Date().toISOString(),
    sessionId: "test-session",
    thoughtHistory: Array.from({ length: thoughtCount }, (_, i) => ({
      thought: `Thought ${i + 1}`,
      thoughtNumber: i + 1,
      totalThoughts: thoughtCount,
      nextThoughtNeeded: i < thoughtCount - 1,
      timestamp: new Date().toISOString(),
      sessionId: "test-session",
    })),
    branches: {},
    activeStrategy: null,
    metadata: {},
  };
}

describe("FileStore", () => {
  let testDir: string;
  let store: FileStore;

  beforeEach(() => {
    testDir = join(tmpdir(), `mcp-dt-fs-${randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
    store = new FileStore(testDir, 5);
  });

  afterEach(() => {
    try { rmSync(testDir, { recursive: true, force: true }); } catch { /* ignore cleanup errors */ }
  });

  describe("save and load", () => {
    it("should save and load a checkpoint", async () => {
      const checkpoint = makeCheckpoint("test-save");
      await store.save("test-save", checkpoint);

      const loaded = await store.load("test-save");
      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe("test-save");
      expect(loaded!.thoughtHistory).toHaveLength(3);
    });

    it("should return null for non-existent checkpoint", async () => {
      const loaded = await store.load("nonexistent");
      expect(loaded).toBeNull();
    });

    it("should preserve all thought data", async () => {
      const checkpoint = makeCheckpoint("full-data", 2);
      checkpoint.activeStrategy = "red-team";
      checkpoint.branches = {
        "branch-a": [{
          thought: "Branch thought",
          thoughtNumber: 3,
          totalThoughts: 3,
          nextThoughtNeeded: false,
          branchFromThought: 1,
          branchId: "branch-a",
          timestamp: new Date().toISOString(),
          sessionId: "test-session",
        }],
      };

      await store.save("full-data", checkpoint);
      const loaded = await store.load("full-data");

      expect(loaded!.activeStrategy).toBe("red-team");
      expect(loaded!.branches["branch-a"]).toHaveLength(1);
    });
  });

  describe("list", () => {
    it("should list all saved checkpoints", async () => {
      await store.save("cp-one", makeCheckpoint("cp-one"));
      await store.save("cp-two", makeCheckpoint("cp-two"));

      const list = await store.list();
      expect(list).toHaveLength(2);
      const names = list.map(c => c.name);
      expect(names).toContain("cp-one");
      expect(names).toContain("cp-two");
    });

    it("should return empty array when no checkpoints exist", async () => {
      const emptyDir = join(testDir, "empty-subdir");
      const emptyStore = new FileStore(emptyDir, 5);
      const list = await emptyStore.list();
      expect(list).toEqual([]);
    });
  });

  describe("delete", () => {
    it("should delete an existing checkpoint", async () => {
      await store.save("to-delete", makeCheckpoint("to-delete"));
      const deleted = await store.delete("to-delete");
      expect(deleted).toBe(true);

      const loaded = await store.load("to-delete");
      expect(loaded).toBeNull();
    });

    it("should return false for non-existent checkpoint", async () => {
      const deleted = await store.delete("nonexistent");
      expect(deleted).toBe(false);
    });
  });

  describe("rotation", () => {
    it("should keep only maxCheckpoints most recent files", async () => {
      for (let i = 0; i < 8; i++) {
        await store.save(`cp-${i}`, makeCheckpoint(`cp-${i}`));
        // Small delay to ensure different mtimes
        await new Promise(r => setTimeout(r, 10));
      }

      const list = await store.list();
      expect(list.length).toBeLessThanOrEqual(5);
    });
  });

  describe("name sanitization", () => {
    it("should sanitize checkpoint names to prevent path traversal", async () => {
      const checkpoint = makeCheckpoint("../../etc/passwd");
      await store.save("../../etc/passwd", checkpoint);

      // Should not create files outside the directory
      const list = await store.list();
      expect(list).toHaveLength(1);
      expect(list[0]!.name).toBe("../../etc/passwd");
    });
  });
});

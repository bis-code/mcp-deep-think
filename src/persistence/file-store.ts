import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from "fs";
import { join, resolve } from "path";
import type { CheckpointData } from "../types.js";
import type { IPersistenceAdapter } from "./types.js";

export class FileStore implements IPersistenceAdapter {
  private directory: string;
  private maxCheckpoints: number;

  constructor(directory: string, maxCheckpoints: number) {
    this.directory = resolve(directory);
    this.maxCheckpoints = maxCheckpoints;
  }

  private ensureDir(): void {
    if (!existsSync(this.directory)) {
      mkdirSync(this.directory, { recursive: true });
    }
  }

  private filePath(name: string): string {
    // Sanitize name to prevent path traversal
    const safe = name.replace(/[^a-zA-Z0-9_-]/g, "_");
    return join(this.directory, `${safe}.json`);
  }

  async save(name: string, data: CheckpointData): Promise<void> {
    this.ensureDir();
    const path = this.filePath(name);
    writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
    this.rotate();
  }

  async load(name: string): Promise<CheckpointData | null> {
    const path = this.filePath(name);
    if (!existsSync(path)) return null;

    try {
      const raw = readFileSync(path, "utf-8");
      return JSON.parse(raw) as CheckpointData;
    } catch {
      return null;
    }
  }

  async list(): Promise<CheckpointData[]> {
    if (!existsSync(this.directory)) return [];

    const files = readdirSync(this.directory)
      .filter(f => f.endsWith(".json"))
      .sort((a, b) => {
        const statA = statSync(join(this.directory, a));
        const statB = statSync(join(this.directory, b));
        return statB.mtimeMs - statA.mtimeMs;
      });

    const checkpoints: CheckpointData[] = [];
    for (const file of files) {
      try {
        const raw = readFileSync(join(this.directory, file), "utf-8");
        checkpoints.push(JSON.parse(raw) as CheckpointData);
      } catch {
        // Skip corrupted files
      }
    }

    return checkpoints;
  }

  async delete(name: string): Promise<boolean> {
    const path = this.filePath(name);
    if (!existsSync(path)) return false;

    unlinkSync(path);
    return true;
  }

  private rotate(): void {
    if (!existsSync(this.directory)) return;

    const files = readdirSync(this.directory)
      .filter(f => f.endsWith(".json"))
      .map(f => ({
        name: f,
        mtime: statSync(join(this.directory, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > this.maxCheckpoints) {
      for (const file of files.slice(this.maxCheckpoints)) {
        unlinkSync(join(this.directory, file.name));
      }
    }
  }
}

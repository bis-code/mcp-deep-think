import type { CheckpointData } from "../types.js";

export interface IPersistenceAdapter {
  save(name: string, data: CheckpointData): Promise<void>;
  load(name: string): Promise<CheckpointData | null>;
  list(): Promise<CheckpointData[]>;
  delete(name: string): Promise<boolean>;
}

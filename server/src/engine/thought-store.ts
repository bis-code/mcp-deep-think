import type { ThoughtData, StoredThought, DeepThinkConfig } from "../types.js";

export class ThoughtStore {
  private thoughtHistory: StoredThought[] = [];
  private branches: Record<string, StoredThought[]> = {};
  private activeStrategy: string | null = null;
  private sessionId: string;
  private config: DeepThinkConfig;

  constructor(config: DeepThinkConfig) {
    this.config = config;
    this.sessionId = crypto.randomUUID();
    this.activeStrategy = config.thinking.defaultStrategy;
  }

  addThought(input: ThoughtData): StoredThought {
    if (input.thoughtNumber > input.totalThoughts) {
      input.totalThoughts = input.thoughtNumber;
    }

    const stored: StoredThought = {
      ...input,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
    };

    this.thoughtHistory.push(stored);

    if (input.branchFromThought && input.branchId) {
      if (!this.branches[input.branchId]) {
        this.branches[input.branchId] = [];
      }
      this.branches[input.branchId].push(stored);
    }

    return stored;
  }

  getThought(thoughtNumber: number): StoredThought | undefined {
    return this.thoughtHistory.find(t => t.thoughtNumber === thoughtNumber);
  }

  getHistory(): StoredThought[] {
    return [...this.thoughtHistory];
  }

  getBranches(): Record<string, StoredThought[]> {
    return { ...this.branches };
  }

  getBranchIds(): string[] {
    return Object.keys(this.branches);
  }

  getBranch(branchId: string): StoredThought[] {
    return this.branches[branchId] ? [...this.branches[branchId]] : [];
  }

  getActiveStrategy(): string | null {
    return this.activeStrategy;
  }

  setActiveStrategy(strategy: string | null): void {
    this.activeStrategy = strategy;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getConfig(): DeepThinkConfig {
    return this.config;
  }

  clear(): void {
    this.thoughtHistory = [];
    this.branches = {};
  }

  // Serialization for checkpointing
  serialize(): { thoughtHistory: StoredThought[]; branches: Record<string, StoredThought[]>; activeStrategy: string | null; sessionId: string } {
    return {
      thoughtHistory: this.thoughtHistory,
      branches: this.branches,
      activeStrategy: this.activeStrategy,
      sessionId: this.sessionId,
    };
  }

  restore(data: { thoughtHistory: StoredThought[]; branches: Record<string, StoredThought[]>; activeStrategy: string | null; sessionId: string }): void {
    this.thoughtHistory = data.thoughtHistory;
    this.branches = data.branches;
    this.activeStrategy = data.activeStrategy;
    this.sessionId = data.sessionId;
  }
}

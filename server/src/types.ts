// ============================================================================
// Core Thought Types
// ============================================================================

export interface ThoughtData {
  // Sequential Thinking compatible fields
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;

  // Deep Think extensions
  strategy?: string;
  confidence?: number;
  tags?: string[];
  dependsOn?: number[];
  assumptions?: string[];
  evidence?: string[];
}

export interface StoredThought extends ThoughtData {
  timestamp: string;
  sessionId: string;
}

// ============================================================================
// Tool Response Types
// ============================================================================

export interface ThinkResponse {
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  branches: string[];
  thoughtHistoryLength: number;
  activeStrategy: string | null;
  feedback: string[];
}

export interface ReflectionResult {
  summary: string;
  patterns: DetectedPattern[];
  suggestions: string[];
  practiceViolations: PracticeViolation[];
  progress: ProgressSummary;
}

export interface DetectedPattern {
  type: 'circular' | 'contradiction' | 'anchoring' | 'scope-creep' | 'diminishing';
  description: string;
  involvedThoughts: number[];
  severity: 'info' | 'warning' | 'critical';
}

export interface PracticeViolation {
  rule: string;
  thoughtNumber: number;
  explanation: string;
}

export interface ProgressSummary {
  totalThoughts: number;
  uniqueTopics: number;
  branchesExplored: number;
  averageConfidence: number | null;
  confidenceTrend: 'rising' | 'falling' | 'stable' | 'unknown';
  estimatedCompletion: number;
}

// ============================================================================
// Branch Types
// ============================================================================

export interface BranchInfo {
  id: string;
  fromThought: number;
  thoughtCount: number;
  summary: string;
}

export interface BranchComparison {
  branchA: string;
  branchB: string;
  agreements: string[];
  disagreements: string[];
  uniqueToA: string[];
  uniqueToB: string[];
}

export interface MergeResult {
  mergedFrom: string[];
  conclusion: string;
  winningBranch: string | null;
  rationale: string;
  mergedThoughtNumber: number;
}

// ============================================================================
// Checkpoint Types
// ============================================================================

export interface CheckpointData {
  name: string;
  timestamp: string;
  sessionId: string;
  thoughtHistory: StoredThought[];
  branches: Record<string, StoredThought[]>;
  activeStrategy: string | null;
  metadata: Record<string, unknown>;
  projectPath?: string;
}

export interface CheckpointInfo {
  name: string;
  timestamp: string;
  thoughtCount: number;
  branchCount: number;
  strategy: string | null;
  projectPath?: string;
}

// ============================================================================
// Strategy Types
// ============================================================================

export interface Strategy {
  name: string;
  description: string;
  steps: string[];
  guidingQuestions: string[];
  reflectChecks: string[];
  whenToUse: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface DeepThinkConfig {
  project: ProjectConfig;
  thinking: ThinkingConfig;
  practices: PracticesConfig;
  strategies: StrategiesConfig;
  reflection: ReflectionConfig;
  persistence: PersistenceConfig;
}

export interface ProjectConfig {
  name: string;
  type: string;
  language: string;
  description: string;
}

export interface ThinkingConfig {
  defaultStrategy: string | null;
  maxThoughts: number;
  autoCheckpointEvery: number;
  confidenceThreshold: number;
}

export interface PracticesConfig {
  rules: string[];
  antiPatterns: string[];
  reviewChecklist: string[];
}

export interface StrategiesConfig {
  custom: CustomStrategy[];
}

export interface CustomStrategy {
  name: string;
  description: string;
  steps: string[];
  checkpoints: string[];
}

export interface ReflectionConfig {
  alwaysCheck: string[];
  circularThreshold: number;
  contradictionSensitivity: 'low' | 'medium' | 'high';
}

export interface PersistenceConfig {
  directory: string;
  maxCheckpoints: number;
  autoSave: boolean;
}

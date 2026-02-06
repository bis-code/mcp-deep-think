import type { StoredThought, DeepThinkConfig, ReflectionResult, DetectedPattern, PracticeViolation, ProgressSummary } from "../types.js";

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "dare", "ought",
  "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
  "as", "into", "through", "during", "before", "after", "above", "below",
  "between", "out", "off", "over", "under", "again", "further", "then",
  "once", "here", "there", "when", "where", "why", "how", "all", "each",
  "every", "both", "few", "more", "most", "other", "some", "such", "no",
  "nor", "not", "only", "own", "same", "so", "than", "too", "very",
  "just", "because", "but", "and", "or", "if", "while", "this", "that",
  "these", "those", "it", "its", "i", "we", "you", "they", "he", "she",
  "what", "which", "who", "whom", "think", "thought", "about",
]);

export function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

export function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export class Analyzer {
  private config: DeepThinkConfig;

  constructor(config: DeepThinkConfig) {
    this.config = config;
  }

  analyze(
    history: StoredThought[],
    branches: Record<string, StoredThought[]>,
    activeStrategy: string | null,
    focus: "all" | "progress" | "contradictions" | "gaps" | "patterns"
  ): ReflectionResult {
    const patterns: DetectedPattern[] = [];
    const suggestions: string[] = [];
    const violations: PracticeViolation[] = [];

    if (focus === "all" || focus === "patterns") {
      patterns.push(...this.detectCircular(history));
    }

    if (focus === "all" || focus === "contradictions") {
      patterns.push(...this.detectContradictions(history));
    }

    if (focus === "all" || focus === "gaps") {
      suggestions.push(...this.detectGaps(history, activeStrategy));
    }

    if (focus === "all") {
      violations.push(...this.checkPractices(history));
    }

    const progress = this.summarizeProgress(history, branches);
    const summary = this.buildSummary(history, patterns, progress);

    if (patterns.length === 0 && focus !== "progress") {
      suggestions.push("No issues detected. Reasoning chain looks consistent so far.");
    }

    return { summary, patterns, suggestions, practiceViolations: violations, progress };
  }

  private detectCircular(history: StoredThought[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const threshold = this.config.reflection.circularThreshold;
    const tokenSets = history.map(t => tokenize(t.thought));

    for (let i = 0; i < history.length; i++) {
      for (let j = i + 2; j < history.length; j++) {
        const sim = jaccardSimilarity(tokenSets[i]!, tokenSets[j]!);
        if (sim > threshold) {
          patterns.push({
            type: "circular",
            description: `Thoughts ${history[i]!.thoughtNumber} and ${history[j]!.thoughtNumber} share ${Math.round(sim * 100)}% similarity — possible circular reasoning`,
            involvedThoughts: [history[i]!.thoughtNumber, history[j]!.thoughtNumber],
            severity: sim > 0.8 ? "critical" : "warning",
          });
        }
      }
    }

    return patterns;
  }

  private detectContradictions(history: StoredThought[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const negationPairs = [
      ["should", "should not"], ["must", "must not"], ["can", "cannot"],
      ["will", "will not"], ["is", "is not"], ["are", "are not"],
      ["recommend", "avoid"], ["yes", "no"], ["true", "false"],
      ["good", "bad"], ["increase", "decrease"], ["add", "remove"],
    ];

    for (let i = 0; i < history.length; i++) {
      const textI = history[i]!.thought.toLowerCase();
      for (let j = i + 1; j < history.length; j++) {
        const textJ = history[j]!.thought.toLowerCase();

        for (const [pos, neg] of negationPairs) {
          if ((textI.includes(pos!) && textJ.includes(neg!)) ||
              (textI.includes(neg!) && textJ.includes(pos!))) {
            const tokensI = tokenize(history[i]!.thought);
            const tokensJ = tokenize(history[j]!.thought);
            const sim = jaccardSimilarity(tokensI, tokensJ);

            // Only flag if the thoughts are about the same topic (some word overlap)
            if (sim > 0.2) {
              patterns.push({
                type: "contradiction",
                description: `Thoughts ${history[i]!.thoughtNumber} and ${history[j]!.thoughtNumber} may contradict on "${pos}/${neg}"`,
                involvedThoughts: [history[i]!.thoughtNumber, history[j]!.thoughtNumber],
                severity: "warning",
              });
              break;
            }
          }
        }
      }
    }

    return patterns;
  }

  private detectGaps(history: StoredThought[], activeStrategy: string | null): string[] {
    const gaps: string[] = [];

    // Check if assumptions are being tracked
    const hasAssumptions = history.some(t => t.assumptions && t.assumptions.length > 0);
    if (!hasAssumptions && history.length >= 3) {
      gaps.push("No assumptions have been made explicit. Consider documenting key assumptions.");
    }

    // Check if evidence is being tracked
    const hasEvidence = history.some(t => t.evidence && t.evidence.length > 0);
    if (!hasEvidence && history.length >= 5) {
      gaps.push("No evidence has been cited. Consider linking conclusions to supporting data.");
    }

    // Check confidence coverage
    const withConfidence = history.filter(t => t.confidence !== undefined);
    if (withConfidence.length < history.length * 0.5 && history.length >= 3) {
      gaps.push("Less than half of thoughts have confidence scores. Tracking confidence improves analysis.");
    }

    // Check branch exploration
    if (history.length >= 8 && Object.keys(history.filter(t => t.branchId)).length === 0) {
      gaps.push("No alternative approaches explored. Consider branching to evaluate alternatives.");
    }

    return gaps;
  }

  private checkPractices(history: StoredThought[]): PracticeViolation[] {
    const violations: PracticeViolation[] = [];
    const { rules, antiPatterns } = this.config.practices;

    for (const thought of history) {
      const textLower = thought.thought.toLowerCase();

      for (const antiPattern of antiPatterns) {
        const keywords = tokenize(antiPattern);
        const thoughtTokens = tokenize(thought.thought);
        const sim = jaccardSimilarity(keywords, thoughtTokens);

        if (sim > 0.3) {
          violations.push({
            rule: antiPattern,
            thoughtNumber: thought.thoughtNumber,
            explanation: `Thought ${thought.thoughtNumber} may involve an anti-pattern: "${antiPattern}"`,
          });
        }
      }
    }

    return violations;
  }

  private summarizeProgress(history: StoredThought[], branches: Record<string, StoredThought[]>): ProgressSummary {
    const confidences = history
      .map(t => t.confidence)
      .filter((c): c is number => c !== undefined);

    const avgConfidence = confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : null;

    let confidenceTrend: "rising" | "falling" | "stable" | "unknown" = "unknown";
    if (confidences.length >= 3) {
      const firstHalf = confidences.slice(0, Math.floor(confidences.length / 2));
      const secondHalf = confidences.slice(Math.floor(confidences.length / 2));
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      if (avgSecond - avgFirst > 0.1) confidenceTrend = "rising";
      else if (avgFirst - avgSecond > 0.1) confidenceTrend = "falling";
      else confidenceTrend = "stable";
    }

    const allTags = history.flatMap(t => t.tags ?? []);
    const uniqueTopics = new Set(allTags).size;

    const lastThought = history[history.length - 1];
    const estimatedCompletion = lastThought
      ? Math.min(100, Math.round((lastThought.thoughtNumber / lastThought.totalThoughts) * 100))
      : 0;

    return {
      totalThoughts: history.length,
      uniqueTopics,
      branchesExplored: Object.keys(branches).length,
      averageConfidence: avgConfidence,
      confidenceTrend,
      estimatedCompletion,
    };
  }

  private buildSummary(history: StoredThought[], patterns: DetectedPattern[], progress: ProgressSummary): string {
    const parts: string[] = [];
    parts.push(`${progress.totalThoughts} thoughts recorded, ~${progress.estimatedCompletion}% complete.`);

    if (progress.branchesExplored > 0) {
      parts.push(`${progress.branchesExplored} branch(es) explored.`);
    }

    if (progress.averageConfidence !== null) {
      parts.push(`Average confidence: ${Math.round(progress.averageConfidence * 100)}% (${progress.confidenceTrend}).`);
    }

    const critical = patterns.filter(p => p.severity === "critical");
    if (critical.length > 0) {
      parts.push(`${critical.length} critical issue(s) detected.`);
    }

    return parts.join(" ");
  }
}

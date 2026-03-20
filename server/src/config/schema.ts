import type { DeepThinkConfig } from "../types.js";

export const DEFAULT_CONFIG: DeepThinkConfig = {
  project: {
    name: "",
    type: "",
    language: "",
    description: "",
  },
  thinking: {
    defaultStrategy: null,
    maxThoughts: 50,
    autoCheckpointEvery: 10,
    confidenceThreshold: 0.7,
  },
  practices: {
    rules: [],
    antiPatterns: [],
    reviewChecklist: [],
  },
  strategies: {
    custom: [],
  },
  reflection: {
    alwaysCheck: ["practices.rules", "practices.antiPatterns"],
    circularThreshold: 0.6,
    contradictionSensitivity: "medium",
  },
  persistence: {
    directory: ".deep-think/sessions",
    maxCheckpoints: 10,
    autoSave: true,
  },
};

# Deep Think Plugin Conversion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert mcp-deep-think from a standalone MCP server into a self-contained Claude Code plugin with auto-checkpointing, commands, skills, hooks, and rules.

**Architecture:** Plugin-first structure with MCP server in `server/` subdirectory. Plugin components (commands, skills, hooks, rules) at root level. Server enhancements: `autoCheckpointEvery` wired up, `projectPath` added to checkpoints.

**Tech Stack:** TypeScript, MCP SDK, Zod, Vitest, Claude Code plugin system

**Spec:** `docs/superpowers/specs/2026-03-20-deep-think-plugin-design.md`

---

## File Structure

### Files to move (Task 1)
- `src/` → `server/src/`
- `package.json` → `server/package.json`
- `tsconfig.json` → `server/tsconfig.json`
- `vitest.config.ts` → `server/vitest.config.ts`

### Files to create
- `.claude-plugin/plugin.json` — Plugin manifest
- `.mcp.json` — MCP server registration
- `hooks/hooks.json` — PreCompact auto-checkpoint hook
- `rules/deep-think-workflow.md` — Workflow guidance rules
- `commands/start.md` — `/deep-think:start` command
- `commands/checkpoints.md` — `/deep-think:checkpoints` command
- `commands/constraints.md` — `/deep-think:constraints` command
- `commands/practices.md` — `/deep-think:practices` command
- `skills/restore-checkpoint/SKILL.md` — Auto-restore skill
- `skills/manage-constraints/SKILL.md` — Auto-constraint management skill
- `skills/manage-practices/SKILL.md` — Auto-practice management skill
- `README.md` — Rewritten (shorter, clearer)
- Root `package.json` — Plugin metadata only
- `.deep-think.json` — Default config reference file (documentation/example)

### Files to modify
- `server/src/types.ts` — Add `projectPath` to `CheckpointData` and `CheckpointInfo`
- `server/src/index.ts` — Instantiate `FileStore` at top level, pass to tools
- `server/src/tools/think.ts` — Accept `FileStore`, implement `autoCheckpointEvery`
- `server/src/tools/checkpoint.ts` — Accept shared `FileStore`, add `projectPath` to save/list
- `server/package.json` — Move `zod` to `dependencies`, update paths
- `server/tsconfig.json` — Update `rootDir`/`outDir` paths

---

## Task 1: Restructure into plugin layout

Move existing source into `server/` subdirectory and create plugin skeleton directories.

**Files:**
- Move: `src/` → `server/src/`
- Move: `package.json` → `server/package.json`
- Move: `tsconfig.json` → `server/tsconfig.json`
- Move: `vitest.config.ts` → `server/vitest.config.ts`
- Create: `.claude-plugin/plugin.json`
- Create: `.mcp.json`

- [ ] **Step 1: Create the server directory and move source files**

```bash
mkdir -p server
git mv src server/src
git mv package.json server/package.json
git mv tsconfig.json server/tsconfig.json
git mv vitest.config.ts server/vitest.config.ts
```

- [ ] **Step 2: Update `server/package.json`**

Changes needed:
- Move `zod` from `devDependencies` and `peerDependencies` to `dependencies`
- Remove `peerDependencies` section
- Update `bin` to `"dist/index.js"`
- Keep `main` as `"dist/index.js"`
- Keep `types` as `"dist/index.d.ts"`

```json
{
  "name": "mcp-deep-think",
  "version": "1.0.0",
  "description": "MCP server for structured reasoning — persistent, analytical, strategy-driven thinking",
  "license": "MIT",
  "author": "Ioan-Sorin Baicoianu <baicoianuioansorin@gmail.com>",
  "type": "module",
  "bin": {
    "mcp-deep-think": "dist/index.js"
  },
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc && chmod +x dist/index.js",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.26.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@vitest/coverage-v8": "^2.1.8",
    "typescript": "^5.3.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 3: Create root `package.json`**

The root needs a minimal `package.json` for the plugin (no dependencies, no scripts):

```json
{
  "name": "deep-think",
  "version": "1.0.0",
  "description": "Claude Code plugin for structured reasoning with auto-checkpointing, branching, and reflection",
  "license": "MIT",
  "author": "Ioan-Sorin Baicoianu <baicoianuioansorin@gmail.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/bis-code/mcp-deep-think.git"
  },
  "private": true
}
```

- [ ] **Step 4: Verify `server/tsconfig.json`**

Paths (`rootDir: ./src`, `outDir: ./dist`) stay the same since `src/` is still relative to the `server/` directory. No changes needed — the file should remain exactly as it was:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.test.ts", "**/__tests__/**", "dist"]
}
```

Do NOT change `module`/`moduleResolution` from `Node16` to `NodeNext` — this is a behavior change outside scope. Do NOT drop `forceConsistentCasingInFileNames` or `resolveJsonModule`.

- [ ] **Step 5: Create `.claude-plugin/plugin.json`**

```bash
mkdir -p .claude-plugin
```

```json
{
  "name": "deep-think",
  "version": "1.0.0",
  "description": "Structured reasoning with auto-checkpointing, branching, and reflection",
  "author": {
    "name": "Ioan-Sorin Baicoianu",
    "email": "baicoianuioansorin@gmail.com"
  },
  "repository": "https://github.com/bis-code/mcp-deep-think",
  "license": "MIT",
  "keywords": ["reasoning", "thinking", "structured", "checkpoint", "reflection"],
  "mcpServers": "./.mcp.json"
}
```

- [ ] **Step 6: Create `.mcp.json`**

```json
{
  "mcpServers": {
    "deep-think": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/server/dist/index.js"]
    }
  }
}
```

- [ ] **Step 7: Create plugin skeleton directories**

```bash
mkdir -p commands skills/restore-checkpoint skills/manage-constraints skills/manage-practices hooks rules
```

- [ ] **Step 8: Update `.gitignore`**

Update paths to reflect new structure. The `dist/` ignore should now be `server/dist/`. Also add `node_modules` under `server/`.

- [ ] **Step 9: Install dependencies and verify build**

```bash
cd server && npm install && npm run build
```

Expected: builds successfully to `server/dist/`.

- [ ] **Step 10: Run existing tests**

```bash
cd server && npm test
```

Expected: all existing tests pass (no behavior changed, only file locations).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor: restructure into Claude Code plugin layout

Move MCP server source to server/ subdirectory.
Create plugin manifest, MCP registration, and skeleton directories.
Move zod to dependencies (used at runtime in tool schemas).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Server enhancements — `projectPath` and `autoCheckpointEvery`

Add `projectPath` to checkpoint types and wire up auto-checkpointing every N thoughts.

**Files:**
- Modify: `server/src/types.ts`
- Modify: `server/src/index.ts`
- Modify: `server/src/tools/think.ts`
- Modify: `server/src/tools/checkpoint.ts`

- [ ] **Step 1: Write test for `projectPath` on checkpoint save/load**

Add to existing test file or create `server/src/__tests__/checkpoint-project-path.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { FileStore } from "../persistence/file-store.js";
import type { CheckpointData } from "../types.js";

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
      // no projectPath field
    };

    await store.save("old-cp", oldCheckpoint as CheckpointData);
    const loaded = await store.load("old-cp");

    expect(loaded).not.toBeNull();
    expect(loaded!.projectPath).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npx vitest run src/__tests__/checkpoint-project-path.test.ts
```

Expected: FAIL — `projectPath` doesn't exist on `CheckpointData` type.

- [ ] **Step 3: Add `projectPath` to types**

In `server/src/types.ts`, add `projectPath` to `CheckpointData` and `CheckpointInfo`:

```typescript
// In CheckpointData interface, add:
projectPath?: string;

// In CheckpointInfo interface, add:
projectPath?: string;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd server && npx vitest run src/__tests__/checkpoint-project-path.test.ts
```

Expected: PASS.

- [ ] **Step 5: Update `checkpoint.ts` — add `projectPath` to save and list**

In `server/src/tools/checkpoint.ts`:

In the `save` case, add `projectPath: process.cwd()` to the checkpoint data:

```typescript
const checkpoint: CheckpointData = {
  name,
  timestamp: new Date().toISOString(),
  sessionId: store.getSessionId(),
  thoughtHistory: state.thoughtHistory,
  branches: state.branches,
  activeStrategy: state.activeStrategy,
  metadata: {},
  projectPath: process.cwd(),
};
```

In the `list` case, add `projectPath` to the `CheckpointInfo` mapping:

```typescript
const infos: CheckpointInfo[] = checkpoints.map(cp => ({
  name: cp.name,
  timestamp: cp.timestamp,
  thoughtCount: cp.thoughtHistory.length,
  branchCount: Object.keys(cp.branches).length,
  strategy: cp.activeStrategy,
  projectPath: cp.projectPath,
}));
```

- [ ] **Step 6: Write test for `autoCheckpointEvery`**

Create `server/src/__tests__/auto-checkpoint.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, readdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { FileStore } from "../persistence/file-store.js";
import { ThoughtStore } from "../engine/thought-store.js";
import { DEFAULT_CONFIG } from "../config/schema.js";
import type { DeepThinkConfig } from "../types.js";

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

    // Simulate the auto-checkpoint logic that will be in think.ts:
    // Add 3 thoughts and check that save is called on the 3rd
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

    // Verify the checkpoint was written to disk
    const files = readdirSync(dir).filter(f => f.endsWith(".json"));
    expect(files).toHaveLength(1);
  });

  it("does not save checkpoint before reaching the threshold", async () => {
    const saveSpy = vi.spyOn(fileStore, "save");

    // Add only 2 thoughts (threshold is 3)
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
```

- [ ] **Step 7: Update `think.ts` — accept FileStore and implement auto-checkpoint**

Add `fileStore` parameter to `registerThinkTool` (change signature BEFORE updating `index.ts` call site):

```typescript
import type { FileStore } from "../persistence/file-store.js";
import type { CheckpointData } from "../types.js";

export function registerThinkTool(
  server: McpServer,
  store: ThoughtStore,
  config: DeepThinkConfig,
  fileStore: FileStore
): void {
```

After `store.addThought(args)`, add auto-checkpoint logic:

```typescript
// Auto-checkpoint every N thoughts
const autoEvery = config.thinking.autoCheckpointEvery;
if (autoEvery > 0 && history.length > 0 && history.length % autoEvery === 0) {
  const state = store.serialize();
  const cpName = `auto-${Date.now()}`;
  await fileStore.save(cpName, {
    name: cpName,
    timestamp: new Date().toISOString(),
    sessionId: store.getSessionId(),
    thoughtHistory: state.thoughtHistory,
    branches: state.branches,
    activeStrategy: state.activeStrategy,
    metadata: {},
    projectPath: process.cwd(),
  });
  feedback.push(`Auto-checkpoint saved: ${cpName} (every ${autoEvery} thoughts)`);
}
```

- [ ] **Step 8: Update `checkpoint.ts` — accept shared FileStore**

Change `registerCheckpointTool` to accept `FileStore` as a parameter instead of creating its own (change signature BEFORE updating `index.ts` call site):

```typescript
export function registerCheckpointTool(
  server: McpServer,
  store: ThoughtStore,
  config: DeepThinkConfig,
  fileStore: FileStore
): void {
  // Remove: const fileStore = new FileStore(...)
  // Use the passed-in fileStore directly
```

- [ ] **Step 9: Restructure `index.ts` — shared FileStore**

Now that both tool signatures accept `FileStore`, update `server/src/index.ts`:

```typescript
import { FileStore } from "./persistence/file-store.js";

const config = loadConfig();
const store = new ThoughtStore(config);
const fileStore = new FileStore(config.persistence.directory, config.persistence.maxCheckpoints);

registerThinkTool(server, store, config, fileStore);
registerBranchTool(server, store, config);
registerCheckpointTool(server, store, config, fileStore);
registerReflectTool(server, store, config);
registerStrategizeTool(server, store, config);
```

- [ ] **Step 10: Run all tests**

Change `registerCheckpointTool` to accept `FileStore` as a parameter instead of creating its own:

```typescript
export function registerCheckpointTool(
  server: McpServer,
  store: ThoughtStore,
  config: DeepThinkConfig,
  fileStore: FileStore
): void {
  // Remove: const fileStore = new FileStore(...)
  // Use the passed-in fileStore directly
```

- [ ] **Step 11: Run all tests**

```bash
cd server && npm test
```

Expected: all tests pass.

- [ ] **Step 12: Build and verify**

```bash
cd server && npm run build
```

Expected: compiles without errors.

- [ ] **Step 13: Commit**

```bash
cd server && git add -A && cd ..
git commit -m "feat(server): add projectPath to checkpoints and wire up autoCheckpointEvery

- Add projectPath field to CheckpointData and CheckpointInfo types
- Capture process.cwd() when saving checkpoints
- Instantiate FileStore at top level, share between think and checkpoint tools
- Auto-save checkpoint every N thoughts (configurable via autoCheckpointEvery)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Create hooks and rules

Create the PreCompact auto-checkpoint hook and workflow guidance rules.

**Files:**
- Create: `hooks/hooks.json`
- Create: `rules/deep-think-workflow.md`

- [ ] **Step 1: Create `hooks/hooks.json`**

```json
{
  "PreCompact": [{
    "matcher": "",
    "hooks": [{
      "type": "prompt",
      "prompt": "Before compaction, if you have been using deep-think tools in this session and have recorded thoughts, save the current reasoning state by calling the deep-think checkpoint tool with operation 'save'. Use a descriptive name based on what you were reasoning about."
    }]
  }]
}
```

- [ ] **Step 2: Create `rules/deep-think-workflow.md`**

```markdown
# Deep Think Workflow

## When to Use Deep Think

Use the deep-think reasoning tools for:
- Complex decisions with multiple viable approaches
- Problems where the full scope isn't clear initially
- Multi-module changes that need careful planning
- Analysis that might need course correction
- Architecture or design decisions with trade-offs

Skip deep-think for: simple fixes, documentation, dependency updates, single-file changes with obvious intent.

## Recommended Workflow

1. **Strategize** — Pick a reasoning framework that fits the problem (first-principles, red-team, convergent, divergent, root-cause, decision-matrix)
2. **Think** — Work through the problem step by step, tracking confidence and assumptions
3. **Reflect** — Check your reasoning for circular logic, contradictions, and gaps
4. **Branch** — Explore alternatives when you hit a decision point
5. **Conclude** — Merge branches, document the decision

This workflow is a guide, not a mandate. Adapt it to the problem at hand.

## Checkpointing

- Checkpoints are saved automatically before context compaction
- The server also auto-saves every N thoughts (default: 10, configurable)
- Use `/deep-think:checkpoints` to view, restore, or delete saved reasoning state
- Use `/deep-think:start` to begin a new reasoning session (checks for existing checkpoints first)

## Customization

- `/deep-think:constraints` — Add project-specific rules and anti-patterns
- `/deep-think:practices` — Add review checklist items and custom strategies
- Or edit `.deep-think.json` directly in your project root
```

- [ ] **Step 3: Commit**

```bash
git add hooks/ rules/
git commit -m "feat(plugin): add PreCompact auto-checkpoint hook and workflow rules

- PreCompact prompt-based hook saves reasoning state before compaction
- Workflow rules provide light guidance on when/how to use deep-think

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Create commands

Create the 4 slash commands for the plugin.

**Files:**
- Create: `commands/start.md`
- Create: `commands/checkpoints.md`
- Create: `commands/constraints.md`
- Create: `commands/practices.md`

- [ ] **Step 1: Create `commands/start.md`**

```markdown
---
name: start
description: Launch a deep-think reasoning session from a natural language description
---

The user wants to start a structured reasoning session. They may have provided
a topic or question as an argument.

1. Call the deep-think checkpoint tool with operation "list" to check for
   existing checkpoints. If any are related to the topic, offer to resume.
2. Based on the topic, suggest an appropriate strategy from the available ones
   (call strategize with operation "list" to see options, then "set" to activate).
3. Begin the first thought in the chain using the think tool.

If no topic was provided, ask the user what they want to reason about.
```

- [ ] **Step 2: Create `commands/checkpoints.md`**

```markdown
---
name: checkpoints
description: View, restore, or delete saved deep-think reasoning checkpoints
---

Show the user their saved reasoning checkpoints.

1. Call the deep-think checkpoint tool with operation "list".
2. Display each checkpoint with: name, timestamp, project path (or "(unknown)"
   if not available), thought count, branch count, and active strategy.
3. Ask the user what they'd like to do — restore one, delete one, or just browse.
4. For restore: call checkpoint with operation "load" and the chosen name.
5. For delete: call checkpoint with operation "delete" and the chosen name.
```

- [ ] **Step 3: Create `commands/constraints.md`**

```markdown
---
name: constraints
description: Manage reasoning rules and anti-patterns in .deep-think.json
---

Help the user manage their deep-think constraints conversationally.
Constraints map to two fields in .deep-think.json:
- practices.rules — things to always check during reasoning
- practices.antiPatterns — patterns to avoid and flag

1. Read .deep-think.json from the current project directory (create if missing).
2. Ask the user what they want to do: add, remove, or show constraints.
3. For add: ask what the rule or anti-pattern is, add it to the appropriate array.
4. For remove: show current items, let them pick which to remove.
5. For show: display all rules and anti-patterns.
6. Write the updated .deep-think.json back to disk.
```

- [ ] **Step 4: Create `commands/practices.md`**

```markdown
---
name: practices
description: Manage review checklists and custom strategies in .deep-think.json
---

Help the user manage their deep-think practices conversationally.
Practices map to two fields in .deep-think.json:
- practices.reviewChecklist — items to check during reflection
- strategies.custom — custom reasoning strategies with steps and checkpoints

1. Read .deep-think.json from the current project directory (create if missing).
2. Ask the user what they want to do: add/remove/show review items or strategies.
3. For review items: manage the practices.reviewChecklist array.
4. For strategies: manage strategies.custom array. Each strategy needs:
   name, description, steps (array), and checkpoints (array).
5. Write the updated .deep-think.json back to disk.
```

- [ ] **Step 5: Commit**

```bash
git add commands/
git commit -m "feat(plugin): add slash commands (start, checkpoints, constraints, practices)

- /deep-think:start — launch reasoning from natural language
- /deep-think:checkpoints — view, restore, delete checkpoints
- /deep-think:constraints — manage rules and anti-patterns
- /deep-think:practices — manage review checklists and strategies

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Create skills

Create the 3 auto-triggering skills.

**Files:**
- Create: `skills/restore-checkpoint/SKILL.md`
- Create: `skills/manage-constraints/SKILL.md`
- Create: `skills/manage-practices/SKILL.md`

- [ ] **Step 1: Create `skills/restore-checkpoint/SKILL.md`**

```markdown
---
name: restore-checkpoint
description: Use when starting a new session and the user seems to be continuing previous reasoning work, mentions resuming a thought chain, or asks to restore a deep-think checkpoint. Also triggers when a user mentions picking up where they left off on a complex decision or analysis.
---

# Restore Deep Think Checkpoint

The user may be continuing reasoning work from a previous session.

## Steps

1. Call the deep-think checkpoint tool with operation "list" to see available checkpoints.
2. If checkpoints exist, present them to the user with name, timestamp, project path, thought count, and strategy.
3. Ask if they'd like to restore one to continue their reasoning.
4. If yes, call checkpoint with operation "load" and the chosen name.
5. After restoring, call reflect with focus "progress" to show where they left off.
6. Suggest next steps based on the restored state.

## If No Checkpoints

If no checkpoints are found, let the user know and suggest starting fresh with `/deep-think:start`.

## Fallback

If this skill doesn't trigger automatically, users can always run `/deep-think:checkpoints` to manually access the same functionality.
```

- [ ] **Step 2: Create `skills/manage-constraints/SKILL.md`**

```markdown
---
name: manage-constraints
description: Use when the user conversationally asks to add reasoning rules, constraints, or anti-patterns to their deep-think configuration. Triggers on phrases like "remember to always check X", "add a rule about Y", "from now on check Z during reasoning", "never do X when thinking through problems".
---

# Manage Deep Think Constraints

The user wants to add, remove, or view constraints that guide deep-think reasoning.

Constraints map to `.deep-think.json` in the current project directory:
- `practices.rules` — things to always check during reasoning
- `practices.antiPatterns` — patterns to avoid and flag during reflection

## Steps

1. Read `.deep-think.json` from the current project directory.
   - If the file doesn't exist, start with an empty config.
2. Determine what the user wants: add a rule, add an anti-pattern, remove something, or view current constraints.
3. Make the change to the appropriate array.
4. Write the updated `.deep-think.json` back to disk.
5. Confirm what was added/removed/shown.

## Deciding: Rule vs Anti-Pattern

- **Rule**: Something to always check or consider (e.g., "always verify security implications")
- **Anti-pattern**: Something to avoid and flag if detected (e.g., "premature optimization")

If unclear, ask the user which category fits better.
```

- [ ] **Step 3: Create `skills/manage-practices/SKILL.md`**

```markdown
---
name: manage-practices
description: Use when the user conversationally asks to add review checklist items, custom reasoning strategies, or modify their deep-think review process. Triggers on phrases like "add a review step for...", "create a strategy for...", "I want to always check for... during review", "add a custom thinking framework".
---

# Manage Deep Think Practices

The user wants to add, remove, or view review practices and custom strategies.

Practices map to `.deep-think.json` in the current project directory:
- `practices.reviewChecklist` — items checked during reflection
- `strategies.custom` — custom reasoning strategies with steps and checkpoints

## Steps

1. Read `.deep-think.json` from the current project directory.
   - If the file doesn't exist, start with an empty config.
2. Determine what the user wants: add a review item, add a strategy, remove something, or view current practices.
3. For review items: add/remove from the `practices.reviewChecklist` array.
4. For strategies: each custom strategy needs:
   - `name` — short identifier (kebab-case)
   - `description` — when to use this strategy
   - `steps` — ordered list of reasoning steps
   - `checkpoints` — things to verify at each stage
5. Write the updated `.deep-think.json` back to disk.
6. Confirm what was added/removed/shown.
```

- [ ] **Step 4: Commit**

```bash
git add skills/
git commit -m "feat(plugin): add skills (restore-checkpoint, manage-constraints, manage-practices)

- restore-checkpoint: auto-triggers on session resume, offers to load saved state
- manage-constraints: auto-triggers on conversational rule additions
- manage-practices: auto-triggers on review checklist/strategy additions

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Rewrite README

Replace the existing README with a shorter, clearer version focused on plugin usage.

**Files:**
- Rewrite: `README.md`

- [ ] **Step 1: Read current README**

```bash
cat README.md
```

Understand what's there so nothing important is lost.

- [ ] **Step 2: Write new README**

```markdown
# Deep Think

A Claude Code plugin for structured reasoning. Think through complex problems with strategies, branching, reflection, and persistent checkpoints.

## Install

```bash
claude plugin add deep-think
```

## How It Works

Deep Think provides 5 MCP tools that work together:

```
strategize → think → reflect → branch → checkpoint
     |          |        |         |          |
  Pick a    Record    Check     Explore    Save/restore
  reasoning  steps    for       alternate  reasoning
  framework          issues    paths      state
```

**Start a session** with `/deep-think:start` and describe what you're reasoning about. The plugin suggests a strategy and begins the thought chain.

**Auto-checkpointing** saves your reasoning before context compaction and every 10 thoughts (configurable). Resume anytime with `/deep-think:checkpoints`.

## Commands

| Command | What it does |
|---------|-------------|
| `/deep-think:start` | Launch a reasoning session from a description |
| `/deep-think:checkpoints` | View, restore, or delete saved checkpoints |
| `/deep-think:constraints` | Manage reasoning rules and anti-patterns |
| `/deep-think:practices` | Manage review checklists and custom strategies |

## Configuration

Create `.deep-think.json` in your project root to customize:

```json
{
  "thinking": {
    "defaultStrategy": "first-principles",
    "maxThoughts": 50,
    "autoCheckpointEvery": 10
  },
  "practices": {
    "rules": ["Always consider security implications"],
    "antiPatterns": ["Premature optimization"],
    "reviewChecklist": ["Check for edge cases"]
  },
  "strategies": {
    "custom": [{
      "name": "incident-response",
      "description": "Structured incident investigation",
      "steps": ["Identify symptoms", "Gather evidence", "Form hypothesis", "Verify"],
      "checkpoints": ["Evidence collected?", "Root cause confirmed?"]
    }]
  }
}
```

Or use commands to manage configuration conversationally:
- `/deep-think:constraints` — add rules like "always verify auth boundaries"
- `/deep-think:practices` — add review steps or custom strategies

## Built-in Strategies

| Strategy | Use when... |
|----------|------------|
| `first-principles` | Conventional wisdom may be misleading |
| `red-team` | Validating important decisions |
| `convergent` | Choosing between multiple options |
| `divergent` | Brainstorming or stuck on a problem |
| `root-cause` | Debugging or investigating failures |
| `decision-matrix` | High-stakes decisions with multiple factors |

## License

MIT
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for plugin usage

Shorter, clearer documentation focused on getting users productive fast.
Covers install, commands, configuration, and built-in strategies.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Final verification and cleanup

Verify the complete plugin works end-to-end.

**Files:**
- Verify: all plugin files
- Clean up: any leftover files from the migration

- [ ] **Step 1: Verify directory structure matches spec**

```bash
find . -not -path './node_modules/*' -not -path './.git/*' -not -path './server/node_modules/*' -not -path './server/dist/*' | sort
```

Expected structure should match the spec's directory layout.

- [ ] **Step 2: Verify server builds**

```bash
cd server && npm run build
```

Expected: clean build with no errors.

- [ ] **Step 3: Run all server tests**

```bash
cd server && npm test
```

Expected: all tests pass.

- [ ] **Step 4: Verify plugin manifest is valid JSON**

```bash
cat .claude-plugin/plugin.json | python3 -m json.tool
cat .mcp.json | python3 -m json.tool
cat hooks/hooks.json | python3 -m json.tool
```

Expected: all valid JSON, no parse errors.

- [ ] **Step 5: Verify all command files have valid frontmatter**

```bash
head -5 commands/*.md
```

Expected: each file starts with `---` frontmatter containing `name` and `description`.

- [ ] **Step 6: Verify all skill files have valid frontmatter**

```bash
head -5 skills/*/SKILL.md
```

Expected: each file starts with `---` frontmatter containing `name` and `description`.

- [ ] **Step 7: Clean up any leftover files**

Check for and clean up:
- Old `src/` directory at root (should be gone, moved to `server/src/`)
- Old `dist/` at root (should be gone)
- `schema.json` at root — move to `server/schema.json` and update `server/package.json` `files` array to include it, or remove if not needed
- Any `.deep-think/sessions/` test artifacts

- [ ] **Step 8: Create `.deep-think.json` reference file**

Create a default `.deep-think.json` at the plugin root as a reference/documentation example:

```json
{
  "thinking": {
    "defaultStrategy": null,
    "maxThoughts": 50,
    "autoCheckpointEvery": 10,
    "confidenceThreshold": 0.7
  },
  "practices": {
    "rules": [],
    "antiPatterns": [],
    "reviewChecklist": []
  },
  "strategies": {
    "custom": []
  },
  "reflection": {
    "circularThreshold": 0.6,
    "contradictionSensitivity": "medium"
  },
  "persistence": {
    "directory": ".deep-think/sessions",
    "maxCheckpoints": 10
  }
}
```

This file documents the available configuration options. Users copy it to their project and customize.

- [ ] **Step 9: Update `.gitignore` if needed**

Ensure `server/dist/`, `server/node_modules/`, and `.deep-think/` are ignored.

- [ ] **Step 10: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: final cleanup after plugin conversion

Co-Authored-By: Claude <noreply@anthropic.com>"
```

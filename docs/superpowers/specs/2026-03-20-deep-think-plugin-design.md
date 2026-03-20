# Deep Think — Claude Code Plugin Design

## Summary

Convert `mcp-deep-think` from a standalone MCP server into a self-contained Claude Code plugin. The plugin ships structured reasoning tools (think, strategize, reflect, branch, checkpoint) with auto-checkpointing, workflow guidance, and conversational management of constraints and practices. Install it, and it just works. Extend it via `.deep-think.json` for project-specific customization.

**Target users:** General Claude Code users who want better reasoning out of the box, and power users who want a structured reasoning building block they can extend.

## Architecture

### Directory Structure

```
mcp-deep-think/
├── .claude-plugin/
│   └── plugin.json
├── server/                    # MCP server (moved from src/)
│   ├── src/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── engine/
│   │   │   ├── thought-store.ts
│   │   │   ├── analyzer.ts
│   │   │   └── strategies.ts
│   │   ├── tools/
│   │   │   ├── think.ts
│   │   │   ├── strategize.ts
│   │   │   ├── reflect.ts
│   │   │   ├── branch.ts
│   │   │   └── checkpoint.ts
│   │   ├── config/
│   │   │   ├── loader.ts
│   │   │   └── schema.ts
│   │   └── persistence/
│   │       ├── types.ts
│   │       └── file-store.ts
│   ├── package.json
│   └── tsconfig.json
├── commands/
│   ├── start.md
│   ├── checkpoints.md
│   ├── constraints.md
│   └── practices.md
├── skills/
│   ├── restore-checkpoint/
│   │   └── SKILL.md
│   ├── manage-constraints/
│   │   └── SKILL.md
│   └── manage-practices/
│       └── SKILL.md
├── hooks/
│   └── hooks.json
├── rules/
│   └── deep-think-workflow.md
├── .mcp.json
├── README.md
└── .deep-think.json           # Default config (reference/documentation)
```

### Migration from Current Layout

The current source lives in `src/`. Migration steps:

1. Create `server/` directory
2. Move `src/` → `server/src/`
3. Move `package.json` → `server/package.json` (server dependencies only)
4. Move `tsconfig.json` → `server/tsconfig.json` (update paths)
5. Create new root `package.json` (plugin metadata, no dependencies)
6. Move `vitest.config.ts` → `server/vitest.config.ts`
7. Update `server/package.json`: `"bin"` → `"dist/index.js"`, `"main"` → `"dist/index.js"`
8. Move `zod` from `devDependencies`/`peerDependencies` to `dependencies` in `server/package.json` (it's used at runtime in tool schemas)
9. Create `.claude-plugin/`, `commands/`, `skills/`, `hooks/`, `rules/` directories

### Plugin Manifest

`.claude-plugin/plugin.json`:

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

The MCP server is registered via `.mcp.json` at the plugin root, referenced from the manifest.

### MCP Server Registration

`.mcp.json`:

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

## MCP Server

### Tools (unchanged)

The existing 5 MCP tools stay as they are:

1. **think** — Record reasoning steps with confidence, tags, assumptions, evidence
2. **strategize** — Switch between reasoning strategies (first-principles, red-team, convergent, divergent, root-cause, decision-matrix) + custom strategies
3. **reflect** — Analyze thought chains for circular reasoning, contradictions, gaps, practice violations
4. **branch** — Explore alternative reasoning paths, compare, merge
5. **checkpoint** — Save/restore reasoning state to disk

### Server Enhancements

**1. Wire up `autoCheckpointEvery`**

The `thinking.autoCheckpointEvery` config field exists but isn't implemented. Add logic to the `think` tool handler: after every N thoughts (where N = `autoCheckpointEvery`), auto-save a checkpoint via the FileStore.

**Structural change required:** `FileStore` is currently instantiated only inside `registerCheckpointTool()`. To share it with the `think` tool, instantiate `FileStore` at the top level in `index.ts` and pass it to both `registerThinkTool()` and `registerCheckpointTool()`.

**2. Add `projectPath` to `CheckpointData`**

Add a `projectPath: string` field to both `CheckpointData` and `CheckpointInfo` types. When saving a checkpoint, capture `process.cwd()`. Update the `list` case in `checkpoint.ts` to project `projectPath` into `CheckpointInfo` so the `/deep-think:checkpoints` command can display it.

**Backwards compatibility:** Old checkpoints saved before this field existed will have `projectPath: undefined`. The `/deep-think:checkpoints` command should display `"(unknown)"` for these.

### Config and Path Resolution

The server reads `.deep-think.json` from `process.cwd()` and falls back to `DEFAULT_CONFIG`.

**Important caveat:** When launched as a plugin MCP server, `process.cwd()` may not be the user's project directory — it depends on how Claude Code launches the process. If this proves to be an issue during implementation, the fallback strategy is:

1. Accept a `--project-dir` CLI argument passed via `.mcp.json` args
2. Or use an environment variable like `DEEP_THINK_PROJECT_DIR`
3. Or default checkpoint storage to `~/.deep-think/sessions/` (absolute path, not relative)

**Note:** The `persistence.directory` default (currently `.deep-think/sessions`, a relative path) is affected by the same `cwd` concern. If `cwd` resolution needs fixing, config loading and persistence directory must be resolved together.

Test during implementation and resolve based on actual behavior.

Users customize per-project by creating `.deep-think.json` in their project root. The commands `/deep-think:constraints` and `/deep-think:practices` help manage this file conversationally.

## Hooks

### `PreCompact` — Auto-checkpoint

`hooks/hooks.json`:

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

Prompt-based hook — no shell scripts, works on any OS. Claude calls the checkpoint MCP tool directly.

## Rules

### `rules/deep-think-workflow.md`

Light, general guidance:

- **When to use deep-think** — Complex decisions with multiple viable approaches. Problems where the full scope isn't clear. Multi-module changes. Analysis that might need course correction. Skip for simple fixes, docs, single-file changes with clear intent.
- **Recommended workflow** — `strategize` (pick a framework) → `think` (iterate through steps) → `reflect` (check for issues) → fill gaps → conclude. Not mandatory.
- **Checkpointing** — PreCompact auto-saves. Users can manually checkpoint anytime. Use `/deep-think:checkpoints` to manage.
- **Extensibility** — Add project-specific rules via `/deep-think:constraints`, review steps via `/deep-think:practices`, or edit `.deep-think.json` directly.

Intentionally not opinionated about specific trigger scenarios. Users add their own triggers via constraints.

## Commands

All commands are markdown files in `commands/` with YAML frontmatter. They instruct Claude on what to do when invoked.

### `/deep-think:start`

`commands/start.md`:

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

### `/deep-think:checkpoints`

`commands/checkpoints.md`:

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

### `/deep-think:constraints`

`commands/constraints.md`:

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

### `/deep-think:practices`

`commands/practices.md`:

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

## Skills

### `restore-checkpoint`

**Triggers:** On new session start when the user seems to be continuing previous reasoning work, or when they explicitly ask to resume or restore a checkpoint.

**Behavior:** Lists available checkpoints for the current project, offers to restore one, loads it into the MCP server so the reasoning chain continues from where it left off.

**Reliability note:** Skill auto-triggering depends on Claude's semantic matching, which is not deterministic. The skill may not fire in every relevant situation. `/deep-think:checkpoints` provides the same restore functionality as an explicit command and serves as the reliable fallback. The README should set expectations that users can always run `/deep-think:checkpoints` to restore manually if the skill doesn't trigger.

### `manage-constraints`

**Triggers:** When the user conversationally says things like "remember to always check X", "add a rule about Y", "from now on check Z during reasoning" — phrases that indicate they want to add a persistent constraint to their deep-think config.

**Behavior:** Reads the project's `.deep-think.json`, adds the constraint to `practices.rules` or `practices.antiPatterns`, confirms what was added. Creates the file if it doesn't exist.

**Naming note:** The user-facing term is "constraints" but the underlying config fields are `practices.rules` and `practices.antiPatterns`. The skill abstracts this mapping.

### `manage-practices`

**Triggers:** When the user conversationally says things like "add a review step for...", "create a strategy for...", "I want to always check for... during review" — phrases that indicate they want to modify review checklists or add custom strategies.

**Behavior:** Reads the project's `.deep-think.json`, adds the review checklist item or custom strategy to `practices.reviewChecklist` or `strategies.custom`, confirms what was added. Creates the file if it doesn't exist.

## README

Rewrite the README to be shorter and clearer:

1. **What it does** — One paragraph, plain language
2. **Install** — Single command
3. **How it works** — Brief explanation of the 5 tools and how they fit together (think → strategize → reflect → branch → checkpoint), simple flow diagram
4. **Commands** — The 4 slash commands with examples
5. **Configuration** — `.deep-think.json` basics, link to schema
6. **Extending** — How to add strategies, practices, constraints

No walls of text. Focused on getting users productive fast.

## Data Flow

```
User installs plugin
    → MCP server starts (5 tools available)
    → Rules loaded (workflow guidance)
    → Hooks registered (PreCompact auto-checkpoint)
    → Commands available (/deep-think:start, :checkpoints, :constraints, :practices)
    → Skills active (restore-checkpoint, manage-constraints, manage-practices)

User starts reasoning:
    /deep-think:start "topic"
    → Checks for existing checkpoints
    → Suggests strategy
    → Begins think chain

During reasoning:
    think → think → think (every N: auto-checkpoint) → reflect → think → ...

Before compaction:
    PreCompact hook fires → Claude calls checkpoint save

New session:
    restore-checkpoint skill triggers → offers to resume
    (or user runs /deep-think:checkpoints explicitly)

Configuration:
    /deep-think:constraints "add rule X" → writes .deep-think.json practices.rules
    /deep-think:practices "add strategy Y" → writes .deep-think.json strategies.custom
    (or skills auto-trigger on conversational equivalents)
```

## What's NOT in Scope

- Agents — not needed, the tools and commands cover the functionality
- Complex hook scripts — prompt-based hooks only, cross-platform
- Opinionated trigger rules — users add their own via constraints
- Pre-implementation checkpoint hook — deferred, PreCompact + autoCheckpointEvery covers the main risk

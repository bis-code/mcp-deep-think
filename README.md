# mcp-deep-think

An MCP server for **active reasoning** — persistent, analytical, strategy-driven thinking that adapts to your codebase.

Built as an enhanced successor to the [Sequential Thinking MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking), `mcp-deep-think` goes beyond passive thought recording to provide cross-thought analysis, branching with merge, persistent checkpoints, configurable reasoning strategies, and per-repo best practices.

## Why?

Sequential Thinking records thoughts but never reads them. It has no persistence, no analysis, no session recovery.

`mcp-deep-think` makes AI reasoning **visible, persistent, and steerable**:

| Feature | Sequential Thinking | mcp-deep-think |
|---------|-------------------|----------------|
| Thought recording | Yes | Yes (enhanced) |
| Persistence | None (in-memory only) | JSON file checkpoints |
| Cross-thought analysis | None | Circular, contradictions, gaps |
| Branch merging | No | Compare + merge with rationale |
| Session recovery | No | Save/load checkpoints |
| Reasoning strategies | No | 6 built-in + custom |
| Per-repo config | No | `.deep-think.json` |
| Active feedback | No | Warns about patterns and issues |

## Quick Start

### Install

```bash
npm install -g mcp-deep-think
```

### Configure in Claude Code

Add to your MCP settings (`~/.claude/settings.json` or project `.claude/settings.json`):

```json
{
  "mcpServers": {
    "deep-think": {
      "command": "mcp-deep-think"
    }
  }
}
```

### Use

The server exposes 5 tools:

```
think        → Record a reasoning step (enhanced sequential thinking)
reflect      → Analyze the thought chain for patterns and issues
branch       → List, compare, and merge reasoning branches
checkpoint   → Save/restore reasoning state across sessions
strategize   → Switch reasoning frameworks
```

## Tools

### `think`

Enhanced drop-in replacement for `sequentialthinking`. Records a thought step with optional metadata.

**Input:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `thought` | string | Yes | Your current thinking step |
| `thoughtNumber` | number | Yes | Current position (1-indexed) |
| `totalThoughts` | number | Yes | Estimated total (adjustable) |
| `nextThoughtNeeded` | boolean | Yes | Continue thinking? |
| `confidence` | number | No | 0-1 confidence in this step |
| `tags` | string[] | No | Semantic labels |
| `assumptions` | string[] | No | Explicit assumptions |
| `evidence` | string[] | No | Supporting evidence |
| `isRevision` | boolean | No | Revises previous thinking? |
| `revisesThought` | number | No | Which thought to revise |
| `branchFromThought` | number | No | Branch point |
| `branchId` | string | No | Branch identifier |
| `strategy` | string | No | Set active strategy |

**Returns:** Thought metadata + active feedback (warnings about chain length, confidence drops, missing tags).

### `reflect`

Analyzes the thought chain. The key differentiator — this tool **reads** thought content.

**Input:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `focus` | enum | `"all"` | `"all"`, `"progress"`, `"contradictions"`, `"gaps"`, `"patterns"` |

**Detects:**
- **Circular reasoning**: Thoughts with >60% word overlap (Jaccard similarity)
- **Contradictions**: Negation patterns on similar topics
- **Gaps**: Missing assumptions, evidence, branches
- **Practice violations**: Checks against `.deep-think.json` rules

### `branch`

Manage alternative reasoning paths.

**Input:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `operation` | enum | Yes | `"list"`, `"compare"`, `"merge"` |
| `branchA` | string | For compare/merge | First branch ID |
| `branchB` | string | For compare/merge | Second branch ID |
| `mergeConclusion` | string | For merge | Your synthesis |
| `winningBranch` | string | No | Which approach won |
| `rationale` | string | No | Why it won |

**Note:** Create branches using the `think` tool with `branchFromThought` and `branchId`.

### `checkpoint`

Save and restore reasoning state.

**Input:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `operation` | enum | Yes | `"save"`, `"load"`, `"list"`, `"delete"` |
| `name` | string | For save/load/delete | Checkpoint name |

Checkpoints are stored as JSON files in the configured directory (default: `.deep-think/sessions/`).

### `strategize`

Switch reasoning frameworks.

**Input:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `operation` | enum | Yes | `"set"`, `"get"`, `"list"` |
| `strategy` | string | For set | Strategy name |

**Built-in strategies:**

| Strategy | When to Use |
|----------|-------------|
| `first-principles` | Decomposing complex problems from ground truth |
| `red-team` | Attacking your own conclusions |
| `convergent` | Narrowing options to a decision |
| `divergent` | Brainstorming without judgment |
| `root-cause` | Debugging and investigation |
| `decision-matrix` | Weighted criteria comparison |

## Per-Repo Configuration

Create a `.deep-think.json` in your repo root to teach the MCP how to reason for your codebase:

```json
{
  "$schema": "https://unpkg.com/mcp-deep-think/schema.json",
  "project": {
    "name": "my-api",
    "type": "backend",
    "language": "typescript"
  },
  "thinking": {
    "defaultStrategy": "first-principles",
    "maxThoughts": 20,
    "autoCheckpointEvery": 5
  },
  "practices": {
    "rules": [
      "Always consider backwards compatibility",
      "Database migrations must be reversible"
    ],
    "antiPatterns": [
      "Never store secrets in config files",
      "Avoid N+1 queries"
    ]
  },
  "strategies": {
    "custom": [
      {
        "name": "api-design",
        "description": "For designing new API endpoints",
        "steps": [
          "Define the resource",
          "Choose HTTP methods",
          "Design request/response schemas",
          "Plan error responses"
        ],
        "checkpoints": ["after schema design"]
      }
    ]
  },
  "persistence": {
    "directory": ".deep-think/sessions",
    "maxCheckpoints": 10
  }
}
```

The config flows through all tools:
- `think`: Applies thought limits, triggers auto-checkpoints
- `reflect`: Checks thoughts against your rules and anti-patterns
- `strategize`: Lists custom strategies alongside built-ins
- `checkpoint`: Uses configured directory and rotation limits

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_DEEP_THINK_CONFIG` | `.deep-think.json` in CWD | Path to config file |

## Development

```bash
git clone https://github.com/bis-code/mcp-deep-think.git
cd mcp-deep-think
npm install
npm test          # Run tests
npm run build     # Build TypeScript
npm run dev       # Watch mode
```

## License

MIT

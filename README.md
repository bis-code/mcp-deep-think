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

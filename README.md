# Deep Think

A Claude Code plugin for structured reasoning. Think through complex problems with strategies, branching, reflection, and persistent checkpoints.

## Install

```bash
# Add the bis-code marketplace (one-time — gives access to all bis-code plugins)
/plugin marketplace add bis-code/claude-plugins

# Install the plugin
/plugin install deep-think@bis-code
```

Or install from a local clone, which is the same path without the round trip
through GitHub — `marketplace add` takes a filesystem path as happily as a repo:

```bash
git clone https://github.com/bis-code/mcp-deep-think.git
cd mcp-deep-think/server && npm install && npm run build   # .mcp.json runs dist/bundle.mjs
claude plugin marketplace add /absolute/path/to/mcp-deep-think
claude plugin install deep-think@bis-code
```

Building is not optional in the local path: `.mcp.json` starts
`server/dist/bundle.mjs`, so a clone without a build gives you a plugin that
cannot start.

There is no npm package. There used to be a publish step aimed at
`@bis-code/deep-think`; it never published anything and has been removed.

## Versioning

Versions are bumped **by hand** — there is no release automation. When you change
anything that ships, bump `.claude-plugin/plugin.json` and `server/package.json`
**together**.

Claude Code keys its plugin cache directory on the version in
`.claude-plugin/plugin.json`. Leave it alone and `claude plugin update` sees
nothing to do — it reports success, changes nothing, and you debug the old bundle
while reading the new source. Rebuild `server/dist/bundle.mjs` and commit it in
the same change, because that bundle is what actually runs.

## How It Works

Deep Think provides 5 MCP tools that work together:

```
strategize → think → reflect → branch → checkpoint
     |          |        |         |          |
  Pick a    Record    Check     Explore    Save/restore
  reasoning  steps    for       alternate  reasoning
  framework          issues    paths      state
```

**Start a session** with `/start` and describe what you're reasoning about. The plugin suggests a strategy and begins the thought chain.

**Auto-checkpointing** saves your reasoning before context compaction and every 10 thoughts (configurable). Resume anytime with `/checkpoints`.

## Commands

| Command | What it does |
|---------|-------------|
| `/start` | Launch a reasoning session from a description |
| `/checkpoints` | View, restore, or delete saved checkpoints |
| `/constraints` | Manage reasoning rules and anti-patterns |
| `/practices` | Manage review checklists and custom strategies |

## Skills (auto-triggering)

| Skill | Triggers when... |
|-------|-----------------|
| `restore-checkpoint` | Starting a new session and continuing previous reasoning |
| `manage-constraints` | User says "remember to always check X" or "add a rule about Y" |
| `manage-practices` | User says "add a review step for..." or "create a strategy for..." |

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
- `/constraints` — add rules like "always verify auth boundaries"
- `/practices` — add review steps or custom strategies

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

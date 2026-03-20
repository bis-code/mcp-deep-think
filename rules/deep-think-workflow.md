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

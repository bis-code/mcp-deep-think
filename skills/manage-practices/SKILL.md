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

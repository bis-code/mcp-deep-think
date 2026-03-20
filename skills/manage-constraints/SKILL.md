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

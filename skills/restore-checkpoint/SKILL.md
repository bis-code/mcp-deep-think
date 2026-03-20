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

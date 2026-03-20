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

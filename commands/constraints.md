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

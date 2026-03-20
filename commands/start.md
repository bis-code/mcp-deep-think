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

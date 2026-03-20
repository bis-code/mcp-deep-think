---
name: practices
description: Manage review checklists and custom strategies in .deep-think.json
---

Help the user manage their deep-think practices conversationally.
Practices map to two fields in .deep-think.json:
- practices.reviewChecklist — items to check during reflection
- strategies.custom — custom reasoning strategies with steps and checkpoints

1. Read .deep-think.json from the current project directory (create if missing).
2. Ask the user what they want to do: add/remove/show review items or strategies.
3. For review items: manage the practices.reviewChecklist array.
4. For strategies: manage strategies.custom array. Each strategy needs:
   name, description, steps (array), and checkpoints (array).
5. Write the updated .deep-think.json back to disk.

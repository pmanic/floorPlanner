# Empty startup and tool selection

Updated November 6, 2026, following explicit user requests:

- New projects must start empty, without a pre-drawn apartment, furniture, dimensions or room labels.
- Remove the V, H, W, D, K, F and P tool-selection shortcuts, including toolbar badges, tooltips and help entries.
- Select tools using toolbar buttons. Other navigation/editing shortcuts remain unchanged.

`createBlankPlan` supplies both initial state and new projects. On the first load of an older autosave, untouched built-in demo entities are removed. User-created objects and modified entities are preserved, including walls required by retained doors. Autosaves carry `starterContentVersion: 1` so imported or subsequently edited documents are not repeatedly cleaned.

This requirement supersedes the earlier decision to preload an illustrative apartment. The sample fixture remains available only for compatibility cleanup and regression testing.

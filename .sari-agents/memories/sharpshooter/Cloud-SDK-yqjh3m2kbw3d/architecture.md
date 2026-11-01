## Core Architecture
- Central dynamic mind named "bulbhul" drives the AI-based operational system, supporting role-wise skills and sub-agents.
- Subagents use free-tier models routed through OpenRouter, excluding retired models and strictly organized by team grouping.
- Employee mapping and hierarchy resolution use a composite key comprising employee code, department, bank, manager email ID, personal file ID, and active status to handle multi-bank assignments correctly.
- Project isolation: this codebase and architecture must remain completely distinct and unmixed with other projects.
- Deployment and updates leverage clasp skills, with repository functionality consolidated into agents.
- Canonical script ID `1PP7wUFkDAkmgOjgPKeWbZeg3Ajs9N4JRm...` is enforced for all bulbhul and related agents, dismantling secondary script IDs to prevent version fragmentation (recurrently regressed).
- Designated Google Spreadsheet acts as the exclusive data source (subtle).
- All agents must be enabled in MCP and directly connected using script id, development id, and repository parameters (subtle).

---
name: sari-autonomous-diagnostics
description: "SARI autonomous self-diagnostics, automated build hardening, and performance optimization tools."
---

# SARI Autonomous Self-Diagnostics & Tool Optimization

This skill provides advanced self-diagnostics, automated build hardening, and performance optimization tools for SARI and connected AI bot assistants.

## Capabilities

1. **Automated Health & Type Verification**:
   - Executes continuous type checking (`tsc --noEmit`), unit test validation (`vitest run`), and production builds (`vite build`) to catch silent errors instantly.
   - Automatically provisions missing TypeScript definitions (e.g. `@types/node`) and verifies environment variable bindings.

2. **Advanced Chunk & Asset Optimization**:
   - Enforces clean function-based `manualChunks` in Vite configurations to split React runtime, charts/Firebase, and UI modules, preventing large main bundle bloat.
   - Prunes dead code and circular chunk dependencies automatically.

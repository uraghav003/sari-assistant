---
name: token-savings
description: "Use always to minimize token burn, maximize prompt cache hit rates, enforce surgical ranged reads, and route subagents to cost-efficient model tiers."
---

<objective>
Minimize LLM input/output token burn, preserve provider quota windows (5-hour and weekly pools), and maximize prompt-cache hit rates across main sessions and subagents without sacrificing engineering accuracy.
</objective>

<essential_principles>
## 1. Surgical Context Acquisition (Zero Full-File Reads)
- **Locate before reading**: Always run `find` (behavior) or `grep` (exact symbol/literal) with `path` scoping before opening files.
- **Ranged reads only**: Always pass line selectors (`path:start-end`, e.g., `src/index.ts:40-90`) to `read`. Never read whole files >100 lines when a range suffices.
- **Rely on structural summaries**: When inspecting unfamiliar files without line ranges, rely on `read.summarize` declarations first; unfold only the target function/block.

## 2. Tool & Shell Output Minimization
- **Never dump raw files via `bash`**: Use `read`, `grep`, `glob`, and `edit` instead of `cat`, `head`, `tail`, `rg`, `find`, or `sed`.
- **Keep `bash` output bounded**: Emit counts, diffs, or status summaries in shell commands rather than megabytes of raw logs. Let `shellMinimizer` and `artifact://` handle large outputs, and read artifacts with `:start-end` selectors.

## 3. Prompt-Cache Preservation
- **Batch parallel tool calls**: Issue all independent reads/searches/edits in a single turn to avoid repeated full-context round-trips.
- **Stable prefix**: Avoid mutating system instructions or toggling mid-session settings unnecessarily so provider prefix caching stays >75%.
- **Supersede & prune**: Rely on `compaction.supersedeReads` and `compaction.dropUseless` to evict stale file reads and empty tool outputs automatically.

## 4. Subagent & Model Tier Routing (`prewalk` + `sonic`)
- **Tiered delegation**: Route mechanical edits, data collection, and boilerplate updates to `agent: "sonic"` (`gemini-3.5-flash-lite`).
- **Prewalk handoff**: Use `prewalk` so planning happens on the primary model and implementation/edits automatically step down to the `smol` role.
- **Compressed subagent context**: Pass exact file paths, line numbers, and interface contracts in `task.context`; never paste whole files inline into subagent prompts (use `local://<name>.md` for shared payloads).

## 5. Concise Output Discipline
- **No filler or restatement**: Output facts, decisions, diffs, and verification results only. Never echo unchanged code blocks or repeat tool outputs already visible to the user.
</essential_principles>

<process>
1. **Audit Burn**: Query `~/.omp/agent/agent.db` (`usage_history`) and `omp stats --summary` to check 5h/weekly quota pools and cache hit rates.
2. **Scope Tightly**: Use `grep`/`find` to pinpoint exact `file:line` ranges before any `read`.
3. **Batch Operations**: Combine independent `read`, `edit`, and verification calls into single turns to minimize prompt prefix re-billing.
4. **Route by Complexity**: Use `sonic` / `smol` models for mechanical work and reserve primary/sentinel models (`gemini-3.8-flash`, `gpt-5.6-luna`) for architecture and review.
</process>

<success_criteria>
- Prompt cache hit rate remains >= 75%.
- Zero un-ranged reads on files > 150 lines.
- Zero redundant retry/fallback 404 calls on deprecated model IDs.
- Subagents receive compressed file:line contracts rather than raw file dumps.
</success_criteria>

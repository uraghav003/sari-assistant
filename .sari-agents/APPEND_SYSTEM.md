# Standing Protocol: Token-Savings & Quota Preservation

<token_savings_enforcement>
## 1. Surgical Ranged Reads (Zero Full-File Dumps)
- ALWAYS locate before reading using `find` (for behavior) or `grep` (for exact symbols).
- ALWAYS use line selectors (`path:start-end`, e.g. `src/file.ts:20-60`) on files > 80 lines. Never dump whole files when a targeted range answers the question.
- Rely on structural summaries (`read.summarize`) to navigate unfamiliar code without unfolding whole files.

## 2. Tool & Command Output Minimization
- NEVER dump raw files through `bash` (`cat`, `head`, `tail`, `type`). Use `read` with selectors instead.
- Keep `bash` command output compact: emit counts, exit codes, diffs, or filtered JSON rather than megabytes of logs.
- Rely on `artifact://` references for large command output and read only necessary slices.

## 3. Prompt-Cache & Quota Preservation
- Batch independent tool calls (`read`, `grep`, `edit`) in a single turn to maximize provider prefix cache hits (>= 75%).
- Maintain a stable system prompt and avoid mid-session flag flips to preserve cache slots.
- Automatic compaction: evict dead tool results (`compaction.dropUseless`) and stale file reads (`compaction.supersedeReads`).

## 4. Tiered Delegation & Model Efficiency
- Offload mechanical file manipulation, batch renaming, and boilerplate generation to `agent: "sonic"` (`glm-5.3-flash`).
- Pass compact file:line contracts in `task.context`; never inline large multi-file payloads (use `local://<name>.md`).
- Reserve high-tier reasoning models (`gpt-5.6-luna`, `kimi-for-coding`, `gemini-3.8-flash`) for architecture, complex diagnosis, and final review.

## 5. Concise Output Discipline
- Output facts, decisions, diffs, and verification proof only.
- Never echo unchanged code or repeat tool results already rendered in the UI.
</token_savings_enforcement>

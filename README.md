# FLOW — Automate the work.

A visual automation platform: build workflows from triggers, actions, conditions,
AI steps and integrations on an interactive canvas, then test them and watch the
run travel the graph node by node.

Everything runs in the browser. There is no backend — but the execution engine,
validation, variable resolution and analytics are real implementations operating
on mock data, and the service layer is shaped like an API client so a real
backend can replace it without touching the UI.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production bundle
npm run lint
```

---

## What is in here

| Area | What it does |
|---|---|
| **Builder** (`/workflows/:id`) | React Flow canvas — pan, zoom, multi-select, drag & drop from the node picker, connect handles, branch labels, sticky notes, undo/redo, copy/paste, autosave, minimap, context menus |
| **Execution engine** (`src/engine`) | Walks the graph from the trigger, resolves `{{variables}}`, evaluates conditions, picks branches, runs a per-kind mock executor, streams events to the canvas, and writes a full run record |
| **Validation** (`src/lib/validation.ts`) | Zod schemas per node kind plus graph rules: missing trigger, unconfigured fields, isolated nodes, unconnected branches, cycles, unreachable paths. Publishing is blocked on errors |
| **Runs** (`/runs`) | Run history, per-run timeline with a duration gantt, streaming log, per-step input/output, failure detail and retry |
| **Analytics** (`/analytics`) | Volume, success/failure rate, average duration, time saved and a mock cost breakdown — all computed from the data, nothing hardcoded |
| **Integrations, Templates, Settings** | 10 integrations with a mock OAuth handshake, 21 forkable templates, workspace/member/permission management |

## The demo workflow

`Lead qualification` (`/workflows/wf_01`) is fully wired and interactive:

```
New lead created → AI Analyze Lead → Lead score > 70 ┬─ YES → Create deal → Notify sales team → Send follow-up
                                                     └─ NO  → Create follow-up task → Log to sheet
```

Press **Test** (or `R`), keep the sample payload, and run it. The AI node scores
the lead from the payload, the condition takes the YES branch, and each node and
edge animates as the run passes through. The finished run appears in `/runs`.

---

## Architecture

```
src/
  app/            router, providers (settings/theme, toasts, workspace, UI), command registry
  components/
    ui/           design-system primitives (button, input, menu, modal, drawer, tabs, …)
    layout/       app shell, sidebar, topbar, command palette
    charts/       Recharts wrappers with a CVD-validated palette
    nodes/        node icon, category tokens, static graph miniature
  engine/         mock execution engine, per-kind executors, condition operators
  features/       overview · workflows · builder · runs · integrations · templates · analytics · settings
  nodes/catalog   38 node definitions: fields, outputs, handles, cost
  services/       workflow · execution · integration · template · workspace · analytics
  data/           seeded fixtures + 90-day pre-aggregated metrics
  lib/            utils, formatting, storage, variables, validation, icons
  types/          workflow · node · execution · integration · workspace · template
```

**Data flow.** `services/db.ts` holds a single client-side store, seeded
deterministically and persisted to `localStorage` under `flow.*`. Components read
it through `useDb(selector)` (a cached `useSyncExternalStore`) and mutate it
through the services. Every service call funnels through `request()` — swap that
one function for `fetch` and the UI is unchanged.

**Metrics.** Charts read a 90-day rollup table (`data/metrics.ts`), the way a
real product would; the detailed `executions` log covers the most recent window.
Both come from the same seeded generator, so the dashboard, the analytics page
and the run list always agree.

**Variables.** Any text field marked `variables` gets an insert-variable picker.
Paths resolve against the trigger payload (under both `trigger.*` and the
trigger's own namespace, e.g. `lead.*`), every upstream node's output keyed by a
slug of its label, plus `workspace.*` and `system.*`.

---

## Keyboard

`⌘K` command palette · `⌘B` sidebar · `?` all shortcuts
`N` add node · `R` run a test · `F` fit view · `M` minimap
`⌘S` save · `⌘Z` / `⌘⇧Z` undo & redo · `⌘C` / `⌘V` / `⌘D` copy, paste, duplicate · `Del` delete

## Notes

- **Dark-first**, with a fully realised light theme. Theme is applied before
  first paint, so there is no flash.
- **Reduced motion** is respected from the OS and can be forced in Settings ›
  Appearance; execution animation is neutralised rather than merely shortened.
- **Permissions** can be previewed in Settings › Security by switching the
  simulated role — Viewer makes the builder read-only.
- **Mobile** is a purpose-built review surface (ordered vertical flow, bottom
  sheets), not a shrunken canvas.
- Settings › General › **Reset demo data** restores the seeded dataset.

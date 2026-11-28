# AI Curriculum Builder — Frontend Demo

React + TypeScript + Vite demo of the AI Curriculum Builder. It calls the FastAPI backend's
generation endpoints, lets a trainer review AI proposals, and applies accepted results to
**browser state**. It does not write curriculum records to TSP.

Backend architecture and API contracts are documented in the backend repository:
`docs/TECHNICAL_DOCUMENTATION_AND_PROJECT_STATUS.md` and
`docs/TASK_SPECIFIC_GENERATION_PROMPTS.md`.

## Architecture

```
React UI (this repo)                    Backend (FastAPI service)             TSP PostgreSQL
──────────────────                     ─────────────────────────             ──────────────
Tab UIs, target selector               Read-only context retrieval
Curriculum Copilot drawer   ──HTTP──▶  Prompt → LLM → validation   ──read──▶  curriculum records
Review drafts / Apply                  In-memory draft cache
App React state (local only)           Generation never writes; commit workflow is separate
```

| Area | Endpoint | Notes |
|---|---|---|
| Training Profile | `POST /v1/training-tabs/training-profile` | Requires the training overview; recorded profile/objectives are used when present |
| Modules | `POST /v1/training-tabs/module` | Requires Training Profile + Audience Profile; returns modules with lessons |
| Content Description | `POST /v1/training-tabs/content-description` | Target required (persisted TSP record or client-provided session record) |
| Survey | `POST /v1/training-tabs/survey` | Requires modules |
| Assessment | `POST /v1/training-tabs/assessment` | Requires modules and existing content; returns sections, rubrics, coverage |
| Draft retrieval | `GET /v1/training-tabs/{tab}/draft` | In-memory backend drafts; content descriptions are target-scoped |
| Real structure | `GET /v1/curriculum/{training_id}/structure` | Persisted TSP modules/lessons only |
| Copilot | `POST /v1/training-tabs/copilot` | Conversational clarification/draft editing over the same pipeline |

## Content Description workflow

1. Targets are built from **persisted TSP modules/lessons** (`/structure`) plus any **session modules**
   generated and applied in the Modules tab (marked `AI Suggested`, labelled `(demo)`, deduplicated by id).
2. The trainer must explicitly select a target; Generate is disabled otherwise.
3. **Persisted targets** send `{kind, id}` and the backend resolves the record against TSP.
4. **Temporary session targets** send `source: "client"` plus their bounded title, objective, and
   parent-module context. The backend uses the real LLM pipeline but **never resolves or persists**
   these ids; they are not TSP records.
5. Content-description drafts are cached per target. Retrieval passes `target_id`/`target_kind`, so
   different lessons never share a draft.
6. Applying a description adds it to `data.contents` with `lessonId`, `lessonName`, `moduleName`, and
   `targetSource` (`tsp` or `demo`). This is frontend state only.

If the backend cannot be reached, generation shows an error. Local offline demo drafts are used
**only** when `VITE_OFFLINE_DEMO_MODE` is explicitly enabled; they are labelled as offline demo
content, never as live AI output.

## State and persistence

- `App` holds one `TrainingData` object, seeded from `src/data/mockData.ts` for the demo.
- Each tab edits it through `onUpdateData`; tab components keep local copies for display.
- **Apply to Curriculum** updates React state (modules or contents) and, for Content Description,
  records applied backend `request_id`s to prevent duplicate applies. It makes no API call.
- A reload resets all demo/applied state. Only Copilot chat text is kept in `localStorage`.
- Persisting approved curriculum to TSP is a separate backend workflow (`/v1/curriculum/commit`,
  engine-session based) and is not invoked by this frontend.

## Curriculum Copilot (designer)

The floating **Curriculum Copilot** drawer is tab-aware and calls
`POST /v1/training-tabs/copilot`. It covers the five curriculum tabs; the learner copilot is a
separate subsystem and is not used by this UI.

- **Clarify** — with no message/option it returns tab-specific choices for module count,
  assessment style, survey depth, content format, or curriculum focus.
- **Steer** — choosing an option (or answering in text) runs the same backend generation pipeline
  with a steer: `module_count`, `assessment_strategy`, `survey_style`, `content_format`,
  `scope_focus`, and `designer_guidance`.
- **Edit** — free-text requests send the current draft plus the recent conversation; the returned
  `updated_draft` is repaired/validated by the backend and cached.
- **Apply** — on `UPDATE_DRAFT` the app updates frontend state: modules, surveys, assessments, or
  the training-profile scope. Content Description Copilot drafts are stored but not applied to the
  canvas (current limitation). For the other four tabs the draft also appears in the tab's review
  card.
- Chat transcripts are kept in `localStorage` per training/tab. Copilot drafts are in-memory and
  Copilot never writes to TSP.

Request fields: `training_id`, `tab`, `user_message`, `selected_option_id`, `current_draft`,
`conversation_history`. Responses use `response_type` (`CLARIFICATION` | `UPDATE_DRAFT` | `CHAT`),
`message`, optional `clarification`, and `updated_draft`.

## Configuration

| Variable | Purpose |
|---|---|
| `VITE_API_BASE` | Backend base URL (default `http://localhost:8000`) |
| `VITE_TRAINING_ID` | Training id used for backend generation |
| `VITE_TSP_COMPANY_ID` | Company id sent as `X-TSP-Company-ID` |
| `VITE_OFFLINE_DEMO_MODE` | `true/1/yes/on` enables explicit offline demo drafts |

Local `.env` / `.env.local` files are gitignored. Dev-mode headers are used by the API client
(`Authorization: Bearer dev-token`, `X-TSP-User-ID`, `X-TSP-Company-ID`, `X-TSP-Role`).

## Run

```bash
npm install
npm run dev      # Vite dev server
npm run build    # tsc + production build
npm test         # Vitest suite
```

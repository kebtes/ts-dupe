# Training Section Dupe with AI Curriculum Generator & Assistant UI

A faithful clone of the training curriculum administration section from:
`https://gheero-management-staging.vercel.app/curriculum-admin/training/d734b694-0802-4a4a-8a51-eaa693a10abd`

Built with a simple, modern approach using **Vite + React + TypeScript + Tailwind CSS**.

## AI Curriculum Generation Tab Flow & Endpoints

Each tab integrates the backend curriculum generation endpoints:

| Tab | Action | Endpoint | Precondition / Schema |
|---|---|---|---|
| **1. Training Profile** | Suggest Scope | `POST /v1/training-tabs/training-profile` | Generates comprehensive training scope |
| **2. Modules & Topics** | Suggest Modules | `POST /v1/training-tabs/module` | Requires Profile scope; generates modules, topics, practical labs, and lessons |
| **3. Content Description** | Suggest Lesson Content | `POST /v1/training-tabs/content-description` | Requires modules & lessons; generates walkthroughs and key takeaways |
| **4. Survey** | Generate Survey | `POST /v1/training-tabs/survey` | Requires modules; generates 5 Likert-scale feedback questions |
| **5. Assessment** | Generate Quizzes | `POST /v1/training-tabs/assessment` | Requires modules & lessons; generates MCQs with options, correct answer, and rationale |
| **Draft Caching** | Read Cached Draft | `GET /v1/training-tabs/{tab}/draft?training_id={id}` | Reads in-memory cached AI suggestions without re-running models |

- **API Client**: [src/api/tabs.ts](file:///C:/Users/CompUser/documents/vscode%20files/gheero/ts-dupe/src/api/tabs.ts) includes `generateTabDraft()` and `getCachedDraft()` with headers (`X-TSP-User-ID`, `X-TSP-Company-ID`, `X-TSP-Role`, etc.) and graceful client-side fallbacks when `http://localhost:8000` is offline.
- **Error Handling**: Implements 422 precondition banners (*"Please generate/save the earlier tab first"*), 403 role restrictions, and 502/503 service unavailable alerts.
- **Draft Cards**: User can review the AI-suggested draft, model badge (`gemma4:31b-cloud`), regenerate, or click *"Apply to Curriculum"* to commit it directly to the active tab.

## Bottom-Right Assistant
- Floating trigger button anchored at bottom-right (`fixed bottom-6 right-6`) with the assistant double-bar logo (`||`).
- RAG retrieval engine indexing training data, answering questions about modules, prerequisites, passing score, and assessments with cited sources.

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview build
npm run preview
```

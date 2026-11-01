# Document reading and representative preparation

Authorized scope: plan sections **1** (document reading, extraction and human review)
and **3** (case-specific preparation and topic cards). Recording, transcription,
post-call summarization and AI report drafting were not requested for this change.

## Existing credential

Both operations use the same server-only `OPENAI_API_KEY` through `ai-provider.ts`.
`AI_MODEL` is centrally configurable (development default: `gpt-6.1-sol`).
The user explicitly authorized reusing the existing key in Downloads. Local tools
read it in memory from `OPENAI_API_KEY`, `OPENAI_KEY_FILE`, or `Downloads/API.txt`.
No key was copied into the project, browser, fixtures, logs or generated HTML.
Replacing the key later requires changing the central server secret; neither
document extraction nor preparation has a separate credential.

## Implemented server flow

- Migration `0009_ai_documents_and_briefs.sql` adds jobs and field reviews.
- Upload commits the immutable document version and extraction outbox job in the
  same transaction. Queues process jobs; a scheduled dispatcher recovers unsent
  jobs and expired leases. Attempts, daily job counts and provider output are bounded.
- Extraction stores the document kind, owner, period, page transcription, values,
  units, page numbers, quotes and warnings. Page/quote/value consistency is checked.
  The model's page transcription is itself generated, so a source citation is not
  independent proof of accuracy. Human inspection of the original is mandatory.
- A representative with `documents.manage` can confirm, correct with a reason,
  or reject a field. This does not approve the document or modify questionnaire
  answers. Replaced files invalidate results and reviews for current preparation.
- Preparation includes questionnaire reports, approved professional findings and
  confirmed values from the current **approved** document version. Internal notes,
  full identity numbers and direct contact fields are excluded from the brief input.
- Every one of the 44 configured conversation topics must be returned exactly
  once. The full active questionnaire definition supplies the chapter coverage,
  including repeated fields and service-specific questions. A topic suggestion
  does not complete or skip the existing conversation or record client consent.
- Source IDs are scoped to the input. A changed snapshot makes the previous brief
  stale. Approved findings and client decisions are never overwritten by a job.

## Interface

- Document card: expandable reader, original alongside editable fields, citations,
  explicit inspection checkbox, correction reason and per-field audit status.
- PDF originals use a lazy PDF.js canvas and local inline worker; image originals
  render directly. The browser receives authorized file blobs, never an API key.
- Representative home and the preparation stage of the guided conversation show
  the sourced case brief, relevance filters, all topic cards and chapter coverage.
  Preparing a brief makes its personal wording available in the topic desk.
- Public demo adapters use visibly labeled synthetic data and never call a paid
  provider. The real build aliases the backend and excludes demo data as before.

## Activation and verification

`AI_ENABLED` remains false in the staging deployment configuration. No external
queue, production migration, secret binding or live-customer AI activation was
performed by the implementation. To activate the authenticated deployment, first
apply migration 0009, provision the configured queue, bind the existing central
key, confirm the intended usage limit/data handling policy, then enable AI.
Do not turn off authentication or broaden access to enable the feature.

- `npm run test:ai`: permissions, scoped sources, version changes, idempotency,
  human corrections, stale output, bounded retries, budget and atomic upload outbox.
- `node scripts/check-ai-workspace.mjs`: desktop and narrow/mobile UI journey.
- `npm run test:ai:live`: opt-in provider calls with a synthetic document and brief.
- `RUN_LIVE_AI=1` with Vitest `server/tests/ai-live.test.ts`: opt-in full backend
  workflow with synthetic data, a human review and all 44 topics / 10 chapters.
- `npm run build:live`, `npm run test:live-boundary`, `npm run test:runtime`:
  build separation and local workerd/D1/R2 verification. Runtime check is local.

The browser MCP was tried but its Chrome extension was unavailable; reproducible
UI verification uses the installed Playwright browser directly.

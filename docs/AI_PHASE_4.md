# Assistance inside a conversation topic

Authorized plan item 4 adds four focused actions to the current representative
topic card: a simpler explanation, one follow-up question, missing information,
and a summary of the representative's notes for that topic. The phone call is
outside the system. No audio, transcription or after-call report is used here.

## Context and processing

- The server resolves the meeting and topic from the authenticated workspace.
  Only the assigned representative or administrator with `families.edit` can
  request assistance. Draft requests remain private to the requesting account.
- Input contains the selected guide, relevant questionnaire answers, related
  confirmed document facts, the displayed finding/comparison, the saved choice
  and the notes explicitly provided for this topic. Case-wide internal notes,
  direct contact fields and identity fields are not included automatically.
- `rpc_ai_assist_topic` queues a request; `rpc_ai_topic_assistance` reads it.
  Existing `ai_jobs`, queues, leases, retries, daily limit and the central provider
  are reused. A topic request is a short `brief` with
  `input.scope = "topic_assistance"`. Family-preparation fallback queries explicitly
  exclude this subtype. No new migration, queue, key or model is needed.
- The request fingerprint covers the requester, meeting, topic, action, notes,
  selected sources, saved-decision revision and meeting state. Repeated requests
  are deduplicated. Changed sources or a closed meeting invalidate background
  output. Changed unsaved notes are also detected in the interface.
- A strict result schema bounds the suggestion and requires source IDs from the
  supplied context. A notes summary must cite the notes. Citations establish
  traceability, not factual correctness; the representative checks the wording.

## Interaction and ownership

The assistant is an expandable area inside the existing branded topic card.
Its output area reserves space while waiting and does not move focus or scroll
to the top. The representative can keep writing while a request runs.

Suggestions can be edited and retain their text across action/topic navigation.
A pending edit prevents a new generation from replacing that edited suggestion.
An outdated suggestion cannot be appended. An explicit append preserves the
original notes and adds a labeled block; it stays an unsaved conversation draft
until the ordinary Save button is used. Repeated appends of the same wording are
disabled. The 5,000-character limit is enforced without truncating original work.

No AI operation saves a client choice, opens a professional task, completes a
topic, finishes a meeting or approves a report. Those actions remain in the
existing manual workflow. The assistant is hidden from client/professional roles.

## Verification and activation

- `npm run test:ai`: existing document tests plus scoped topic processing,
  permissions, idempotency, budget, input bounds, stale output, source validation
  and absence of business-data mutations.
- `npm run test:ai-topic`: desktop and mobile journey covering all four actions,
  edited text, retained notes/choice, in-flight changes, explicit append and Save.
- `npm run test:ai-topic:live`: opt-in synthetic-only calls for all four actions
  through the same existing server credential. The key is read in memory.

The public demo adapter labels its synthetic suggestions and never calls a paid
provider. Actual provider verification is local and synthetic-only. Staging
`AI_ENABLED` remains false; no production server, secret binding, remote migration
or queue provisioning is part of this publication.

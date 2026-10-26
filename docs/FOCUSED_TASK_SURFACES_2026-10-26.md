# Work inside the selected record — 2026-10-26

The role-specific entry screen now hands off to focused work, not an expanded case dashboard.

- Family document/followup/service links preserve the requested record in `focus`. Only that record is initially exposed; remaining records and context are closed disclosures. Unknown record IDs show a scoped missing-record message and never substitute an unrelated request.
- Completing a focused followup leaves it visible with its completed state. Filters do not remove it and expose another task unexpectedly. The existing return-to-next-step control recalculates the next action.
- Professional detail pages keep the editor first, with task-list navigation and shared documents available separately. Their home action selector now works from authorized professional assignments even when the workspace intentionally omits private family records.
- Focused meetings keep the current topic and decision editor in view. The agenda, other stages, family information and meeting-management tools open on demand; save-and-next behavior and draft guards remain intact.
- Case overview separates editable contact details from case statistics, discussion history and contact logs.
- Consent text, warnings needed for a decision, errors and validation remain in the relevant form. Secondary forms stay mounted so folding them does not discard drafts. Invalid fields can open their disclosure ancestors through existing validation handling.

Implementation: `src/workspace/TaskSurface.tsx` and `task-surface.css`, plus structural changes to the existing case, task and meeting components. No role permissions or backend services are changed.

Verification: focused document/record/review/professional/meeting paths at 1440/390/320 pixels; missing record fallback; completed record stays selected; shared data privacy; existing draft, validation, concurrency, role, guided-call and intake tests. Tests intentionally seeking secondary controls open their disclosure through visible summary clicks.

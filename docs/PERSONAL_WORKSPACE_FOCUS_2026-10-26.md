# Personal workspaces — one next action

The homepage content and registration / payment / questionnaire flow are unchanged. This change replaces the entry screen's information hierarchy rather than adding another skin.

## Selection rules

`src/workspace/next-actions.ts` is a presentation selector over the authorized workspace. It never changes assignment, permissions, case state or financial data.

- Client: incomplete questionnaire first within its case; otherwise active visible requests owned by the client, sorted by due date, plus required missing/rejected documents. Linked requests/documents are deduplicated. Optional uploads and representative work do not become client tasks. Completed/archived cases do not generate new requests. After all requests are done, show a waiting state with the representative, or an approved final report if available.
- Representative: only actionable work assigned to the current representative; overdue work first. Work awaiting the family or another professional remains in secondary tracking.
- Professional: only the current professional's active assigned work. Submitted work awaiting approval is tracking, not a new assignment.
- Manager: pending approvals and cases without an active representative. Unassigned responsibility precedes ordinary approvals. Routine representative tasks remain in the operational list.
- Marketer: personal referral link as the sole main action. Referral/commission detail opens on demand; no family data or automatic commission claims are added.

A single main action opens the specific record (including focus for documents and followups). The workspace-return button leads back to the recomputed next action using the existing unsaved-change guard. Changes are not marked complete by navigation.

## Secondary information

Work queues, filters, case tracking, calls, reports and administration remain accessible through existing routes and a closed expansion on home. The current client task is omitted from the supplementary list to avoid duplicating it. Help remains available independently. Demo reset and role chooser are under “כלי הדמו”; role switching and homepage access remain available.

Partial workspace responses use scoped empty-state language and retain a note that more records may exist. No unsupported claim that all work is complete is inferred from an empty partial list.

## Verification

- Unit tests cover roles, permissions, hidden items, ownership, deadlines, optional documents, document/task deduplication and completion transitions.
- `test:focused-home` checks all five roles at 1440, 390 and 320 px, at most one primary action, CTA in viewport, real upload/task-completion transitions to the next request and waiting state, clipboard copy and referral privacy.
- Existing intake, client workspace, customer journey, representative, professional/admin, branding, homepage and guided-call checks remain in the deployment gate. Tests that previously expected every detail at entry now explicitly open the relevant expansion.
- Both demo and live UI builds are checked; publishing this task updates the public demo, not backend services.

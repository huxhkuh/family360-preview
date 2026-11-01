# Connected personal area

The normal client role and “אזור אישי מסוג אחר” both open this experience through `App`.
Do not replace either entry with a redirect to the standalone design prototype.

- `ClientLanding` carries the approved split composition and layered green family folder. Its next action comes from `nextActions`, including retained questionnaire drafts.
- `ClientCase` provides seven folder sections and compact document rows. A row opens the existing focused `DocumentCard`; uploads, consents, downloads and permissions remain in that component.
- `ClientHeader` keeps three main destinations. Questionnaire, meetings, follow-ups, notifications, refresh and sign-out remain in the account menu.
- `ClientContact` uses the existing client request RPC. Approved reports open the existing meeting report screen.
- `client-reference-home.css` is scoped artwork from the approved local `design/combined-reference.css` prototype. `client-atelier.css` integrates it with the real app and its mobile intake mode.

Both `main.tsx` and `live-main.tsx` load the client theme. The standalone `role-workspaces.html` must be regenerated from the same source using `scripts/export-workspace-html.mjs`.

Verification: `check-client-atelier.mjs`, `check-client-folio.mjs`, `check-client-intake.mjs`, `check-client-workspace.mjs`, `check-focused-home.mjs`, and the existing document/optional-intake checks. The new atelier check verifies both entry points, document opening and sample upload, all folder sections, and a client request reaching the representative at desktop and mobile widths.

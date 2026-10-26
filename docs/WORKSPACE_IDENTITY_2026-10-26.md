# Workspace identity — 2026-10-26

Reference: the current editorial homepage, including its forest opening, warm paper, copper actions and geometric brand illustrations. Homepage copy and layout are unchanged by this work.

- Shared navigation: solid forest surface with the approved dark-background logo and paper active item. Never use the light-background logo on this surface.
- Main canvas: paper, generous headings, quiet rules, compact operational rows. Meeting entry is the one contrasting forest panel; primary actions use copper.
- Eighteen custom SVG icons in `src/icons.tsx`: 32-unit grid, rounded silhouettes, copper details and contrasting cutouts. Icons are decorative and always accompany written labels. No directional arrows.
- `src/branding/editorial-workspaces.css` applies after legacy styles in both demo and live entry points. It preserves existing route and component contracts, mobile focus mode, autofill, validation and reduced-motion behavior.
- Representative priorities share the same icons without changing filter actions. Five roles keep their existing permissions and workflows.

Verification: 341 unit tests; build; five roles at desktop/mobile through all 48 main navigation states; client focus at 1440/820/390/320; representative workflows; professional/admin workflows; branding and customer registration journey. Screenshots under `test-results/workspace-brand/` (ignored generated artifacts).

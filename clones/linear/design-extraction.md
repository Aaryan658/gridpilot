# Linear Reference Extraction

Source snapshot: `clones/linear/source.html`
Reference URL: `https://linear.app`

## Sidebar And Navigation Patterns
- Width target: 252-264px expanded; compact variant can collapse to roughly 72px.
- Sidebar background is dark, quiet, and nearly solid with slight translucency.
- Padding rhythm: 8px outer rail, 12-16px internal groups, 40px nav row height.
- Nav rows are compact, icon-left/text-right, with subtle hover fill.
- Active state is a slim vertical indicator at the left edge plus a soft active background.
- Navigation density is high: many objects visible without large decorative headers.

## Cards
- Card borders are low-contrast 1px lines.
- Shadows are restrained and used for layering, not decoration.
- Card backgrounds sit just above page background.
- Hover lift is minimal: border brightens, surface lifts by about 1-2px.

## Typography
- Body: compact 13-14px with high legibility.
- Panel labels: 12px, muted, normal letter spacing.
- Section titles: 15-18px, 600-700.
- Product headline hierarchy is larger on the marketing page, but the product UI uses tight operational type.
- Letter spacing stays near zero.

## Spacing
- 4/8/12/16/24 rhythm.
- Dense row-based information structure.
- Dividers and group labels create hierarchy without heavy decoration.

## Color Handling
- One accent is used sparingly on a dark base.
- Accent appears in active nav, selected UI, and progress/status moments.
- For GridPilot: replace Linear purple with `#7c5cbf`; replace black base with `#0a0e1a`.

## Micro-Interactions
- Hover states are fast and subtle.
- Focus/active states are visible through border and fill changes.
- Sliding active indicator should use Framer Motion `layoutId`.

## GridPilot Application
- Use Linear-like sidebar structure exactly: compact logo stack, nav groups, lower controls.
- Use Linear-like card density and border system, upgraded with the required GridPilot glass surface.
- Typography hierarchy should stay operational and precise.

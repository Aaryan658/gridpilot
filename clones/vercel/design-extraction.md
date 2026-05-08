# Vercel Analytics Reference Extraction

Source snapshot: `clones/vercel/source.html`
Reference URL: `https://vercel.com/analytics` redirects to `https://vercel.com/products/observability`

## Chart Aesthetic
- Minimal chart decoration.
- Gridlines are very subtle, thin, and low-contrast.
- Axes use small muted labels with no heavy axis frame.
- Lines are clean, rounded, and uncluttered.
- Tooltips are compact dark cards with clear value rows.

## KPI Metric Cards
- Large number first, label beneath or above in muted text.
- Delta indicators are small and adjacent to the metric, never dominant.
- Cards use restrained borders and almost no visual clutter.

## Tab And Filter Bars
- Horizontal controls above charts.
- Selected state is clear through subtle fill/border contrast.
- Filters feel like operational controls, not marketing chips.

## Tables
- Rows have generous but efficient vertical padding.
- Dividers are thin and muted.
- Hover state is a slight background shift.

## Loading Skeletons
- Same shape as final content.
- Soft opacity pulse, no flashy shimmer needed except for the primary run button.

## Color Philosophy
- Minimal palette, mostly monochrome.
- Use color only for semantic meaning.
- For GridPilot: dual-accent system: purple for GridPilot-managed values, teal for FirstFlight signals.

## GridPilot Application
- Use Vercel-style clean axes and tooltip behavior in all Recharts components.
- KPI number hierarchy should match this reference.
- Add GridPilot’s unique purple glow only to the managed chart line.

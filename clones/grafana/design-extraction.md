# Grafana Dashboards Reference Extraction

Source snapshot: `clones/grafana/source.html`
Reference URL: `https://grafana.com/grafana/dashboards/`

## Time-Series Panels
- Threshold/reference lines are highly legible and sit above chart data.
- Warning/overload ranges use translucent zone shading behind the data.
- Panel headers pair title, subtitle/context, and a compact status badge.

## Status And Severity
- Severity indicators are color-coded but compact.
- Alert cards use label, short message, and timestamp-like metadata.
- Badges are small, bordered, and semantic.

## Panel Treatment
- Dark panel background with a clear 1px border.
- Utilitarian by default; GridPilot should make this more premium with the required glass surface and blur.

## Graph Annotations
- Arrow plus label callouts work well for peaks and threshold moments.
- Labels should sit near the data they explain, not in a detached legend.

## GridPilot Application
- Use Grafana-style threshold lines for transformer and DVVNL limits.
- Use translucent red overload zone and green clean-window zone.
- Use severity badges for anomaly and fleet states.
- Upgrade panels to 16px glass cards per GridPilot design system.

# What Customers Actually See/Use in EV Depot Charging Management Software: Research Report
*Generated: 2026-07-19 | Sources: 20 | Confidence: Medium-High (vendor marketing/docs, not customer interviews)*

## Executive Summary

Across ~15 real vendors (ChargePoint, Driivz, VEV IQ, Cleo, PowerFlex, Tenix, EO Cloud, WeaveGrid, Monta, reev, and others), the customer-facing surface of EV depot/fleet charging software converges on the same shape: a **web dashboard** showing live charger/vehicle status and a map or list view, a **scheduling/smart-charging control panel**, an **alerts/incident feed**, a **reports & CSV/PDF export section**, and (for depot ops specifically) a **shared-screen "readiness" view** for staff on the floor. Onboarding is a multi-week hardware-then-software process (electrical planning → charger installation → OCPP commissioning → software activation → fleet/telematics integration), not a simple SaaS signup — except for pure charge-point-management (CPMS) products aimed at existing hardware, where onboarding can be "10 minutes" (enter an OCPP URL). Pricing is overwhelmingly **per-charger/per-month** ($5–$20/port/month is typical, plus a platform fee and sometimes a transaction %), not per-seat. The actual daily users are **facilities/energy managers and depot operations staff**, not drivers — drivers get, at most, a simple status view or mobile app.

## 1. Onboarding & Deployment: What Actually Happens Before Anyone Sees a Dashboard

Two very different onboarding patterns showed up depending on whether the vendor sells **hardware+software together** vs. **software-only (bring-your-own-charger)**:

**Hardware-coupled deployment (the norm for fleet depot vendors)** is a multi-phase project, not a signup flow. reev's documented process is explicit: **Planning → Procurement → Installation → Connectivity → Handover** — align the use case and grid capacity with the customer, procure chargers + license keys, install and configure OCPP connectivity, verify the backend connection (they have a dedicated "reev Companion" tool electricians use to confirm commissioning), then hand over license keys/materials, after which "the operator can independently manage and operate the charging stations via the reev platform" ([reev Help Center](https://support.reev.com/en/articles/527950-commissioning-a-charging-station-with-reev-software)). Tenix says "most operators are live within days" once chargers are installed ([Tenix](https://tenix.eu/charge/)). A broader CPO planning guide puts **utility engagement 12-18 months before first vehicle arrival** as the real long pole — transformer/service upgrades, not software — with phased rollout (25-50% of fleet first, expand based on operational data) recommended over a single big-bang deployment ([jointcharging.com EV Fleet Depot Charging Guide](https://jointcharging.com/cpo/ev-fleet-depot-charging-guide/)).

**Software-only CPMS (charge point management system) onboarding is fast.** Üreticy advertises "**10-Minute Device Onboarding** — No engineer required. Enter the OCPP URL on your device and it appears in your dashboard immediately," with a 4-step flow: integrate via OCPP → activate dashboard → manage fleet → start ([Üreticy](https://ureticy.com/)). This is the model closest to GridPilot's current architecture (chargers connect via OCPP to a backend, dashboard reflects state).

For CSMS/OCPP backend selection specifically, one implementation guide lays out a maturity ladder — 1-50 sites needs only device monitoring/remote reset/basic billing/uptime reporting; 50-500 sites needs OCPI roaming, smart load management, open API; 500+ needs white-label app, multi-tenant, enterprise SLA — and notes that **OCPI roaming-hub onboarding (Hubject/Gireve) takes 4-8 weeks** with a pre-built stack vs. 9-12 months building from scratch ([jointcharging.com OCPP 2.0.1 & CSMS Guide](https://jointcharging.com/cpo/ocpp-csms-implementation-guide/)).

## 2. The Main Dashboard: What's Actually On Screen

There's strong convergence on dashboard structure across vendors:

- **Live status view** (map or list): which chargers are occupied/available/faulted, which vehicles are plugged in, real-time delivered power, state of charge. Cleo: "Track all active charging sessions from a single dashboard... charging station in use, connected vehicle, session start and end times, delivered power, duration, and state of charge" ([Cleo](https://cleo.eco/en/products/features)). PowerFlex Fleet+: filter by Stations or Vehicles view; select a vehicle to see SoC, range, route location ([PowerFlex](https://www.powerflex.com/product/powerflex-x-fleet)).
- **A depot-specific "shared screen" readiness display** — this is a distinct pattern from the general dashboard, meant to be glanced at by depot floor staff, not clicked through. EO Cloud's "SiteOps" homepage is explicitly described as a "shared-screen interface" giving "an instant view of the entire fleet's state of charge," with "high-contrast design, real-time updates, and intuitive action indicators" for quick decisions ([EO Cloud](https://www.eocharging.com/eo-cloud)). This is directly analogous to what a physical LCD/status-light rig (like the hackathon hardware) is trying to represent digitally.
- **Scheduling / smart-charging controls**: bulk-upload or per-vehicle departure times and target SoC, power caps per site/group, time-of-use windows, manual override/"boost" for urgent vehicles. Nearly every vendor has some version of this (Cleo's SoC-goal-by-time, PowerFlex's bulk schedule upload, Tenix's "Boost charging" override, VEV IQ's "vehicle prioritisation").
- **Alerts/notifications feed**: configurable by event type, channel (email/SMS/in-app), and recipient. PowerFlex: "Popups in the dashboard notify fleet managers of low SOC, missed sessions... Clicking into a message brings up the Notifications tab." Driivz has a dedicated "Alerts" view tied to self-healing remediation logic before escalating to a human.
- **Reports & Analytics tab**, covered in detail below.

## 3. Daily-Use vs. Rarely-Used Features

Based on how vendors describe their own UI hierarchy (what's on the homepage vs. buried in a sub-menu):

**Used constantly (homepage-level):** live charger/vehicle status, active session list, alerts/faults requiring action, today's schedule/readiness-by-shift.

**Used periodically (weekly/monthly, own menu tab):** reports & exports, billing/invoicing reconciliation, adding/configuring new chargers or users, adjusting tariff/pricing rules.

**Used rarely (admin/setup, one-time or occasional):** integration configuration (telematics, fleet management system connections), user/role management, firmware update pushes, white-label branding config, API key management. VEV IQ groups this explicitly as "Network & Commercial Management" — separate from day-to-day "Fleet & Charger Visibility" and "Charging & Power Control" ([VEV](https://www.vev.com/vev-iq/)).

## 4. Integrations Customers Actually Expect

Consistent list across vendors:

- **OCPP to the chargers themselves** — near-universal, vendor-agnostic (OCPP 1.6/2.0.1). Driivz claims support for "over 2,200 OCPP-ready charger models"; Üreticy lists 40+ certified brands.
- **Telematics / fleet management systems** — named integration partners repeatedly cited: **Samsara and Geotab** (PowerFlex), plus generic "fleet telematics, fuel card and asset management systems" (ChargePoint TCO page). This is what feeds real-time vehicle SoC/location into the charging schedule.
- **Utility/tariff data** — time-of-use rate ingestion for cost optimization; some (WeaveGrid, VEV IQ) go further and integrate demand-response/grid-signal programs directly.
- **Billing/payment** — Stripe-style processing for public/workplace charging; for fleets specifically, "consolidated invoicing, cost center allocation" rather than per-session payment (Monta).
- **ERP** — for enterprise-scale revenue reconciliation (jointcharging.com CPO guide).
- **Open REST API** — cited as a baseline expectation by essentially every vendor at any scale ("PowerFlex X API," "ChargePoint open API and more than 40 integrations," Tenix's "Open API").

## 5. Reports & Exports Customers Actually Pull

ChargePoint's own reporting documentation is the most granular public source found and is worth citing in full because it's a real product, not marketing copy. Report categories: **Energy (kWh + accumulated), GHG Savings, Stations/Ports activated, Sessions, API call volume, Revenue, Peak Daily Occupancy, Session Length Histogram, Unique Drivers, Average Utilization, Queue Depth/Peak Queue/Wait Time (waitlist features), full Session Details table (exportable), Financial (Organization Statement, Activation, Employee Benefit, Tax), Pricing Logs, Audit Trail, and Alarm history** — nearly all exportable as CSV/PDF ([ChargePoint Generate Reports guide](https://na.chargepoint.com/UI/s3docs/docs/help/GenerateReports.pdf)). Cleo similarly emphasizes exporting "power reports and charging session history in .xls or .csv format," explicitly because "these reports are also essential for participating in... Demand Response Management and Carbon Credit Valuation" programs — i.e., the export isn't just record-keeping, it's a prerequisite for revenue/incentive programs. Tenix Charge highlights "Environmental reporting" specifically for "ESG KPI" compliance.

**Takeaway for a demo/pitch:** the exports customers actually value aren't generic "usage stats" — they're the specific artifacts needed for (a) utility demand-response or carbon-credit program enrollment, (b) regulatory/ESG reporting, and (c) financial reconciliation/billing. A generic "download CSV of sessions" is table stakes; the differentiator is packaging data for a specific downstream program.

## 6. Who The Actual Day-to-Day Users Are

Consistently **not drivers**. The named personas across vendor copy:
- **Fleet/depot managers** — the primary persona almost everywhere ("depot managers to drivers" language on PowerFlex explicitly ranks depot managers first).
- **Facilities/energy managers** — distinct persona for energy-cost and grid-capacity concerns specifically (emobilitysimplified.com explicitly flags that fleet management and facility/utility-facing roles often haven't worked together before and need an "organizational interface" built around the software).
- **Depot floor/operations staff** — the shared-screen "SiteOps"/readiness-display pattern (EO Cloud) exists specifically because floor staff need a glance-able view, not a full dashboard login.
- **Drivers** — get, at most, a lightweight status/notification surface (ChargePoint's separate driver app/portal exists specifically because drivers don't use the management CMS at all).
- One outlier: **WeaveGrid's customer is the utility**, not the fleet operator — a reminder that "who buys this" and "who uses it daily" can be different organizations depending on business model (WeaveGrid sells to utilities like PG&E/Xcel, who in turn manage EV owners' charging with consent).

## 7. Contract / Pricing Patterns

Pricing is close to universally **per-charging-point/port/month**, not per-user or flat-license:
- Monta: $300/yr platform fee + 5% transaction fee (startup tier); Complete tier: L2 $5/port/month, L3 $10/port/month + $250/month platform fee, 4% transaction ([Monta](https://monta.com/en-us/pricing/)).
- E-Flux: €5.50/month/AC socket, €10.40/month/DC socket, plus a one-time €16.50-22.18 per-station connection fee, minimum 12-24 month contract ([E-Flux](https://www.e-flux.io/pricing)).
- vaylens: €6.90-9.90/charge point/month tiered by feature set ([vaylens](https://vaylens.com/pricing)).
- Ladecloud: €7-15/charging point/month + a one-time €70-100/point onboarding fee ([Ladecloud](https://ladecloud.io/pricing/)).
- Tridens EV Charge (AWS Marketplace): flat $349/month for up to 25 chargers on the entry tier, custom enterprise pricing above that ([AWS Marketplace](https://aws.amazon.com/marketplace/pp/prodview-v7qqkgzlxhysm)).

ChargePoint instead uses **feature-tiered plans** (Core/Professional/Enterprise) layered on top of hardware+software+install+support as one bundled contract: "ChargePoint works with you to design a customized, end-to-end charging program. Bundling hardware, software, installation, and long-term support into one scalable solution" ([ChargePoint](https://www.chargepoint.com/products/software)) — its Enterprise Cloud Plan adds demand-response, advanced meter reporting (15-minute granularity), and automatic station software updates as the differentiators at the top tier.

**Deployment/support inclusions repeatedly bundled in:** installation, OCPP commissioning support, ongoing remote monitoring (often marketed as a specific uptime SLA — 99.5-99.9% shows up repeatedly), and account/technical support (phone/WhatsApp support tiers appear even in budget European CPMS products).

## Key Takeaways (for GridPilot specifically)

- **The physical hardware rig's LCD/status-light concept maps directly to a real product pattern** — EO Cloud's "SiteOps" shared-screen readiness display is exactly this idea, just on a monitor instead of an LCD. That's a legitimate, citable design precedent to reference if judges ask "why does this need a physical display."
- **A believable "what does the customer get" pitch should separate three surfaces**, matching the market: (1) a live status/scheduling dashboard for fleet/energy managers, (2) a reports/export tab pointed at a *specific* downstream use (utility demand-response enrollment, carbon reporting — not generic analytics), (3) an ops-floor glanceable readiness view (which the hardware demo already visually represents).
- **Onboarding realism**: if asked "how would a customer actually deploy this," the honest, well-grounded answer is a multi-week phased hardware+software rollout (per reev/jointcharging.com), not a SaaS signup — unless GridPilot's story is specifically "software-only, bring-your-own-OCPP-charger," in which case the Üreticy-style "10-minute onboarding" pitch is the more accurate analog.
- **Pricing framing**: per-charger/month (in the $5-20/port range, plus a platform fee) is the market-standard model to cite if asked about business model, not per-seat SaaS pricing.

## Sources

1. [Cleo — Product Features](https://cleo.eco/en/products/features) — dashboard, session tracking, SoC-goal scheduling, XLS/CSV export tied to DR/carbon programs
2. [PowerFlex X Fleet+](https://www.powerflex.com/product/powerflex-x-fleet) — monitoring, scheduling, Samsara/Geotab telematics, alerts
3. [ChargePoint — Software Product Page](https://www.chargepoint.com/products/software) — CMS overview, bundled hardware+software+install+support
4. [ChargePoint — EV Fleet Management Software](https://www.chargepoint.com/en-gb/fleet/software) — dashboard structure, reporting
5. [ChargePoint — Generate Reports Guide (PDF)](https://na.chargepoint.com/UI/s3docs/docs/help/GenerateReports.pdf) — exhaustive real report-type catalog
6. [ChargePoint — Enterprise Cloud Plan Datasheet](https://www.chargepoint.com/download-file/chargepoint-enterprise-cloud-plan-ds-en-us) — feature tiering, valet dashboard, ADR
7. [ChargePoint — Lower Fleet TCO](https://www.chargepoint.com/solutions/improve-tco) — telematics integration framing
8. [ChargePoint — CMS Suite Plan Comparison](https://www.chargepoint.com/download-file/chargepoint-cms-suite-cloud-plan-comparison-enna) — Core/Professional/Enterprise tier breakdown
9. [Driivz InSite for Fleets](https://driivz.com/solutions/ev-fleets/) — depot dashboards, self-healing alerts, mobile intake/dispatch view
10. [VEV IQ](https://www.vev.com/vev-iq/) — fleet/charger visibility, control, network management tiers, Stagecoach case study
11. [Gaadin AI — Fleet Charging Optimization](https://www.gaadin.ai/product/ai-ev-fleet-charging-management) — forecasting/scheduling feature framing
12. [Tenix Charge](https://tenix.eu/charge/) — four core functions, "live within days" onboarding, scheduling-platform API integration
13. [EverCharge GLANCE](https://evercharge.com/products/glance) — CSMS admin/energy/telemetry integration categories
14. [jointcharging.com — OCPP 2.0.1 & CSMS Implementation Guide](https://jointcharging.com/cpo/ocpp-csms-implementation-guide/) — CSMS feature tiers by scale, OCPI onboarding timeline
15. [jointcharging.com — EV Fleet Depot Charging Guide](https://jointcharging.com/cpo/ev-fleet-depot-charging-guide/) — utility engagement timeline, phased deployment, telematics/dispatch integration
16. [reev — Commissioning a Charging Station](https://support.reev.com/en/articles/527950-commissioning-a-charging-station-with-reev-software) — 5-phase onboarding process
17. [Siemens DepotFinity](https://www.siemens.com/global/en/products/energy/medium-voltage/solutions/emobility/ebus-depot/evdepot-digital.html) — tiered Basic/Advanced/Premium plans
18. [Üreticy](https://ureticy.com/) — "10-minute" OCPP onboarding flow
19. [Monta Pricing](https://monta.com/en-us/pricing/) — per-port + platform + transaction fee model
20. [vaylens Pricing](https://vaylens.com/pricing) / [E-Flux Pricing](https://www.e-flux.io/pricing) / [Ladecloud Pricing](https://ladecloud.io/pricing/) / [Tridens (AWS Marketplace)](https://aws.amazon.com/marketplace/pp/prodview-v7qqkgzlxhysm) — concrete per-charger/month pricing data points
21. [WeaveGrid — What is EV Managed Charging?](https://www.weavegrid.com/news/what-is-ev-managed-charging) / [WeaveGrid Utilities](https://www.weavegrid.com/utilities) — utility-as-customer business model contrast
22. [BetterFleet Charge Management](https://www.betterfleet.com/charge-management/) — incident management, digital-twin dispatch view
23. [EO Cloud](https://www.eocharging.com/eo-cloud) — "SiteOps" shared-screen depot readiness display
24. [E-Mobility Simplified — Depot Charging Implementation Plan](https://www.emobilitysimplified.com/2022/12/how-to-plan-for-ev-fleet-depot-charging.html) — planning-phase organizational/timeline guidance
25. [AssetWorks FuelFocusEV](https://www.assetworks.com/fleet/fuelfocusev/) — CMS feature definition, telematics data integration

## Methodology

6 parallel Exa web searches across sub-questions (dashboard/UI, onboarding, ChargePoint specifics, WeaveGrid/utility model, pricing, day-to-day energy-manager workflow), yielding ~45 unique result snippets; ~25 distinct sources retained after de-duplication and relevance filtering. No full-page deep-fetches were performed beyond search-result highlights (time/cost-constrained); all citations trace to the source highlights returned by search, not independently re-verified page-by-page. Gaps: no direct customer/practitioner interviews were available in this search pass — all findings are vendor self-description (marketing pages, product docs, help-center articles), which may overstate ease-of-use or understate real-world friction. Treat "10-minute onboarding" and similar vendor claims as marketing claims, not independently verified timing.

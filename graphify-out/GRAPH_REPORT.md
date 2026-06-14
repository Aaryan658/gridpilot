# Graph Report - .  (2026-06-06)

## Corpus Check
- 84 files · ~318,752 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 427 nodes · 645 edges · 41 communities (24 shown, 17 thin omitted)
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 121 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_FastAPI API Layer|FastAPI API Layer]]
- [[_COMMUNITY_Dashboard & Analytics|Dashboard & Analytics]]
- [[_COMMUNITY_Frontend Package Config|Frontend Package Config]]
- [[_COMMUNITY_Load & Carbon Charts|Load & Carbon Charts]]
- [[_COMMUNITY_Demand Forecasting (FirstFlight)|Demand Forecasting (FirstFlight)]]
- [[_COMMUNITY_Frontend Directory Structure|Frontend Directory Structure]]
- [[_COMMUNITY_Clone Website Template|Clone Website Template]]
- [[_COMMUNITY_GridPilot Core Concepts|GridPilot Core Concepts]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_EV Fleet Management|EV Fleet Management]]
- [[_COMMUNITY_DVVNL Tariff & Savings|DVVNL Tariff & Savings]]
- [[_COMMUNITY_OCPP Charging Protocol|OCPP Charging Protocol]]
- [[_COMMUNITY_Anomaly Detection|Anomaly Detection]]
- [[_COMMUNITY_Landing Page UI|Landing Page UI]]
- [[_COMMUNITY_EV Charging Scheduler|EV Charging Scheduler]]
- [[_COMMUNITY_Depot Network Simulator|Depot Network Simulator]]
- [[_COMMUNITY_Skills Sync Scripts|Skills Sync Scripts]]
- [[_COMMUNITY_Logging & Audit|Logging & Audit]]
- [[_COMMUNITY_Clone Website Command|Clone Website Command]]
- [[_COMMUNITY_Next.js Root Layout|Next.js Root Layout]]
- [[_COMMUNITY_Vahan EV Data|Vahan EV Data]]
- [[_COMMUNITY_Vasudha Data Loader|Vasudha Data Loader]]
- [[_COMMUNITY_Vercel Project Config|Vercel Project Config]]
- [[_COMMUNITY_API Auth|API Auth]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Package Init|Package Init]]
- [[_COMMUNITY_CICD Pipeline|CI/CD Pipeline]]
- [[_COMMUNITY_Prophet Dependency|Prophet Dependency]]
- [[_COMMUNITY_Streamlit Dependency|Streamlit Dependency]]
- [[_COMMUNITY_Pandas Dependency|Pandas Dependency]]
- [[_COMMUNITY_NumPy Dependency|NumPy Dependency]]
- [[_COMMUNITY_Scikit-Learn Dependency|Scikit-Learn Dependency]]
- [[_COMMUNITY_HTTPX Dependency|HTTPX Dependency]]

## God Nodes (most connected - your core abstractions)
1. `DemandForecaster` - 23 edges
2. `AnomalyDetector` - 20 edges
3. `ScheduleRequest` - 17 edges
4. `SimulateRequest` - 17 edges
5. `OptimizeRequest` - 17 edges
6. `GridSignalBus` - 17 edges
7. `compilerOptions` - 16 edges
8. `ensure_ready()` - 15 edges
9. `GridPilotScheduler` - 15 edges
10. `CEALoader` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Next.js 16 Frontend` --semantically_similar_to--> `Next.js 16 App Router React 19 TypeScript Stack`  [INFERRED] [semantically similar]
  README.md → frontend/AGENTS.md
- `ScheduleRequest` --uses--> `AnomalyDetector`  [INFERRED]
  api/main.py → firstflight/anomaly.py
- `ScheduleRequest` --uses--> `DemandForecaster`  [INFERRED]
  api/main.py → firstflight/forecaster.py
- `ScheduleRequest` --uses--> `CorporateEVDepotSimulator`  [INFERRED]
  api/main.py → gridpilot/depot_sim.py
- `ScheduleRequest` --uses--> `EVRequestManager`  [INFERRED]
  api/main.py → gridpilot/ev_manager.py

## Hyperedges (group relationships)
- **GridPilot Backend Optimizer Stack** — readme_cvxpy_ecos, readme_pandapower, readme_fastapi_backend [EXTRACTED 1.00]
- **Clone Website Multi-Phase Pipeline** — skill_reconnaissance_phase, skill_foundation_build, skill_component_dispatch [EXTRACTED 1.00]
- **India EV Fleet Data Sources** — readme_vahan_data, readme_acn_data, readme_vasudha [EXTRACTED 1.00]

## Communities (41 total, 17 thin omitted)

### Community 0 - "FastAPI API Layer"
Cohesion: 0.07
Nodes (17): grid_frequency(), OptimizeRequest, ScheduleRequest, SimulateRequest, startup_event(), Base, BaseModel, GridMeasurement (+9 more)

### Community 1 - "Dashboard & Analytics"
Cohesion: 0.16
Nodes (27): active_evs_count(), carbon_signal_label(), clean_json(), dashboard_data(), data_provenance(), depot_carbon_signal(), depot_fleet(), depot_schedule() (+19 more)

### Community 2 - "Frontend Package Config"
Cohesion: 0.06
Nodes (31): author, bugs, url, description, devDependencies, eslint, eslint-config-next, tailwindcss (+23 more)

### Community 3 - "Load & Carbon Charts"
Cohesion: 0.12
Nodes (12): CARBON_DATA, LOAD_DATA, SIG_COLORS, CarbonSignal, LOAD_DATA, ScheduleComparison, ScheduleResult, fetchCarbonSignal() (+4 more)

### Community 4 - "Demand Forecasting (FirstFlight)"
Cohesion: 0.17
Nodes (5): DemandForecaster, _metrics(), _daily_shape(), IEXLoader, _seasonal_multiplier()

### Community 5 - "Frontend Directory Structure"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 6 - "Clone Website Template"
Cohesion: 0.14
Nodes (22): AGENTS.md Source of Truth, Next.js 16 App Router React 19 TypeScript Stack, shadcn/ui Radix Tailwind CSS v4, Vercel Deployment, Git Worktree Parallel Agent Teams, Clone Website Skill, Multi-Platform AI Agent Support, sync-agent-rules.sh Script (+14 more)

### Community 7 - "GridPilot Core Concepts"
Cohesion: 0.10
Nodes (21): ACN-Data Behavioral Distributions, CEA India 2022-23 Carbon Data, CVXPY + ECOS Convex Optimizer, DVVNL Demand Charge, FastAPI Backend, FirstFlight Grid Intelligence Engine, Framer Motion Animation, GridPilot Project (+13 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 9 - "Frontend Dependencies"
Cohesion: 0.13
Nodes (16): dependencies, @base-ui/react, class-variance-authority, clsx, framer-motion, lucide-react, next, react (+8 more)

### Community 10 - "EV Fleet Management"
Cohesion: 0.16
Nodes (6): EVRequestManager, ACNDataLoader, download_data(), main(), print_summary_table(), start_api_background()

### Community 11 - "DVVNL Tariff & Savings"
Cohesion: 0.20
Nodes (4): DVVNLLoader, _range_for_hour(), Preprocessor, _rename_weather_and_carbon()

### Community 12 - "OCPP Charging Protocol"
Cohesion: 0.17
Nodes (5): cp, GridPilotCentralSystem, MockCharger, connect_charger(), main()

### Community 13 - "Anomaly Detection"
Cohesion: 0.29
Nodes (5): _alert(), _anomaly_type(), AnomalyDetector, _severity(), _synthetic_temp()

### Community 14 - "Landing Page UI"
Cohesion: 0.17
Nodes (6): FEATURES, RESULTS, stats, FLEET_MIX, fmt(), LiveCalculator()

### Community 17 - "Skills Sync Scripts"
Cohesion: 0.29
Nodes (4): geminiBody, match, ROOT, SOURCE

### Community 19 - "Clone Website Command"
Cohesion: 0.40
Nodes (4): description, fileContext, name, prompt

### Community 20 - "Next.js Root Layout"
Cohesion: 0.40
Nodes (3): geistMono, inter, metadata

### Community 23 - "Vercel Project Config"
Cohesion: 0.50
Nodes (3): orgId, projectId, projectName

## Knowledge Gaps
- **113 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+108 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `WeatherLoader` connect `Load & Carbon Charts` to `EV Fleet Management`, `DVVNL Tariff & Savings`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `ScheduleRequest` connect `FastAPI API Layer` to `Dashboard & Analytics`, `Demand Forecasting (FirstFlight)`, `EV Fleet Management`, `DVVNL Tariff & Savings`, `OCPP Charging Protocol`, `Anomaly Detection`, `EV Charging Scheduler`, `Depot Network Simulator`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `SimulateRequest` connect `FastAPI API Layer` to `Dashboard & Analytics`, `Demand Forecasting (FirstFlight)`, `EV Fleet Management`, `DVVNL Tariff & Savings`, `OCPP Charging Protocol`, `Anomaly Detection`, `EV Charging Scheduler`, `Depot Network Simulator`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `DemandForecaster` (e.g. with `ScheduleRequest` and `SimulateRequest`) actually correct?**
  _`DemandForecaster` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `AnomalyDetector` (e.g. with `ScheduleRequest` and `SimulateRequest`) actually correct?**
  _`AnomalyDetector` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 15 inferred relationships involving `ScheduleRequest` (e.g. with `AnomalyDetector` and `CarbonEngine`) actually correct?**
  _`ScheduleRequest` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Are the 15 inferred relationships involving `SimulateRequest` (e.g. with `AnomalyDetector` and `CarbonEngine`) actually correct?**
  _`SimulateRequest` has 15 INFERRED edges - model-reasoned connections that need verification._
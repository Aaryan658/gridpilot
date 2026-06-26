# GridPilot: Industrial Readiness & Funding Proposal
**Market Context:** Indian Corporate EV Fleet Depot Deployment

---

## PART 1: Industrial Readiness & Technical Gaps Analysis

While GridPilot's core optimization math (CVXPY/CLARABEL) is genuinely production-grade, the surrounding software architecture is currently an MVP (Minimum Viable Product). To deploy this to a real industrial fleet like Lithium Urban Technologies, the following critical gaps must be bridged through R&D:

### 1. IoT Hardware & Telemetry Pipelines
*   **Current State:** GridPilot "mocks" OCPP communication and assumes perfect data availability.
*   **The Industrial Gap:** Real chargers disconnect, send corrupted data, or go offline. A production system requires an industrial **IoT Message Broker** (like Kafka or AWS IoT Core) capable of handling millions of real-time WebSocket heartbeat pings, RFID authentication requests, and fault logs from hundreds of physical chargers simultaneously without dropping messages.

### 2. Real-Time Re-Optimization (MPC)
*   **Current State:** GridPilot builds one perfect schedule at 20:00 and expects the real world to follow it until 07:00.
*   **The Industrial Gap:** Vehicles arrive late, chargers break, and grid conditions change. A true enterprise system uses **Model Predictive Control (MPC)**. It continuously polls the actual State of Charge (SoC) from the chargers and automatically re-runs the entire CVXPY optimization every 5–15 minutes to adjust to real-world deviations.

### 3. Edge Computing & Fallback
*   **Current State:** GridPilot runs entirely in the cloud. If the internet connection at the Gurugram depot goes down, charging orchestration fails.
*   **The Industrial Gap:** Industrial deployments require **Edge Controllers** (hardened local computers at the physical depot). If the cloud disconnects, the Edge Controller must seamlessly take over, executing a safe "fallback" schedule to ensure vehicles still charge and transformer limits are never breached during the outage.

### 4. Non-Linear Battery Degradation Modeling
*   **Current State:** GridPilot treats a battery like a bucket—pouring energy in at a flat rate (e.g., 7.4 kW).
*   **The Industrial Gap:** Pushing maximum power into a battery when it is near 90% full, or when the ambient temperature is 45°C, severely degrades battery health. Industrial optimizers include physics-based battery models to slow down charging (tapering) at high SoC to extend the fleet's battery lifespan by years.

### 5. Billing, Settlement, and Multi-Tenancy
*   **Current State:** The system assumes one owner for all vehicles and chargers.
*   **The Industrial Gap:** Commercial depots often host multiple fleets. An industrial system requires **IAM (Identity & Access Management)**, driver RFID mapping, and an automated financial ledger to accurately track kWh usage and automatically bill different corporate accounts.

### 6. Solver Warm-Starting
*   **Current State:** The Clarabel solver calculates from a blank slate every time, taking ~3 seconds.
*   **The Industrial Gap:** Because fleet schedules are highly repetitive day-to-day, industrial systems "warm-start" the solver by feeding it yesterday's optimal schedule as a starting guess. This reduces computation time from thousands of milliseconds down to sub-500ms.

---

## PART 2: Software & Infrastructure Operating Costs (OpEx)

Based on current (2026) industry pricing, here is the breakdown of the infrastructure, tooling, and software licensing costs required to run GridPilot in production. *(Calculated at ~$1 USD = ₹95 INR, June 2026 mid-market rate).*

### Cloud Infrastructure (AWS Mumbai Region `ap-south-1`)
GridPilot requires compute-heavy instances to run the convex optimization models rapidly.
*   **Instance Type:** `c7i.large` (2 vCPUs, 4 GiB Memory)
*   **Monthly Cost (On-Demand):** ~$65.15 USD / month (**~₹6,200 INR / month**)
*   **Recommendation:** Budget **₹14,500 INR / month** to cover the EC2 server, RDS PostgreSQL database, load balancing, and AWS IoT Core telemetry.

### AI & Developer Tooling
For ongoing development, maintenance, and automated code assistance:
*   **Claude Max 20x Subscription:** $200 USD / month → **₹19,000 INR / month** per developer. Provides 20× the usage capacity of Claude Pro, essential for heavy AI-assisted optimization R&D and code generation.

### Optimizer / Solver Licensing
*   **Gurobi (The Industry Standard):** Between **$10,000 to $16,000 USD per year** (~₹9.5L to ₹15.2L INR / year). Prohibitively expensive.
*   **MOSEK:** ~$4,300 USD perpetual + $1,075/year maintenance (~₹4.1L one-time + ₹1.0L/year) for commercial use. **Free for academic emails** (365-day renewable license) — applicable to this project under CHRIST (Deemed to be University).
*   **CLARABEL (GridPilot's choice):** Free and open-source (Apache 2.0). Solves the problem in 3 seconds. **Cost: ₹0.**

---

## PART 3: Comprehensive Budget (1-Year Runway for 1 Depot)

This section combines the OpEx costs with the estimated one-time R&D (CapEx) required to build the industrial upgrades listed in Part 1.

### Capital Expenditure (CapEx) / One-Time R&D
| Item / Gap Addressed | Description | Estimated Cost (INR) |
| :--- | :--- | :--- |
| **Edge Computing Hardware** | 1x Industrial IoT Edge PC (e.g., Advantech/Siemens) installed at the depot. | ₹85,000 |
| **MPC & Optimization R&D** | Backend Engineering to build the MPC data pipeline and CVXPY warm-starting. | ₹6,00,000 |
| **IoT & Telemetry Engineering** | Integration of AWS IoT Core / Kafka to handle massive concurrent WebSockets. | ₹4,00,000 |
| **Battery Physics & IAM** | R&D to implement battery tapering models and a Multi-Tenancy / IAM framework. | ₹3,00,000 |
| **Total One-Time CapEx** | | **₹13,85,000** |

### Operational Expenditure (OpEx) / Ongoing SaaS Costs
| Item | Monthly Cost (INR) | Annual Cost (INR) |
| :--- | :--- | :--- |
| **AWS Core Infrastructure** | Compute instances, database, load balancers, and IoT Core telemetry. | ₹14,500 | ₹1,74,000 |
| **AI Tooling & Dev Subscriptions**| Claude Max 20x ($200/mo) for AI-assisted development. | ₹19,000 | ₹2,28,000 |
| **Solver Licensing** | CLARABEL (Open Source). | ₹0 | ₹0 |
| **Total Ongoing OpEx** | | **₹33,500 / mo** | **₹4,02,000 / year** |

### **Total Budget Required: ₹17,87,000 INR** *(~₹17.9 Lakhs)*

> [!IMPORTANT]
> **Pitch Narrative:** *"For roughly ₹18 Lakhs, we can take a mathematically proven MVP, upgrade it with military-grade IoT pipelines and edge computing fallbacks, and run it for a full year. Because we are leveraging open-source solvers instead of paying Gurobi's ₹10–15 Lakh annual tax, 78% of this budget goes directly into permanent IP and R&D, not software rent."*

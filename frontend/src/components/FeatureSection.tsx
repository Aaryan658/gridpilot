"use client";
import { motion } from "framer-motion";

const FEATURES = [
  {
    title: "Convex QP Optimizer",
    desc: "CVXPY + CLARABEL solver. 40 vehicles. Optimal in 0.2s. Mathematically guaranteed minimum carbon + peak.",
    accent: "#7C5CBF",
    icon: "⚡",
  },
  {
    title: "Physics Validation",
    desc: "pandapower AC power flow on a 7-bus depot network. Every recommendation physically validated. Zero guesses.",
    accent: "#00D4AA",
    icon: "🔬",
  },
  {
    title: "Real Carbon Signals",
    desc: "CEA India 2024-25 state-wise emission factors. Haryana: 0.710 kg CO₂/kWh. FirstFlight signal bus feeds the optimizer.",
    accent: "#27AE60",
    icon: "🌿",
  },
  {
    title: "OCPP 1.6 Ready",
    desc: "SetChargingProfile commands to real chargers. Exicom, Delta, Tata Power EZ. Software → hardware in one step.",
    accent: "#F9CA24",
    icon: "🔌",
  },
];

const RESULTS = [
  { before: "294 kW", after: "173 kW", label: "Peak Load", delta: "-41.2%" },
  { before: "8 events", after: "0 events", label: "Overloads/night", delta: "-100%" },
  { before: "₹26,900", after: "₹0", label: "DVVNL Penalty", delta: "-100%" },
  { before: "768 kg", after: "629 kg", label: "CO₂ Emissions/night", delta: "-18.0%" },
];

export default function FeatureSection() {
  return (
    <section style={{
      width: "100%",
      padding: "80px 32px",
      background: "transparent",
    }}>
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 80,
      }}>

        {/* Before / After table */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{
              fontSize: 10, fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#00D4AA",
              display: "block", marginBottom: 12,
            }}>
              Simulation Results
            </span>
            <h2 style={{
              fontSize: "clamp(24px,3vw,40px)",
              fontWeight: 700, color: "#CCD0CF",
              letterSpacing: "-0.02em",
            }}>
              Without GridPilot vs With GridPilot
            </h2>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 16,
          }}>
            {RESULTS.map((r, i) => (
              <motion.div
                key={r.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="card-premium p-6"
              >
                <div style={{
                  fontSize: 11, color: "#4A5C6A",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 16,
                }}>
                  {r.label}
                </div>
                <div style={{
                  display: "flex", alignItems: "center",
                  gap: 12, marginBottom: 8,
                }}>
                  <span style={{
                    fontSize: 18, color: "#E74C3C",
                    fontWeight: 600,
                    textDecoration: "line-through",
                    opacity: 0.7,
                  }}>
                    {r.before}
                  </span>
                  <span style={{ color: "#4A5C6A" }}>→</span>
                  <span style={{
                    fontSize: 22, color: "#CCD0CF", fontWeight: 700,
                  }}>
                    {r.after}
                  </span>
                </div>
                <div style={{
                  display: "inline-block",
                  padding: "2px 10px",
                  borderRadius: 20,
                  background: "rgba(39,174,96,0.1)",
                  border: "1px solid rgba(39,174,96,0.3)",
                  fontSize: 11, color: "#27AE60", fontWeight: 600,
                }}>
                  {r.delta}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{
              fontSize: "clamp(24px,3vw,40px)",
              fontWeight: 700, color: "#CCD0CF",
              letterSpacing: "-0.02em",
            }}>
              What makes it real.
            </h2>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
            gap: 24,
          }}>
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card-premium group cursor-default"
                style={{ position: "relative", overflow: "hidden", padding: "32px 28px" }}
              >
                <div style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0,
                  height: 3,
                  background: f.accent,
                }} />
                <div style={{ fontSize: 44, marginBottom: 18 }}>
                  {f.icon}
                </div>
                <div style={{
                  fontSize: 22, fontWeight: 700,
                  color: "#CCD0CF", marginBottom: 14,
                  letterSpacing: "-0.01em",
                }}>
                  {f.title}
                </div>
                <div style={{
                  fontSize: 17, color: "#9BA8AB", lineHeight: 1.75,
                }}>
                  {f.desc}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>



      </div>
    </section>
  );
}


"use client";
import { motion } from "framer-motion";

const FEATURES = [
  {
    title: "Convex QP Optimizer",
    desc: "CVXPY + ECOS solver. 500 vehicles. Optimal in 4,576ms. Mathematically guaranteed minimum carbon + peak.",
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
    desc: "CEA India 2022-23 state-wise emission factors. Haryana: 0.820 kg CO₂/kWh. FirstFlight signal bus feeds the optimizer.",
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
  { before: "4,100 kW", after: "1,509 kW", label: "Peak Load", delta: "-63.2%" },
  { before: "5 events", after: "0 events", label: "Overloads/night", delta: "-100%" },
  { before: "₹8.4L/mo", after: "₹0", label: "DVVNL Penalty", delta: "-100%" },
  { before: "453/500", after: "500/500", label: "Vehicles Ready", delta: "+10%" },
];

export default function FeatureSection() {
  return (
    <section style={{
      width: "100%",
      padding: "80px 32px",
      background: "var(--bg)",
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
            gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
            gap: 16,
          }}>
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card-premium p-6 group cursor-default"
                style={{ position: "relative", overflow: "hidden" }}
              >
                <div style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0,
                  height: 2,
                  background: f.accent,
                }} />
                <div style={{ fontSize: 28, marginBottom: 12 }}>
                  {f.icon}
                </div>
                <div style={{
                  fontSize: 15, fontWeight: 600,
                  color: "#CCD0CF", marginBottom: 8,
                }}>
                  {f.title}
                </div>
                <div style={{
                  fontSize: 13, color: "#9BA8AB", lineHeight: 1.6,
                }}>
                  {f.desc}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Cold email CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          style={{
            textAlign: "center",
            padding: "48px 32px",
            borderRadius: 20,
            background: "var(--surface)",
            border: "1px solid rgba(74,92,106,0.2)",
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.025) inset, 0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{
            fontSize: 10, fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "#00D4AA",
            marginBottom: 16,
          }}>
            Pilot Programme
          </div>
          <h3 style={{
            fontSize: "clamp(22px,3vw,36px)",
            fontWeight: 700, color: "#CCD0CF",
            letterSpacing: "-0.02em",
            marginBottom: 16,
          }}>
            Is your depot losing ₹9 lakh/month?
          </h3>
          <p style={{
            color: "#9BA8AB", fontSize: 15,
            maxWidth: 480, margin: "0 auto 32px",
            lineHeight: 1.6,
          }}>
            We want to validate GridPilot on a real depot. You share
            before/after DVVNL bills. We handle everything else. Free pilot.
          </p>
          <a
            href="mailto:connect@project-lithium.com"
            style={{
              display: "inline-block",
              padding: "12px 32px",
              borderRadius: 40,
              background: "#7C5CBF",
              color: "white",
              fontSize: 14, fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 4px 20px rgba(124,92,191,0.4)",
            }}
          >
            Contact Lithium Urban Technologies →
          </a>
        </motion.div>

      </div>
    </section>
  );
}

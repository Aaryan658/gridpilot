"use client";

import { useEffect, useState } from "react";
import HeroSection from "@/components/HeroSection";
import GridPilotCharts from "@/components/charts/GridPilotCharts";
import FeatureSection from "@/components/FeatureSection";
import LiveCalculator from "@/components/LiveCalculator";
import ParticleBackground from "@/components/ParticleBackground";
import { apiFetch } from "@/lib/api";

export default function Home() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    apiFetch("/ping")
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false));
  }, []);

  return (
    <>
      <ParticleBackground />
      {/* Nav */}
      <nav style={{
        position: "fixed", top: 24, left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 48px)", maxWidth: 1200, zIndex: 50,
        padding: "0 24px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(6,20,27,0.6)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(0,212,170,0.15)",
        boxShadow: "0 0 8px rgba(0,212,170,0.04), inset 0 0 4px rgba(0,212,170,0.02)",
        borderRadius: 100,
      }}>
        <span style={{
          fontSize: 16, fontWeight: 800,
          background: "linear-gradient(90deg,#7C5CBF,#00D4AA)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          ⚡ GridPilot
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a
            href="/login"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#7C5CBF",
              textDecoration: "none",
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid rgba(124,92,191,0.3)",
              background: "rgba(124,92,191,0.1)",
              transition: "all 0.15s",
            }}
          >
            Admin Login
          </a>
          <a
            href="/dashboard"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#9BA8AB",
              textDecoration: "none",
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid rgba(74,92,106,0.3)",
              transition: "all 0.15s",
            }}
          >
            Live Dashboard →
          </a>
          
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 10,
            color: isConnected ? "#00D4AA" : (isConnected === false ? "#E74C3C" : "#9BA8AB"),
            padding: "3px 10px",
            border: `1px solid ${isConnected ? "rgba(0,212,170,0.3)" : (isConnected === false ? "rgba(231,76,60,0.3)" : "rgba(155,168,171,0.3)")}`,
            borderRadius: 20,
            background: isConnected ? "rgba(0,212,170,0.05)" : (isConnected === false ? "rgba(231,76,60,0.05)" : "transparent"),
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: isConnected ? "#00D4AA" : (isConnected === false ? "#E74C3C" : "#9BA8AB"),
              boxShadow: isConnected ? "0 0 6px #00D4AA" : (isConnected === false ? "0 0 6px #E74C3C" : "none")
            }} />
            {isConnected ? "Backend connected" : (isConnected === false ? "Backend disconnected" : "Connecting...")}
          </div>


        </div>
      </nav>

      <main className="relative z-10 min-h-screen bg-transparent">
        <HeroSection />

        <section id="live-demo" style={{
          width: "100%",
          padding: "80px 32px",
          background: "transparent",
          borderTop: "1px solid rgba(74,92,106,0.15)",
          position: "relative",
          zIndex: 20,
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <span style={{
                display: "inline-block",
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#00D4AA",
                marginBottom: 16,
              }}>
                Live Simulation Results
              </span>
              <h2 style={{
                fontSize: "clamp(28px,4vw,48px)",
                fontWeight: 700,
                color: "#CCD0CF",
                letterSpacing: "-0.02em",
                marginBottom: 16,
                lineHeight: 1.1,
              }}>
                The before and after.
                <br />
                <span style={{
                  background: "linear-gradient(90deg,#7C5CBF,#00D4AA)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  Real numbers. Real optimizer.
                </span>
              </h2>
              <p style={{
                color: "#9BA8AB",
                fontSize: 16,
                maxWidth: 560,
                margin: "0 auto",
                lineHeight: 1.6,
              }}>
                CVXPY convex QP solved in 35s for
                600 vehicles. pandapower AC power flow
                validates every result. CEA India
                2024-25 carbon data.
              </p>
            </div>
            <GridPilotCharts />
          </div>
        </section>

        {/* SECTION 1: The Math */}
        <section style={{
          width: "100%",
          padding: "60px 32px",
          background: "transparent",
          borderTop: "1px solid rgba(74,92,106,0.1)",
        }}>
          <div style={{
            maxWidth: 900, margin: "0 auto",
          }}>
            <div style={{
              textAlign: "center", marginBottom: 40,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#7C5CBF",
                display: "block", marginBottom: 12,
              }}>
                The Algorithm
              </span>
              <h2 style={{
                fontSize: "clamp(22px,3vw,36px)",
                fontWeight: 700, color: "#CCD0CF",
                letterSpacing: "-0.02em",
                marginBottom: 12,
              }}>
                Convex quadratic program.
                Not a heuristic.
              </h2>
              <p style={{
                color: "#9BA8AB", fontSize: 14,
                maxWidth: 560, margin: "0 auto",
                lineHeight: 1.6,
              }}>
                GridPilot solves a mathematically
                guaranteed optimal schedule using
                CVXPY with the CLARABEL interior-point
                solver. Four competing objectives.
                One hard constraint. 57,600 variables.
              </p>
            </div>

            {/* Objective function display */}
            <div style={{
              background: "#11212D",
              border: "1px solid rgba(74,92,106,0.2)",
              borderRadius: 16,
              padding: "28px 32px",
              marginBottom: 20,
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.02) inset,"
                +"0 8px 32px rgba(0,0,0,0.4)",
            }}>
              <div style={{
                fontSize: 11, color: "#4A5C6A",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 16,
              }}>
                Objective function
              </div>
              <div style={{
                fontSize: "clamp(13px,2vw,17px)",
                color: "#CCD0CF",
                lineHeight: 2,
                overflowX: "auto",
              }}>
                <span style={{ color: "#9BA8AB" }}>
                  minimize
                </span>{" "}
                <span style={{ color: "#7C5CBF",
                               fontWeight: 700 }}>
                  α
                </span>
                <span style={{ color: "#CCD0CF" }}>
                  ·C(x)
                </span>
                {" + "}
                <span style={{ color: "#7C5CBF",
                               fontWeight: 700 }}>
                  β
                </span>
                <span style={{ color: "#CCD0CF" }}>
                  ·P(x)
                </span>
                {" + "}
                <span style={{ color: "#7C5CBF",
                               fontWeight: 700 }}>
                  γ
                </span>
                <span style={{ color: "#CCD0CF" }}>
                  ·D(x)
                </span>
                {" + "}
                <span style={{ color: "#7C5CBF",
                               fontWeight: 700 }}>
                  δ
                </span>
                <span style={{ color: "#CCD0CF" }}>
                  ·V(x)
                </span>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(180px,1fr))",
                gap: 12,
                marginTop: 24,
              }}>
                {[
                  {
                    sym: "α = 0.50",
                    term: "C(x)",
                    name: "Carbon cost",
                    desc: "CEA Haryana intensity × kWh",
                    color: "#00D4AA",
                  },
                  {
                    sym: "β = 0.20",
                    term: "P(x)",
                    name: "Peak penalty",
                    desc: "sum(max(load − 2000, 0)²)",
                    color: "#7C5CBF",
                  },
                  {
                    sym: "γ = 0.20",
                    term: "D(x)",
                    name: "Discomfort",
                    desc: "max(energy_needed − delivered, 0)",
                    color: "#F9CA24",
                  },
                  {
                    sym: "δ = 0.10",
                    term: "V(x)",
                    name: "DVVNL penalty",
                    desc: "max(peak − 4500, 0) × 500",
                    color: "#E74C3C",
                  },
                ].map(item => (
                  <div key={item.term} style={{
                    padding: "12px 14px",
                    background: "rgba(37,55,69,0.4)",
                    borderRadius: 8,
                    borderLeft:
                      `3px solid ${item.color}`,
                  }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700,
                      color: item.color,
                      fontFamily: "var(--font-mono)",
                      marginBottom: 4,
                    }}>
                      {item.sym} · {item.term}
                    </div>
                    <div style={{
                      fontSize: 12, fontWeight: 600,
                      color: "#CCD0CF",
                      marginBottom: 3,
                    }}>
                      {item.name}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: "#4A5C6A",
                      fontFamily: "var(--font-mono)",
                    }}>
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: 20,
                padding: "12px 16px",
                background: "rgba(124,92,191,0.08)",
                borderRadius: 8,
                border:
                  "1px solid rgba(124,92,191,0.2)",
              }}>
                <span style={{
                  fontSize: 11, color: "#7C5CBF",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginRight: 12,
                }}>
                  Hard constraint:
                </span>
                <span style={{
                  fontSize: 12, color: "#9BA8AB",
                  fontFamily: "var(--font-mono)",
                }}>
                  total_load[t] ≤ 5,000 kW ∀t
                </span>
                <span style={{
                  fontSize: 11, color: "#4A5C6A",
                  marginLeft: 12,
                }}>
                  (transformer safety limit)
                </span>
              </div>
            </div>

            {/* Solver stats */}
            <div style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(150px,1fr))",
              gap: 12,
            }}>
              {[
                {
                  value: "CLARABEL",
                  label: "Solver",
                  sub: "Interior-point method",
                  color: "#7C5CBF",
                },
                {
                  value: "35s",
                  label: "Total solve time",
                  sub: "600 vehicles, 96 timeslots (full pipeline)",
                  color: "#00D4AA",
                },
                {
                  value: "optimal",
                  label: "Status",
                  sub: "Mathematically guaranteed",
                  color: "#27AE60",
                },
                {
                  value: "57,600",
                  label: "Variables",
                  sub: "600 vehicles × 96 slots",
                  color: "#9BA8AB",
                },
              ].map(s => (
                <div key={s.label} style={{
                  background: "#11212D",
                  border: "1px solid rgba(74,92,106,0.2)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  borderTop: `2px solid ${s.color}`,
                }}>
                  <div style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: s.color,
                    fontFamily: "var(--font-mono)",
                    marginBottom: 4,
                  }}>
                    {s.value}
                  </div>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#9BA8AB",
                    marginBottom: 2,
                  }}>
                    {s.label}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: "#4A5C6A",
                  }}>
                    {s.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 2: Data sources */}
        <section style={{
          width: "100%",
          padding: "60px 32px",
          background: "transparent",
          borderTop: "1px solid rgba(74,92,106,0.1)",
        }}>
          <div style={{
            maxWidth: 900, margin: "0 auto",
          }}>
            <div style={{
              textAlign: "center", marginBottom: 40,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#00D4AA",
                display: "block", marginBottom: 12,
              }}>
                Data provenance
              </span>
              <h2 style={{
                fontSize: "clamp(22px,3vw,36px)",
                fontWeight: 700, color: "#CCD0CF",
                letterSpacing: "-0.02em",
              }}>
                Every number has a source.
              </h2>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(260px,1fr))",
              gap: 12,
            }}>
              {[
                {
                  source: "CEA CO₂ Baseline v21",
                  type: "REAL · GOVERNMENT",
                  typeColor: "#27AE60",
                  value: "0.710 kg CO₂/kWh",
                  usage:
                    "Carbon cost term in objective "
                    +"function. Haryana state grid.",
                  citation:
                    "Ministry of Power, India 2024-25",
                  icon: "🌿",
                },
                {
                  source: "Vahan Dashboard MoRTH",
                  type: "REAL · GOVERNMENT",
                  typeColor: "#27AE60",
                  value: "6 vehicle models",
                  usage:
                    "Fleet: Nexon 27%, Tiago 14%, "
                    +"Windsor 18%, BE6 17%, "
                    +"Curvv 16%, ZS 8%.",
                  citation: "CY2025 India EV sales",
                  icon: "🚗",
                },
                {
                  source: "ACN-Data (Caltech)",
                  type: "REAL · ADAPTED",
                  typeColor: "#F9CA24",
                  value: "Arrival distributions",
                  usage:
                    "Arrival time distributions "
                    +"only. Adapted to Indian depot "
                    +"context. Vehicle specs from "
                    +"Vahan CY2025.",
                  citation:
                    "Lee et al. 2019, sessions 2018-2020",
                  icon: "⚡",
                },
                {
                  source: "Open-Meteo API",
                  type: "REAL · API",
                  typeColor: "#4ECDC4",
                  value: "3yr hourly",
                  usage:
                    "Gurugram weather for solar "
                    +"irradiance and load patterns.",
                  citation:
                    "Open-Meteo Historical Weather API. "
                    +"open-meteo.com. Accessed June 2026. "
                    +"CC BY 4.0 open data licence.",
                  icon: "🌤️",
                },
                {
                  source: "DVVNL HT-2 Tariff",
                  type: "REAL · REGULATORY",
                  typeColor: "#27AE60",
                  value: "₹350/kVA/month",
                  usage:
                    "Demand charge calculation. "
                    +"Dakshinanchal Vidyut Vitran "
                    +"Nigam Ltd, Gurugram zone.",
                  citation:
                    "DVVNL HT-2 Tariff Schedule FY 2025-26. "
                    +"UPERC Order November 2025. "
                    +"Demand charge ₹350/kVA/month "
                    +"unchanged for 6th consecutive year.",
                  icon: "📋",
                },
                {
                  source: "First-Principles Energy",
                  type: "DERIVED",
                  typeColor: "#00D4AA",
                  value: "24.32 kWh/session",
                  usage:
                    "Theoretical energy needed to "
                    +"reach 80% SoC from 20% SoC "
                    +"weighted average battery capacity "
                    +"(40.53 kWh).",
                  citation: "First-principles fleet energy model",
                  icon: "📊",
                },
              ].map(d => (
                <div key={d.source} style={{
                  background: "#11212D",
                  border: "1px solid rgba(74,92,106,0.2)",
                  borderRadius: 12,
                  padding: "16px",
                  boxShadow:
                    "0 4px 16px rgba(0,0,0,0.3)",
                }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 10,
                  }}>
                    <span style={{
                      fontSize: 18,
                    }}>
                      {d.icon}
                    </span>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: d.typeColor,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      padding: "2px 8px",
                      borderRadius: 12,
                      background:
                        `${d.typeColor}15`,
                      border:
                        `1px solid ${d.typeColor}30`,
                    }}>
                      {d.type}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#CCD0CF",
                    marginBottom: 4,
                  }}>
                    {d.source}
                  </div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#7C5CBF",
                    fontFamily: "var(--font-mono)",
                    marginBottom: 8,
                  }}>
                    {d.value}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: "#9BA8AB",
                    lineHeight: 1.5,
                    marginBottom: 8,
                  }}>
                    {d.usage}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: "#4A5C6A",
                    fontStyle: "italic",
                  }}>
                    {d.citation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3: Tech stack */}
        <section style={{
          width: "100%",
          padding: "60px 32px",
          background: "transparent",
          borderTop: "1px solid rgba(74,92,106,0.1)",
        }}>
          <div style={{
            maxWidth: 900, margin: "0 auto",
          }}>
            <div style={{
              textAlign: "center", marginBottom: 40,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#7C5CBF",
                display: "block", marginBottom: 12,
              }}>
                Technical stack
              </span>
              <h2 style={{
                fontSize: "clamp(22px,3vw,36px)",
                fontWeight: 700, color: "#CCD0CF",
                letterSpacing: "-0.02em",
              }}>
                Production-grade components.
              </h2>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(200px,1fr))",
              gap: 10,
            }}>
              {[
                {
                  layer: "Optimizer",
                  tools: ["CVXPY", "CLARABEL solver",
                          "NumPy", "SciPy"],
                  color: "#7C5CBF",
                  result: "46.3% peak reduction",
                },
                {
                  layer: "ML Engine",
                  tools: ["Prophet (Meta)",
                          "Isolation Forest",
                          "scikit-learn"],
                  color: "#00D4AA",
                  result: "MAPE 0.83%, F1 0.95",
                },
                {
                  layer: "Physics",
                  tools: ["pandapower 3.4.0",
                          "AC power flow",
                          "7-bus network"],
                  color: "#4ECDC4",
                  result: "14 violations → 0",
                },
                {
                  layer: "Backend",
                  tools: ["FastAPI", "uvicorn",
                          "SQLAlchemy", "SQLite"],
                  color: "#9BA8AB",
                  result: "10 REST endpoints",
                },
                {
                  layer: "Frontend",
                  tools: ["Next.js 16",
                          "TypeScript",
                          "Recharts", "Framer Motion"],
                  color: "#F9CA24",
                  result: "Live on Vercel",
                },
                {
                  layer: "Charger Control",
                  tools: ["OCPP 1.6",
                          "WebSockets",
                          "SetChargingProfile"],
                  color: "#27AE60",
                  result: "10 mock chargers",
                },
              ].map(s => (
                <div key={s.layer} style={{
                  background: "#11212D",
                  border: "1px solid rgba(74,92,106,0.2)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  borderLeft: `3px solid ${s.color}`,
                }}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: s.color,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}>
                    {s.layer}
                  </div>
                  {s.tools.map(t => (
                    <div key={t} style={{
                      fontSize: 12,
                      color: "#9BA8AB",
                      padding: "2px 0",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}>
                      <span style={{
                        width: 4, height: 4,
                        borderRadius: "50%",
                        background: s.color,
                        opacity: 0.6,
                        flexShrink: 0,
                      }} />
                      {t}
                    </div>
                  ))}
                  <div style={{
                    marginTop: 10,
                    fontSize: 11,
                    color: s.color,
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                  }}>
                    → {s.result}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 4: Interactive Calculator */}
        <section style={{
          width: "100%",
          padding: "60px 32px",
          background: "transparent",
          borderTop:
            "1px solid rgba(74,92,106,0.1)",
        }}>
          <div style={{
            maxWidth: 900, margin: "0 auto",
          }}>
            <div style={{
              textAlign: "center",
              marginBottom: 40,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#7C5CBF",
                display: "block", marginBottom: 12,
              }}>
                Interactive calculator
              </span>
              <h2 style={{
                fontSize: "clamp(22px,3vw,36px)",
                fontWeight: 700, color: "#CCD0CF",
                letterSpacing: "-0.02em",
                marginBottom: 12,
              }}>
                Change the inputs.
                Watch the math update.
              </h2>
              <p style={{
                fontSize: 14, color: "#9BA8AB",
                maxWidth: 520,
                margin: "0 auto",
                lineHeight: 1.6,
              }}>
                Drag the sliders to see how fleet size,
                tariff rates, and charger mix affect the
                optimizer output. Every calculation is
                shown step by step.
              </p>
            </div>
            <LiveCalculator />
          </div>
        </section>

        <FeatureSection />

        {/* Footer */}
        <footer style={{
          padding: "24px 32px",
          borderTop: "1px solid rgba(74,92,106,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <span style={{ fontSize: 11, color: "#4A5C6A" }}>
            GridPilot v1.0 | Corporate EV Depot, Gurugram | Modeled on Lithium Urban Technologies fleet profile
          </span>
          <span style={{ fontSize: 11, color: "#00D4AA" }}>
            Powered by FirstFlight ⚡
          </span>
        </footer>
      </main>
    </>
  );
}


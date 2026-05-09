import HeroSection from "@/components/HeroSection";
import GridPilotCharts from "@/components/charts/GridPilotCharts";
import FeatureSection from "@/components/FeatureSection";

export default function Home() {
  return (
    <>
      {/* Nav */}
      <nav style={{
        position: "fixed", top: 0, left: 0,
        right: 0, zIndex: 50,
        padding: "0 32px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(6,20,27,0.8)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(74,92,106,0.15)",
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
          <span style={{
            fontSize: 10, color: "#00D4AA",
            padding: "3px 10px",
            border: "1px solid rgba(0,212,170,0.3)",
            borderRadius: 20,
            background: "rgba(0,212,170,0.05)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}>
            Powered by FirstFlight
          </span>
        </div>
      </nav>

      <main className="min-h-screen bg-background">
        <HeroSection />

        <section id="live-demo" style={{
          width: "100%",
          padding: "80px 32px",
          background: "var(--bg)",
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
                CVXPY convex QP solved in 4,576ms for 500 vehicles.
                pandapower AC power flow validates every result.
                CEA India 2022-23 carbon data.
              </p>
            </div>
            <GridPilotCharts />
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

"use client";
import { motion } from "framer-motion";

const stats = [
  {
    value: "54.0%",
    label: "Peak Load Reduced",
    detail: "Drop in the depot's peak transformer draw between an unmanaged night (every EV charges at full power on arrival) and GridPilot's optimized schedule, for the reference 40-vehicle depot run: (unmanaged peak − optimized peak) ÷ unmanaged peak.",
  },
  {
    value: "₹56k",
    label: "Monthly Savings",
    detail: "Demand-charge savings from shaving that peak, at DVVNL's ₹350/kW demand charge rate: kW of peak avoided × ₹350, extrapolated over a month.",
  },
  {
    value: "40",
    label: "EVs Orchestrated",
    detail: "Vehicles charging simultaneously in the reference depot run behind this number. Try the live Demo mode to see anywhere from 10 to 200 vehicles — depot capacity scales with fleet size.",
  },
  {
    value: "0",
    label: "Overload Events",
    detail: "15-minute intervals where total load exceeded the transformer's safe limit under GridPilot's schedule — zero, because the optimizer enforces that limit as a hard constraint, not a target.",
  },
];

export default function HeroSection() {
  return (
    <section className="relative w-full min-h-screen flex flex-col
      items-center justify-center overflow-hidden bg-transparent">

      {/* Content */}
      <div className="relative z-10 text-center
                      px-4 md:px-8 max-w-5xl mx-auto">


        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold
            tracking-tight text-[#E2E8F0] leading-none mb-6"
        >
          Grid Intelligence.
          <br />
          <span className="gradient-text">
            For{" "}
          </span>
          <span style={{
            background: "linear-gradient(180deg, #FF9933 15%, #FFFFFF 50%, #138808 85%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            display: "inline-block",
          }}>
            India&apos;s
          </span>
          <span className="gradient-text">
            {" "}EV future.
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-xl text-[#9BA8AB]
            max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          GridPilot prevents transformer overloads at EV
          depots using convex optimization. 40 vehicles.
          Zero overloads. ₹0.56 lakh saved every month.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center
            justify-center gap-4 mb-20"
        >
          <button
            suppressHydrationWarning
            onClick={() => {
              document.getElementById("live-demo")
                ?.scrollIntoView({ behavior: "smooth" })
            }}
            className="relative px-8 py-3.5 text-sm font-semibold
              rounded-full text-white overflow-hidden
              transition-all hover:-translate-y-0.5"
            style={{
              background: "#7C5CBF",
              boxShadow: `0 4px 20px rgba(124,92,191,0.4),
                          0 1px 0 rgba(255,255,255,0.06) inset`
            }}
          >
            View Live Demo ↗
          </button>
          <a
            href="https://github.com/Aaryan658/gridpilot"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 text-sm font-semibold
              rounded-full border text-white transition-all
              hover:bg-[#11212D] no-underline"
            style={{ borderColor: "rgba(74,92,106,0.5)" }}
          >
            Read the Paper ↓
          </a>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4
            max-w-3xl mx-auto"
        >
          {stats.map((stat, i) => (
            <div key={stat.label} className="relative group">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                className="relative overflow-hidden p-6 rounded-2xl
                           bg-white/10 backdrop-blur-xl border border-white/10
                           hover:-translate-y-1 transition-all duration-300
                           shadow-[0_8px_32px_rgba(0,0,0,0.5)] cursor-help"
              >
                {/* Subtle top glare */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent" />

                {/* Background accent glow - now permanent */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#00D4AA]/10 opacity-100" />

                <div
                  className="relative z-10 text-3xl md:text-4xl font-extrabold mb-2
                    tabular-nums tracking-tight"
                  style={{ color: "#FFF", textShadow: "0 2px 15px rgba(255,255,255,0.2)" }}
                >
                  {stat.value}
                </div>
                <div className="relative z-10 text-[10px] md:text-xs text-[#00D4AA]
                  uppercase tracking-widest font-semibold">
                  {stat.label}
                </div>
              </motion.div>

              {/* Hover explanation dropdown */}
              <div
                className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-30
                  w-56 sm:w-64 max-w-[80vw] -translate-x-1/2 translate-y-1 opacity-0 scale-95
                  transition-all duration-200 ease-out
                  group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0
                  group-hover:pointer-events-auto"
              >
                <div className="rounded-xl border border-white/10 bg-[#0B1620]/95
                  backdrop-blur-xl p-4 shadow-2xl shadow-black/60 text-left">
                  <p className="text-white text-xs font-bold mb-1.5">{stat.label}</p>
                  <p className="text-[#9BA8AB] text-[11px] leading-relaxed">{stat.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 w-full h-40
        bg-gradient-to-t from-background to-transparent
        z-10 pointer-events-none" />
    </section>
  );
}


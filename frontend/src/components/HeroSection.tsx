"use client";
import { motion } from "framer-motion";

const stats = [
  { value: "55.1%", label: "Peak Load Reduced" },
  { value: "₹8.60L", label: "Monthly Savings" },
  { value: "600", label: "EVs Orchestrated" },
  { value: "0", label: "Overload Events" },
];

export default function HeroSection() {
  return (
    <section className="relative w-full min-h-screen flex flex-col
      items-center justify-center overflow-hidden bg-transparent">

      {/* Content */}
      <div className="relative z-10 text-center
                      px-4 md:px-8 max-w-5xl mx-auto">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5
            rounded-full border mb-8"
          style={{
            borderColor: "rgba(0,212,170,0.3)",
            background: "rgba(0,212,170,0.05)"
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full
            bg-[#00D4AA] animate-pulse" />
          <span className="text-xs font-semibold tracking-widest
            uppercase text-[#00D4AA]">
            Powered by FirstFlight
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold
            tracking-tight text-white leading-none mb-6"
        >
          Grid Intelligence.
          <br />
          <span className="gradient-text">
            For India&apos;s EV future.
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
          depots using convex optimization. 600 vehicles.
          Zero overloads. ₹8.60 lakh saved every month.
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
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.08 }}
              className="card-premium p-5 text-center"
            >
              <div
                className="text-3xl font-bold mb-1
                  tabular-nums"
                style={{ color: "#CCD0CF" }}
              >
                {stat.value}
              </div>
              <div className="text-xs text-[#4A5C6A]
                uppercase tracking-wider font-medium">
                {stat.label}
              </div>
            </motion.div>
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


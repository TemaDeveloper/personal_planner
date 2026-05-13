"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { fadeUp, staggerContainer } from "@/lib/motion";

const DEMO_TEXT = "I resell monitors on Facebook Marketplace and go to the gym 5 days a week...";
const DEMO_SECTIONS = [
  { name: "Monitor Reselling", color: "#22C55E" },
  { name: "Gym", color: "#14B8A6" },
  { name: "Finances", color: "#A78BFA" },
];

export function Hero() {
  const [typedText, setTypedText] = useState("");
  const [showSections, setShowSections] = useState(false);

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < DEMO_TEXT.length) {
        setTypedText(DEMO_TEXT.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
        setTimeout(() => setShowSections(true), 400);
      }
    }, 35);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-24">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-[120px]" style={{ background: "var(--accent-color)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-[100px]" style={{ background: "#A78BFA" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-[150px]" style={{ background: "#60A5FA" }} />
      </div>

      <motion.div
        className="max-w-4xl mx-auto text-center"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {/* Badge */}
        <motion.div variants={fadeUp} className="mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold surface-card" style={{ color: "var(--accent-color)" }}>
            <Sparkles size={12} />
            AI-Powered Planner
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          Track anything,{" "}
          <span style={{ color: "var(--accent-color)" }}>your way</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={fadeUp}
          className="text-lg sm:text-xl max-w-2xl mx-auto mb-10"
          style={{ color: "var(--text-muted)" }}
        >
          Describe what you want to track. AI builds your personalized planner
          with custom sections, smart fields, and a beautiful dashboard.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold transition-all hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
            style={{
              background: "var(--accent-color)",
              color: "var(--primary-foreground)",
              boxShadow: "0 0 24px var(--accent-glow), var(--shadow-card)",
            }}
          >
            Get Started Free
            <ArrowRight size={18} />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold surface-card transition-all hover:-translate-y-0.5 cursor-pointer"
            style={{ color: "var(--text-primary)" }}
          >
            See how it works
          </a>
        </motion.div>

        {/* Live demo card */}
        <motion.div
          variants={fadeUp}
          className="max-w-2xl mx-auto surface-elevated rounded-2xl p-6 text-left"
          style={{ boxShadow: "var(--shadow-overlay)" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Try it — describe what you track
          </p>
          <div className="rounded-xl p-4 mb-4" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>
              {typedText}
              <span className="inline-block w-0.5 h-4 ml-0.5 align-text-bottom animate-pulse" style={{ background: "var(--accent-color)" }} />
            </p>
          </div>

          {/* Generated sections */}
          {showSections && (
            <motion.div
              className="flex flex-wrap gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {DEMO_SECTIONS.map((s, i) => (
                <motion.span
                  key={s.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{
                    background: `${s.color}15`,
                    color: s.color,
                    border: `1px solid ${s.color}30`,
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.12, type: "spring", stiffness: 400, damping: 25 }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </motion.span>
              ))}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </section>
  );
}

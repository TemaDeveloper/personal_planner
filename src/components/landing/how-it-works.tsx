"use client";

import { motion } from "framer-motion";
import { MessageSquareText, SlidersHorizontal, BarChart3 } from "lucide-react";
import { staggerContainer, fadeUp } from "@/lib/motion";

const STEPS = [
  {
    icon: MessageSquareText,
    step: "01",
    title: "Describe",
    description: "Tell the AI what you want to track in plain language. No forms, no setup wizards.",
  },
  {
    icon: SlidersHorizontal,
    step: "02",
    title: "Review",
    description: "AI creates custom sections with tailored fields. Toggle on/off, edit anything before saving.",
  },
  {
    icon: BarChart3,
    step: "03",
    title: "Track",
    description: "Start logging daily. See your progress on the dashboard calendar and stat cards.",
  },
];

export function HowItWorks() {
  return (
    <section className="px-6 py-24">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4" style={{ color: "var(--text-primary)" }}>
            How it works
          </h2>
          <p className="text-base max-w-lg mx-auto" style={{ color: "var(--text-muted)" }}>
            From description to dashboard in under a minute.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {STEPS.map((step, i) => (
            <motion.div key={step.step} variants={fadeUp} className="relative text-center">
              {/* Connector line (between cards) */}
              {i < STEPS.length - 1 && (
                <div
                  className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px"
                  style={{ background: "var(--glass-border)" }}
                />
              )}

              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: "var(--accent-glow)", color: "var(--accent-color)" }}
              >
                <step.icon size={24} />
              </div>

              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: "var(--accent-color)" }}
              >
                Step {step.step}
              </p>

              <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                {step.title}
              </h3>

              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

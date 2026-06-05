"use client";

import { motion } from "framer-motion";
import { MessageSquareText, SlidersHorizontal, BarChart3 } from "lucide-react";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { Card } from "@/components/ui/card";

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
          className="mb-16"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        >
          <p className="stat-label mb-2">Process</p>
          <h2
            className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            How it works
          </h2>
          <p className="text-base max-w-lg" style={{ color: "var(--text-muted)" }}>
            From description to dashboard in under a minute.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {STEPS.map((step, i) => (
            <motion.div key={step.step} variants={fadeUp} className="relative">
              {/* Connector line between cards */}
              {i < STEPS.length - 1 && (
                <div
                  className="hidden md:block absolute top-10 left-[62%] w-[76%] h-px"
                  style={{ background: "var(--border)" }}
                />
              )}

              <Card variant="default" padding="lg" className="rounded-2xl text-left">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: "var(--accent-glow)", color: "var(--accent-color)" }}
                >
                  <step.icon size={22} />
                </div>

                <p
                  className="stat-label mb-2"
                  style={{ color: "var(--accent-text)" }}
                >
                  Step {step.step}
                </p>

                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {step.title}
                </h3>

                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {step.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

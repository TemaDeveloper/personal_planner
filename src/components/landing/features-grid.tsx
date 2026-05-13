"use client";

import { motion } from "framer-motion";
import { Sparkles, Puzzle, Calendar, Sun, Layers, GitFork } from "lucide-react";
import { staggerContainer, scaleIn } from "@/lib/motion";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI-Powered Setup",
    description: "Describe what you do in plain English. AI creates your personalized tracker with smart fields tailored to your exact activity.",
    large: true,
  },
  {
    icon: Puzzle,
    title: "Custom Sections",
    description: "Monitor reselling, marathon training, crypto trading — any activity gets its own tracker with the right fields.",
    large: true,
  },
  {
    icon: Calendar,
    title: "Activity Calendar",
    description: "See your entire month at a glance with color-coded activity dots across all sections.",
    large: false,
  },
  {
    icon: Sun,
    title: "Light & Dark Mode",
    description: "System-aware glassmorphism that looks stunning in both modes.",
    large: false,
  },
  {
    icon: Layers,
    title: "13+ Built-in Trackers",
    description: "Gym, work hours, habits, study, health, reading, journal, and more — ready to use.",
    large: false,
  },
  {
    icon: GitFork,
    title: "Open Source",
    description: "Free forever. Self-hostable. No subscription. No tracking. Your data stays yours.",
    large: false,
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="px-6 py-24">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4" style={{ color: "var(--text-primary)" }}>
            Everything you need
          </h2>
          <p className="text-base max-w-lg mx-auto" style={{ color: "var(--text-muted)" }}>
            A planner that adapts to you — not the other way around.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={scaleIn}
              className={`surface-card rounded-2xl p-6 transition-all hover:-translate-y-1 cursor-default ${
                feature.large ? "lg:col-span-2" : ""
              }`}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "var(--accent-glow)", color: "var(--accent-color)" }}
              >
                <feature.icon size={20} />
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

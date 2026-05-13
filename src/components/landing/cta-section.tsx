"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, GitFork } from "lucide-react";
import { fadeUp, staggerContainer } from "@/lib/motion";

export function CTASection() {
  return (
    <section className="px-6 py-24">
      <motion.div
        className="max-w-3xl mx-auto text-center surface-elevated rounded-3xl p-12 sm:p-16 relative overflow-hidden"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
      >
        {/* Background glow */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full opacity-20 blur-[80px]" style={{ background: "var(--accent-color)" }} />
        </div>

        <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Start tracking in 30 seconds
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="text-base mb-8 max-w-md mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            No credit card. No setup complexity. Just describe what you do
            and start tracking immediately.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold transition-all hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
              style={{
                background: "var(--accent-color)",
                color: "var(--primary-foreground)",
                boxShadow: "0 0 24px var(--accent-glow)",
              }}
            >
              Get Started Free
              <ArrowRight size={18} />
            </Link>
            <a
              href="https://github.com/TemaDeveloper/personal_planner"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold surface-card transition-all hover:-translate-y-0.5 cursor-pointer"
              style={{ color: "var(--text-primary)" }}
            >
              <GitFork size={18} />
              Star on GitHub
            </a>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="text-xs mt-6"
            style={{ color: "var(--text-muted)" }}
          >
            Free & open source — MIT License
          </motion.p>
        </motion.div>
      </motion.div>
    </section>
  );
}

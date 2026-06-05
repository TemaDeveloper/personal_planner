"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, GitFork } from "lucide-react";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { Card } from "@/components/ui/card";

export function CTASection() {
  return (
    <section className="px-6 py-24">
      <motion.div
        className="max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
      >
        <Card variant="default" padding="lg" className="rounded-2xl p-10 sm:p-14 text-center">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <motion.p variants={fadeUp} className="stat-label mb-3">
              Get started
            </motion.p>

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
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold transition-colors hover:opacity-90 active:scale-[0.98] cursor-pointer"
                style={{
                  background: "var(--accent-color)",
                  color: "var(--primary-foreground)",
                  minHeight: "44px",
                }}
              >
                Get Started Free
                <ArrowRight size={18} />
              </Link>
              <a
                href="https://github.com/TemaDeveloper/personal_planner"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold surface-card transition-colors hover:opacity-80 cursor-pointer"
                style={{ color: "var(--text-primary)", minHeight: "44px" }}
              >
                <GitFork size={18} />
                Star on GitHub
              </a>
            </motion.div>

            <motion.p
              variants={fadeUp}
              className="text-xs mt-6"
              style={{ color: "var(--text-faint)" }}
            >
              Free & open source — MIT License
            </motion.p>
          </motion.div>
        </Card>
      </motion.div>
    </section>
  );
}

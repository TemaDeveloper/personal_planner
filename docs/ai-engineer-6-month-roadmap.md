# Becoming a Good AI Software Engineer — Step-by-Step Roadmap

A practical, ordered set of steps to go from "can code" to "can design, build, and ship reliable AI-powered software." Work through the phases in order. Each step ends with a concrete artifact, not just "I studied it."

---

## Phase 0 — Prerequisites

1. Be comfortable in one strong backend language (Python and/or TypeScript).
2. Know HTTP/REST, JSON, async, and how to call and design APIs.
3. Use git fluently — branches, PRs, code review.
4. Be able to deploy a web app (any cloud or platform).
5. Know basic SQL and one database.

> If any of these are shaky, fix them first. AI engineering is software engineering with a model in the loop — the software part still has to be solid.

---

## Phase 1 — LLM Fundamentals

**Goal:** Stop being a prompt user, become an API builder.

1. Understand the mental model: tokens, context windows, temperature, system vs. user messages, why models hallucinate.
2. Learn one LLM API end-to-end (completions, streaming, system prompts).
3. Master **structured output** — make the model return validated JSON, not free text.
4. Master **tool / function calling** — let the model trigger your code.
5. Learn cost & latency control: token estimation, prompt caching, streaming for UX.
6. Learn prompt-injection basics — treat all model input/output as untrusted.

**Artifact:** A small app where a model returns validated structured output and calls at least one tool.

---

## Phase 2 — Prompting & Context Engineering

**Goal:** Get reliable behavior out of a non-deterministic system.

1. Learn prompting patterns: clear instructions, examples (few-shot), role/system framing, decomposition.
2. Learn when *not* to prompt-engineer and instead add tools, retrieval, or code.
3. Learn context management: what to put in context, what to leave out, ordering effects.
4. Learn output reliability: validation, retries, fallbacks when the model misbehaves.

**Artifact:** A documented prompt + a before/after showing measurable improvement in reliability.

---

## Phase 3 — RAG (Retrieval-Augmented Generation)

**Goal:** Give models knowledge they weren't trained on.

1. Understand embeddings and vector similarity search.
2. Learn chunking strategies, metadata, and hybrid (keyword + vector) search.
3. Set up a vector store (e.g. pgvector or a managed option).
4. Build a full pipeline: documents → chunks → embeddings → store → retrieve → answer **with citations**.
5. Learn RAG failure modes: bad retrieval, lost-in-the-middle, hallucinated citations, bad chunk boundaries.

**Artifact:** A deployed RAG app that answers questions over a document set with citations.

---

## Phase 4 — Agents

**Goal:** Make the model *do things*, in a loop, safely.

1. Understand the agent loop: model decides → calls a tool → reads result → repeats → stops.
2. **Build the loop by hand once** before using any framework, so you understand it.
3. Learn tool design: clean schemas, error handling, fewer/better tools.
4. Learn human-in-the-loop: approval gates, dry-run/preview, safe execution.
5. Learn **MCP (Model Context Protocol)** — use a server, then write your own.
6. Learn multi-agent orchestration and, crucially, *when a single good agent beats multiple*.

**Artifact:** An agent that completes a real multi-step task with tools, a stop condition, and guardrails. Bonus: publish an MCP server.

---

## Phase 5 — Evaluation & Reliability (the differentiator)

**Goal:** Prove your AI works — don't vibe-check it. This is what separates "did a tutorial" from "owns AI in production."

1. Build golden datasets (input → expected outcome).
2. Learn LLM-as-judge and automated scoring.
3. Add regression tests for prompts/agents and run them in CI.
4. Measure quality: accuracy, faithfulness, hallucination rate, retrieval precision/recall.
5. Add observability: trace latency, tokens, and cost per request.
6. Add guardrails: input validation, prompt-injection defense, PII handling.

**Artifact:** An eval suite running in CI for one of your earlier projects, plus a cost/latency dashboard.

---

## Phase 6 — Productionization

**Goal:** Ship AI that survives real traffic.

1. Caching, rate-limit handling, retries, and provider fallbacks.
2. Streaming responses for good UX.
3. Cost monitoring and budgets.
4. Security: untrusted input, output sanitization, secrets, abuse prevention.
5. Versioning prompts/models and rolling back safely.

**Artifact:** One project hardened for production with caching, monitoring, and a documented failure/fallback strategy.

---

## Phase 7 — Capstone Project

**Goal:** Build the thing that proves you can do the whole job.

1. Pick a real problem and build an **agentic app** that combines everything: tools, retrieval, an agent loop, evals, guardrails, and a clean UX.
2. Write your own MCP server or a meaningful set of tools.
3. Deploy it, document the architecture (with a diagram), and write up the tradeoffs.
4. Open-source it with a strong README and a demo.

**Artifact:** A deployed, documented, open-source capstone you can deep-dive in an interview.

---

## The Skill → Proof Map

| Skill | Proof you can claim |
|---|---|
| LLM API / structured output / tool use | Phase 1 app |
| Prompting & context engineering | Phase 2 before/after |
| RAG / embeddings | Phase 3 app with citations |
| Agents / MCP | Phase 4 agent + MCP server |
| **Evals & reliability** | CI eval suite + dashboards |
| Production readiness | Hardened, monitored service |
| End-to-end ownership | Capstone |

---

## Recommended Tech Stack (pick once, go deep)

- **Language:** TypeScript and/or Python.
- **Models:** One primary provider (e.g. Claude), plus literacy in a second so you can speak to multi-provider tradeoffs.
- **RAG:** pgvector or a managed vector store + an embeddings model.
- **Protocol:** MCP — build a server.
- **Evals/observability:** start hand-rolled (proves understanding), then adopt a tool.
- **Deploy:** any cloud you know well.

---

## Habits of a Good AI Software Engineer

1. **Ship artifacts, not study sessions.** Every week ends with something deployed, merged, or measured.
2. **Build the AI core by hand before automating it.** Understand the loop, the RAG pipeline, the eval — then go fast.
3. **Measure everything.** If you can't show an eval score, you don't know if it works.
4. **Treat model output as untrusted.** Validate, guard, and assume prompt injection.
5. **Optimize for cost and latency**, not just correctness — production cares about all three.
6. **Stay current cheaply.** ~20 min/day on release notes and a couple of practitioner sources. Fundamentals barely change; hype does.
7. **One stack, one thing at a time.** Depth beats breadth early.

---

## Core Resources

- The official docs of your chosen LLM provider (read them deeply, not just skim).
- A canonical "building effective agents" guide — read it more than once.
- One structured course per phase (fundamentals → agents → evals → RAG), each tied to an artifact.
- A small set of high-signal AI-engineering newsletters/practitioners.

> A course only counts when it produces a commit. Tie every module to a deliverable.

---

## The One-Line Summary

> Learn the model API, then context engineering, then RAG, then agents, then **evals and production reliability** — and prove each phase with a shipped artifact, finishing with one open-source capstone. The engineers who get hired are the ones who can *measure* and *ship* AI, not just demo it.

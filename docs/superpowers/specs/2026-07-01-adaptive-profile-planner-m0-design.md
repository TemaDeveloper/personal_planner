# Adaptive, Profile-Driven Planner — Program Design + M0 Spec

**Date:** 2026-07-01
**Status:** Draft for review
**Supersedes/extends:** Vision V2 (fully dynamic AI-generated sections). This document adds the *organizing brain* (a living profile) and the *principle* that removes rigidity at every layer.

---

## 1. Problem

Lifora bakes in one kind of life. Concretely: work earnings assume a car commute with fuel deducted from pay; the gym section assumes a 5-day attendance grid; currency defaults to CAD; sections are a fixed enum of 13 with privileged, code-bound UIs; life-area grouping is hardcoded. Two people with genuinely different lives (a remote cyclist-freelancer, a carless student, a person pacing a chronic illness) open the *same* app and most of it is noise or actively wrong.

The goal is not "more settings." It is an app that understands **who you are** and reshapes every section around your actual life — so two users can open Lifora and share almost nothing.

## 2. North Star (program-level)

### 2.1 The principle: Seed → Generate → Learn-back. No fixed enums, anywhere.

Every layer keeps a library of **common priors** (cheap, instant, deterministic) **and** an unbounded **generative path** for the long tail. Whatever the generator invents for a novel person is folded back into the library, so the next similar person gets it for free. The system grows; it never caps.

This is a generalization of a pattern already shipped for sections (the `SectionTemplate` embedding + reuse + dedup pipeline). We extend the same treatment to the **profile** and to **computations**.

| Layer | Seed (common, instant) | Generative path (long tail) | Learn-back |
|---|---|---|---|
| **Profile facets** | growing facet vocabulary | AI mints a new facet from the conversation | embed + dedup into vocab |
| **Sections** | template library | AI-generated `SectionTemplate` | already shipped |
| **Views** | built React components | AI `layoutHtml` / composed view *(exists today)* | promote hot layouts → components |
| **Computations** | primitive kit (streak, pace/ETA, ceiling, net, cycle, countdown, rolling-avg…) | AI-composed formula/derivation | promote common formulas → primitives |

### 2.2 The profile is an open bag of "life facets" — not a fixed schema

A **facet** is `{ key, dimension (open string), value, salience (0–1), source }`. A person has as many facets as their life needs (6 or 30), never forced into a fixed column set. `salience` decides whether a facet becomes a section, a dashboard KPI, or quiet context. The ~12 dimensions observed across the 100-persona corpus (livelihood, mobility, time-structure, movement, health/care, learning, home, people, money, craft, values, big-arcs) are **seeds for interview coverage and UI grouping only** — the AI may mint dimensions outside them (e.g. "off-grid solar/water budget", "monastic daily office") with zero code change.

The profile is a **living source of truth**: when a fact changes, sections re-adapt (with destructive changes — e.g. deleting a section holding months of data — requiring confirmation).

### 2.3 Capability layers

1. **Profile** — open facets, living, versioned; facet-vocabulary library.
2. **Conversation** — AI onboarding + ongoing profile chat; structured facet extraction.
3. **Generation** — facets → section specs (reuse-or-invent).
4. **Capability/body** — enriched section spec: expanded view vocabulary, computation primitive kit + evaluator + formula fallback, structural patterns (per-entity repetition, alternating A/B, multi-instance), time/location providers.
5. **Reconciliation** — profile change → diff → propose/apply, guarding destructive deletes; dashboard salience assembly.

### 2.4 Decomposition & sequencing

- **M0 — Walking skeleton** (this spec): thin end-to-end slice on 3 personas, reusing existing machinery. De-risks the architecture.
- **SP-1 — Capability layer:** ~12 view components; computation primitive kit + evaluator + formula fallback; structural patterns; time/location providers; learn-back for computations/views.
- **SP-2 — The brain:** full conversational onboarding + ongoing chat; open-facet profile (versioned, salience, provenance) + facet vocabulary library (embeddings/dedup/learn-back); generation engine.
- **SP-3 — Dissolve built-ins:** convert 13 built-ins → seed templates; migrate user data; retire rigid enums + baked assumptions (fuel/gym=5/CAD/life-area grouping).
- **SP-4 — Living re-adaptation:** reconciliation engine; profile editor UI; salience-driven dashboard.

Each sub-project gets its own spec → plan → implementation cycle.

---

## 3. M0 — Walking Skeleton

### 3.1 Objective

Prove the loop **description → open facets → one generated adaptive section → compute → render** end-to-end, on three deliberately contrasting personas, adding the minimum new code and touching **no** existing built-in section. Success means the same code path produces three demonstrably different sections with three different computations — with zero persona-specific branching.

### 3.2 Acceptance personas (the test corpus)

Chosen so each exercises one new computation kind and none needs structural patterns (deferred to SP-1):

| Persona | Facet that drives it | Section generated | Computation kind |
|---|---|---|---|
| **Marcus** (rideshare driver) | livelihood: per-trip; mobility: car-is-the-job | Trips & Earnings | **net-subtract**: `net = gross + tips − fuel − depreciation` |
| **Ella** (saving for a house) | big-arc: down-payment goal | Escape/Savings Fund | **pace/ETA**: `eta = today + (target − saved) ÷ weekly_rate` |
| **Grace** (ME/CFS pacing) | health: chronic; movement: ceiling-not-goal | Gentle Movement | **ceiling**: warn when `value > cap` (inverted metric) |

### 3.3 Scope

**In:**
- Minimal **open-facet profile** persisted per user.
- **Facet extraction**: free-text (or short Q&A) → validated facet list via existing `callAI`.
- **Facet-conditioned generation**: facets → one/few `SectionTemplate` specs, each field optionally carrying a **typed computation**.
- **Computation model + deterministic evaluator** for three primitives: `net`, `pace_eta`, `ceiling`.
- **Rendering** of computed values (reuse existing views/`layoutHtml`) + a ceiling warning state.
- A dev harness/route to run a persona description through the loop and inspect output.

**Out (deferred):**
- Conversational UX polish, ongoing profile chat → SP-2.
- Facet vocabulary library w/ embeddings/dedup/learn-back → SP-2 (M0 mints facets without dedup).
- Full ~12 view components → SP-1 (M0 uses existing views + `layoutHtml`).
- Structural patterns (per-entity, alternating A/B) → SP-1 (personas chosen to avoid them).
- Living reconciliation on change → SP-4 (M0 generates once).
- Migrating/altering built-ins → SP-3 (M0 is purely additive).

### 3.4 Architecture & data model

**New model — `src/lib/models/life-profile.ts`:**
```
LifeProfile { userId, facets: LifeFacet[], version, createdAt, updatedAt }
LifeFacet   { key, dimension: string, value: string, salience: number(0..1),
              source: "asked" | "inferred" | "stated" }
```
`dimension` is a free string (open vocabulary). One `LifeProfile` per user.

**Computation model — extend `IFieldDefinition` (`section-template.ts`):**
Today `formula?: string` does arithmetic interpolation in the layout renderer. Add an optional **typed** computation alongside it (keep `formula` for back-compat):
```
computation?: {
  kind: "net" | "pace_eta" | "ceiling";
  params: Record<string, string | number>;  // references to field keys / literals
}
```
Rationale: a small explicit typed spec is safer and unit-testable vs. free-form eval, and it seeds SP-1's primitive kit. Examples:
- net → `{ kind:"net", params:{ add:["gross","tips"], subtract:["fuel","depreciation"] } }`
- pace_eta → `{ kind:"pace_eta", params:{ target:"target", current:"saved", ratePerWeek:"weekly_rate" } }`
- ceiling → `{ kind:"ceiling", params:{ value:"minutes", cap:"daily_cap" } }` → returns `{ ok, over }`

**New — `src/lib/compute/primitives.ts`:** pure functions `net()`, `paceEta()`, `ceiling()` + `resolveComputed(field, entryData) -> value | {ok,over} | Date`. No AI, fully deterministic.

**New — `src/lib/profile/facet-extract.ts`:** `extractFacets(input: string) -> LifeFacet[]` using `callAI` + a Zod schema (`FacetsSchema`).

**Generation — extend `src/lib/ai.ts`:** add `generateSectionsFromFacets(facets)` (may wrap existing `generatePlannerConfig`) that conditions the system prompt on facets and emits section specs whose fields may include a `computation`. M0 may skip the embeddings reuse path (generate fresh).

**Rendering — `src/components/sections/rendered-layout.tsx` (+ table/weekly views):** call `resolveComputed` for computed fields; render `pace_eta` as a date/ETA, `ceiling` with an over-limit warning style. Reuse existing view types.

**Dev harness:** a guarded route or script `POST` persona text → returns `{ facets, sections }` JSON for inspection, plus persists to a test user.

### 3.5 Data flow

```
persona text
  → extractFacets()            → LifeFacet[]  (persist to LifeProfile)
  → generateSectionsFromFacets → SectionTemplate spec(s) w/ typed computations (persist, link to user)
  → user opens section
  → renderer + resolveComputed → displays raw fields + derived values (net / ETA / ceiling-warning)
```

### 3.6 Testing strategy

Follows project TDD; **run `npm run lint` before pushing** (CI gates on lint, not just build).

- **Unit (deterministic, no AI):** `primitives.ts` — `net`, `paceEta`, `ceiling` with fixed inputs → expected outputs, incl. edge cases (zero rate → no ETA; value == cap → ok; negative net). This is the core correctness surface.
- **Contract:** `facet-extract` and `generateSectionsFromFacets` outputs validated against Zod schemas (mock or recorded AI responses so tests are deterministic).
- **Acceptance:** 3 persona fixtures → assert the generated section for each carries the intended `computation.kind` and that the three differ. Because generation is AI-nondeterministic, assert *structural* properties (right computation kind present, required fields present), not exact copy.
- **Smoke (optional, live AI):** one end-to-end run per persona behind an env flag.

### 3.7 Risks & decisions

- **AI nondeterminism** in extraction/generation → keep the compute layer deterministic and fully tested; treat AI steps as Zod-validated contracts with structural assertions + optional live smoke.
- **Additive only** — M0 must not modify built-in sections, enums, or existing user data. Everything new lives beside the current system.
- **Typed computation vs. free-form formula** — choose typed spec (3 kinds) for safety/testability; it becomes the seed of SP-1's primitive kit. `formula` string stays untouched for back-compat.
- **Persona selection** avoids structural patterns so M0 stays thin; those are the explicit first job of SP-1.

### 3.8 Files touched (M0)

- **New:** `src/lib/models/life-profile.ts`, `src/lib/profile/facet-extract.ts`, `src/lib/compute/primitives.ts`, tests under `src/lib/__tests__/`.
- **Edit:** `src/lib/models/section-template.ts` (+ `computation` on `IFieldDefinition`), `src/lib/ai.ts` (+ `generateSectionsFromFacets`), `src/components/sections/rendered-layout.tsx` (+ table/weekly views) for computed rendering, and a dev harness route.
- **Untouched:** all 13 built-in sections, their models, enums, and existing user data.

### 3.9 Definition of done (M0)

1. `primitives.ts` unit tests pass (net, pace_eta, ceiling incl. edge cases).
2. Feeding each of the 3 persona descriptions yields a persisted `LifeProfile` with sensible facets and a generated section carrying the correct `computation.kind`; the three sections are visibly different.
3. Each section renders its computed value correctly, incl. Grace's ceiling warning state.
4. `npm run lint`, `npm test`, and `npm run build` pass.
5. No changes to existing built-in sections or user data.

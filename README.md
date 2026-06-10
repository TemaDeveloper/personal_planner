# Personal Planner

<img width="100" height="100" alt="lifora-logo" src="https://github.com/user-attachments/assets/aec6bde3-864c-4f3c-a09c-5ffaae5e72a6" />
<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lifora">
  <rect width="100" height="100" rx="22" fill="#F6F3EE"/>
  <path d="M20 18 H42 V58 H82 V80 H20 Z" fill="#C0613C"/>
  <path d="M45 55 V25 A30 30 0 0 1 75 55 Z" fill="#C0613C"/>
  <path d="M45 22 A33 33 0 0 1 78 55" stroke="#9CA39B" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>



https://github.com/user-attachments/assets/5aaa328c-3ab1-441e-b843-03af806bc974



A free, open-source personal planner to track your daily life -- gym, work, habits, finances, study, and more. Self-hostable, no subscription needed.

[![CI](https://github.com/TemaDeveloper/personal_planner/actions/workflows/ci.yml/badge.svg)](https://github.com/TemaDeveloper/personal_planner/actions/workflows/ci.yml)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](CONTRIBUTING.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

- **Gym** -- Daily attendance tracker with configurable weekly goals
- **Work** -- Multi-job hour tracking, earnings calculator, expense & route logging
- **Habits** -- Daily habit tracking with streaks and custom colors
- **Finances** -- Expense categories, monthly bills, reimbursement tracking
- **Study** -- Subject-based session logging, homework, grades & academic items
- **Hobbies** -- Project management and time tracking for hobbies
- **Housework** -- Chore tracking with recurring tasks
- **Health** -- Water intake, sleep, weight, and mood logging
- **Goals** -- Goal setting with milestones across personal, career, health & financial categories
- **Reading** -- Book tracking with progress, ratings, and notes
- **Journal** -- Daily journal entries with mood tracking
- **Shopping** -- Shopping lists with quantities and prices
- **Meal Prep** -- Weekly meal planning by day and meal type

All sections are toggleable per user. Enable only what you need.

### Supervisor Sharing & View-Only Access

Share any section (or a specific job within Work) with a supervisor, manager, or collaborator. Two access modes:

- **Magic link** -- generate a URL anyone can open to view your data read-only, no account required
- **Account-based** -- invite by email, the shared section appears in their "Shared with me" sidebar

Sharing is managed in Settings > Sharing. You can set optional expiry dates, revoke access anytime, and track who has access. Email invitations are sent via Resend.

### Excel Export

Export any section's data as a `.xlsx` file -- built-in sections and custom sections alike. Each section page has a download button in the header. Custom sections use their field definitions as column headers automatically.

### AI-Generated Custom Sections & Shared Template Pool

Beyond the built-in sections, users can describe any activity in natural language (e.g., "I resell monitors on Facebook Marketplace") and the AI generates a fully custom tracking section with smart fields, formulas, and the right view type.

**How it works:**

1. **User describes what they want to track** during onboarding or setup.
2. **Semantic search** runs against a shared template pool using vector embeddings. The user's prompt is converted to a 1536-dimensional vector (via OpenAI `text-embedding-3-small`) and compared against existing templates stored in MongoDB Atlas Vector Search.
3. **Match decision** based on cosine similarity score:
   - **Strong match (>= 0.85):** The proven template is reused instantly -- no AI call needed, zero latency. Usage count is incremented.
   - **Weak match (0.70 - 0.84):** Existing templates (including their layout HTML) are passed as inspiration, and the AI generates a tailored version.
   - **No match (< 0.70):** The AI generates an entirely new section from scratch using a field-analysis system that picks the right layout structure based on field composition.
4. **Save & deduplicate:** After generation, an embedding is computed for the output template and compared to the source:
   - If the fork is significantly different (cosine distance > threshold), it's saved as a new template with a `forkedFrom` reference.
   - If it's essentially the same, the source template's usage count is incremented instead.
5. **Usage-based ranking:** Search results are weighted by usage count, so the best templates naturally rise to the top over time.

**The result:** The first user to request "dog breeding tracker" triggers a full AI generation. The next user who asks for something similar gets a faster, proven template that's adapted to their needs. The shared pool gets smarter with every user.

```
User Prompt
    │
    ▼
Generate Embedding (OpenAI text-embedding-3-small)
    │
    ▼
Vector Search (MongoDB Atlas) ──► Top 3 matches by cosine similarity
    │
    ├── Score >= 0.85 ──► Instant Reuse (no AI call, proven template)
    ├── Score 0.70-0.84 ──► Use as Inspiration (AI generates informed by matches)
    └── Score < 0.70 ──► Generate from Scratch (field-analysis-driven AI generation)
    │
    ▼
Deduplicate (compare output embedding to source)
    │
    ├── Different enough ──► Save as new template
    └── Too similar ──► Increment usage count on source
    │
    ▼
User gets their custom section
```

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** MongoDB with Mongoose
- **Auth:** NextAuth v5 (credentials + Google OAuth)
- **Styling:** Tailwind CSS 4, CSS custom properties, Framer Motion
- **Email:** Resend (share invitations)
- **Export:** ExcelJS (`.xlsx` generation)
- **AI:** Mistral, Claude, Gemini, OpenAI (multi-provider, user-configurable)
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- MongoDB (local instance or [MongoDB Atlas](https://www.mongodb.com/atlas))

### Setup

1. Clone the repository:

```bash
git clone https://github.com/TemaDeveloper/personal_planner.git
cd personal_planner
```

2. Install dependencies:

```bash
pnpm install
```

3. Create a `.env.local` file:

```env
MONGODB_URI=mongodb://localhost:27017/personal_planner
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# AI-powered onboarding (free Mistral API key from console.mistral.ai)
MISTRAL_API_KEY=your-mistral-api-key

# Optional: Shared template pool with semantic search (platform.openai.com)
OPENAI_API_KEY=your-openai-api-key

# Optional: Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Optional: Email invitations for sharing (resend.com)
RESEND_API_KEY=
```

4. Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to start using the planner.

## Deployment

The easiest way to deploy is with [Vercel](https://vercel.com):

1. Push your repo to GitHub
2. Import the project on Vercel
3. Add your environment variables (`MONGODB_URI`, `NEXTAUTH_SECRET`, `MISTRAL_API_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, Google OAuth vars)
4. Deploy

### Atlas Vector Search Index (required for shared templates)

If you want the shared template pool to work, create a vector search index in your MongoDB Atlas cluster:

1. Go to Atlas console -> your cluster -> **Atlas Search** tab
2. Click **Create Search Index** -> select **Atlas Vector Search**
3. Database: `personal-planner`, Collection: `sectiontemplates`
4. Index name: `section_template_embeddings`
5. Use the visual editor to add:
   - Field `embedding`: type **vector**, dimensions **1536**, similarity **cosine**
   - Filter field `isShared`
6. Click **Create**

To backfill embeddings for existing templates:

```bash
npx tsx src/lib/scripts/backfill-embeddings.ts
```

Without the index or `OPENAI_API_KEY`, the app still works — it just generates every section from scratch without searching the shared pool.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on setting up the dev environment, code conventions, and the PR process.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

# Personal Planner

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

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** MongoDB with Mongoose
- **Auth:** NextAuth v5 (credentials + Google OAuth)
- **Styling:** Tailwind CSS 4, CSS custom properties, Framer Motion
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

# Optional: Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
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
3. Add your environment variables (`MONGODB_URI`, `NEXTAUTH_SECRET`, Google OAuth vars)
4. Deploy

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on setting up the dev environment, code conventions, and the PR process.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

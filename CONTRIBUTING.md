# Contributing to Personal Planner

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- MongoDB instance (local or Atlas)

### Getting Started

1. Fork the repository and clone your fork:

```bash
git clone https://github.com/<your-username>/personal_planner.git
cd personal_planner
```

2. Install dependencies:

```bash
pnpm install
```

3. Create a `.env.local` file in the project root:

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

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Code Conventions

### File Naming

- **Models:** `kebab-case.ts` (e.g., `gym-attendance.ts`, `work-session.ts`)
- **Components:** `kebab-case.tsx` (e.g., `page-header.tsx`, `dashboard-cards.tsx`)
- **Pages:** `page.tsx` inside the appropriate route directory

### Component Patterns

- **Server components** for data fetching in `page.tsx` files (no `"use client"`)
- **Client components** with `"use client"` for interactivity (forms, toggles, modals)
- Use the shared `<Modal>` component from `src/components/ui/modal.tsx` for dialogs
- Use `<FormInput>` from `src/components/ui/form-input.tsx` for styled inputs
- Use `<PageHeader>` for consistent page titles

### Styling

- **Tailwind CSS 4** for utility classes
- **CSS custom properties** for theming (`var(--accent-color)`, `var(--surface-1)`, `var(--surface-2)`, `var(--border-subtle)`, `var(--text-primary)`, `var(--text-muted)`)
- Use `planner-surface` and `planner-surface-2` classes for card surfaces
- Use `animate-slide-up` for page transition animations
- Icons from `lucide-react`
- Toast notifications via `sonner`

### Database

- Mongoose models in `src/lib/models/`
- Always include proper indexes
- Use `if (mongoose.models.X) mongoose.deleteModel("X")` pattern for hot reload

## Pull Request Process

1. Create a feature branch from `main`:

```bash
git checkout -b feature/your-feature-name
```

2. Make your changes and test locally

3. Commit using [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new section for meditation tracking
fix: correct weekly target calculation on dashboard
refactor: extract modal into shared component
docs: update README with deployment instructions
chore: update dependencies
```

4. Push your branch and open a PR against `main`

5. Fill out the PR description with:
   - What the change does
   - Why the change is needed
   - How to test it

## Issue Reporting

When opening an issue, please include:

- A clear, descriptive title
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Browser and OS information
- Screenshots if applicable

## Adding a New Section

If you want to add a new trackable section (like the existing Gym, Habits, etc.):

1. Add the section ID to `SECTIONS` array in `src/lib/constants.ts`
2. Add metadata to `SECTION_META` in the same file
3. Create the Mongoose model in `src/lib/models/`
4. Create the API routes in `src/app/api/<section>/`
5. Create the page in `src/app/(app)/<section>/page.tsx`
6. Add the section to the dashboard aggregation in `src/app/(app)/dashboard/page.tsx`
7. Add the icon to `src/lib/icon-map.ts`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

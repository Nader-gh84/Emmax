# EmaX

A Next.js 14 SaaS starter built with TypeScript, Tailwind CSS, and the App Router.

## Getting started

### Prerequisites

Install [Node.js 18+](https://nodejs.org/) (includes npm).

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project structure

```
src/
├── app/
│   ├── page.tsx                 # Landing page (/)
│   ├── (auth)/
│   │   ├── login/page.tsx       # Login (/login)
│   │   └── signup/page.tsx      # Signup (/signup)
│   └── (dashboard)/
│       └── dashboard/
│           ├── page.tsx         # Dashboard (/dashboard)
│           ├── projects/page.tsx
│           └── settings/page.tsx
└── components/
    ├── auth/                    # Auth UI components
    ├── dashboard/               # Dashboard layout components
    └── layout/                  # Shared layout (header, footer)
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Login |
| `/signup` | Sign up |
| `/dashboard` | Main dashboard |
| `/dashboard/projects` | Projects |
| `/dashboard/settings` | Settings |

## Next steps

1. **Add authentication** — Integrate [NextAuth.js](https://next-auth.js.org/) or [Clerk](https://clerk.com/)
2. **Add a database** — Set up [Prisma](https://www.prisma.io/) with PostgreSQL or Supabase
3. **Protect routes** — Add middleware to guard `/dashboard/*`
4. **Add billing** — Integrate [Stripe](https://stripe.com/) for subscriptions
5. **Deploy** — Push to GitHub and deploy on [Vercel](https://vercel.com/)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

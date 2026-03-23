# DUP PM Bootcamp

This project is built step-by-step with Cursor, GitHub, Vercel, and Supabase.

## Phase 1 - Foundation

- [x] Create Next.js app with TypeScript and Tailwind
- [ ] Push project to GitHub
- [ ] Create Supabase project
- [ ] Add environment variables to `.env.local`

## Phase 2 - Supabase Setup

Install client libraries:

```bash
npm install @supabase/supabase-js
```

Create a client utility in `src/lib/supabase/client.ts` using:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Phase 3 - Database Schema (Simple Start)

Create these tables in Supabase SQL Editor:

1. `team_members`
2. `properties`
3. `property_sections`
4. `property_assignments`

Recommended assignment columns:

- `team_member_id`
- `property_id`
- `role` (`gsm`, `property_manager`, `housekeeping`, `maintenance`)

## Phase 4 - Auth + Permissions

- Enable Email auth in Supabase
- Add sign in and sign up UI
- Restrict data with Row Level Security policies

## Phase 5 - Deploy

- Connect GitHub repo to Vercel
- Add environment variables in Vercel Project Settings
- Deploy and test authentication + CRUD flow

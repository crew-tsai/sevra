# Sevra — AI-Powered Crisis Communications Platform

Sevra is an AI-driven crisis communications platform built for airlines, demoed under the brand **Aurora Skylines** (primary hub: MAD Barajas T4). It ingests social media mentions and manual reports, uses AI to triage them into structured incidents with risk scoring, generates a full communication asset package, gates publication behind a two-stage approval workflow, and maintains an append-only audit trail.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Database | PostgreSQL 15 via Supabase (self-owned project) |
| Auth | Supabase GoTrue (email + password, JWT) |
| RBAC | `user_roles` table + RLS policies (`admin`, `manager`, `coordinador`, `ejecutivo`) |
| REST API | Supabase PostgREST |
| Edge Functions | Deno (11 functions) |
| AI | Anthropic Claude via Lovable AI gateway |
| Email queue | pgmq + pg_cron + transactional email edge functions |
| Scheduler | pg_cron — `sevra-social-monitor-15min` |

---

## Features

- **SEVRA Social Intel** — Pull and auto-analyze social mentions via AI; AI classifies risk level, suggests incident type, and deduplicates against existing incidents
- **Incident Management** — Create, update, and track incidents with crisis level (L0–L4), risk score, and approval status
- **Strategy** — AI-generated response plans with short/medium/long-term phases and action items
- **Assets** — Auto-generated communication assets: press releases, social posts, internal memos, Q&As, FAQs
- **Approvals** — Two-stage approval workflow with admin comments; approve/reject incidents before publishing
- **Workflows** — Track communication workflows and task progress
- **Reports** — Analytics and incident reporting
- **Audit Log** — Append-only log of all field changes with before/after values
- **Admin Panel** — Company settings, branding, team & roles, email lists, responsibility matrix, social monitoring config
- **Agent Stripes** — 24/7 AI assistant chat (bottom-right button on every page)

---

## Project Structure

```
src/
  pages/          # Route-level page components
  components/     # Shared UI components
  integrations/   # Supabase client + generated types
  hooks/          # Custom React hooks
  lib/            # Utilities, mock data, distribution helpers
supabase/
  functions/      # 11 Deno edge functions
  migrations/     # PostgreSQL migrations (chronological)
  seed.sql        # Demo seed data (Aurora Skylines)
```

---

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- A Supabase project (free tier works)

### Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
# Edit .env.local with your Supabase project URL and publishable key

# Start dev server
npm run dev
```

### Environment Variables

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-key>
```

### Database

```bash
# Link to your Supabase project
supabase link --project-ref <your-project-ref>

# Apply all migrations
supabase db push

# Load demo seed data
supabase db query --linked < supabase/seed.sql
```

### Edge Functions

```bash
# Deploy all edge functions
supabase functions deploy

# Set required secrets
supabase secrets set ANTHROPIC_API_KEY=<your-key>
```

---

## Database Migrations

Migrations are applied in timestamp order. Key migrations:

| Migration | Purpose |
|---|---|
| `20260330` | Initial schema — incidents, social_mentions |
| `20260423` | Email infrastructure (pgmq, suppression lists) |
| `20260423` | Social monitor pg_cron job + control RPCs |
| `20260518` | `crisis_level` column + data backfill |
| `20260527` | RLS hardening (asset/audit/team policies) |
| `20260612` | Phase 1 hardening — incident_type CHECK, tags, approval RPCs |
| `20260623` | Response plans, distribution tables, audit triggers, analytics RPCs |
| `20260701` | Table-level GRANT fix (authenticated / anon / service_role) |

> **Note:** The `20260701_grant_table_privileges` migration is required on any fresh Supabase project. PostgreSQL requires explicit `GRANT` statements in addition to RLS policies.

---

## Edge Functions

| Function | Purpose |
|---|---|
| `sevra-analyze` | AI analysis of a social mention — classifies risk, creates/deduplicates incident |
| `social-monitor-cron` | Periodic job: fetches mentions, ingests, auto-analyzes |
| `social-monitor-control` | Enable/disable/status of the pg_cron monitor job |
| `generate-incident-assets` | Generates press releases, social posts, memos, Q&As via AI |
| `generate-response-plan` | Generates a structured response plan for an incident |
| `agent-stripes` | Streaming AI assistant chat (Agent Stripes) |
| `process-email-queue` | Drains the pgmq email queue and sends via transactional email |
| `send-transactional-email` | Sends a single transactional email |
| `preview-transactional-email` | Returns rendered HTML preview of an email template |
| `handle-email-unsubscribe` | Handles one-click unsubscribe tokens |
| `handle-email-suppression` | Manages email suppression list (bounces, spam complaints) |

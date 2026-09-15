# Sevra — AI-Powered Crisis Communications Platform

Sevra is an AI-driven crisis communications platform for **transportation operators** — airlines, rail, bus and coach, maritime and ferry, ride-hailing, public transit, and freight. It ingests social media mentions and manual reports, uses AI to triage them into structured incidents with risk scoring, generates a full communication asset package, gates publication behind a two-stage approval workflow, and maintains an append-only audit trail.

The workspace retunes itself to the operator: setting the transportation type in Admin → Company changes the incident field labels (a rail operator is asked for a *train number* and *station code*; a shipping line for a *voyage number* and *port code*) and briefs the AI that classifies mentions and drafts communications.

---

## Deployment model

**One deployment per client.** Each customer runs in their own Supabase project and their own database. A company's data is isolated structurally, not by policy — a misconfigured rule cannot leak one operator's unpublished holding statement to another, because they do not share a database.

The trade-off is that no single place shows the client portfolio. That is what the separate [control plane](https://github.com/roayca-tech/sevra-console) is for: each deployment reports **metadata only** (company name, transport mode, counts, health) to a central registry. Incident content never leaves the client's database.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Database | PostgreSQL 17 via Supabase (one project per client) |
| Auth | Supabase GoTrue (email + password, JWT) — **invite-only** |
| RBAC | `user_roles` table + RLS policies (`admin`, `coordinador`, `manager`, `ejecutivo`, `soporte`) |
| REST API | Supabase PostgREST |
| Edge Functions | Deno (17 functions) |
| AI | Lovable AI Gateway (`ai.gateway.lovable.dev`) — `google/gemini-2.5-flash`, `google/gemini-3-flash-preview`, `google/gemini-2.5-flash-image` |
| Email queue | pgmq + pg_cron + transactional email edge functions |
| Scheduler | pg_cron — `sevra-social-monitor-15min`, `process-email-queue-5s`, `sevra-deployment-heartbeat-15min` |

> Only `admin` currently changes what a user can do. `coordinador`, `manager` and `ejecutivo` are recorded against each person but do not yet restrict anything, and every signed-in user can read the workspace. `soporte` marks Sevra staff (see [Support access](#support-access)).

---

## Features

- **SEVRA Social Intel** — Pulls real mentions from connected X and Facebook accounts; Instagram and TikTok activity is AI-simulated until direct platform access is in place. AI classifies risk, suggests incident type, and deduplicates against existing incidents
- **Incident Management** — Create, update, and track incidents with crisis level (L0–L4), risk score, and approval status
- **Assets** — Auto-generated communication assets: press releases, holding statements, social posts, internal memos, Q&As, FAQs. Instagram and TikTok assets can carry an uploaded image/video, or an AI-generated image
- **Approvals** — Two-stage workflow: a team member sends a draft forward, an admin gives final approval. Approved assets unlock email, direct social publishing, and WhatsApp
- **Social connections** — OAuth to the operator's own X, Facebook, Instagram and TikTok accounts. X and Facebook publish directly; Instagram and TikTok fall back to copy-and-open because those platforms require media on every post
- **Reports** — Analytics and incident reporting
- **Audit Log** — Append-only log of incident field changes, plus a record of every Sevra support access
- **Admin Panel** — Company profile, branding, team & roles, email lists, responsibility matrix, social connections
- **Agent Stripes** — AI assistant chat, grounded in the workspace's live data

> **Workflows** (sidebar) is an unfinished preview. It operates on a hardcoded in-memory array: rules defined there are not persisted and nothing in the incident pipeline consults them.

---

## Project Structure

```
src/
  pages/          # Route-level page components
  components/     # Shared UI components
  integrations/   # Supabase client + generated types
  hooks/          # Custom React hooks
  lib/            # Utilities, transportation vocabulary, distribution helpers
supabase/
  functions/      # 17 Deno edge functions
  migrations/     # PostgreSQL migrations (chronological)
  seed.sql        # Optional demo data, airline-flavored — never runs automatically
```

---

## Provisioning a new client

Each client gets their own Supabase project. Run these in order; **step 4 is required** or nobody, including the client, can create an account.

```bash
# 1. Link to the client's new project
supabase link --project-ref <client-project-ref>

# 2. Apply the schema
supabase db push

# 3. Deploy the edge functions
supabase functions deploy

# 4. REQUIRED — designate who may claim the admin role.
#    Signup is invite-only and fails closed: until this is set, registration
#    is rejected for everyone. This is what prevents a stranger who finds the
#    URL from claiming the client's workspace first.
supabase db query --linked \
  "update public.bootstrap_config set bootstrap_admin_email = 'admin@clientcompany.com' where id = 1;"

# 5. Set the deployment's secrets (see table below)
supabase secrets set SITE_URL=https://<client-app-domain>

# 6. Optional — report into the control plane
supabase secrets set \
  CONTROL_PLANE_URL=https://<control-plane-ref>.supabase.co \
  HEARTBEAT_SECRET=<shared secret>
```

The client's admin then signs up with the designated address, opens **Admin**, and clicks **Claim admin role**. From that point they invite their own team — an invitation both permits registration and assigns the role automatically on signup.

An end-user walkthrough for the client's administrator is kept separately as the **Sevra Readiness Guide**.

### Secrets

| Secret | Required | Purpose |
|---|---|---|
| `LOVABLE_API_KEY` | Yes | AI gateway access for analysis, asset generation, and Agent Stripes |
| `SITE_URL` | Yes | Public app origin; used to build the OAuth return URL |
| `CONTROL_PLANE_URL` | No | Control plane project URL. Unset ⇒ the deployment does not report |
| `HEARTBEAT_SECRET` | No | Shared secret authenticating the heartbeat |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase automatically.

Per-network OAuth credentials (X, Meta, TikTok client IDs and secrets) are **not** secrets here — the client's own admin enters them in Admin → Social connections, so onboarding needs no CLI access.

### Cron jobs

`20260722160000_cron_jobs.sql` and `20260915160000_heartbeat_cron.sql` schedule the jobs but reference a Vault secret by name. Create it once per deployment:

```sql
select vault.create_secret('<service_role_key>', 'sevra_cron_service_role_key');
```

Without it the scheduled calls fail and "Continuous monitoring" stays inert.

---

## Support access

Sevra staff hold the `soporte` role on a client's deployment. Because the read policies on incidents, assets and mentions are `USING (true)`, that role can read the workspace — so it is made visible rather than implicit:

- Support accounts appear in the client's **Admin → Team & roles**
- Entering the workspace writes to `support_access_log`, shown to the client in **Audit Log**
- That table has a SELECT policy and deliberately no INSERT/UPDATE/DELETE policies: only a `SECURITY DEFINER` RPC writes, and no one can edit or erase an entry

**Limit:** this records entry *through the app*. Someone using API credentials directly could read without producing a row. Closing that fully needs `pgaudit` or routing reads through logging functions.

---

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Setup

```bash
npm install

# Create .env.local in the project root with your project's values:
#   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
#   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-key>

npm run dev
```

### Optional demo data

`supabase/seed.sql` contains an airline-flavored demo dataset (Aurora Skylines). It is **opt-in** and never runs as part of a migration — do not load it into a real client's database:

```bash
supabase db query --linked < supabase/seed.sql
```

### Checks

```bash
npx tsc --noEmit -p tsconfig.app.json
npx eslint src
npm run build
npm test          # vitest — infrastructure exists, but there is no real coverage yet
```

---

## Database Migrations

Applied in timestamp order. Key migrations:

| Migration | Purpose |
|---|---|
| `20260330` | Initial schema — incidents, social_mentions |
| `20260423` | Email infrastructure (pgmq, suppression lists) |
| `20260505` | Roles, `is_admin()`, company settings, team members, storage buckets |
| `20260518` | `crisis_level` column + audit trigger |
| `20260527` | RLS hardening (asset/audit/team policies) |
| `20260612` | Phase 1 hardening — `incident_type` CHECK, tags, `claim_first_admin()` |
| `20260701` | Table-level GRANT fix (authenticated / anon / service_role) |
| `20260722120000` | Social connections + tokens + OAuth state |
| `20260722130000` | Client-entered OAuth app credentials |
| `20260722140000` | `external_id` on mentions, for deduplicating real API pulls |
| `20260722150000` | Asset media columns + `asset-media` storage bucket |
| `20260722160000` | Social monitor and email queue cron jobs |
| `20260915120000` | Invite-only signup, role-granting on signup, admin claim locked to a designated email |
| `20260915130000` | `soporte` role (own migration — Postgres won't use a new enum value in the transaction that adds it) |
| `20260915140000` | Support access log + logging RPC |
| `20260915160000` | Deployment heartbeat cron |

> `20260701000000_grant_table_privileges` is required on any fresh project: PostgreSQL needs explicit `GRANT`s in addition to RLS policies.
>
> `20260509072107` is now an explanatory comment only. It originally wiped all incidents and seeded Aurora Skylines demo rows on every run, which would have dropped fake airline data into a real client's database on first setup.

---

## Edge Functions

| Function | Purpose |
|---|---|
| `sevra-analyze` | AI analysis of a social mention — classifies risk, creates/deduplicates incident |
| `generate-incident-assets` | Generates press releases, social posts, memos, Q&As via AI |
| `generate-asset-image` | Generates an image for an Instagram asset from a prompt |
| `social-monitor-cron` | Scheduled: pulls real X/Facebook mentions, simulates Instagram/TikTok, auto-analyzes |
| `social-monitor-control` | Enable/disable/status of the pg_cron monitor job |
| `social-oauth-start` | Begins an OAuth connection (admin only) |
| `social-oauth-callback` | Handles the provider redirect, exchanges tokens, resolves the Facebook Page |
| `social-oauth-credentials` | Stores/reads the client's own OAuth app credentials (admin only) |
| `social-oauth-disconnect` | Revokes and clears a connection (admin only) |
| `social-publish` | Publishes approved content to a connected X or Facebook account |
| `deployment-heartbeat` | Reports deployment metadata to the control plane |
| `agent-stripes` | Streaming AI assistant chat, grounded in workspace data |
| `process-email-queue` | Drains the pgmq email queue and sends |
| `send-transactional-email` | Enqueues a single transactional email |
| `preview-transactional-email` | Returns rendered HTML preview of an email template |
| `handle-email-unsubscribe` | Handles one-click unsubscribe tokens |
| `handle-email-suppression` | Manages email suppression list (bounces, spam complaints) |

---

## Known gaps

Recorded rather than glossed over:

- **Workflows** is a non-persisting prototype (see Features)
- **Email lists** and the **responsibility matrix** save to `localStorage`, so they are per-browser and do not sync between admins or devices
- **No real test coverage** — the tooling runs, but the only test asserts `true`
- **No rate limiting** on any edge function or the public lead form
- Instagram and TikTok **connect** but do not publish directly; both platforms require media on every post

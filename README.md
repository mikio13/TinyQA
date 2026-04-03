# TinyQA

TinyQA is a Next.js app for webhook-driven PR verification. It receives GitHub pull request events through a GitHub App installation, gathers PR context and diffs, generates a QA goal with OpenAI, runs a TinyFish browser session against a staging URL, and stores run records in Supabase.

## What the app currently includes

- Supabase-backed TinyQA user accounts and dashboard access
- project registration with repo owner, repo name, and staging URL
- GitHub App webhook handling at `/api/github/webhook`
- live preview UI at `/dashboard/live-preview`
- run history UI at `/dashboard/runs`
- TinyFish SSE-based execution and screenshot/result persistence
- PR comment posting back to GitHub after a run completes

## Current routes

- `/`
  Pixel-art landing page with dashboard entry points
- `/dashboard`
  Authenticated project dashboard
- `/dashboard/live-preview`
  Authenticated live preview screen
- `/dashboard/runs`
  Authenticated run history
- `/auth/login`
- `/auth/sign-up`
- `/auth/forgot-password`
- `/auth/update-password`
- `/api/github/webhook`
  GitHub App webhook endpoint
- `/api/live-preview/stream`
  TinyFish live preview proxy route
- `/api/runs`
  Authenticated run listing API

## Architecture

TinyQA has two separate auth domains:

- Supabase auth handles TinyQA users, sessions, project ownership, and run visibility
- GitHub App auth handles webhook verification and GitHub API access for installed repositories

The important boundary is:

- users log into TinyQA with Supabase
- repositories connect to TinyQA by installing the TinyQA GitHub App
- TinyQA reacts to webhook events server-to-server

TinyQA does not currently use GitHub OAuth for end-user login, and it does not store GitHub user refresh tokens.

## GitHub App flow

1. A user signs into TinyQA and creates a project with repo owner, repo name, and staging URL.
2. The user installs the TinyQA GitHub App on the target repository or organization.
3. GitHub sends pull request webhook events to `/api/github/webhook`.
4. TinyQA verifies the webhook signature with `GITHUB_APP_WEBHOOK_SECRET`.
5. TinyQA reads `payload.installation.id` and `payload.repository.id` from the webhook payload.
6. TinyQA resolves the matching project in Supabase.
7. On the first matching webhook, TinyQA backfills:
   - `github_installation_id`
   - `github_repository_id`
   - `github_repository_node_id`
8. TinyQA creates a GitHub App JWT using `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY`.
9. TinyQA exchanges that JWT for a fresh short-lived installation access token.
10. TinyQA passes that installation token to Octokit and other GitHub API requests to fetch PR data, fetch diffs, and post comments.
11. TinyQA runs the TinyFish/OpenAI pipeline and stores the run results in Supabase.

Installation gives TinyQA permission to act on the repo, but the webhook payload does not contain a reusable installation token. TinyQA mints a fresh installation token on demand for each GitHub API session.

## What TinyQA stores

- Supabase user identity
- project metadata
- run history and failure reasons
- GitHub installation and repository metadata used to link future webhook events to the correct project

TinyQA does not currently store:

- GitHub user refresh tokens
- long-lived GitHub installation access tokens

## Environment variables

Create `tinyqa/.env.local` and configure the values below.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini
TINYFISH_API_KEY=your_tinyfish_key
GITHUB_APP_ID=your_github_app_id
GITHUB_APP_PRIVATE_KEY=your_github_app_private_key_pem
GITHUB_APP_WEBHOOK_SECRET=your_github_app_webhook_secret
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` is required for server-side webhook and run persistence
- `OPENAI_MODEL` is optional and defaults to `gpt-4o-mini`
- `TINYFISH_API_KEY` is required for real TinyFish execution
- GitHub App credentials belong to the TinyQA service, not to the users who install the app

## Local development

1. Clone the repository.
2. Install dependencies.
3. Configure `tinyqa/.env.local`.
4. Start the app.

```bash
git clone <your-repo-url>
cd TinyQA/tinyqa
npm install
npm run dev
```

Then open `http://localhost:3000`.

For local webhook demos, exposing your local app with ngrok is a reasonable setup for `/api/github/webhook`.

## Access policy

- `/dashboard/*` routes require a TinyQA user session
- `/api/github/webhook` is public because GitHub must reach it
- authenticated API routes such as `/api/runs` and `/api/live-preview/stream` require a Supabase session

## Current status

This repo is still in active development. The main product path today is:

- register a project in the dashboard
- install the GitHub App on the target repo
- receive webhook events
- run the TinyFish/OpenAI verification pipeline
- inspect results in the TinyQA dashboard

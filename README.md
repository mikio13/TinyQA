# TinyQA

TinyQA is a Next.js hackathon project built to help teams verify whether pull request fixes are actually reflected in a live preview environment.

Instead of relying only on code diffs or reviewer intuition, TinyFish focuses on visual and behavioral verification. The product helps reviewers inspect preview environments, monitor verification progress, and confirm whether frontend or infra-backed changes are truly resolved.

This project was created as part of a hackathon organized by TinyFish, OpenAI, and NUS Acacia College.

## What it does

TinyFish is designed around a simple question:

**Did the fix really land in the preview?**

The current product direction supports:

- pull request inspection
- live browser preview for PR environments
- live browser preview for infra-backed environments such as Supabase and AWS
- verification checklists and status tracking
- preview environment visibility for demo and review flows
- project configuration through Supabase
- webhook-based PR verification workflow

## Current frontend experience

The frontend currently includes:

- a pixel-art landing page that acts as the main TinyFish world
- a unified dashboard for registering repositories and preview environments
- a Live Browser Preview for PRs screen
- a Live Browser Preview for Supabase/AWS screen
- consistent pixel-inspired visual styling across key screens
- public preview routes for easier local demoing without auth friction

## Live preview status

The live preview pages are structured to work with TinyFish live browser streaming through an SSE-based backend route.

What is already in place:

- frontend UI for starting a live preview run
- backend route for forwarding TinyFish live preview requests
- iframe-based live browser preview area
- run state, event stream, checklist, and result panels
- separate PR and infra preview experiences

What still depends on environment setup:

- actual live TinyFish streaming requires a valid `TINYFISH_API_KEY`
- without that key, the UI still renders, but the TinyFish browser stream cannot start

## Tech stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
- TinyFish live preview integration
- GitHub webhook workflow

## Main routes

- `/`  
  Pixel-art landing page

- `/dashboard`  
  Project dashboard for configuring repositories and preview URLs

- `/dashboard/live-pr-preview`  
  Authenticated PR live preview page

- `/dashboard/live-infra-preview`  
  Authenticated infra live preview page

- `/preview/pr`  
  Public PR preview route for demo and testing

- `/preview/infra`  
  Public infra preview route for demo and testing

## Features

- Pixel-art product presentation for hackathon demo clarity
- Repository registration with staging URL and GitHub PAT
- Webhook URL generation for PR verification flow
- Live PR preview interface with status, run summary, and event log
- Live infra preview interface for backend-connected environment validation
- Checklist-driven verification UI
- Clear run states such as pending, checking, passed, failed, and warning
- Supabase-backed project configuration
- TinyFish live preview SSE integration scaffold

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd TinyQA/tinyqa
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local env file such as `.env.local` and add the required values.

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
OPENAI_APIKEY=your_openai_key
TINYFISH_API_KEY=your_tinyfish_key
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are required for authenticated dashboard functionality
- `TINYFISH_API_KEY` is required for actual live TinyFish browser preview streaming
- without the TinyFish key, the preview pages will load but the live stream cannot start

### 4. Run the development server

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

If you want to jump straight to the preview pages:

```text
http://localhost:3000/preview/pr
http://localhost:3000/preview/infra
```

## Notes for local development

- The app currently runs best when the repository is stored outside OneDrive, since OneDrive can slow down Next.js file watching on Windows
- The first page load in `next dev` may take longer because Next.js compiles routes on demand
- Lint configuration has been adjusted to ignore generated build output

## Project status

This project is currently in active hackathon development.

Completed so far:

- codebase structure learned and mapped
- two preview pages designed and implemented
- shared reusable preview components added
- pixel-style visual consistency extended across major screens
- TinyFish live preview backend route added
- frontend live preview runner added
- public preview routes added for easier demos
- local lint configuration stabilized

Still to improve:

- connect preview pages to real project data automatically
- fully enable live TinyFish runs using valid production env keys
- refine remaining copy and polish
- extend consistency to any remaining starter-template screens

## Demo focus

This product is built to communicate:

- confidence in verification
- visibility into preview environments
- clarity around PR resolution
- live AI-assisted review workflows

TinyFish is not meant to feel like a generic admin dashboard. It is meant to feel like an AI-assisted PR verification tool that helps teams answer whether a reported issue is actually fixed.

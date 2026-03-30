-- TinyQA Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Projects table: stores registered GitHub repos for visual testing
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  repo_owner text not null,
  repo_name text not null,
  staging_url text not null,
  github_pat text,
  github_installation_id bigint,
  github_repository_id bigint,
  github_repository_node_id text,
  created_at timestamptz default now()
);

alter table projects add column if not exists github_installation_id bigint;
alter table projects add column if not exists github_repository_id bigint;
alter table projects add column if not exists github_repository_node_id text;
alter table projects alter column github_pat drop not null;

create table if not exists runs (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  source text not null check (source in ('webhook', 'manual_live_preview')),
  status text not null check (status in ('queued', 'running', 'passed', 'failed', 'error', 'timed_out')),
  tinyfish_run_id text,
  streaming_url text,
  github_delivery_id text,
  github_event text,
  pr_number integer,
  pr_title text,
  pr_url text,
  repo_full_name text not null,
  target_url text not null,
  goal text,
  browser_profile text,
  result_text text,
  review_comment_url text,
  screenshot_url text,
  failure_reason text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists webhook_jobs (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  mode text not null check (mode in ('legacy_project_pat', 'github_app')),
  github_event text,
  github_delivery_id text,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  attempts integer not null default 0,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row-Level Security
alter table projects enable row level security;
alter table runs enable row level security;
alter table webhook_jobs enable row level security;

create policy "Users can view own runs"
  on runs for select
  using (auth.uid() = user_id);

create policy "Users can insert own runs"
  on runs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own runs"
  on runs for update
  using (auth.uid() = user_id);

create policy "Users can delete own runs"
  on runs for delete
  using (auth.uid() = user_id);

create policy "Users can view own webhook jobs"
  on webhook_jobs for select
  using (
    exists (
      select 1
      from projects
      where projects.id = webhook_jobs.project_id
        and projects.user_id = auth.uid()
    )
  );

-- Indexes
create index if not exists idx_projects_user_id on projects(user_id);
create unique index if not exists idx_projects_installation_repo
  on projects(github_installation_id, github_repository_id)
  where github_installation_id is not null and github_repository_id is not null;
create index if not exists idx_runs_user_id on runs(user_id);
create index if not exists idx_runs_project_id on runs(project_id);
create index if not exists idx_runs_created_at on runs(created_at desc);
create unique index if not exists idx_runs_project_delivery
  on runs(project_id, github_delivery_id)
  where github_delivery_id is not null;
create index if not exists idx_webhook_jobs_pending
  on webhook_jobs(status, created_at);
create unique index if not exists idx_webhook_jobs_delivery
  on webhook_jobs(github_delivery_id)
  where github_delivery_id is not null;

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
  github_pat text not null,
  created_at timestamptz default now()
);

-- Row-Level Security
alter table projects enable row level security;

-- Users can only CRUD their own projects
create policy "Users can view own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on projects for delete
  using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_projects_user_id on projects(user_id);

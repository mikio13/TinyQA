"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/types";
import { hasEnvVars } from "@/lib/utils";

export default function DashboardPage() {
  const supabase = hasEnvVars ? createClient() : null;

  // Form state
  const [repoOwner, setRepoOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [stagingUrl, setStagingUrl] = useState("");
  const [githubPat, setGithubPat] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProjects(data as Project[]);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabase) {
      setFormError("Configure Supabase before adding projects.");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setFormError("You must be logged in.");
        return;
      }

      const { error } = await supabase.from("projects").insert({
        user_id: user.id,
        repo_owner: repoOwner.trim(),
        repo_name: repoName.trim(),
        staging_url: stagingUrl.trim(),
        github_pat: githubPat.trim(),
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      // Reset form & refresh
      setRepoOwner("");
      setRepoName("");
      setStagingUrl("");
      setGithubPat("");
      await fetchProjects();
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (!error) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    }
  };

  const copyWebhookUrl = (projectId: string) => {
    const webhookUrl = `${window.location.origin}/api/webhook?project_id=${projectId}`;
    navigator.clipboard.writeText(webhookUrl);
    setCopiedId(projectId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getWebhookUrl = (projectId: string) => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/api/webhook?project_id=${projectId}`;
  };

  if (!hasEnvVars) {
    return (
      <div className="flex-1 w-full">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Setup Required
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">
            Connect Supabase to unlock the dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50">
            Add <code className="text-amber-300">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-amber-300">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>, then restart the app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">
          Project Dashboard
        </h1>
        <p className="text-sm text-white/50">
          Connect your GitHub repos for autonomous visual testing on every PR.
        </p>
      </div>

      {/* Add Project Form */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 mb-4">
          Add New Project
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="repoOwner" className="text-xs font-semibold text-white/60">
                Repo Owner
              </label>
              <input
                id="repoOwner"
                type="text"
                placeholder="e.g. david-ocbc"
                value={repoOwner}
                onChange={(e) => setRepoOwner(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="repoName" className="text-xs font-semibold text-white/60">
                Repo Name
              </label>
              <input
                id="repoName"
                type="text"
                placeholder="e.g. hackathon-demo"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="stagingUrl" className="text-xs font-semibold text-white/60">
              Staging URL
            </label>
            <input
              id="stagingUrl"
              type="url"
              placeholder="https://staging.myapp.com"
              value={stagingUrl}
              onChange={(e) => setStagingUrl(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="githubPat" className="text-xs font-semibold text-white/60">
              GitHub Personal Access Token
            </label>
            <input
              id="githubPat"
              type="password"
              placeholder="ghp_xxxxxxxxxxxx"
              value={githubPat}
              onChange={(e) => setGithubPat(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors"
            />
            <p className="text-xs text-white/30">
              Needs <code className="text-white/50">repo</code> scope. Used to read PR diffs and post review comments.
            </p>
          </div>

          {formError && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-bold uppercase tracking-wider hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Saving..." : "Add Project"}
          </button>
        </form>
      </div>

      {/* Project Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/70">
          Your Projects
        </h2>

        {isLoading ? (
          <div className="text-center py-12 text-white/40">
            <p className="animate-pulse">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-white/40 border border-dashed border-white/10 rounded-lg">
            <p className="text-sm">No projects yet. Add your first GitHub repo above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="border border-white/10 rounded-lg p-5 bg-white/5 hover:bg-white/[0.07] transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white text-sm">
                      {project.repo_owner}/{project.repo_name}
                    </h3>
                    <p className="text-xs text-white/40 mt-1">
                      Staging:{" "}
                      <a
                        href={project.staging_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-white/60 hover:text-white hover:underline"
                      >
                        {project.staging_url}
                      </a>
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10 px-2 py-1 rounded transition-colors"
                    title="Delete project"
                  >
                    ✕
                  </button>
                </div>

                {/* Webhook URL */}
                <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                      Webhook URL
                    </span>
                    <button
                      onClick={() => copyWebhookUrl(project.id)}
                      className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                    >
                      {copiedId === project.id ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <code className="text-xs text-white/50 break-all leading-relaxed">
                    {getWebhookUrl(project.id)}
                  </code>
                </div>

                <p className="text-xs text-white/30 mt-3">
                  Added{" "}
                  {new Date(project.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/live-pr-preview?project_id=${project.id}`}
                    className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    Live PR Preview
                  </Link>
                  <Link
                    href={`/dashboard/live-infra-preview?project_id=${project.id}`}
                    className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    Live Infra Preview
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

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
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
            Setup Required
          </p>
          <h1 className="mt-3 text-3xl font-bold text-foreground">
            Connect Supabase to unlock the dashboard
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            The landing page is ready to demo, but the authenticated dashboard
            still depends on your Supabase environment variables. Add
            `NEXT_PUBLIC_SUPABASE_URL` and
            `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then restart the app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Project Dashboard
          </span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Connect your GitHub repos for autonomous visual testing on every PR.
        </p>
      </div>

      {/* Add Project Form */}
      <div className="border rounded-xl p-6 bg-card shadow-sm">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-xl">➕</span> Add New Project
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="repoOwner"
                className="text-sm font-medium text-foreground"
              >
                Repo Owner
              </label>
              <input
                id="repoOwner"
                type="text"
                placeholder="e.g. david-ocbc"
                value={repoOwner}
                onChange={(e) => setRepoOwner(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-400/50 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="repoName"
                className="text-sm font-medium text-foreground"
              >
                Repo Name
              </label>
              <input
                id="repoName"
                type="text"
                placeholder="e.g. hackathon-demo"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-400/50 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="stagingUrl"
              className="text-sm font-medium text-foreground"
            >
              Staging URL
            </label>
            <input
              id="stagingUrl"
              type="url"
              placeholder="https://staging.myapp.com"
              value={stagingUrl}
              onChange={(e) => setStagingUrl(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-400/50 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="githubPat"
              className="text-sm font-medium text-foreground"
            >
              GitHub Personal Access Token
            </label>
            <input
              id="githubPat"
              type="password"
              placeholder="ghp_xxxxxxxxxxxx"
              value={githubPat}
              onChange={(e) => setGithubPat(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-400/50 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Needs <code>repo</code> scope. Used to read PR diffs and post
              review comments.
            </p>
          </div>

          {formError && (
            <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium text-sm hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            {isSubmitting ? "Saving..." : "Add Project"}
          </button>
        </form>
      </div>

      {/* Project Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-xl">📦</span> Your Projects
        </h2>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="animate-pulse">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">
            <p className="text-4xl mb-3">🔗</p>
            <p>No projects yet. Add your first GitHub repo above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="border rounded-xl p-5 bg-card shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                      <span className="text-muted-foreground">📂</span>
                      {project.repo_owner}/{project.repo_name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Staging:{" "}
                      <a
                        href={project.staging_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline"
                      >
                        {project.staging_url}
                      </a>
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition-colors"
                    title="Delete project"
                  >
                    ✕
                  </button>
                </div>

                {/* Webhook URL */}
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      🔗 Webhook URL (paste in GitHub)
                    </span>
                    <button
                      onClick={() => copyWebhookUrl(project.id)}
                      className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                      {copiedId === project.id ? "✓ Copied!" : "Copy"}
                    </button>
                  </div>
                  <code className="text-xs text-foreground/80 break-all leading-relaxed">
                    {getWebhookUrl(project.id)}
                  </code>
                </div>

                <p className="text-xs text-muted-foreground mt-3">
                  Added{" "}
                  {new Date(project.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

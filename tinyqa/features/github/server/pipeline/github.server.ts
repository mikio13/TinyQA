import { Octokit } from "@octokit/rest";
import type { Project } from "@/types/domain";

const MAX_GITHUB_ERROR_LOG_LENGTH = 500;

export type PullRequestDiffResult = {
  diff: string;
  source: "file_patches" | "unavailable";
  promptLabel: string;
};

export async function fetchPullRequestDiff({
  octokit,
  project,
  prNumber,
  traceId,
}: {
  octokit: Octokit;
  project: Project;
  prNumber: number;
  traceId: string;
}): Promise<PullRequestDiffResult> {
  console.log("[TinyQA Pipeline] Fetching PR changed files", {
    traceId,
    repo: `${project.repo_owner}/${project.repo_name}`,
    prNumber,
  });

  const files = await fetchPullRequestFiles({
    octokit,
    project,
    prNumber,
    traceId,
  });

  if (files.length === 0) {
    return {
      diff: "PR diff unavailable. No changed file patches could be retrieved.",
      source: "unavailable",
      promptLabel: "Changed Files and Patches (unavailable)",
    };
  }

  const diff = buildFilePatchesSummary(files);
  console.log("[TinyQA Pipeline] PR file patches prepared", {
    traceId,
    prNumber,
    fileCount: files.length,
    diffLength: diff.length,
  });

  return {
    diff,
    source: "file_patches",
    promptLabel: "Changed Files and Patches",
  };
}

export async function postGitHubComment({
  octokit,
  project,
  prNumber,
  body,
}: {
  octokit: Octokit;
  project: Project;
  prNumber: number;
  body: string;
}): Promise<string | null> {
  try {
    const { data } = await octokit.issues.createComment({
      owner: project.repo_owner,
      repo: project.repo_name,
      issue_number: prNumber,
      body,
    });
    return data.html_url ?? null;
  } catch (error) {
    console.error("[TinyQA] Failed to post GitHub comment:", error);
    return null;
  }
}

async function fetchPullRequestFiles({
  octokit,
  project,
  prNumber,
  traceId,
}: {
  octokit: Octokit;
  project: Project;
  prNumber: number;
  traceId: string;
}): Promise<Array<Record<string, unknown>>> {
  const files: Array<Record<string, unknown>> = [];
  let page = 1;

  while (true) {
    try {
      const response = await octokit.pulls.listFiles({
        owner: project.repo_owner,
        repo: project.repo_name,
        pull_number: prNumber,
        per_page: 100,
        page,
      });

      const pageFiles = response.data as Array<Record<string, unknown>>;
      files.push(...pageFiles);

      if (pageFiles.length < 100) {
        break;
      }

      page += 1;
    } catch (error) {
      const details = formatGitHubErrorDetails(error);
      console.error("[TinyQA Pipeline] Failed to fetch PR changed files", {
        traceId,
        prNumber,
        page,
        ...details,
      });

      const statusText = details.status ? `${details.status} ` : "";
      throw new Error(
        `Failed to retrieve PR changed files (${statusText}${details.message})`.trim(),
      );
    }
  }

  return files;
}

function buildFilePatchesSummary(files: Array<Record<string, unknown>>): string {
  const sections = files.map((file) => {
    const filename =
      typeof file.filename === "string" ? file.filename : "(unknown file)";
    const status = typeof file.status === "string" ? file.status : "unknown";
    const additions =
      typeof file.additions === "number" ? String(file.additions) : "unknown";
    const deletions =
      typeof file.deletions === "number" ? String(file.deletions) : "unknown";
    const changes =
      typeof file.changes === "number" ? String(file.changes) : "unknown";
    const patch =
      typeof file.patch === "string"
        ? file.patch
        : "(patch omitted or unavailable from GitHub)";

    return [
      `File: ${filename}`,
      `Status: ${status}`,
      `Additions: ${additions}`,
      `Deletions: ${deletions}`,
      `Changes: ${changes}`,
      "Patch:",
      patch,
    ].join("\n");
  });

  return sections.join("\n\n---\n\n");
}

function formatGitHubErrorDetails(error: unknown): {
  status: number | null;
  message: string;
  responseBodyPreview: string | null;
} {
  if (typeof error === "object" && error !== null) {
    const maybeError = error as {
      status?: unknown;
      message?: unknown;
      response?: {
        data?: unknown;
      };
    };

    const status =
      typeof maybeError.status === "number" ? maybeError.status : null;
    const message =
      typeof maybeError.message === "string"
        ? maybeError.message
        : String(error);
    const responseBodyPreview =
      maybeError.response?.data !== undefined
        ? stringifyForLog(maybeError.response.data)
        : null;

    return {
      status,
      message,
      responseBodyPreview,
    };
  }

  return {
    status: null,
    message: String(error),
    responseBodyPreview: null,
  };
}

function stringifyForLog(value: unknown): string {
  const serialized =
    typeof value === "string" ? value : JSON.stringify(value ?? null);

  return serialized.length > MAX_GITHUB_ERROR_LOG_LENGTH
    ? `${serialized.slice(0, MAX_GITHUB_ERROR_LOG_LENGTH)}... [truncated]`
    : serialized;
}

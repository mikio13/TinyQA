import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

function getGeminiClient(): ChatGoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Gemini is not configured. Set GEMINI_API_KEY before running the webhook pipeline.",
    );
  }

  return new ChatGoogleGenerativeAI({
    model: process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL,
    apiKey,
  });
}

function getConfiguredGeminiModel(): string {
  return process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
}

function extractResponseText(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof part.text === "string"
        ) {
          return part.text;
        }

        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

function formatGeminiError(stage: string, error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`Gemini ${stage} failed: ${message}`);
}

export async function generateQaCommand({
  traceId,
  prTitle,
  prDescription,
  diffPromptLabel,
  diffContent,
  targetUrl,
}: {
  traceId: string;
  prTitle: string;
  prDescription: string | null;
  diffPromptLabel: string;
  diffContent: string;
  targetUrl: string;
}): Promise<string> {
  console.log("[TinyQA Pipeline] Requesting QA command from Gemini", {
    traceId,
    model: getConfiguredGeminiModel(),
  });

  try {
    const response = await getGeminiClient().invoke([
      new SystemMessage(
        `You are a QA Engineer. Translate this PR description and code diff into a single, strict, 1-2 sentence command for a browser automation bot to test this feature on a staging UI.\n\nThe command should be specific and actionable - tell the bot exactly what to navigate to, what to click, what to type, and what to verify.\nFocus on the most impactful visual/functional change in the PR.\nReturn ONLY the command text, nothing else.`,
      ),
      new HumanMessage(
        `PR Title: ${prTitle}\n\nPR Description:\n${prDescription || "(no description)"}\n\n${diffPromptLabel}:\n${diffContent}\n\nTarget URL: ${targetUrl}`,
      ),
    ]);

    return (
      extractResponseText(response.content) ||
      "Navigate to the target preview URL and check if the page loads correctly."
    );
  } catch (error) {
    throw formatGeminiError("qa_command_generation", error);
  }
}

export async function generateFinalReview({
  traceId,
  observation,
  diffPromptLabel,
  diffContent,
  testCommand,
}: {
  traceId: string;
  observation: string;
  diffPromptLabel: string;
  diffContent: string;
  testCommand: string;
}): Promise<string> {
  console.log("[TinyQA Pipeline] Requesting final review from Gemini", {
    traceId,
    model: getConfiguredGeminiModel(),
  });

  try {
    const response = await getGeminiClient().invoke([
      new SystemMessage(
        `You are a Senior Code Reviewer for a CI/CD pipeline. The QA Agent visually tested a staging site and observed the following. Based on the observation and the code diff, determine if the test PASSED or FAILED.\n\nYour response MUST follow this format:\n\n## Result: PASSED ✅  (or)  ## Result: FAILED ❌\n\n### Observation\n[Summarize what the QA agent saw on the staging site]\n\n### Analysis\n[Explain whether the visual test matches the expected behavior from the code changes]\n\n### Suggested Fix (if FAILED)\n[If FAILED, provide a specific markdown-formatted code block suggesting the exact fix based on the diff. If PASSED, omit this section.]`,
      ),
      new HumanMessage(
        `QA Agent's Observation:\n${observation || "(No observation returned)"}\n\n${diffPromptLabel}:\n${diffContent}\n\nTest Command Given:\n${testCommand}`,
      ),
    ]);

    return extractResponseText(response.content) || "Unable to generate review.";
  } catch (error) {
    throw formatGeminiError("final_review_generation", error);
  }
}

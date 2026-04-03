import crypto from "node:crypto";

interface InstallationTokenResponse {
  token: string;
}

function toBase64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function getGitHubPrivateKey(): string {
  const raw = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!raw) {
    throw new Error("GITHUB_APP_PRIVATE_KEY is not configured.");
  }

  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

export function createGitHubAppJwt(): string {
  const appId = process.env.GITHUB_APP_ID;
  if (!appId) {
    throw new Error("GITHUB_APP_ID is not configured.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const payload = {
    iat: now - 60,
    exp: now + 9 * 60,
    iss: appId,
  };

  const unsignedToken = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(payload))}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsignedToken)
    .end()
    .sign(getGitHubPrivateKey(), "base64url");

  return `${unsignedToken}.${signature}`;
}

export async function createInstallationAccessToken(
  installationId: number,
): Promise<string> {
  const jwt = createGitHubAppJwt();

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${jwt}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to create installation access token (${response.status}): ${details}`,
    );
  }

  const body = (await response.json()) as InstallationTokenResponse;
  if (!body.token) {
    throw new Error("GitHub installation token response did not include a token.");
  }

  return body.token;
}

export function verifyGitHubWebhookSignature({
  payload,
  signature,
  secret,
}: {
  payload: string;
  signature: string | null;
  secret: string;
}): boolean {
  if (!signature || !signature.startsWith("sha256=")) {
    return false;
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`;

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

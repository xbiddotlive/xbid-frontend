import { createHash, createHmac, randomBytes } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const X_API_ORIGIN = "https://api.x.com";
const MAX_POST_LENGTH = 280;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const HISTORY_DIRECTORY = ".x-publish-history";

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function encode(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function oauthCredentials() {
  const credentials = {
    consumerKey: process.env.X_API_KEY,
    consumerSecret: process.env.X_API_KEY_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET,
  };
  const missing = Object.entries(credentials)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`Missing X credentials: ${missing.join(", ")}. Configure .env.x.local.`);
  }
  return credentials;
}

function oauthHeader(method, url, credentials) {
  const oauth = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: randomBytes(24).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: credentials.accessToken,
    oauth_version: "1.0",
  };
  const parsedUrl = new URL(url);
  const signatureParameters = [...parsedUrl.searchParams.entries(), ...Object.entries(oauth)]
    .map(([key, value]) => [encode(key), encode(value)])
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey),
    )
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
  const signatureBase = [method.toUpperCase(), encode(baseUrl), encode(signatureParameters)].join("&");
  const signingKey = `${encode(credentials.consumerSecret)}&${encode(credentials.accessTokenSecret)}`;
  oauth.oauth_signature = createHmac("sha1", signingKey).update(signatureBase).digest("base64");
  return `OAuth ${Object.entries(oauth)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encode(key)}="${encode(value)}"`)
    .join(", ")}`;
}

async function xRequest(method, pathname, credentials, body) {
  const url = `${X_API_ORIGIN}${pathname}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: oauthHeader(method, url, credentials),
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.detail ?? payload?.title ?? payload?.errors?.[0]?.message ?? response.statusText;
    throw new Error(`X API ${method} ${pathname} failed (${response.status}): ${detail}`);
  }
  return payload;
}

function validateContent(content) {
  for (const field of ["campaign", "expectedUsername", "text", "mediaPath", "mediaType", "altText"]) {
    if (typeof content[field] !== "string" || content[field].trim() === "") {
      throw new Error(`Content field ${field} must be a non-empty string.`);
    }
  }
  if (Array.from(content.text).length > MAX_POST_LENGTH) {
    throw new Error(`Post text exceeds ${MAX_POST_LENGTH} Unicode code points.`);
  }
  if (content.mediaType !== "image/png" && content.mediaType !== "image/jpeg") {
    throw new Error("Only image/png and image/jpeg launch media are supported.");
  }
}

async function main() {
  const contentArgument = argumentValue("--content");
  if (!contentArgument) throw new Error("Usage: publish-x-post.mjs --content <file> [--publish]");

  const projectDirectory = process.cwd();
  const contentPath = path.resolve(projectDirectory, contentArgument);
  const content = JSON.parse(await readFile(contentPath, "utf8"));
  validateContent(content);

  const mediaPath = path.resolve(projectDirectory, content.mediaPath);
  const media = await readFile(mediaPath);
  const mediaStats = await stat(mediaPath);
  if (mediaStats.size > MAX_IMAGE_BYTES) throw new Error("Launch image exceeds X's 15 MB image limit.");

  const fingerprint = createHash("sha256").update(content.text).update(media).digest("hex");
  const historyDirectory = path.resolve(projectDirectory, HISTORY_DIRECTORY);
  const historyPath = path.join(historyDirectory, `${fingerprint}.json`);
  const alreadyPublished = await readFile(historyPath, "utf8").then(JSON.parse).catch(() => null);
  if (alreadyPublished) {
    throw new Error(`Duplicate blocked: this content was already published as ${alreadyPublished.url}.`);
  }

  if (!process.argv.includes("--publish")) {
    console.log(JSON.stringify({
      mode: "dry-run",
      campaign: content.campaign,
      expectedUsername: content.expectedUsername,
      characters: Array.from(content.text).length,
      mediaPath,
      mediaBytes: mediaStats.size,
      text: content.text,
    }, null, 2));
    return;
  }

  const credentials = oauthCredentials();
  const me = await xRequest("GET", "/2/users/me", credentials);
  const actualUsername = me?.data?.username;
  if (actualUsername?.toLowerCase() !== content.expectedUsername.toLowerCase()) {
    throw new Error(`Account check failed: credentials belong to @${actualUsername ?? "unknown"}, expected @${content.expectedUsername}.`);
  }

  const upload = await xRequest("POST", "/2/media/upload", credentials, {
    media: media.toString("base64"),
    media_category: "tweet_image",
    media_type: content.mediaType,
    shared: false,
  });
  const mediaId = upload?.data?.id ?? upload?.data?.media_id_string;
  if (!mediaId) throw new Error("X media upload succeeded without returning a media ID.");

  await xRequest("POST", "/2/media/metadata", credentials, {
    id: String(mediaId),
    metadata: { alt_text: { text: content.altText } },
  });

  const post = await xRequest("POST", "/2/tweets", credentials, {
    text: content.text,
    media: { media_ids: [String(mediaId)] },
  });
  const postId = post?.data?.id;
  if (!postId) throw new Error("X post creation succeeded without returning a Post ID.");

  const receipt = {
    campaign: content.campaign,
    fingerprint,
    postId,
    username: actualUsername,
    url: `https://x.com/${actualUsername}/status/${postId}`,
    publishedAt: new Date().toISOString(),
    text: content.text,
    mediaId: String(mediaId),
  };
  await mkdir(historyDirectory, { recursive: true });
  await writeFile(historyPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

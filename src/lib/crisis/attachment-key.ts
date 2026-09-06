/**
 * Crisis.attachments are stored as S3 keys (e.g. `signals/{uuid}.pdf`) but
 * GraphQL returns presigned GET URLs at read time. removeCrisisAttachment
 * matches the stored key exactly and is idempotent on a miss — so extracting
 * the wrong key looks like "remove did nothing".
 *
 * Staging/prod use an S3-compatible endpoint (Tigris) with path-style URLs:
 *   https://t3.storageapi.dev/{bucket}/{key}?X-Amz-…
 * Vanilla AWS virtual-hosted URLs keep the key as the pathname:
 *   https://{bucket}.s3.{region}.amazonaws.com/{key}?X-Amz-…
 * External http(s) values are stored as-is and must be sent back unchanged.
 */

const STORED_KEY_PREFIXES = ["signals/", "sources/"] as const;

function decodePath(pathname: string): string {
  const trimmed = pathname.replace(/^\/+/, "");
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function isPresignedS3Url(url: URL): boolean {
  return (
    url.searchParams.has("X-Amz-Algorithm") ||
    url.searchParams.has("X-Amz-Signature") ||
    url.searchParams.has("X-Amz-Credential") ||
    url.searchParams.has("AWSAccessKeyId")
  );
}

function isAwsVirtualHosted(hostname: string): boolean {
  return /^[^.]+\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i.test(hostname);
}

function keyFromKnownPrefix(path: string): string | null {
  for (const prefix of STORED_KEY_PREFIXES) {
    const idx = path.indexOf(prefix);
    if (idx === 0 || (idx > 0 && path[idx - 1] === "/")) {
      return path.slice(idx);
    }
  }
  return null;
}

/** Recover the DB attachment value from a Crisis.attachments URL (or raw key). */
export function keyFromAttachmentUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (!isPresignedS3Url(parsed)) {
    return url;
  }

  const path = decodePath(parsed.pathname);
  if (!path) return url;

  const known = keyFromKnownPrefix(path);
  if (known) return known;

  if (isAwsVirtualHosted(parsed.hostname)) {
    return path;
  }

  const slash = path.indexOf("/");
  return slash === -1 ? path : path.slice(slash + 1);
}

export function nameFromAttachmentUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "Document");
  } catch {
    return url.split("/").pop()?.split("?")[0] ?? "Document";
  }
}

/** True when a remove mutation's returned list still contains `key`. */
export function attachmentStillListed(key: string, urls: string[]): boolean {
  return urls.some((url) => keyFromAttachmentUrl(url) === key);
}

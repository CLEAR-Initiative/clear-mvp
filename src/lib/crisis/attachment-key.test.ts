import { describe, expect, it } from "vitest";
import {
  attachmentStillListed,
  keyFromAttachmentUrl,
  nameFromAttachmentUrl,
} from "./attachment-key";

const AMZ = "X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIA%2F20260101";
const KEY = "signals/6f1c0a2e-9b44-4c1a-8d2e-1a2b3c4d5e6f.pdf";

describe("keyFromAttachmentUrl", () => {
  it("strips the bucket from Tigris path-style presigned URLs (staging)", () => {
    const url = `https://t3.storageapi.dev/clear-uploads/${KEY}?${AMZ}`;
    const buggyPathname = new URL(url).pathname.slice(1);
    expect(buggyPathname).toBe(`clear-uploads/${KEY}`);
    expect(keyFromAttachmentUrl(url)).toBe(KEY);
  });

  it("recovers the key from a URL produced by @aws-sdk/s3-request-presigner", () => {
    // Captured from clear-api's S3 client config (Tigris endpoint + forcePathStyle).
    const url =
      "https://t3.storageapi.dev/clear-uploads/signals/6f1c0a2e-9b44-4c1a-8d2e-1a2b3c4d5e6f.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=test%2F20260831%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260831T122157Z&X-Amz-Expires=3600&X-Amz-Signature=deadbeef&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject";
    expect(keyFromAttachmentUrl(url)).toBe(
      "signals/6f1c0a2e-9b44-4c1a-8d2e-1a2b3c4d5e6f.pdf",
    );
  });

  it("reads the key from AWS virtual-hosted presigned URLs", () => {
    const url = `https://clear-uploads.s3.eu-west-1.amazonaws.com/${KEY}?${AMZ}`;
    expect(keyFromAttachmentUrl(url)).toBe(KEY);
  });

  it("strips the bucket from AWS path-style presigned URLs", () => {
    const url = `https://s3.eu-west-1.amazonaws.com/clear-uploads/${KEY}?${AMZ}`;
    expect(keyFromAttachmentUrl(url)).toBe(KEY);
  });

  it("strips the bucket from MinIO / local path-style URLs", () => {
    const url = `http://localhost:9000/clear-uploads/${KEY}?${AMZ}`;
    expect(keyFromAttachmentUrl(url)).toBe(KEY);
  });

  it("recovers sources/ keys used by the pipeline archive path", () => {
    const key = "sources/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf";
    const url = `https://t3.storageapi.dev/clear-uploads/${key}?${AMZ}`;
    expect(keyFromAttachmentUrl(url)).toBe(key);
  });

  it("decodes percent-encoded key segments", () => {
    const url = `https://t3.storageapi.dev/clear-uploads/signals/my%20report.pdf?${AMZ}`;
    expect(keyFromAttachmentUrl(url)).toBe("signals/my report.pdf");
  });

  it("passes through a raw S3 key (already the stored value)", () => {
    expect(keyFromAttachmentUrl(KEY)).toBe(KEY);
  });

  it("passes through unsigned http(s) URLs stored as-is", () => {
    const url = "https://reliefweb.int/report/example.pdf";
    expect(keyFromAttachmentUrl(url)).toBe(url);
  });
});

describe("nameFromAttachmentUrl", () => {
  it("uses the last path segment, decoded", () => {
    const url = `https://t3.storageapi.dev/clear-uploads/signals/my%20report.pdf?${AMZ}`;
    expect(nameFromAttachmentUrl(url)).toBe("my report.pdf");
  });
});

describe("attachmentStillListed", () => {
  it("matches remaining presigned URLs against the recovered key", () => {
    const remaining = [
      `https://t3.storageapi.dev/clear-uploads/signals/keep.pdf?${AMZ}`,
      `https://t3.storageapi.dev/clear-uploads/${KEY}?${AMZ}`,
    ];
    expect(attachmentStillListed(KEY, remaining)).toBe(true);
    expect(attachmentStillListed("signals/keep.pdf", remaining)).toBe(true);
    expect(attachmentStillListed("signals/gone.pdf", remaining)).toBe(false);
  });
});

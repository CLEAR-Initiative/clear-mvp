/**
 * The name a downloaded Source document is saved under. Apart from the
 * download route (a Next.js route file may only export its handlers).
 */

/** The file name NRC Find gave, made safe for a header; else the id. */
export function fileNameOf(disposition: string | null, fileId: string): string {
  // NRC Find's FileResponse sends `filename="<name>"` or `filename*=utf-8''<name>`;
  // its app-scoped route sends `filename=<name>` last and unquoted, spaces and all.
  const header = disposition ?? "";
  const encoded = /filename\*=(?:UTF-8'')?([^;]*)/i.exec(header)?.[1];
  const quoted = /filename="([^"]*)"/i.exec(header)?.[1];
  const bare = /filename=(?!")(.*)$/i.exec(header)?.[1];
  let name = (encoded ?? quoted ?? bare ?? "").trim();
  if (encoded !== undefined) {
    try {
      name = decodeURIComponent(name);
    } catch {
      /* not encoded */
    }
  }
  // Drop control and bidi-override characters, and cut by code point so a
  // surrogate pair is never split (encodeURIComponent would throw on it).
  name = name.replace(/[\u0000-\u001f\u007f/\\\u202a-\u202e\u2066-\u2069]/g, "");
  name = Array.from(name).slice(0, 200).join("");
  return name || fileId;
}

// Canonical, safe file extensions derived from the (already validated) image
// mimetype. The client-supplied filename/extension is never trusted for the
// stored object name, which prevents storing e.g. `evil.html` that would then
// be served as text/html from our origin (stored XSS).
const IMAGE_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};

export const safeImageExt = (mimetype: string): string =>
  IMAGE_EXT_BY_MIME[mimetype?.toLowerCase()] ?? "bin";

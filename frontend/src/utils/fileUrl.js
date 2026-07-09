export function getFileUrl(path) {
  if (!path) return "";

  // Already absolute or base64
  if (
    path.startsWith("data:image") ||
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }

  const BASE = "http://localhost:5001";

  // 🔥 Normalize path
  let cleanPath = path.startsWith("/") ? path : `/${path}`;

  // 🔥 FORCE uploads root (for logos)
  if (!cleanPath.startsWith("/uploads/")) {
    cleanPath = `/uploads${cleanPath.startsWith("/") ? "" : "/"}${path}`;
  }

  return `${BASE}${cleanPath}`;
}

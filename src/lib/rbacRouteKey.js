/** Match backend `listHttpRoutes.routeKey` for merging permissions onto discovered routes. */

export function normalizeHttpPath(p) {
  let s = String(p ?? "").trim();
  if (!s) s = "/";
  if (!s.startsWith("/")) s = `/${s}`;
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s;
}

export function normalizeHttpMethod(m) {
  const u = String(m ?? "").trim().toUpperCase();
  return u || "UNKNOWN";
}

export function routeKey(path, method) {
  return `${normalizeHttpMethod(method)} ${normalizeHttpPath(path)}`;
}

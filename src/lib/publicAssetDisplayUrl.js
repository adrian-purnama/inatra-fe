import { API_BASE_URL } from "./api.js";

/**
 * In dev, rewrite `http://localhost:4000/public-files/:id` → `/public-files/:id` so the
 * browser loads the asset from the Vite origin (see `vite.config.js` proxy). Avoids
 * `ERR_BLOCKED_BY_RESPONSE` / CORP issues between :5173 and :4000.
 * In production, returns `url` unchanged (full absolute URL from `BE_LINK`).
 * @param {string | undefined | null} url
 */
export function publicAssetUrlForDisplay(url) {
  if (url == null || typeof url !== "string") return url;
  const u = url.trim();
  if (!u) return u;
  if (!import.meta.env.DEV) return u;
  const base = API_BASE_URL.replace(/\/$/, "");
  if (u.startsWith(`${base}/public-files/`)) {
    return u.slice(base.length);
  }
  return u;
}

export function formatMoney(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString();
}

export function prettyDate(value) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function prettyDateTime(value) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

export function hexToRgba(hex, alpha) {
  const normalized = String(hex ?? "").trim();
  const raw = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return `rgba(107, 114, 128, ${alpha})`;
  const int = Number.parseInt(raw, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function quotationStatusColor(status) {
  switch (String(status ?? "")) {
    case "draft":
      return "#6b7280";
    case "pending_approved":
      return "#d97706";
    case "rejected":
      return "#dc2626";
    case "open":
      return "#059669";
    case "close":
      return "#4b5563";
    case "loss":
      return "#7c3aed";
    default:
      return "#6b7280";
  }
}

export function quotationStatusLabel(status) {
  const s = String(status ?? "");
  return s.replace(/_/g, " ");
}

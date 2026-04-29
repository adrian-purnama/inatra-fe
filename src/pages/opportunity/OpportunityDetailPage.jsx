import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Modal } from "../../components/Modal.jsx";
import { PublicFileBundle } from "../../components/PublicFileBundle.jsx";
import { useUser } from "../../context/UserContext.jsx";
import { OpportunityWizardForm } from "../../forms/OpportunityWizardForm.jsx";
import { apiGet, paths } from "../../lib/api.js";

function hexToRgba(hex, alpha) {
  const normalized = String(hex ?? "").trim();
  const raw = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return `rgba(107, 114, 128, ${alpha})`;
  const int = Number.parseInt(raw, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function prettyDate(value) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function prettyDateTime(value) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

function formatMoney(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString();
}

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <div className="mt-0.5 break-words text-sm text-zinc-800 dark:text-zinc-100">
        {children}
      </div>
    </div>
  );
}

export function OpportunityDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, sessionLoading, userId } = useUser();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr("");
    try {
      const itemRes = await apiGet(`${paths.opportunity}/${encodeURIComponent(id)}`);
      const itemData = itemRes?.data?.item ?? null;
      if (!itemData) {
        setItem(null);
        return;
      }

      setItem({
        ...itemData,
        details: Array.isArray(itemData.details) ? itemData.details : [],
        totalPrice: Array.isArray(itemData.details)
          ? itemData.details.reduce(
              (sum, d) => sum + Number(d.quantity ?? 0) * Number(d.price ?? 0),
              0,
            )
          : Number(itemData.totalPrice ?? 0),
      });

    } catch (e) {
      setErr(e?.message ?? "Failed to load opportunity detail");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const detailTotal = useMemo(() => {
    if (!item?.details) return 0;
    return item.details.reduce(
      (sum, d) => sum + Number(d.quantity ?? 0) * Number(d.price ?? 0),
      0,
    );
  }, [item]);

  const total = Number(item?.totalPrice ?? detailTotal ?? 0);
  const probability = Number(item?.propability ?? 0);
  const statusColor = item?.leadQualificationColor || "#6b7280";
  const statusName = item?.leadQualificationName || (item ? String(item.leadQualificationId) : "-");

  const locationPath = useMemo(() => {
    if (!item?.locationNames) return [];
    const parts = [];
    const prov = String(item.locationNames.provinceName ?? "");
    const reg = String(item.locationNames.regencyName ?? "");
    const dist = String(item.locationNames.districtName ?? "");
    if (prov) parts.push(prov);
    if (reg) parts.push(reg);
    if (dist) parts.push(dist);
    return parts;
  }, [item]);

  if (sessionLoading)
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading session...</p>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/opportunity/manage"
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          ← Back to opportunities
        </Link>
        {item && String(item.ownerId) === String(userId ?? "") ? (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Edit opportunity
          </button>
        ) : null}
      </div>

      {err ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
          {err}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Loading opportunity detail...
        </p>
      ) : !item ? (
        <p className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Opportunity not found or not accessible.
        </p>
      ) : (
        <>
          {/* Executive summary header */}
          <section
            className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
            style={{
              borderTop: `4px solid ${statusColor}`,
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Customer
                </p>
                <h1 className="mt-0.5 truncate text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {item.customer?.customerName || "Unknown"}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
                    style={{
                      color: statusColor,
                      backgroundColor: hexToRgba(statusColor, 0.14),
                      borderColor: hexToRgba(statusColor, 0.42),
                    }}
                  >
                    {statusName}
                  </span>
                  {item.lineOfBusinessName ? (
                    <span className="inline-flex items-center rounded-full border border-zinc-300 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200">
                      {item.lineOfBusinessName}
                    </span>
                  ) : null}
                  {item.marketSegmentName ? (
                    <span className="inline-flex items-center rounded-full border border-zinc-300 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200">
                      {item.marketSegmentName}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>•</span>
                    <span>{locationPath.length > 0 ? locationPath.join(" / ") : "Unknown"}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* KPI strip */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Estimated value
                </p>
                <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatMoney(total)}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {(item.details ?? []).length} line item
                  {(item.details ?? []).length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Probability
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {probability}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(0, Math.min(100, probability))}%`,
                      backgroundColor: statusColor,
                    }}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Close date
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Est. {prettyDate(item.estimateCloseDate)}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Actual: {prettyDate(item.actualCloseDate)}
                </p>
              </div>
            </div>
          </section>

          {/* Main two-column layout: commercial breakdown + context */}
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Commercial breakdown */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Commercial breakdown
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {(item.details ?? []).length} line item
                  {(item.details ?? []).length === 1 ? "" : "s"}
                </p>
              </div>

              {Array.isArray(item.details) && item.details.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                        <th className="px-2 py-2 font-medium">Description</th>
                        <th className="px-2 py-2 text-right font-medium">Qty</th>
                        <th className="px-2 py-2 text-right font-medium">Unit price</th>
                        <th className="px-2 py-2 text-right font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.details.map((d) => {
                        const subtotal =
                          Number(d.quantity ?? 0) * Number(d.price ?? 0);
                        return (
                          <tr
                            key={d.id}
                            className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
                          >
                            <td className="px-2 py-2.5 text-zinc-800 dark:text-zinc-100">
                              {d.description || "-"}
                            </td>
                            <td className="px-2 py-2.5 text-right tabular-nums text-zinc-700 dark:text-zinc-200">
                              {Number(d.quantity ?? 0)}
                            </td>
                            <td className="px-2 py-2.5 text-right tabular-nums text-zinc-700 dark:text-zinc-200">
                              {formatMoney(d.price)}
                            </td>
                            <td className="px-2 py-2.5 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                              {formatMoney(subtotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-zinc-300 dark:border-zinc-600">
                        <td
                          className="px-2 py-3 text-sm font-medium text-zinc-600 dark:text-zinc-300"
                          colSpan={3}
                        >
                          Total
                        </td>
                        <td className="px-2 py-3 text-right text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                          {formatMoney(total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="mt-3 rounded-md border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  No line items added yet.
                </p>
              )}

              {item.notes ? (
                <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-100">
                    {item.notes}
                  </p>
                </div>
              ) : null}
              
              <div className="mt-5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Attachments
                </p>
                <PublicFileBundle
                  fileIds={item.attachmentAssetIds ?? []}
                  className="mt-2"
                  emptyText="No attachments."
                />
              </div>
            </section>

            {/* Context panel */}
            <aside className="space-y-5">
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Qualification
                </h2>
                <div className="mt-3 space-y-3">
                  <Field label="Line of business">
                    {item.lineOfBusinessName || "Unknown"}
                  </Field>
                  <Field label="Market segment">
                    {item.marketSegmentName || "Unknown"}
                  </Field>
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Parties
                </h2>
                <div className="mt-3 space-y-3">
                  <Field label="Customer">
                    {item.customer?.customerName || "Unknown"}
                  </Field>
                  <Field label="End user">
                    {item.endUser?.endUserName || "Unknown"}
                  </Field>
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Contact
                </h2>
                <div className="mt-3 space-y-3">
                  <Field label="Contact name">
                    {item.contact?.contactName || "-"}
                  </Field>
                  <Field label="Channels">
                    {Array.isArray(item.contact?.contactDetails) &&
                    item.contact.contactDetails.length > 0 ? (
                      <ul className="space-y-1">
                        {item.contact.contactDetails.map((v, i) => (
                          <li
                            key={`${v}-${i}`}
                            className="rounded-md bg-zinc-50 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                          >
                            {v}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-zinc-500 dark:text-zinc-400">-</span>
                    )}
                  </Field>
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Location
                </h2>
                <div className="mt-3 space-y-3">
                  <Field label="Province">
                    {item.locationNames?.provinceName || "Unknown"}
                  </Field>
                  <Field label="Regency">
                    {item.locationNames?.regencyName || "Unknown"}
                  </Field>
                  <Field label="District">
                    {item.locationNames?.districtName || "Unknown"}
                  </Field>
                </div>
              </section>
            </aside>
          </div>

          {/* Record metadata footer */}
          <section className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <span>
                  <span className="font-medium text-zinc-500 dark:text-zinc-400">ID:</span>{" "}
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {item.id}
                  </span>
                </span>
                <span>
                  <span className="font-medium text-zinc-500 dark:text-zinc-400">
                    Owner:
                  </span>{" "}
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {item.ownerName || item.ownerId}
                  </span>
                </span>
                <span>
                  <span className="font-medium text-zinc-500 dark:text-zinc-400">
                    Created:
                  </span>{" "}
                  {prettyDateTime(item.createdAt)}
                </span>
                <span>
                  <span className="font-medium text-zinc-500 dark:text-zinc-400">
                    Updated:
                  </span>{" "}
                  {prettyDateTime(item.updatedAt)}
                </span>
              </div>
              <div className="max-w-full">
                <span className="font-medium text-zinc-500 dark:text-zinc-400">
                  Shared with:
                </span>{" "}
                {Array.isArray(item.availableTo) && item.availableTo.length > 0 ? (
                  <span className="inline-flex flex-wrap gap-1 align-middle">
                    {item.availableTo.map((uid) => (
                      <span
                        key={uid}
                        className="rounded bg-zinc-200/70 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                      >
                        {uid}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span>owner only</span>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      <Modal
        open={editOpen && item != null}
        onClose={() => setEditOpen(false)}
        closeOnOverlayClick={false}
        title="Edit opportunity"
      >
        {item ? (
          <OpportunityWizardForm
            initial={item}
            currentUserId={userId ?? ""}
            onSuccess={async () => {
              setEditOpen(false);
              await loadDetail();
            }}
            onCancel={() => setEditOpen(false)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

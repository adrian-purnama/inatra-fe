import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Modal } from "../../components/Modal.jsx";
import { PublicFileBundle } from "../../components/PublicFileBundle.jsx";
import { ProductSkuPicker } from "../../components/ProductSkuPicker.jsx";
import { useUser } from "../../context/UserContext.jsx";
import { OpportunityWizardForm } from "../../forms/OpportunityWizardForm.jsx";
import { apiGet, apiPatch, apiPost, paths } from "../../lib/api.js";

const detailInputClass =
  "w-full min-w-0 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

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
      <div className="mt-0.5 wrap-break-word text-sm text-zinc-800 dark:text-zinc-100">
        {children}
      </div>
    </div>
  );
}

export function OpportunityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, sessionLoading, userId } = useUser();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [detailRows, setDetailRows] = useState([]);
  const [taxRateInput, setTaxRateInput] = useState(0);
  const [detailsDirty, setDetailsDirty] = useState(false);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsErr, setDetailsErr] = useState("");

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

  const canEdit = item != null && String(item.ownerId) === String(userId ?? "");

  useEffect(() => {
    if (!item) {
      setDetailRows([]);
      setTaxRateInput(0);
      setDetailsDirty(false);
      return;
    }
    setDetailRows(
      (item.details ?? []).map((d) => ({
        productId: String(d.productId ?? ""),
        sku: String(d.sku ?? ""),
        productName: "",
        unit: String(d.unit ?? ""),
        description: String(d.description ?? ""),
        quantity: Number(d.quantity ?? 0),
        price: Number(d.price ?? 0),
        discount: Number(d.discount ?? 0),
      })),
    );
    setTaxRateInput(Number(item.taxRate ?? 0));
    setDetailsDirty(false);
    setDetailsErr("");
  }, [item]);

  const detailSubtotal = useMemo(
    () =>
      detailRows.reduce(
        (sum, d) =>
          sum +
          Number(d.quantity || 0) * Number(d.price || 0) -
          Number(d.discount || 0),
        0,
      ),
    [detailRows],
  );

  const previewTaxAmount = useMemo(
    () => Math.max(0, (detailSubtotal * Number(taxRateInput || 0)) / 100),
    [detailSubtotal, taxRateInput],
  );

  const previewGrandTotal = detailSubtotal + previewTaxAmount;

  const displaySubtotal = detailsDirty
    ? detailSubtotal
    : Number(item?.subTotal ?? detailSubtotal);
  const displayTaxAmount = detailsDirty
    ? previewTaxAmount
    : Number(item?.taxAmount ?? 0);
  const displayGrandTotal = detailsDirty
    ? previewGrandTotal
    : Number(item?.grandTotal ?? displaySubtotal + displayTaxAmount);
  const displayTaxRate = detailsDirty ? taxRateInput : Number(item?.taxRate ?? 0);

  async function saveInlineDetails() {
    if (!item?.id || !canEdit) return;
    setDetailsErr("");
    setDetailsSaving(true);
    try {
      const normalizedDetails = detailRows
        .filter((d) => String(d.description).trim().length > 0)
        .map((d) => ({
          productId: d.productId ? String(d.productId) : null,
          description: String(d.description).trim(),
          unit: String(d.unit ?? "").trim(),
          quantity: Number(d.quantity || 0),
          price: Number(d.price || 0),
          discount: Number(d.discount || 0),
        }));
      await apiPatch(`${paths.opportunity}/${encodeURIComponent(item.id)}`, {
        taxRate: Number(taxRateInput || 0),
        details: normalizedDetails,
      });
      setDetailsDirty(false);
      await loadDetail();
    } catch (e) {
      setDetailsErr(e?.message ?? "Failed to save line items");
    } finally {
      setDetailsSaving(false);
    }
  }

  function updateDetailRow(idx, patch) {
    setDetailRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
    setDetailsDirty(true);
  }

  function removeDetailRow(idx) {
    setDetailRows((prev) => prev.filter((_, i) => i !== idx));
    setDetailsDirty(true);
  }

  function addDetailRow() {
    setDetailRows((prev) => [
      ...prev,
      {
        productId: "",
        sku: "",
        productName: "",
        unit: "",
        description: "",
        quantity: 1,
        price: 0,
        discount: 0,
      },
    ]);
    setDetailsDirty(true);
  }
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

  async function handleCreateQuotation() {
    if (!item?.id) return;
    setErr("");
    try {
      const res = await apiPost(paths.quotationFromOpportunity(item.id), {});
      const quotationId = String(res?.data?.item?.id ?? "");
      if (quotationId) {
        navigate(`/quotation/manage/${quotationId}`);
      }
    } catch (e) {
      setErr(e?.message ?? "Failed to create quotation from opportunity");
    }
  }

  if (sessionLoading)
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading session...</p>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/"
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          ← Home
        </Link>
        {item && String(item.ownerId) === String(userId ?? "") ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateQuotation}
              className="rounded-md border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/30"
            >
              Create quotation
            </button>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Edit opportunity
            </button>
          </div>
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
                  {formatMoney(displayGrandTotal)}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Subtotal {formatMoney(displaySubtotal)}
                  {displayTaxRate > 0 ? ` · Tax ${displayTaxRate}%` : ""}
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Commercial breakdown
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {detailsDirty ? (
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      Unsaved changes
                    </span>
                  ) : null}
                  {canEdit ? (
                    <>
                      <button
                        type="button"
                        onClick={addDetailRow}
                        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        Add row
                      </button>
                      <button
                        type="button"
                        disabled={!detailsDirty || detailsSaving}
                        onClick={() => void saveInlineDetails()}
                        className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {detailsSaving ? "Saving…" : "Save line items"}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {detailsErr ? (
                <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
                  {detailsErr}
                </p>
              ) : null}

              {canEdit || detailRows.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                        <th className="px-2 py-2 font-medium">Product (SKU)</th>
                        <th className="px-2 py-2 font-medium">Description</th>
                        <th className="w-20 px-2 py-2 text-right font-medium">Qty</th>
                        <th className="w-20 px-2 py-2 font-medium">Unit</th>
                        <th className="w-32 px-2 py-2 text-right font-medium">Unit price</th>
                        <th className="w-28 px-2 py-2 text-right font-medium">Discount</th>
                        <th className="w-32 px-2 py-2 text-right font-medium">Subtotal</th>
                        {canEdit ? (
                          <th className="w-20 px-2 py-2 text-right font-medium"> </th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {detailRows.map((d, idx) => {
                        const lineSubtotal =
                          Number(d.quantity ?? 0) * Number(d.price ?? 0) -
                          Number(d.discount ?? 0);
                        return (
                          <tr
                            key={`detail-${idx}`}
                            className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
                          >
                            <td className="px-2 py-2">
                              {canEdit ? (
                                <ProductSkuPicker
                                  value={d.productId}
                                  sku={d.sku}
                                  name={d.productName}
                                  onChange={(sel) => {
                                    if (!sel) {
                                      updateDetailRow(idx, {
                                        productId: "",
                                        sku: "",
                                        productName: "",
                                        unit: "",
                                      });
                                      return;
                                    }
                                    updateDetailRow(idx, {
                                      productId: sel.productId,
                                      sku: sel.sku,
                                      productName: sel.name,
                                      unit: sel.unit ?? "",
                                    });
                                  }}
                                />
                              ) : (
                                <span className="tabular-nums text-zinc-700 dark:text-zinc-200">
                                  {String(d.sku ?? "").trim() || "-"}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {canEdit ? (
                                <input
                                  type="text"
                                  value={d.description}
                                  onChange={(e) =>
                                    updateDetailRow(idx, { description: e.target.value })
                                  }
                                  className={detailInputClass}
                                  placeholder="Description"
                                />
                              ) : (
                                <span className="text-zinc-800 dark:text-zinc-100">
                                  {d.description || "-"}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-right">
                              {canEdit ? (
                                <input
                                  type="number"
                                  min={0}
                                  value={d.quantity}
                                  onChange={(e) =>
                                    updateDetailRow(idx, {
                                      quantity: Number(e.target.value || 0),
                                    })
                                  }
                                  className={`${detailInputClass} text-right`}
                                />
                              ) : (
                                <span className="tabular-nums text-zinc-700 dark:text-zinc-200">
                                  {Number(d.quantity ?? 0)}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {canEdit ? (
                                <input
                                  type="text"
                                  value={d.unit}
                                  onChange={(e) =>
                                    updateDetailRow(idx, { unit: e.target.value })
                                  }
                                  className={detailInputClass}
                                  placeholder="Unit"
                                  disabled={Boolean(d.productId)}
                                  title={
                                    d.productId
                                      ? "Unit comes from product catalog"
                                      : "Enter unit for free-text line"
                                  }
                                />
                              ) : (
                                <span className="text-zinc-700 dark:text-zinc-200">
                                  {d.unit || "-"}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-right">
                              {canEdit ? (
                                <input
                                  type="number"
                                  min={0}
                                  value={d.price}
                                  onChange={(e) =>
                                    updateDetailRow(idx, {
                                      price: Number(e.target.value || 0),
                                    })
                                  }
                                  className={`${detailInputClass} text-right`}
                                />
                              ) : (
                                <span className="tabular-nums text-zinc-700 dark:text-zinc-200">
                                  {formatMoney(d.price)}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-right">
                              {canEdit ? (
                                <input
                                  type="number"
                                  min={0}
                                  value={d.discount}
                                  onChange={(e) =>
                                    updateDetailRow(idx, {
                                      discount: Number(e.target.value || 0),
                                    })
                                  }
                                  className={`${detailInputClass} text-right`}
                                />
                              ) : (
                                <span className="tabular-nums text-zinc-700 dark:text-zinc-200">
                                  {formatMoney(d.discount)}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2.5 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                              {formatMoney(lineSubtotal)}
                            </td>
                            {canEdit ? (
                              <td className="px-2 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeDetailRow(idx)}
                                  className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/30"
                                >
                                  Remove
                                </button>
                              </td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-zinc-200 dark:border-zinc-700">
                        <td
                          colSpan={6}
                          className="px-2 py-2 text-sm text-zinc-600 dark:text-zinc-300"
                        >
                          Subtotal
                        </td>
                        <td className="px-2 py-2 text-right font-medium tabular-nums">
                          {formatMoney(displaySubtotal)}
                        </td>
                        {canEdit ? <td /> : null}
                      </tr>
                      <tr>
                        <td
                          colSpan={5}
                          className="px-2 py-2 text-sm text-zinc-600 dark:text-zinc-300"
                        >
                          Tax
                        </td>
                        <td className="px-2 py-2 text-right">
                          {canEdit ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                min={0}
                                value={taxRateInput}
                                onChange={(e) => {
                                  setTaxRateInput(Number(e.target.value || 0));
                                  setDetailsDirty(true);
                                }}
                                className={`${detailInputClass} w-20 text-right`}
                              />
                              <span className="text-xs text-zinc-500">%</span>
                            </div>
                          ) : (
                            <span className="text-sm tabular-nums">{displayTaxRate}%</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right font-medium tabular-nums">
                          {formatMoney(displayTaxAmount)}
                        </td>
                        {canEdit ? <td /> : null}
                      </tr>
                      <tr className="border-t-2 border-zinc-300 dark:border-zinc-600">
                        <td
                          colSpan={6}
                          className="px-2 py-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100"
                        >
                          Grand total
                        </td>
                        <td className="px-2 py-3 text-right text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                          {formatMoney(displayGrandTotal)}
                        </td>
                        {canEdit ? <td /> : null}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="rounded-md border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    No line items added yet.
                  </p>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={addDetailRow}
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 dark:border-zinc-600 dark:text-zinc-200"
                    >
                      Add first line item
                    </button>
                  ) : null}
                </div>
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
                    {item.contact?.contactName
                      ? `${item.contact?.contactSuffix ? `${item.contact.contactSuffix} ` : ""}${item.contact.contactName}`
                      : "-"}
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

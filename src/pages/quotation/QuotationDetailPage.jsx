import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Modal } from "../../components/Modal.jsx";
import { ProductSkuPicker } from "../../components/ProductSkuPicker.jsx";
import { PublicFileBundle } from "../../components/PublicFileBundle.jsx";
import { useUser } from "../../context/UserContext.jsx";
import { QuotationWizardForm } from "../../forms/QuotationWizardForm.jsx";
import {
  formatMoney,
  hexToRgba,
  prettyDate,
  prettyDateTime,
  quotationStatusColor,
  quotationStatusLabel,
} from "../../lib/formatters.js";
import { apiGet, apiPatch, apiPost, downloadQuotationPdf, paths } from "../../lib/api.js";

const detailInputClass =
  "w-full min-w-0 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

const APPROVE_PERMS = ["post_quotation_id_approve"];
const REJECT_PERMS = ["post_quotation_id_reject"];

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

export function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, sessionLoading, userId, isSuperAdmin, hasAnyPermission } =
    useUser();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [detailRows, setDetailRows] = useState([]);
  const [taxRateInput, setTaxRateInput] = useState(0);
  const [discountTotalInput, setDiscountTotalInput] = useState(0);
  const [detailsDirty, setDetailsDirty] = useState(false);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsErr, setDetailsErr] = useState("");

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr("");
    try {
      const res = await apiGet(`${paths.quotation}/${encodeURIComponent(id)}`);
      setItem(res?.data?.item ?? null);
    } catch (e) {
      setErr(e?.message ?? "Failed to load quotation");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const status = String(item?.quotationStatus ?? "");
  const statusColor = quotationStatusColor(status);
  const isOwner = item != null && String(item.ownerId) === String(userId ?? "");
  const canEdit = isOwner && ["draft", "rejected"].includes(status);
  const canSubmit = canEdit && Boolean(item?.approverId);
  const hasApproveRejectRoutes =
    isSuperAdmin ||
    (hasAnyPermission(APPROVE_PERMS) && hasAnyPermission(REJECT_PERMS));
  const isAssignedApprover =
    item?.approverId != null && String(item.approverId) === String(userId ?? "");
  const canApproveReject =
    status === "pending_approved" &&
    hasApproveRejectRoutes &&
    (isSuperAdmin || isAssignedApprover);
  const canRevise = isOwner && status === "open";
  const canDownloadPdf = ["open", "close", "loss"].includes(status);

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

  useEffect(() => {
    if (!item) {
      setDetailRows([]);
      setTaxRateInput(0);
      setDiscountTotalInput(0);
      setDetailsDirty(false);
      return;
    }
    setDetailRows(
      (item.details ?? []).map((d) => {
        const productId = String(d.productId ?? "");
        return {
          productId,
          productName: productId ? String(d.description ?? "") : "",
          description: String(d.description ?? ""),
          quantity: Number(d.quantity ?? 0),
          unit: String(d.unit ?? ""),
          sku: String(d.sku ?? ""),
          price: Number(d.price ?? 0),
          discount: Number(d.discount ?? 0),
        };
      }),
    );
    setTaxRateInput(Number(item.taxRate ?? 0));
    setDiscountTotalInput(Number(item.discountTotal ?? 0));
    setDetailsDirty(false);
    setDetailsErr("");
  }, [item]);

  const lineSum = useMemo(
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

  const previewSubTotal = useMemo(
    () => Math.max(0, lineSum - Number(discountTotalInput || 0)),
    [lineSum, discountTotalInput],
  );

  const previewTaxAmount = useMemo(
    () => Math.max(0, (previewSubTotal * Number(taxRateInput || 0)) / 100),
    [previewSubTotal, taxRateInput],
  );

  const previewGrandTotal = previewSubTotal + previewTaxAmount;

  const displaySubtotal = detailsDirty
    ? previewSubTotal
    : Number(item?.subTotal ?? previewSubTotal);
  const displayTaxAmount = detailsDirty
    ? previewTaxAmount
    : Number(item?.taxAmount ?? 0);
  const displayGrandTotal = detailsDirty
    ? previewGrandTotal
    : Number(item?.grandTotal ?? displaySubtotal + displayTaxAmount);
  const displayTaxRate = detailsDirty ? taxRateInput : Number(item?.taxRate ?? 0);
  const displayDiscountTotal = detailsDirty
    ? discountTotalInput
    : Number(item?.discountTotal ?? 0);

  async function saveInlineDetails() {
    if (!item?.id || !canEdit) return;
    setDetailsErr("");
    setDetailsSaving(true);
    try {
      const normalizedDetails = detailRows
        .filter(
          (d) =>
            String(d.description).trim().length > 0 || Boolean(String(d.productId ?? "").trim()),
        )
        .map((d, idx) => ({
          sortOrder: idx,
          productId: d.productId ? String(d.productId) : null,
          description: String(d.description).trim(),
          quantity: Number(d.quantity || 0),
          unit: String(d.unit ?? "").trim(),
          sku: String(d.sku ?? "").trim(),
          price: Number(d.price || 0),
          discount: Number(d.discount || 0),
        }));
      await apiPatch(`${paths.quotation}/${encodeURIComponent(item.id)}`, {
        taxRate: Number(taxRateInput || 0),
        discountTotal: Number(discountTotalInput || 0),
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
        productName: "",
        description: "",
        quantity: 1,
        unit: "",
        sku: "",
        price: 0,
        discount: 0,
      },
    ]);
    setDetailsDirty(true);
  }

  async function onSubmitForApproval() {
    if (!item?.id) return;
    if (!item.approverId) {
      setErr("Select an approver before submitting (use Edit).");
      return;
    }
    setWorkflowLoading(true);
    setErr("");
    try {
      await apiPost(paths.quotationSubmit(item.id), {
        approverId: item.approverId,
      });
      await loadDetail();
    } catch (e) {
      setErr(e?.message ?? "Failed to submit quotation");
    } finally {
      setWorkflowLoading(false);
    }
  }

  async function onApprove() {
    if (!item?.id) return;
    setWorkflowLoading(true);
    setErr("");
    try {
      await apiPost(paths.quotationApprove(item.id), {});
      await loadDetail();
    } catch (e) {
      setErr(e?.message ?? "Failed to approve quotation");
    } finally {
      setWorkflowLoading(false);
    }
  }

  async function onRejectConfirm() {
    if (!item?.id) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setErr("Rejection reason is required.");
      return;
    }
    setWorkflowLoading(true);
    setErr("");
    try {
      await apiPost(paths.quotationReject(item.id), { reason });
      setRejectOpen(false);
      setRejectReason("");
      await loadDetail();
    } catch (e) {
      setErr(e?.message ?? "Failed to reject quotation");
    } finally {
      setWorkflowLoading(false);
    }
  }

  async function onRevise() {
    if (!item?.id) return;
    setWorkflowLoading(true);
    setErr("");
    try {
      const res = await apiPost(paths.quotationRevise(item.id), {});
      const nextId = String(res?.data?.item?.id ?? "");
      if (nextId) navigate(`/quotation/manage/${nextId}`);
    } catch (e) {
      setErr(e?.message ?? "Failed to create revision");
    } finally {
      setWorkflowLoading(false);
    }
  }

  async function onDownloadPdf() {
    if (!item?.id) return;
    setPdfLoading(true);
    setErr("");
    try {
      const safeNo = String(item.quotationNo ?? "quotation").replace(/[/\\?%*:|"<>]/g, "-");
      const filename = `Quotation_${safeNo}_Rev${item.revisionNo ?? 0}.pdf`;
      await downloadQuotationPdf(item.id, filename);
    } catch (e) {
      setErr(e?.message ?? "Failed to download PDF");
    } finally {
      setPdfLoading(false);
    }
  }

  if (sessionLoading) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading session...</p>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/quotation/manage"
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          ← Back to quotations
        </Link>
        {item ? (
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                disabled={workflowLoading}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Edit
              </button>
            ) : null}
            {isOwner && ["draft", "rejected"].includes(status) ? (
              <button
                type="button"
                onClick={onSubmitForApproval}
                disabled={workflowLoading || !canSubmit}
                title={!item.approverId ? "Set an approver in Edit first" : undefined}
                className="rounded-md border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/30"
              >
                Submit
              </button>
            ) : null}
            {canApproveReject ? (
              <>
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={workflowLoading}
                  className="rounded-md border border-green-300 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50 dark:border-green-700 dark:text-green-300"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRejectReason("");
                    setRejectOpen(true);
                  }}
                  disabled={workflowLoading}
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-300"
                >
                  Reject
                </button>
              </>
            ) : null}
            {canDownloadPdf ? (
              <button
                type="button"
                onClick={onDownloadPdf}
                disabled={pdfLoading || workflowLoading}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200"
              >
                {pdfLoading ? "Downloading…" : "Download PDF"}
              </button>
            ) : null}
            {canRevise ? (
              <button
                type="button"
                onClick={onRevise}
                disabled={workflowLoading}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200"
              >
                Create revision
              </button>
            ) : null}
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
          Loading quotation...
        </p>
      ) : !item ? (
        <p className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Quotation not found.
        </p>
      ) : (
        <>
          <section
            className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
            style={{ borderTop: `4px solid ${statusColor}` }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Quotation
                </p>
                <h1 className="mt-0.5 truncate text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {item.quotationNo}{" "}
                  <span className="text-lg font-medium text-zinc-500">
                    Rev {item.revisionNo}
                  </span>
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize"
                    style={{
                      color: statusColor,
                      backgroundColor: hexToRgba(statusColor, 0.14),
                      borderColor: hexToRgba(statusColor, 0.42),
                    }}
                  >
                    {quotationStatusLabel(status)}
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
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {item.customer?.customerName || "Unknown customer"}
                    {locationPath.length > 0 ? ` · ${locationPath.join(" / ")}` : ""}
                  </span>
                </div>
                {item.opportunityId ? (
                  <p className="mt-2 text-sm">
                    <Link
                      to={`/opportunity/manage/${encodeURIComponent(item.opportunityId)}`}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      View source opportunity
                    </Link>
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Grand total
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatMoney(displayGrandTotal)} {item.currency || "IDR"}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Subtotal {formatMoney(displaySubtotal)}
                  {Number(displayTaxRate) > 0
                    ? ` · Tax ${displayTaxRate}% (${formatMoney(displayTaxAmount)})`
                    : ""}
                  {Number(displayDiscountTotal) > 0
                    ? ` · Document discount ${formatMoney(displayDiscountTotal)}`
                    : ""}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Approver
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {item.approverEmail || "—"}
                </p>
                {item.approvedAt ? (
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    Approved {prettyDateTime(item.approvedAt)}
                  </p>
                ) : null}
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Valid until
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {prettyDate(item.validUntil)}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Line items
                </p>
                <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {detailRows.length}
                </p>
              </div>
            </div>

            {status === "rejected" && item.rejectReason ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                <span className="font-medium">Rejection reason:</span> {item.rejectReason}
              </div>
            ) : null}
          </section>

          <div className="grid gap-5 lg:grid-cols-3">
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
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                        <th className="px-2 py-2 font-medium">Description</th>
                        <th className="w-20 px-2 py-2 text-right font-medium">Qty</th>
                        <th className="w-24 px-2 py-2 font-medium">Unit</th>
                        <th className="w-28 px-2 py-2 font-medium">SKU</th>
                        <th className="w-28 px-2 py-2 text-right font-medium">Unit price</th>
                        <th className="w-24 px-2 py-2 text-right font-medium">Discount</th>
                        <th className="w-28 px-2 py-2 text-right font-medium">Subtotal</th>
                        {canEdit ? <th className="w-20 px-2 py-2" /> : null}
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
                                <input
                                  type="text"
                                  value={d.description}
                                  onChange={(e) =>
                                    updateDetailRow(idx, { description: e.target.value })
                                  }
                                  className={detailInputClass}
                                  placeholder="Name"
                                  disabled={Boolean(d.productId)}
                                  title={
                                    d.productId
                                      ? "Name comes from product catalog"
                                      : "Enter name for free-text line"
                                  }
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
                                <span className="tabular-nums">{Number(d.quantity ?? 0)}</span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {canEdit ? (
                                <input
                                  type="text"
                                  value={d.unit}
                                  onChange={(e) => updateDetailRow(idx, { unit: e.target.value })}
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
                                <span className="text-zinc-600">{d.unit || "-"}</span>
                              )}
                            </td>
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
                                        description: "",
                                      });
                                      return;
                                    }
                                    updateDetailRow(idx, {
                                      productId: sel.productId,
                                      sku: sel.sku,
                                      productName: sel.name,
                                      unit: sel.unit ?? "",
                                      description: sel.name,
                                    });
                                  }}
                                />
                              ) : (
                                <span className="font-mono text-xs">{d.sku || "-"}</span>
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
                                <span className="tabular-nums">{formatMoney(d.price)}</span>
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
                                <span className="tabular-nums">{formatMoney(d.discount)}</span>
                              )}
                            </td>
                            <td className="px-2 py-2.5 text-right font-medium tabular-nums">
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
                        <td colSpan={canEdit ? 6 : 6} className="px-2 py-2 text-sm text-zinc-600">
                          Document discount
                        </td>
                        <td className="px-2 py-2 text-right">
                          {canEdit ? (
                            <input
                              type="number"
                              min={0}
                              value={discountTotalInput}
                              onChange={(e) => {
                                setDiscountTotalInput(Number(e.target.value || 0));
                                setDetailsDirty(true);
                              }}
                              className={`${detailInputClass} text-right`}
                            />
                          ) : (
                            <span className="font-medium tabular-nums">
                              {formatMoney(displayDiscountTotal)}
                            </span>
                          )}
                        </td>
                        {canEdit ? <td /> : null}
                      </tr>
                      <tr>
                        <td colSpan={canEdit ? 6 : 6} className="px-2 py-2 text-sm text-zinc-600">
                          Subtotal
                        </td>
                        <td className="px-2 py-2 text-right font-medium tabular-nums">
                          {formatMoney(displaySubtotal)}
                        </td>
                        {canEdit ? <td /> : null}
                      </tr>
                      <tr>
                        <td colSpan={canEdit ? 5 : 5} className="px-2 py-2 text-sm text-zinc-600">
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
                          colSpan={canEdit ? 6 : 6}
                          className="px-2 py-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100"
                        >
                          Grand total
                        </td>
                        <td className="px-2 py-3 text-right text-base font-semibold tabular-nums">
                          {formatMoney(displayGrandTotal)}
                        </td>
                        {canEdit ? <td /> : null}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="rounded-md border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
                    No line items.
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

              {item.termsAndConditions ? (
                <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    Terms & conditions
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{item.termsAndConditions}</p>
                </div>
              ) : null}

              {item.notes ? (
                <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{item.notes}</p>
                </div>
              ) : null}

              <div className="mt-5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Attachments
                </p>
                <PublicFileBundle
                  fileIds={item.attachmentAssetIds ?? []}
                  className="mt-2"
                  emptyText="No attachments."
                />
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <h2 className="text-base font-semibold">Commercial context</h2>
                <div className="mt-3 space-y-3">
                  <Field label="Line of business">{item.lineOfBusinessName || "-"}</Field>
                  <Field label="Market segment">{item.marketSegmentName || "-"}</Field>
                  <Field label="Probability">{Number(item.propability ?? 0)}%</Field>
                  <Field label="Est. close">{prettyDate(item.estimateCloseDate)}</Field>
                  <Field label="Actual close">{prettyDate(item.actualCloseDate)}</Field>
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <h2 className="text-base font-semibold">Parties</h2>
                <div className="mt-3 space-y-3">
                  <Field label="Customer">{item.customer?.customerName || "-"}</Field>
                  <Field label="End user">{item.endUser?.endUserName || "-"}</Field>
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <h2 className="text-base font-semibold">Contact</h2>
                <div className="mt-3 space-y-3">
                  <Field label="Name">
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
                            className="rounded-md bg-zinc-50 px-2 py-1 text-xs dark:bg-zinc-800"
                          >
                            {v}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "-"
                    )}
                  </Field>
                </div>
              </section>

              {item?.quotationInformationSelected ? (
                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <h2 className="text-base font-semibold">Selected terms</h2>
                  <div className="mt-3 space-y-3">
                    <Field label="Terms of payment">
                      {Array.isArray(item.quotationInformationSelected?.termsOfPaymentSelected) &&
                      item.quotationInformationSelected.termsOfPaymentSelected.length > 0 ? (
                        <ul className="space-y-1">
                          {item.quotationInformationSelected.termsOfPaymentSelected.map((v, i) => (
                            <li
                              key={`${v}-${i}`}
                              className="rounded-md bg-zinc-50 px-2 py-1 text-xs dark:bg-zinc-800"
                            >
                              {v}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "-"
                      )}
                    </Field>
                    <Field label="Terms of delivery">
                      {Array.isArray(item.quotationInformationSelected?.termsOfDeliverySelected) &&
                      item.quotationInformationSelected.termsOfDeliverySelected.length > 0 ? (
                        <ul className="space-y-1">
                          {item.quotationInformationSelected.termsOfDeliverySelected.map((v, i) => (
                            <li
                              key={`${v}-${i}`}
                              className="rounded-md bg-zinc-50 px-2 py-1 text-xs dark:bg-zinc-800"
                            >
                              {v}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "-"
                      )}
                    </Field>
                    <Field label="Warranty">
                      {Array.isArray(item.quotationInformationSelected?.termsOfWarrantySelected) &&
                      item.quotationInformationSelected.termsOfWarrantySelected.length > 0 ? (
                        <ul className="space-y-1">
                          {item.quotationInformationSelected.termsOfWarrantySelected.map((v, i) => (
                            <li
                              key={`${v}-${i}`}
                              className="rounded-md bg-zinc-50 px-2 py-1 text-xs dark:bg-zinc-800"
                            >
                              {v}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "-"
                      )}
                    </Field>
                  </div>
                </section>
              ) : null}

              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <h2 className="text-base font-semibold">Location</h2>
                <div className="mt-3 space-y-3">
                  <Field label="Province">{item.locationNames?.provinceName || "-"}</Field>
                  <Field label="Regency">{item.locationNames?.regencyName || "-"}</Field>
                  <Field label="District">{item.locationNames?.districtName || "-"}</Field>
                </div>
              </section>
            </aside>
          </div>

          <section className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <span>
                <span className="font-medium text-zinc-500">ID:</span>{" "}
                <span className="font-mono">{item.id}</span>
              </span>
              <span>
                <span className="font-medium text-zinc-500">Owner:</span>{" "}
                {item.ownerName || item.ownerId}
              </span>
              <span>
                <span className="font-medium text-zinc-500">Created:</span>{" "}
                {prettyDateTime(item.createdAt)}
              </span>
              <span>
                <span className="font-medium text-zinc-500">Updated:</span>{" "}
                {prettyDateTime(item.updatedAt)}
              </span>
            </div>
          </section>
        </>
      )}

      <Modal
        open={editOpen && item != null}
        onClose={() => setEditOpen(false)}
        closeOnOverlayClick={false}
        title="Edit quotation"
      >
        {item ? (
          <QuotationWizardForm
            initial={item}
            onSuccess={async () => {
              setEditOpen(false);
              await loadDetail();
            }}
            onCancel={() => setEditOpen(false)}
          />
        ) : null}
      </Modal>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        closeOnOverlayClick={false}
        title="Reject quotation"
      >
        <div className="space-y-3">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Reason
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full min-h-24 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            placeholder="Why is this quotation rejected?"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejectOpen(false)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onRejectConfirm}
              disabled={workflowLoading}
              className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {workflowLoading ? "Rejecting…" : "Confirm reject"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

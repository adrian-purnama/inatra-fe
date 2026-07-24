import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Modal } from "../../components/Modal.jsx";
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
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [siblings, setSiblings] = useState([]);

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

  useEffect(() => {
    const quotationNo = String(item?.quotationNo ?? "").trim();
    if (!quotationNo) {
      setSiblings([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams({
          quotationNo,
          limit: "100",
          page: "1",
        });
        const res = await apiGet(`${paths.quotation}?${qs.toString()}`);
        const items = res?.data?.items ?? [];
        if (cancelled) return;
        setSiblings(
          [...items].sort(
            (a, b) => Number(b.revisionNo ?? 0) - Number(a.revisionNo ?? 0),
          ),
        );
      } catch {
        if (!cancelled) setSiblings([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item?.quotationNo]);

  const status = String(item?.quotationStatus ?? "");
  const statusColor = quotationStatusColor(status);
  const isOwner = item != null && String(item.ownerId) === String(userId ?? "");
  const canEdit = isOwner && ["draft", "rejected"].includes(status);
  const canEditStatus = isOwner && ["open", "close", "loss"].includes(status);
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

  const details = Array.isArray(item?.details) ? item.details : [];

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

  async function onSubmitForApproval() {
    if (!item?.id) return;
    if (!item.approverId) {
      setErr("Select an approver in the form below first.");
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

  async function onStatusChange(nextStatus) {
    if (!item?.id || !canEditStatus) return;
    const next = String(nextStatus ?? "");
    if (!["open", "close", "loss"].includes(next) || next === status) return;
    setWorkflowLoading(true);
    setErr("");
    try {
      await apiPatch(`${paths.quotation}/${encodeURIComponent(item.id)}`, {
        quotationStatus: next,
      });
      await loadDetail();
    } catch (e) {
      setErr(e?.message ?? "Failed to update status");
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
            {isOwner && ["draft", "rejected"].includes(status) ? (
              <button
                type="button"
                onClick={onSubmitForApproval}
                disabled={workflowLoading || !canSubmit}
                title={!item.approverId ? "Set an approver in the form below first" : undefined}
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
                {siblings.length > 1 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Revisions
                    </span>
                    {siblings.map((sib) => {
                      const sibStatus = String(sib.quotationStatus ?? "");
                      const sibColor = quotationStatusColor(sibStatus);
                      const isCurrent = String(sib.id) === String(item.id);
                      return isCurrent ? (
                        <span
                          key={sib.id}
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold"
                          style={{
                            color: sibColor,
                            backgroundColor: hexToRgba(sibColor, 0.14),
                            borderColor: hexToRgba(sibColor, 0.42),
                          }}
                        >
                          Rev {sib.revisionNo}
                        </span>
                      ) : (
                        <Link
                          key={sib.id}
                          to={`/quotation/manage/${sib.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-0.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          title={quotationStatusLabel(sibStatus)}
                        >
                          Rev {sib.revisionNo}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {canEditStatus ? (
                    <select
                      value={status}
                      disabled={workflowLoading}
                      onChange={(e) => onStatusChange(e.target.value)}
                      className="rounded-full border px-2 py-0.5 text-xs font-medium capitalize disabled:opacity-50"
                      style={{
                        color: statusColor,
                        backgroundColor: hexToRgba(statusColor, 0.14),
                        borderColor: hexToRgba(statusColor, 0.42),
                      }}
                      aria-label="Quotation status"
                    >
                      {["open", "close", "loss"].map((s) => (
                        <option key={s} value={s}>
                          {quotationStatusLabel(s)}
                        </option>
                      ))}
                    </select>
                  ) : (
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
                  )}
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
                  {formatMoney(item.grandTotal)} {item.currency || "IDR"}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Subtotal {formatMoney(item.subTotal)}
                  {Number(item.taxRate ?? 0) > 0
                    ? ` · Tax ${item.taxRate}% (${formatMoney(item.taxAmount)})`
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
                  {details.length}
                </p>
              </div>
            </div>

            {status === "rejected" && item.rejectReason ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                <span className="font-medium">Rejection reason:</span> {item.rejectReason}
              </div>
            ) : null}
          </section>

          {canEdit ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Edit quotation
              </h2>
              <QuotationWizardForm
                variant="page"
                initial={item}
                onSuccess={loadDetail}
              />
              <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-700">
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
          ) : (
            <>
              <div className="grid gap-5 lg:grid-cols-3">
                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 lg:col-span-2">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Cost breakdown
                  </h2>

                  {details.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {/* Mobile: stacked line cards — no horizontal scroll */}
                      <div className="space-y-3 md:hidden">
                        {details.map((d, idx) => {
                          const lineSubtotal =
                            Number(d.quantity ?? 0) * Number(d.price ?? 0) -
                            Number(d.discount ?? 0);
                          return (
                            <div
                              key={d.id ?? `m-detail-${idx}`}
                              className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="min-w-0 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                  <span className="mr-1.5 tabular-nums text-zinc-400">
                                    {idx + 1}.
                                  </span>
                                  {d.description || "-"}
                                </p>
                                <p className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                                  {formatMoney(lineSubtotal)}
                                </p>
                              </div>
                              <p className="mt-1 font-mono text-xs text-zinc-500">
                                {String(d.sku ?? "").trim() || "—"}
                              </p>
                              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                                <div className="flex justify-between gap-1">
                                  <dt className="text-zinc-500">Qty</dt>
                                  <dd className="tabular-nums">{Number(d.quantity ?? 0)}</dd>
                                </div>
                                <div className="flex justify-between gap-1">
                                  <dt className="text-zinc-500">Unit</dt>
                                  <dd>{d.unit || "—"}</dd>
                                </div>
                                <div className="flex justify-between gap-1">
                                  <dt className="text-zinc-500">Price</dt>
                                  <dd className="tabular-nums">{formatMoney(d.price)}</dd>
                                </div>
                                <div className="flex justify-between gap-1">
                                  <dt className="text-zinc-500">Discount</dt>
                                  <dd className="tabular-nums">
                                    {Number(d.discount ?? 0) > 0
                                      ? formatMoney(d.discount)
                                      : "—"}
                                  </dd>
                                </div>
                              </dl>
                            </div>
                          );
                        })}
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                          <div className="flex justify-between gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                            <span>Subtotal</span>
                            <span className="font-medium tabular-nums">
                              {formatMoney(item.subTotal)}
                            </span>
                          </div>
                          <div className="mt-1.5 flex justify-between gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                            <span>Tax ({Number(item.taxRate ?? 0)}%)</span>
                            <span className="font-medium tabular-nums">
                              {formatMoney(item.taxAmount)}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between gap-2 border-t border-zinc-200 pt-2 dark:border-zinc-600">
                            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                              Grand total ({item.currency || "IDR"})
                            </span>
                            <span className="text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                              {formatMoney(item.grandTotal)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Desktop: invoice table */}
                      <div className="hidden overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 md:block">
                        <table className="w-full table-fixed text-left text-sm">
                          <thead>
                            <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400">
                              <th className="w-10 px-3 py-2.5 font-medium">#</th>
                              <th className="px-3 py-2.5 font-medium">Description</th>
                              <th className="w-[14%] px-3 py-2.5 font-medium">SKU</th>
                              <th className="w-14 px-3 py-2.5 text-right font-medium">Qty</th>
                              <th className="w-14 px-3 py-2.5 font-medium">Unit</th>
                              <th className="w-[16%] px-3 py-2.5 text-right font-medium">
                                Unit price
                              </th>
                              <th className="w-[14%] px-3 py-2.5 text-right font-medium">
                                Discount
                              </th>
                              <th className="w-[16%] px-3 py-2.5 text-right font-medium">
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {details.map((d, idx) => {
                              const lineSubtotal =
                                Number(d.quantity ?? 0) * Number(d.price ?? 0) -
                                Number(d.discount ?? 0);
                              return (
                                <tr
                                  key={d.id ?? `detail-${idx}`}
                                  className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
                                >
                                  <td className="px-3 py-2.5 tabular-nums text-zinc-500">
                                    {idx + 1}
                                  </td>
                                  <td className="break-words px-3 py-2.5 text-zinc-800 dark:text-zinc-100">
                                    {d.description || "-"}
                                  </td>
                                  <td className="break-all px-3 py-2.5 font-mono text-xs tabular-nums text-zinc-600 dark:text-zinc-300">
                                    {String(d.sku ?? "").trim() || "—"}
                                  </td>
                                  <td className="px-3 py-2.5 text-right tabular-nums">
                                    {Number(d.quantity ?? 0)}
                                  </td>
                                  <td className="break-words px-3 py-2.5 text-zinc-600 dark:text-zinc-300">
                                    {d.unit || "—"}
                                  </td>
                                  <td className="px-3 py-2.5 text-right tabular-nums">
                                    {formatMoney(d.price)}
                                  </td>
                                  <td className="px-3 py-2.5 text-right tabular-nums">
                                    {Number(d.discount ?? 0) > 0
                                      ? formatMoney(d.discount)
                                      : "—"}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                                    {formatMoney(lineSubtotal)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-zinc-200 dark:border-zinc-700">
                              <td
                                colSpan={7}
                                className="px-3 py-2 text-right text-sm text-zinc-600 dark:text-zinc-300"
                              >
                                Subtotal
                              </td>
                              <td className="px-3 py-2 text-right font-medium tabular-nums">
                                {formatMoney(item.subTotal)}
                              </td>
                            </tr>
                            <tr>
                              <td
                                colSpan={7}
                                className="px-3 py-2 text-right text-sm text-zinc-600 dark:text-zinc-300"
                              >
                                Tax ({Number(item.taxRate ?? 0)}%)
                              </td>
                              <td className="px-3 py-2 text-right font-medium tabular-nums">
                                {formatMoney(item.taxAmount)}
                              </td>
                            </tr>
                            <tr className="border-t-2 border-zinc-300 bg-zinc-50/80 dark:border-zinc-600 dark:bg-zinc-800/40">
                              <td
                                colSpan={7}
                                className="px-3 py-3 text-right text-sm font-semibold text-zinc-800 dark:text-zinc-100"
                              >
                                Grand total ({item.currency || "IDR"})
                              </td>
                              <td className="px-3 py-3 text-right text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                                {formatMoney(item.grandTotal)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 rounded-md border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
                      No line items.
                    </p>
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
                              <li key={`${v}-${i}`}>{v}</li>
                            ))}
                          </ul>
                        ) : (
                          "-"
                        )}
                      </Field>
                    </div>
                  </section>

                  {item.quotationInformationSelected ? (
                    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                      <h2 className="text-base font-semibold">Selected terms</h2>
                      <div className="mt-3 space-y-3">
                        <Field label="Payment">
                          {Array.isArray(
                            item.quotationInformationSelected?.termsOfPaymentSelected,
                          ) &&
                          item.quotationInformationSelected.termsOfPaymentSelected.length > 0 ? (
                            <ul className="space-y-1">
                              {item.quotationInformationSelected.termsOfPaymentSelected.map(
                                (v, i) => (
                                  <li
                                    key={`${v}-${i}`}
                                    className="rounded-md bg-zinc-50 px-2 py-1 text-xs dark:bg-zinc-800"
                                  >
                                    {v}
                                  </li>
                                ),
                              )}
                            </ul>
                          ) : (
                            "-"
                          )}
                        </Field>
                        <Field label="Delivery">
                          {Array.isArray(
                            item.quotationInformationSelected?.termsOfDeliverySelected,
                          ) &&
                          item.quotationInformationSelected.termsOfDeliverySelected.length > 0 ? (
                            <ul className="space-y-1">
                              {item.quotationInformationSelected.termsOfDeliverySelected.map(
                                (v, i) => (
                                  <li
                                    key={`${v}-${i}`}
                                    className="rounded-md bg-zinc-50 px-2 py-1 text-xs dark:bg-zinc-800"
                                  >
                                    {v}
                                  </li>
                                ),
                              )}
                            </ul>
                          ) : (
                            "-"
                          )}
                        </Field>
                        <Field label="Warranty">
                          {Array.isArray(
                            item.quotationInformationSelected?.termsOfWarrantySelected,
                          ) &&
                          item.quotationInformationSelected.termsOfWarrantySelected.length > 0 ? (
                            <ul className="space-y-1">
                              {item.quotationInformationSelected.termsOfWarrantySelected.map(
                                (v, i) => (
                                  <li
                                    key={`${v}-${i}`}
                                    className="rounded-md bg-zinc-50 px-2 py-1 text-xs dark:bg-zinc-800"
                                  >
                                    {v}
                                  </li>
                                ),
                              )}
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
        </>
      )}

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

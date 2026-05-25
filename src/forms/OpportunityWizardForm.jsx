import { useEffect, useMemo, useState } from "react";
import { Modal } from "../components/Modal.jsx";
import { SearchableDropdown } from "../components/SearchableDropdown.jsx";
import { useUser } from "../context/UserContext.jsx";
import { LineOfBusinessForm } from "./LineOfBusinessForm.jsx";
import { MarketSegmentForm } from "./MarketSegmentForm.jsx";
import { StatusForm } from "./StatusForm.jsx";
import { apiGet, apiPatch, apiPost, apiPostFormData, paths } from "../lib/api.js";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

const STEP_TITLES = [
  "1. Qualification",
  "2. Customer & contact",
  "3. Location",
  "4. Detail items",
];

const quickAddPermission = {
  lineOfBusiness: ["post_dataentry_lineofbusiness", "post_opportunity_lineofbusiness"],
  marketSegment: ["post_dataentry_marketsegment", "post_opportunity_marketsegment"],
  leadQualification: ["post_dataentry_status", "post_admin_status"],
};

function splitDetailsText(raw) {
  return String(raw ?? "")
    .split(/\r?\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function firstConstraintMessage(err) {
  const errors = err?.data?.errors;
  if (!Array.isArray(errors) || errors.length === 0) return "";
  for (const item of errors) {
    const constraints = item?.constraints;
    if (constraints && typeof constraints === "object") {
      const first = Object.values(constraints)[0];
      if (typeof first === "string" && first.trim()) {
        return `${item.property}: ${first}`;
      }
    }
  }
  return "";
}

function idOrEmpty(value) {
  return typeof value === "string" ? value : "";
}

function monthValueFromDate(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function optionalId(value, isEdit) {
  const trimmed = String(value ?? "").trim();
  if (trimmed) return trimmed;
  return isEdit ? null : undefined;
}

function fileExtensionFromName(nameOrUrl) {
  const text = String(nameOrUrl ?? "").trim();
  const noQuery = text.split("?")[0]?.split("#")[0] ?? text;
  const last = noQuery.lastIndexOf(".");
  if (last < 0) return "FILE";
  const ext = noQuery.slice(last + 1).trim().toUpperCase();
  return ext || "FILE";
}

function isImageAttachment(urlOrName) {
  return /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(String(urlOrName ?? ""));
}

function fileNameFromUrl(urlOrName) {
  const text = String(urlOrName ?? "").trim();
  if (!text) return "file";
  const noQuery = text.split("?")[0]?.split("#")[0] ?? text;
  const slash = noQuery.lastIndexOf("/");
  const name = slash >= 0 ? noQuery.slice(slash + 1) : noQuery;
  return name || "file";
}

/**
 * @param {object} props
 * @param {{ id?: string } | null} [props.initial]
 * @param {string} props.currentUserId
 * @param {() => Promise<void> | void} props.onSuccess
 * @param {() => void} props.onCancel
 */
export function OpportunityWizardForm({ initial = null, currentUserId, onSuccess, onCancel }) {
  const { hasAnyPermission } = useUser();
  const isEdit = Boolean(initial?.id);
  const [step, setStep] = useState(0);
  const [lineOfBusinessId, setLineOfBusinessId] = useState("");
  const [marketSegmentId, setMarketSegmentId] = useState("");
  const [leadQualificationId, setLeadQualificationId] = useState("");
  const [propability, setPropability] = useState(0);
  const [estimateCloseMonth, setEstimateCloseMonth] = useState("");
  const [actualCloseMonth, setActualCloseMonth] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [endUserId, setEndUserId] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactDetailsText, setContactDetailsText] = useState("");
  const [notes, setNotes] = useState("");
  const [countryId, setCountryId] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [regencyId, setRegencyId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [details, setDetails] = useState([{ description: "", quantity: 1, price: 0 }]);
  const [taxRate, setTaxRate] = useState(0);
  const [lobOptions, setLobOptions] = useState([]);
  const [segmentOptions, setSegmentOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);
  const [countryRows, setCountryRows] = useState([]);
  const [provinceRows, setProvinceRows] = useState([]);
  const [regencyRows, setRegencyRows] = useState([]);
  const [districtRows, setDistrictRows] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [regencyOptions, setRegencyOptions] = useState([]);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [createLobOpen, setCreateLobOpen] = useState(false);
  const [createSegmentOpen, setCreateSegmentOpen] = useState(false);
  const [createStatusOpen, setCreateStatusOpen] = useState(false);
  const [attachmentAssetIds, setAttachmentAssetIds] = useState([]);
  const [attachmentUrls, setAttachmentUrls] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [uploadAttachmentErr, setUploadAttachmentErr] = useState("");
  const [pendingAttachmentFiles, setPendingAttachmentFiles] = useState([]);

  useEffect(() => {
    setStep(0);
    setFormErr("");
    setLineOfBusinessId(idOrEmpty(initial?.lineOfBusinessId));
    setMarketSegmentId(idOrEmpty(initial?.marketSegmentId));
    setLeadQualificationId(idOrEmpty(initial?.leadQualificationId));
    setPropability(Number(initial?.propability ?? 0));
    setEstimateCloseMonth(monthValueFromDate(initial?.estimateCloseDate));
    setActualCloseMonth(monthValueFromDate(initial?.actualCloseDate));
    setCustomerId(idOrEmpty(initial?.customer?.customerId));
    setEndUserId(idOrEmpty(initial?.endUser?.endUserId));
    setContactName(String(initial?.contact?.contactName ?? ""));
    setContactDetailsText(
      Array.isArray(initial?.contact?.contactDetails)
        ? initial.contact.contactDetails.map((x) => String(x)).join("\n")
        : "",
    );
    setNotes(String(initial?.notes ?? ""));
    setCountryId("");
    setProvinceId(idOrEmpty(initial?.location?.provinceId));
    setRegencyId(idOrEmpty(initial?.location?.regencyId));
    setDistrictId(idOrEmpty(initial?.location?.districtId));
    setDetails(
      Array.isArray(initial?.details) && initial.details.length > 0
        ? initial.details.map((d) => ({
            description: String(d?.description ?? ""),
            quantity: Number(d?.quantity ?? 0),
            price: Number(d?.price ?? 0),
          }))
        : [{ description: "", quantity: 1, price: 0 }],
    );
    setTaxRate(Number(initial?.taxRate ?? 0));
    setAttachmentAssetIds(
      Array.isArray(initial?.attachmentAssetIds)
        ? initial.attachmentAssetIds.map((x) => String(x))
        : [],
    );
    setAttachmentUrls(
      Array.isArray(initial?.attachmentUrls)
        ? initial.attachmentUrls.map((x) => String(x)).filter(Boolean)
        : [],
    );
    setUploadAttachmentErr("");
    setPendingAttachmentFiles([]);
  }, [initial]);

  const canQuickAddLob = hasAnyPermission(quickAddPermission.lineOfBusiness);
  const canQuickAddSegment = hasAnyPermission(quickAddPermission.marketSegment);
  const canQuickAddStatus = hasAnyPermission(quickAddPermission.leadQualification);

  async function loadQualificationOptions() {
    const [lobRes, segRes, stRes] = await Promise.all([
      apiGet(paths.opportunityLineOfBusiness),
      apiGet(paths.opportunityMarketSegment),
      apiGet(paths.opportunityStatus),
    ]);
    setLobOptions((lobRes?.data?.items ?? []).map((x) => ({ value: x.id, label: x.name })));
    setSegmentOptions((segRes?.data?.items ?? []).map((x) => ({ value: x.id, label: x.name })));
    setStatusOptions((stRes?.data?.items ?? []).map((x) => ({ value: x.id, label: x.name })));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [orgRes, locRes] = await Promise.all([
          apiGet(paths.opportunityExternalOrg),
          apiGet(`${paths.location}/choices`),
        ]);
        await loadQualificationOptions();
        if (cancelled) return;
        setOrgOptions((orgRes?.data?.items ?? []).map((x) => ({ value: x.id, label: x.name })));
        const countries = locRes?.data?.countries ?? [];
        setCountryRows(countries);
        setCountryOptions(countries.map((x) => ({ value: x.id, label: x.name })));
        const provinces = locRes?.data?.provinces ?? [];
        setProvinceRows(provinces);
        setProvinceOptions(provinces.map((x) => ({ value: x.id, label: x.name })));
      } catch {
        if (!cancelled) {
          setLobOptions([]);
          setSegmentOptions([]);
          setStatusOptions([]);
          setOrgOptions([]);
          setCountryRows([]);
          setProvinceRows([]);
          setRegencyRows([]);
          setDistrictRows([]);
          setCountryOptions([]);
          setProvinceOptions([]);
          setRegencyOptions([]);
          setDistrictOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!countryId) {
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const qs = new URLSearchParams({ countryId });
        const res = await apiGet(`${paths.location}/choices?${qs.toString()}`);
        if (!cancelled) {
          const provinces = res?.data?.provinces ?? [];
          setProvinceRows(provinces);
          setProvinceOptions(provinces.map((x) => ({ value: x.id, label: x.name })));
          const hasProvince =
            provinces.find((x) => String(x.id) === String(provinceId)) != null;
          if (!hasProvince) {
            setProvinceId("");
            setRegencyRows([]);
            setDistrictRows([]);
            setRegencyOptions([]);
            setDistrictOptions([]);
            setRegencyId("");
            setDistrictId("");
          }
          setDistrictRows([]);
          setDistrictOptions([]);
          setDistrictId("");
        }
      } catch {
        if (!cancelled) {
          setProvinceRows([]);
          setProvinceOptions([]);
          setRegencyRows([]);
          setRegencyOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [countryId, provinceId]);

  useEffect(() => {
    if (!provinceId || !Array.isArray(provinceRows) || provinceRows.length === 0) return;
    const selectedProvince = provinceRows.find((x) => String(x.id) === String(provinceId));
    const inferredCountryId = selectedProvince?.parentId ? String(selectedProvince.parentId) : "";
    if (inferredCountryId && inferredCountryId !== countryId) {
      setCountryId(inferredCountryId);
    }
  }, [provinceId, provinceRows, countryId]);

  useEffect(() => {
    let cancelled = false;
    if (!provinceId) {
      setRegencyRows([]);
      setDistrictRows([]);
      setRegencyOptions([]);
      setDistrictOptions([]);
      setRegencyId("");
      setDistrictId("");
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const qs = new URLSearchParams({ provinceId });
        const res = await apiGet(`${paths.location}/choices?${qs.toString()}`);
        if (!cancelled) {
          const regencies = res?.data?.regencies ?? [];
          setRegencyRows(regencies);
          setRegencyOptions(regencies.map((x) => ({ value: x.id, label: x.name })));
          setDistrictRows([]);
          setDistrictOptions([]);
          setDistrictId("");
        }
      } catch {
        if (!cancelled) {
          setRegencyRows([]);
          setRegencyOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provinceId]);

  useEffect(() => {
    let cancelled = false;
    if (!regencyId) {
      setDistrictRows([]);
      setDistrictOptions([]);
      setDistrictId("");
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const qs = new URLSearchParams({ regencyId });
        const res = await apiGet(`${paths.location}/choices?${qs.toString()}`);
        if (!cancelled) {
          const districts = res?.data?.districts ?? [];
          setDistrictRows(districts);
          setDistrictOptions(districts.map((x) => ({ value: x.id, label: x.name })));
        }
      } catch {
        if (!cancelled) {
          setDistrictRows([]);
          setDistrictOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [regencyId]);

  const canPrev = step > 0;
  const canNext = step < STEP_TITLES.length - 1;

  const detailTotal = useMemo(
    () => details.reduce((sum, d) => sum + Number(d.quantity || 0) * Number(d.price || 0), 0),
    [details],
  );

  const taxAmount = useMemo(
    () => Math.max(0, (detailTotal * Number(taxRate || 0)) / 100),
    [detailTotal, taxRate],
  );

  const grandTotal = useMemo(() => detailTotal + taxAmount, [detailTotal, taxAmount]);

  async function submit() {
    setFormErr("");
    if (!lineOfBusinessId || !marketSegmentId || !leadQualificationId) {
      setFormErr("Line of business, market segment, and lead qualification are required.");
      setStep(0);
      return;
    }
    if (!contactName.trim()) {
      setFormErr("Contact person is required.");
      setStep(1);
      return;
    }
    setSubmitting(true);
    try {
      const contactDetails = splitDetailsText(contactDetailsText);
      const normalizedDetails = details
        .filter((d) => String(d.description).trim().length > 0)
        .map((d) => ({
          description: String(d.description).trim(),
          quantity: Number(d.quantity || 0),
          price: Number(d.price || 0),
        }));

      const body = {
        ownerId: currentUserId,
        availableTo: currentUserId ? [currentUserId] : [],
        lineOfBusinessId,
        marketSegmentId,
        leadQualificationId,
        propability: Number(propability || 0),
        estimateCloseDate: estimateCloseMonth || (isEdit ? null : undefined),
        actualCloseDate: actualCloseMonth || (isEdit ? null : undefined),
        customerId: optionalId(customerId, isEdit),
        endUserId: optionalId(endUserId, isEdit),
        contactName: contactName.trim(),
        contactDetails,
        notes: notes.trim(),
        provinceId: optionalId(provinceId, isEdit),
        regencyId: optionalId(regencyId, isEdit),
        districtId: optionalId(districtId, isEdit),
        details: normalizedDetails,
        taxRate: Number(taxRate || 0),
      };

      if (isEdit) {
        await apiPatch(`${paths.opportunity}/${initial.id}`, body);
      } else {
        const createRes = await apiPost(paths.opportunity, body);
        const createdId = createRes?.data?.item?.id;
        if (createdId && pendingAttachmentFiles.length > 0) {
          for (const f of pendingAttachmentFiles) {
            const fd = new FormData();
            fd.append("file", f);
            await apiPostFormData(paths.opportunityAttachmentUpload(createdId), fd);
          }
        }
      }
      await onSuccess();
    } catch (err) {
      setFormErr(firstConstraintMessage(err) || err?.message || "Could not save opportunity");
    } finally {
      setSubmitting(false);
    }
  }

  function updateDetail(idx, patch) {
    setDetails((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  async function onUploadAttachment(file) {
    if (!isEdit || !initial?.id || !file) return;
    setUploadAttachmentErr("");
    setUploadingAttachment(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiPostFormData(paths.opportunityAttachmentUpload(initial.id), fd);
      const nextIds = Array.isArray(res?.data?.attachmentAssetIds)
        ? res.data.attachmentAssetIds.map((x) => String(x))
        : attachmentAssetIds;
      const uploadedUrl = String(res?.data?.url ?? "");
      setAttachmentAssetIds(nextIds);
      setAttachmentUrls((prev) =>
        uploadedUrl && !prev.includes(uploadedUrl) ? [...prev, uploadedUrl] : prev,
      );
    } catch (err) {
      setUploadAttachmentErr(err?.message || "Could not upload attachment");
    } finally {
      setUploadingAttachment(false);
    }
  }

  function onSelectPendingAttachments(files) {
    const next = Array.from(files ?? []).filter(Boolean);
    if (next.length === 0) return;
    setPendingAttachmentFiles((prev) => [...prev, ...next]);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">{STEP_TITLES[step]}</p>
      {formErr ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {formErr}
        </p>
      ) : null}

      {step === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">Line of business</label>
            <SearchableDropdown value={lineOfBusinessId} onChange={setLineOfBusinessId} options={lobOptions} />
            {canQuickAddLob ? (
              <button type="button" onClick={() => setCreateLobOpen(true)} className="mt-1 text-xs font-medium text-primary hover:underline">
                + Add line of business
              </button>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-sm">Market segment</label>
            <SearchableDropdown value={marketSegmentId} onChange={setMarketSegmentId} options={segmentOptions} />
            {canQuickAddSegment ? (
              <button type="button" onClick={() => setCreateSegmentOpen(true)} className="mt-1 text-xs font-medium text-primary hover:underline">
                + Add market segment
              </button>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-sm">Lead qualification</label>
            <SearchableDropdown value={leadQualificationId} onChange={setLeadQualificationId} options={statusOptions} />
            {canQuickAddStatus ? (
              <button type="button" onClick={() => setCreateStatusOpen(true)} className="mt-1 text-xs font-medium text-primary hover:underline">
                + Add lead qualification status
              </button>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-sm">Probability</label>
            <input type="number" min={0} max={100} value={propability} onChange={(e) => setPropability(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Estimated close month</label>
            <input
              type="month"
              value={estimateCloseMonth}
              onChange={(e) => setEstimateCloseMonth(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Actual close month</label>
            <input
              type="month"
              value={actualCloseMonth}
              onChange={(e) => setActualCloseMonth(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">Customer org</label>
            <SearchableDropdown value={customerId} onChange={setCustomerId} options={orgOptions} />
          </div>
          <div>
            <label className="mb-1 block text-sm">End user org</label>
            <SearchableDropdown value={endUserId} onChange={setEndUserId} options={orgOptions} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Contact name</label>
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Required
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm">Contact details (comma or newline)</label>
            <textarea value={contactDetailsText} onChange={(e) => setContactDetailsText(e.target.value)} className={`${inputClass} min-h-24`} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} min-h-24`} />
          </div>

          <div className="sm:col-span-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Attachments</p>
              {isEdit && initial?.id ? (
                <label className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-xs dark:border-zinc-600">
                  {uploadingAttachment ? "Uploading..." : "Upload attachment"}
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploadingAttachment}
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f) void onUploadAttachment(f);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              ) : (
                <label className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-xs dark:border-zinc-600">
                  Select attachments
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      onSelectPendingAttachments(e.target.files);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              )}
            </div>

            {uploadAttachmentErr ? (
              <p className="mb-2 text-xs text-red-600 dark:text-red-300">{uploadAttachmentErr}</p>
            ) : null}

            {!isEdit && pendingAttachmentFiles.length > 0 ? (
              <p className="mb-2 text-xs text-zinc-500">
                {pendingAttachmentFiles.length} file(s) selected. They will upload after create.
              </p>
            ) : null}

            {attachmentUrls.length === 0 && pendingAttachmentFiles.length === 0 ? (
              <p className="text-xs text-zinc-500">No attachments yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {attachmentUrls.map((url, idx) => (
                  <a
                    key={`${url}-${idx}`}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    title={fileNameFromUrl(url)}
                    className="rounded-md border border-zinc-200 p-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/40"
                  >
                    {isImageAttachment(url) ? (
                      <img
                        src={url}
                        alt={`Attachment ${idx + 1}`}
                        className="h-28 w-full rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-28 flex-col items-center justify-center rounded bg-zinc-100 px-2 text-center dark:bg-zinc-800">
                        <span className="text-xs text-zinc-500">{fileExtensionFromName(url)}</span>
                        <span className="mt-1 line-clamp-2 text-xs font-medium">
                          {fileNameFromUrl(url)}
                        </span>
                      </div>
                    )}
                  </a>
                ))}
                {!isEdit
                  ? pendingAttachmentFiles.map((f, idx) => (
                      <div
                        key={`${f.name}-${idx}`}
                        title={f.name}
                        className="rounded-md border border-dashed border-zinc-300 p-2 dark:border-zinc-600"
                      >
                        <div className="flex h-28 flex-col items-center justify-center rounded bg-zinc-100 px-2 text-center dark:bg-zinc-800">
                          <span className="text-xs text-zinc-500">{fileExtensionFromName(f.name)}</span>
                          <span className="mt-1 line-clamp-2 text-xs font-medium">{f.name}</span>
                        </div>
                      </div>
                    ))
                  : null}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm">Country</label>
            <SearchableDropdown value={countryId} onChange={setCountryId} options={countryOptions} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Province</label>
            <SearchableDropdown value={provinceId} onChange={setProvinceId} options={provinceOptions} disabled={!countryId} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Regency</label>
            <SearchableDropdown value={regencyId} onChange={setRegencyId} options={regencyOptions} disabled={!provinceId} />
          </div>
          <div>
            <label className="mb-1 block text-sm">District</label>
            <SearchableDropdown value={districtId} onChange={setDistrictId} options={districtOptions} disabled={!regencyId} />
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          {details.map((d, idx) => (
            <div key={idx} className="grid gap-2 rounded border border-zinc-200 p-3 sm:grid-cols-3">
              <input placeholder="Description" value={d.description} onChange={(e) => updateDetail(idx, { description: e.target.value })} className={inputClass} />
              <input type="number" min={0} placeholder="Qty" value={d.quantity} onChange={(e) => updateDetail(idx, { quantity: e.target.value })} className={inputClass} />
              <input type="number" min={0} placeholder="Price" value={d.price} onChange={(e) => updateDetail(idx, { price: e.target.value })} className={inputClass} />
            </div>
          ))}
          <div className="flex flex-wrap items-end gap-3 rounded-md border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
            <div className="min-w-[8rem]">
              <label className="mb-1 block text-sm">Tax rate (%)</label>
              <input
                type="number"
                min={0}
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value || 0))}
                className={inputClass}
              />
            </div>
            <div className="ml-auto space-y-0.5 text-right text-sm text-zinc-700 dark:text-zinc-200">
              <p>Subtotal: {detailTotal.toLocaleString()}</p>
              <p>Tax: {taxAmount.toLocaleString()}</p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Grand total: {grandTotal.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setDetails((prev) => [...prev, { description: "", quantity: 1, price: 0 }])}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            >
              Add detail row
            </button>
          </div>

        </div>
      ) : null}

      <div className="flex flex-wrap justify-between gap-2 pt-1">
        <button type="button" disabled={!canPrev || submitting} onClick={() => setStep((s) => s - 1)} className="rounded-md border border-zinc-300 px-4 py-2 text-sm">
          Previous
        </button>
        <div className="flex gap-2">
          <button type="button" disabled={submitting} onClick={onCancel} className="rounded-md border border-zinc-300 px-4 py-2 text-sm">
            Cancel
          </button>
          {canNext ? (
            <button type="button" disabled={submitting} onClick={() => setStep((s) => s + 1)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">
              Next
            </button>
          ) : (
            <button type="button" disabled={submitting} onClick={submit} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">
              {submitting ? "Saving..." : isEdit ? "Save opportunity" : "Create opportunity"}
            </button>
          )}
        </div>
      </div>

      <Modal open={createLobOpen} onClose={() => setCreateLobOpen(false)} closeOnOverlayClick={false} title="Add line of business">
        <LineOfBusinessForm
          onSuccess={async () => {
            await loadQualificationOptions();
            setCreateLobOpen(false);
          }}
          onCancel={() => setCreateLobOpen(false)}
        />
      </Modal>
      <Modal open={createSegmentOpen} onClose={() => setCreateSegmentOpen(false)} closeOnOverlayClick={false} title="Add market segment">
        <MarketSegmentForm
          onSuccess={async () => {
            await loadQualificationOptions();
            setCreateSegmentOpen(false);
          }}
          onCancel={() => setCreateSegmentOpen(false)}
        />
      </Modal>
      <Modal open={createStatusOpen} onClose={() => setCreateStatusOpen(false)} closeOnOverlayClick={false} title="Add lead qualification status">
        <StatusForm
          defaultCategory="opportunity"
          onSuccess={async () => {
            await loadQualificationOptions();
            setCreateStatusOpen(false);
          }}
          onCancel={() => setCreateStatusOpen(false)}
        />
      </Modal>
    </div>
  );
}

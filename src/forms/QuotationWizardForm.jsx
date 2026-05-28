import { useEffect, useMemo, useState } from "react";
import { SearchableDropdown } from "../components/SearchableDropdown.jsx";
import { apiGet, apiPatch, apiPost, paths } from "../lib/api.js";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

const readOnlyClass =
  "w-full rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

function firstConstraintMessage(err) {
  const errors = err?.data?.errors;
  if (!Array.isArray(errors) || errors.length === 0) return "";
  for (const item of errors) {
    const constraints = item?.constraints;
    if (constraints && typeof constraints === "object") {
      const first = Object.values(constraints)[0];
      if (typeof first === "string" && first.trim()) return `${item.property}: ${first}`;
    }
  }
  return "";
}

function splitDetailsText(raw) {
  return String(raw ?? "")
    .split(/\r?\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);
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

function dateInputFromIso(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

function optionalId(value, isEdit) {
  const trimmed = String(value ?? "").trim();
  if (trimmed) return trimmed;
  return isEdit ? null : undefined;
}

export function QuotationWizardForm({ initial, onSuccess, onCancel }) {
  const isEdit = Boolean(initial?.id);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [lineOfBusinessOptions, setLineOfBusinessOptions] = useState([]);
  const [marketSegmentOptions, setMarketSegmentOptions] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);
  const [approverOptions, setApproverOptions] = useState([]);
  const [suffixOptions, setSuffixOptions] = useState([]);
  const [termsOfPaymentOptions, setTermsOfPaymentOptions] = useState([]);
  const [termsOfDeliveryOptions, setTermsOfDeliveryOptions] = useState([]);
  const [termsOfWarrantyOptions, setTermsOfWarrantyOptions] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [regencyOptions, setRegencyOptions] = useState([]);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [provinceRows, setProvinceRows] = useState([]);

  const [currency, setCurrency] = useState(initial?.currency ?? "IDR");
  const [lineOfBusinessId, setLineOfBusinessId] = useState(initial?.lineOfBusinessId ?? "");
  const [marketSegmentId, setMarketSegmentId] = useState(initial?.marketSegmentId ?? "");
  const [approverId, setApproverId] = useState(initial?.approverId ?? "");
  const [customerId, setCustomerId] = useState(initial?.customer?.customerId ?? "");
  const [endUserId, setEndUserId] = useState(initial?.endUser?.endUserId ?? "");
  const [contactName, setContactName] = useState(initial?.contact?.contactName ?? "");
  const [contactSuffix, setContactSuffix] = useState(initial?.contact?.contactSuffix ?? "");
  const [contactDetailsText, setContactDetailsText] = useState(
    Array.isArray(initial?.contact?.contactDetails)
      ? initial.contact.contactDetails.join("\n")
      : "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [termsAndConditions, setTermsAndConditions] = useState(initial?.termsAndConditions ?? "");
  const [termsOfPaymentSelected, setTermsOfPaymentSelected] = useState(
    Array.isArray(initial?.quotationInformationSelected?.termsOfPaymentSelected)
      ? initial.quotationInformationSelected.termsOfPaymentSelected.map((x) => String(x ?? ""))
      : [],
  );
  const [termsOfDeliverySelected, setTermsOfDeliverySelected] = useState(
    Array.isArray(initial?.quotationInformationSelected?.termsOfDeliverySelected)
      ? initial.quotationInformationSelected.termsOfDeliverySelected.map((x) => String(x ?? ""))
      : [],
  );
  const [termsOfWarrantySelected, setTermsOfWarrantySelected] = useState(
    Array.isArray(initial?.quotationInformationSelected?.termsOfWarrantySelected)
      ? initial.quotationInformationSelected.termsOfWarrantySelected.map((x) => String(x ?? ""))
      : [],
  );
  const [discountTotal, setDiscountTotal] = useState(initial?.discountTotal ?? 0);
  const [taxRate, setTaxRate] = useState(initial?.taxRate ?? 0);
  const [propability, setPropability] = useState(initial?.propability ?? 0);
  const [estimateCloseMonth, setEstimateCloseMonth] = useState(
    monthValueFromDate(initial?.estimateCloseDate),
  );
  const [actualCloseMonth, setActualCloseMonth] = useState(
    monthValueFromDate(initial?.actualCloseDate),
  );
  const [validUntil, setValidUntil] = useState(dateInputFromIso(initial?.validUntil));
  const [countryId, setCountryId] = useState("");
  const [provinceId, setProvinceId] = useState(initial?.location?.provinceId ?? "");
  const [regencyId, setRegencyId] = useState(initial?.location?.regencyId ?? "");
  const [districtId, setDistrictId] = useState(initial?.location?.districtId ?? "");
  const [details, setDetails] = useState(
    Array.isArray(initial?.details) && initial.details.length > 0
      ? initial.details.map((d, i) => ({
          sortOrder: Number(d.sortOrder ?? i),
          description: d.description ?? "",
          quantity: Number(d.quantity ?? 0),
          unit: d.unit ?? "",
          sku: d.sku ?? "",
          price: Number(d.price ?? 0),
          discount: Number(d.discount ?? 0),
          taxRate: Number(d.taxRate ?? 0),
          lineNotes: d.lineNotes ?? "",
        }))
      : [
          {
            sortOrder: 0,
            description: "",
            quantity: 1,
            unit: "",
            sku: "",
            price: 0,
            discount: 0,
            taxRate: 0,
            lineNotes: "",
          },
        ],
  );

  useEffect(() => {
    setCurrency(initial?.currency ?? "IDR");
    setLineOfBusinessId(idOrEmpty(initial?.lineOfBusinessId));
    setMarketSegmentId(idOrEmpty(initial?.marketSegmentId));
    setApproverId(idOrEmpty(initial?.approverId));
    setCustomerId(idOrEmpty(initial?.customer?.customerId));
    setEndUserId(idOrEmpty(initial?.endUser?.endUserId));
    setContactName(String(initial?.contact?.contactName ?? ""));
    setContactSuffix(String(initial?.contact?.contactSuffix ?? ""));
    setContactDetailsText(
      Array.isArray(initial?.contact?.contactDetails)
        ? initial.contact.contactDetails.join("\n")
        : "",
    );
    setNotes(String(initial?.notes ?? ""));
    setTermsAndConditions(String(initial?.termsAndConditions ?? ""));
    setTermsOfPaymentSelected(
      Array.isArray(initial?.quotationInformationSelected?.termsOfPaymentSelected)
        ? initial.quotationInformationSelected.termsOfPaymentSelected.map((x) => String(x ?? ""))
        : [],
    );
    setTermsOfDeliverySelected(
      Array.isArray(initial?.quotationInformationSelected?.termsOfDeliverySelected)
        ? initial.quotationInformationSelected.termsOfDeliverySelected.map((x) => String(x ?? ""))
        : [],
    );
    setTermsOfWarrantySelected(
      Array.isArray(initial?.quotationInformationSelected?.termsOfWarrantySelected)
        ? initial.quotationInformationSelected.termsOfWarrantySelected.map((x) => String(x ?? ""))
        : [],
    );
    setDiscountTotal(Number(initial?.discountTotal ?? 0));
    setTaxRate(Number(initial?.taxRate ?? 0));
    setPropability(Number(initial?.propability ?? 0));
    setEstimateCloseMonth(monthValueFromDate(initial?.estimateCloseDate));
    setActualCloseMonth(monthValueFromDate(initial?.actualCloseDate));
    setValidUntil(dateInputFromIso(initial?.validUntil));
    setProvinceId(idOrEmpty(initial?.location?.provinceId));
    setRegencyId(idOrEmpty(initial?.location?.regencyId));
    setDistrictId(idOrEmpty(initial?.location?.districtId));
    setDetails(
      Array.isArray(initial?.details) && initial.details.length > 0
        ? initial.details.map((d, i) => ({
            sortOrder: Number(d.sortOrder ?? i),
            description: d.description ?? "",
            quantity: Number(d.quantity ?? 0),
            unit: d.unit ?? "",
            sku: d.sku ?? "",
            price: Number(d.price ?? 0),
            discount: Number(d.discount ?? 0),
            taxRate: Number(d.taxRate ?? 0),
            lineNotes: d.lineNotes ?? "",
          }))
        : [
            {
              sortOrder: 0,
              description: "",
              quantity: 1,
              unit: "",
              sku: "",
              price: 0,
              discount: 0,
              taxRate: 0,
              lineNotes: "",
            },
          ],
    );
    setFormErr("");
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [lobRes, segRes, apprRes, orgRes, locRes] = await Promise.all([
          apiGet(paths.opportunityLineOfBusiness),
          apiGet(paths.opportunityMarketSegment),
          apiGet(paths.quotationApprovers),
          apiGet(paths.opportunityExternalOrg),
          apiGet(`${paths.location}/choices`),
        ]);
        if (cancelled) return;
        setLineOfBusinessOptions(
          (lobRes?.data?.items ?? []).map((x) => ({ value: x.id, label: x.name })),
        );
        setMarketSegmentOptions(
          (segRes?.data?.items ?? []).map((x) => ({ value: x.id, label: x.name })),
        );
        setApproverOptions(
          (apprRes?.data?.items ?? []).map((x) => ({ value: x.id, label: x.email })),
        );
        setOrgOptions((orgRes?.data?.items ?? []).map((x) => ({ value: x.id, label: x.name })));
        // Optional: suffix + term options from app info (do not fail the whole form)
        try {
          const appInfoRes = await apiGet(paths.appInfo);
          if (cancelled) return;
          setSuffixOptions(
            (appInfoRes?.data?.personSuffix ?? [])
              .map((s) => String(s ?? "").trim())
              .filter(Boolean)
              .map((s) => ({ value: s, label: s })),
          );
          const qi = appInfoRes?.data?.quotationInformation ?? {};
          const normalizeOpt = (arr) =>
            (Array.isArray(arr) ? arr : [])
              .map((x) => String(x ?? "").trim())
              .filter(Boolean);
          setTermsOfPaymentOptions(normalizeOpt(qi.termsOfPayment));
          setTermsOfDeliveryOptions(normalizeOpt(qi.termsOfDelivery));
          setTermsOfWarrantyOptions(normalizeOpt(qi.termsOfWarranty));
        } catch {
          if (!cancelled) {
            setSuffixOptions([]);
            setTermsOfPaymentOptions([]);
            setTermsOfDeliveryOptions([]);
            setTermsOfWarrantyOptions([]);
          }
        }
        const countries = locRes?.data?.countries ?? [];
        const provinces = locRes?.data?.provinces ?? [];
        setCountryOptions(countries.map((x) => ({ value: x.id, label: x.name })));
        setProvinceRows(provinces);
        setProvinceOptions(provinces.map((x) => ({ value: x.id, label: x.name })));
      } catch {
        if (!cancelled) {
          setLineOfBusinessOptions([]);
          setMarketSegmentOptions([]);
          setApproverOptions([]);
          setOrgOptions([]);
          setSuffixOptions([]);
          setTermsOfPaymentOptions([]);
          setTermsOfDeliveryOptions([]);
          setTermsOfWarrantyOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleInList(value, setList) {
    setList((prev) => {
      const v = String(value ?? "").trim();
      if (!v) return prev;
      return prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v];
    });
  }

  function TermsPicker({ title, options, selected, setSelected }) {
    const rows = Array.isArray(options) ? options : [];
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </p>
          <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
            Selected: {Array.isArray(selected) ? selected.length : 0}
          </span>
        </div>
        {rows.length === 0 ? (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            No options configured in Admin App Settings.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {rows.map((opt) => (
              <label
                key={opt}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              >
                <input
                  type="checkbox"
                  className="mt-1 rounded border-zinc-400"
                  checked={selected.includes(opt)}
                  onChange={() => toggleInList(opt, setSelected)}
                />
                <span className="text-zinc-800 dark:text-zinc-200">{opt}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  useEffect(() => {
    let cancelled = false;
    if (!countryId) return () => { cancelled = true; };
    (async () => {
      try {
        const qs = new URLSearchParams({ countryId });
        const res = await apiGet(`${paths.location}/choices?${qs.toString()}`);
        if (!cancelled) {
          const provinces = res?.data?.provinces ?? [];
          setProvinceRows(provinces);
          setProvinceOptions(provinces.map((x) => ({ value: x.id, label: x.name })));
        }
      } catch {
        if (!cancelled) setProvinceOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [countryId]);

  useEffect(() => {
    if (!provinceId || provinceRows.length === 0) return;
    const selected = provinceRows.find((x) => String(x.id) === String(provinceId));
    const inferred = selected?.parentId ? String(selected.parentId) : "";
    if (inferred && inferred !== countryId) setCountryId(inferred);
  }, [provinceId, provinceRows, countryId]);

  useEffect(() => {
    let cancelled = false;
    if (!provinceId) {
      setRegencyOptions([]);
      setDistrictOptions([]);
      return () => { cancelled = true; };
    }
    (async () => {
      try {
        const qs = new URLSearchParams({ provinceId });
        const res = await apiGet(`${paths.location}/choices?${qs.toString()}`);
        if (!cancelled) {
          setRegencyOptions((res?.data?.regencies ?? []).map((x) => ({ value: x.id, label: x.name })));
          setDistrictOptions([]);
        }
      } catch {
        if (!cancelled) setRegencyOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provinceId]);

  useEffect(() => {
    let cancelled = false;
    if (!regencyId) {
      setDistrictOptions([]);
      return () => { cancelled = true; };
    }
    (async () => {
      try {
        const qs = new URLSearchParams({ regencyId });
        const res = await apiGet(`${paths.location}/choices?${qs.toString()}`);
        if (!cancelled) {
          setDistrictOptions((res?.data?.districts ?? []).map((x) => ({ value: x.id, label: x.name })));
        }
      } catch {
        if (!cancelled) setDistrictOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [regencyId]);

  const status = String(initial?.quotationStatus ?? "draft");
  const editable = !isEdit || status === "draft" || status === "rejected";
  const summary = useMemo(() => {
    const raw = details.reduce(
      (sum, d) => sum + Number(d.quantity ?? 0) * Number(d.price ?? 0) - Number(d.discount ?? 0),
      0,
    );
    const subTotal = Math.max(0, raw - Number(discountTotal ?? 0));
    const taxAmount = Math.max(0, (subTotal * Number(taxRate ?? 0)) / 100);
    return { subTotal, taxAmount, grandTotal: subTotal + taxAmount };
  }, [details, discountTotal, taxRate]);

  function updateDetail(idx, patch) {
    setDetails((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function addDetail() {
    setDetails((prev) => [
      ...prev,
      {
        sortOrder: prev.length,
        description: "",
        quantity: 1,
        unit: "",
        sku: "",
        price: 0,
        discount: 0,
        taxRate: 0,
        lineNotes: "",
      },
    ]);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!editable) return;
    if (!lineOfBusinessId || !marketSegmentId) {
      setFormErr("Line of business and market segment are required.");
      return;
    }
    setSubmitting(true);
    setFormErr("");
    try {
      const payload = {
        currency,
        lineOfBusinessId,
        marketSegmentId,
        approverId: approverId || (isEdit ? null : undefined),
        customerId: optionalId(customerId, isEdit),
        endUserId: optionalId(endUserId, isEdit),
        contactName: contactName.trim(),
        contactSuffix: contactSuffix.trim(),
        contactDetails: splitDetailsText(contactDetailsText),
        notes: notes.trim(),
        termsAndConditions: termsAndConditions.trim(),
        termsOfPaymentSelected,
        termsOfDeliverySelected,
        termsOfWarrantySelected,
        discountTotal: Number(discountTotal ?? 0),
        taxRate: Number(taxRate ?? 0),
        propability: Number(propability ?? 0),
        estimateCloseDate: estimateCloseMonth || (isEdit ? null : undefined),
        actualCloseDate: actualCloseMonth || (isEdit ? null : undefined),
        validUntil: validUntil ? new Date(validUntil).toISOString() : isEdit ? null : undefined,
        provinceId: optionalId(provinceId, isEdit),
        regencyId: optionalId(regencyId, isEdit),
        districtId: optionalId(districtId, isEdit),
        details: details
          .map((d, i) => ({ ...d, sortOrder: i }))
          .filter((d) => String(d.description ?? "").trim().length > 0),
      };
      if (isEdit) {
        await apiPatch(`${paths.quotation}/${encodeURIComponent(initial.id)}`, payload);
      } else {
        await apiPost(paths.quotation, {
          ...payload,
          opportunityId: initial?.opportunityId,
        });
      }
      await onSuccess?.();
    } catch (err) {
      setFormErr(firstConstraintMessage(err) || err?.message || "Could not save quotation");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-h-[80vh] space-y-4 overflow-y-auto pr-1">
      {formErr ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formErr}
        </p>
      ) : null}
      {!editable ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This quotation is not editable in status: {status}. Create a revision to modify it.
        </p>
      ) : null}

      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Document</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-zinc-500">Quotation number</p>
          {isEdit ? (
            <input className={readOnlyClass} value={initial?.quotationNo ?? ""} readOnly disabled />
          ) : (
            <p className="text-xs text-zinc-500">Auto-generated on create</p>
          )}
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Revision</p>
          <input
            className={readOnlyClass}
            value={isEdit ? String(initial?.revisionNo ?? 0) : "0"}
            readOnly
            disabled
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Currency</p>
          <input
            className={inputClass}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={!editable}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Valid until</p>
          <input
            type="date"
            className={inputClass}
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            disabled={!editable}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Approver (approve + reject access)</p>
          <SearchableDropdown
            value={approverId}
            onChange={setApproverId}
            options={[{ value: "", label: "No approver (stay draft)" }, ...approverOptions]}
            placeholder="Select..."
            searchPlaceholder="Search approver..."
            disabled={!editable}
          />
        </div>
      </div>

      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Commercial</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-zinc-500">Line of business</p>
          <SearchableDropdown
            value={lineOfBusinessId}
            onChange={setLineOfBusinessId}
            options={lineOfBusinessOptions}
            disabled={!editable}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Market segment</p>
          <SearchableDropdown
            value={marketSegmentId}
            onChange={setMarketSegmentId}
            options={marketSegmentOptions}
            disabled={!editable}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Discount total</p>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={discountTotal}
            onChange={(e) => setDiscountTotal(Number(e.target.value || 0))}
            disabled={!editable}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Tax rate (%)</p>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value || 0))}
            disabled={!editable}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Probability (%)</p>
          <input
            className={inputClass}
            type="number"
            min={0}
            max={100}
            value={propability}
            onChange={(e) => setPropability(Number(e.target.value || 0))}
            disabled={!editable}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Est. close month</p>
          <input
            type="month"
            className={inputClass}
            value={estimateCloseMonth}
            onChange={(e) => setEstimateCloseMonth(e.target.value)}
            disabled={!editable}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Actual close month</p>
          <input
            type="month"
            className={inputClass}
            value={actualCloseMonth}
            onChange={(e) => setActualCloseMonth(e.target.value)}
            disabled={!editable}
          />
        </div>
      </div>

      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Customer & contact
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-zinc-500">Customer org</p>
          <SearchableDropdown
            value={customerId}
            onChange={setCustomerId}
            options={orgOptions}
            disabled={!editable}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">End user org</p>
          <SearchableDropdown
            value={endUserId}
            onChange={setEndUserId}
            options={orgOptions}
            disabled={!editable}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Contact name</p>
          <input
            className={inputClass}
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            disabled={!editable}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Suffix</p>
          <SearchableDropdown
            value={contactSuffix}
            onChange={setContactSuffix}
            options={suffixOptions}
            disabled={!editable}
            placeholder="Select suffix"
          />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-zinc-500">Contact details (comma or newline)</p>
          <textarea
            className={`${inputClass} min-h-[72px]`}
            value={contactDetailsText}
            onChange={(e) => setContactDetailsText(e.target.value)}
            disabled={!editable}
          />
        </div>
      </div>

      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Selected terms
      </p>
      <div className="space-y-3">
        <TermsPicker
          title="Terms of payment"
          options={termsOfPaymentOptions}
          selected={termsOfPaymentSelected}
          setSelected={setTermsOfPaymentSelected}
        />
        <TermsPicker
          title="Terms of delivery"
          options={termsOfDeliveryOptions}
          selected={termsOfDeliverySelected}
          setSelected={setTermsOfDeliverySelected}
        />
        <TermsPicker
          title="Warranty"
          options={termsOfWarrantyOptions}
          selected={termsOfWarrantySelected}
          setSelected={setTermsOfWarrantySelected}
        />
      </div>

      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Location</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-zinc-500">Country</p>
          <SearchableDropdown
            value={countryId}
            onChange={setCountryId}
            options={countryOptions}
            disabled={!editable}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Province</p>
          <SearchableDropdown
            value={provinceId}
            onChange={setProvinceId}
            options={provinceOptions}
            disabled={!editable}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Regency</p>
          <SearchableDropdown
            value={regencyId}
            onChange={setRegencyId}
            options={regencyOptions}
            disabled={!editable || !provinceId}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">District</p>
          <SearchableDropdown
            value={districtId}
            onChange={setDistrictId}
            options={districtOptions}
            disabled={!editable || !regencyId}
          />
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs text-zinc-500">Notes</p>
        <textarea
          className={`${inputClass} min-h-[72px]`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={!editable}
        />
      </div>
      <div>
        <p className="mb-1 text-xs text-zinc-500">Terms & conditions</p>
        <textarea
          className={`${inputClass} min-h-[72px]`}
          value={termsAndConditions}
          onChange={(e) => setTermsAndConditions(e.target.value)}
          disabled={!editable}
        />
      </div>

      <div className="rounded border border-zinc-200 p-3 dark:border-zinc-700">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Detail items</p>
          {editable ? (
            <button
              type="button"
              onClick={addDetail}
              className="rounded border border-zinc-300 px-2 py-1 text-xs"
            >
              + Add
            </button>
          ) : null}
        </div>
        <div className="space-y-2">
          {details.map((d, idx) => (
            <div key={idx} className="grid gap-2 md:grid-cols-6">
              <input
                className={inputClass}
                value={d.description}
                onChange={(e) => updateDetail(idx, { description: e.target.value })}
                placeholder="Description"
                disabled={!editable}
              />
              <input
                className={inputClass}
                type="number"
                min={0}
                value={d.quantity}
                onChange={(e) => updateDetail(idx, { quantity: Number(e.target.value || 0) })}
                placeholder="Qty"
                disabled={!editable}
              />
              <input
                className={inputClass}
                type="number"
                min={0}
                value={d.price}
                onChange={(e) => updateDetail(idx, { price: Number(e.target.value || 0) })}
                placeholder="Price"
                disabled={!editable}
              />
              <input
                className={inputClass}
                type="number"
                min={0}
                value={d.discount}
                onChange={(e) => updateDetail(idx, { discount: Number(e.target.value || 0) })}
                placeholder="Discount"
                disabled={!editable}
              />
              <input
                className={inputClass}
                value={d.unit}
                onChange={(e) => updateDetail(idx, { unit: e.target.value })}
                placeholder="Unit"
                disabled={!editable}
              />
              <input
                className={inputClass}
                value={d.sku}
                onChange={(e) => updateDetail(idx, { sku: e.target.value })}
                placeholder="SKU"
                disabled={!editable}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/40">
        Subtotal: {summary.subTotal.toLocaleString()} | Tax: {summary.taxAmount.toLocaleString()}{" "}
        | Grand total: {summary.grandTotal.toLocaleString()}
      </div>

      <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
        <button type="button" onClick={onCancel} className="rounded border border-zinc-300 px-3 py-2 text-sm">
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !editable}
          className="rounded bg-primary px-3 py-2 text-sm text-white disabled:opacity-60"
        >
          {submitting ? "Saving..." : isEdit ? "Save changes" : "Create quotation"}
        </button>
      </div>
    </form>
  );
}

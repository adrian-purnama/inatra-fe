import { useEffect, useMemo, useState } from "react";
import {
  apiGet,
  apiPatch,
  apiPostFormData,
  paths,
} from "../lib/api.js";
import { publicAssetUrlForDisplay } from "../lib/publicAssetDisplayUrl.js";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

function normalizeList(list) {
  return (Array.isArray(list) ? list : [])
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
}

function Section({ title, description, children }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ListEditor({
  label,
  helper,
  value,
  onChange,
  addLabel = "Add row",
  inputClassName,
}) {
  const rows = Array.isArray(value) && value.length > 0 ? value : [""];
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {label}
        </p>
        {helper ? (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {helper}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              value={row}
              onChange={(e) => {
                const next = rows.slice();
                next[idx] = e.target.value;
                onChange(next);
              }}
              className={inputClassName}
            />
            <button
              type="button"
              onClick={() => {
                const next = rows.filter((_, i) => i !== idx);
                onChange(next.length > 0 ? next : [""]);
              }}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div>
        <button
          type="button"
          onClick={() => onChange([...rows, ""])}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {() => void | Promise<void>} props.onSaved — e.g. refresh public branding in AppContext
 */
export function AdminAppSettingsForm({ onSaved }) {
  const [appName, setAppName] = useState("");
  const [appLogo, setAppLogo] = useState("");
  /** @type {File | null} */
  const [logoFile, setLogoFile] = useState(null);
  const [openRegister, setOpenRegister] = useState(true);
  const [openLogin, setOpenLogin] = useState(true);
  const [companyInformation, setCompanyInformation] = useState({
    companyName: "",
    companyAddress: "",
    companyPhone: "",
    companyEmail: "",
    companyWebsite: "",
  });
  const [quotationInformation, setQuotationInformation] = useState({
    termsOfPayment: [""],
    termsOfDelivery: [""],
    termsOfWarranty: [""],
  });
  const [personSuffix, setPersonSuffix] = useState([""]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [formErrDetails, setFormErrDetails] = useState([]);

  const logoBlobPreview = useMemo(() => {
    if (logoFile == null) return null;
    return URL.createObjectURL(logoFile);
  }, [logoFile]);

  useEffect(() => {
    return () => {
      if (logoBlobPreview) URL.revokeObjectURL(logoBlobPreview);
    };
  }, [logoBlobPreview]);

  const logoPreviewSrc = useMemo(() => {
    if (logoBlobPreview) return logoBlobPreview;
    const u = appLogo.trim();
    return u ? publicAssetUrlForDisplay(u) : null;
  }, [logoBlobPreview, appLogo]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setFormErr("");
      setFormErrDetails([]);
      try {
        const res = await apiGet(paths.adminApp);
        const d = res?.data;
        if (!cancelled && d) {
          setAppName(String(d.appName ?? ""));
          setAppLogo(String(d.appLogo ?? ""));
          setOpenRegister(Boolean(d.openRegister));
          setOpenLogin(Boolean(d.openLogin));
          setCompanyInformation({
            companyName: String(d.companyInformation?.companyName ?? ""),
            companyAddress: String(d.companyInformation?.companyAddress ?? ""),
            companyPhone: String(d.companyInformation?.companyPhone ?? ""),
            companyEmail: String(d.companyInformation?.companyEmail ?? ""),
            companyWebsite: String(d.companyInformation?.companyWebsite ?? ""),
          });
          setQuotationInformation({
            termsOfPayment:
              Array.isArray(d.quotationInformation?.termsOfPayment) &&
              d.quotationInformation.termsOfPayment.length > 0
                ? d.quotationInformation.termsOfPayment.map((x) => String(x ?? ""))
                : [""],
            termsOfDelivery:
              Array.isArray(d.quotationInformation?.termsOfDelivery) &&
              d.quotationInformation.termsOfDelivery.length > 0
                ? d.quotationInformation.termsOfDelivery.map((x) => String(x ?? ""))
                : [""],
            termsOfWarranty:
              Array.isArray(d.quotationInformation?.termsOfWarranty) &&
              d.quotationInformation.termsOfWarranty.length > 0
                ? d.quotationInformation.termsOfWarranty.map((x) => String(x ?? ""))
                : [""],
          });
          setPersonSuffix(
            Array.isArray(d.personSuffix) && d.personSuffix.length > 0
              ? d.personSuffix.map((x) => String(x ?? ""))
              : [""],
          );
        }
      } catch (e) {
        if (!cancelled) {
          setFormErr(e?.message ?? "Failed to load app settings");
          setFormErrDetails(
            Array.isArray(e?.data?.errors) ? e.data.errors : [],
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setFormErr("");
    setFormErrDetails([]);
    setSubmitting(true);
    try {
      let nextLogo = appLogo.trim();
      if (logoFile != null) {
        const fd = new FormData();
        fd.append("file", logoFile);
        const uploadRes = await apiPostFormData(paths.adminAppLogo, fd);
        const uploaded = uploadRes?.data;
        if (uploaded?.appLogo) {
          nextLogo = String(uploaded.appLogo);
          setAppLogo(nextLogo);
        }
        setLogoFile(null);
      }
      await apiPatch(paths.adminApp, {
        appName: appName.trim(),
        appLogo: nextLogo,
        openRegister,
        openLogin,
        personSuffix: normalizeList(personSuffix),
        companyInformation: {
          companyName: String(companyInformation.companyName ?? "").trim(),
          companyAddress: String(companyInformation.companyAddress ?? "").trim(),
          companyPhone: String(companyInformation.companyPhone ?? "").trim(),
          companyEmail: String(companyInformation.companyEmail ?? "").trim(),
          companyWebsite: String(companyInformation.companyWebsite ?? "").trim(),
        },
        quotationInformation: {
          termsOfPayment: normalizeList(quotationInformation.termsOfPayment),
          termsOfDelivery: normalizeList(quotationInformation.termsOfDelivery),
          termsOfWarranty: normalizeList(quotationInformation.termsOfWarranty),
        },
      });
      await onSaved?.();
    } catch (err) {
      setFormErr(err?.message ?? "Could not save");
      setFormErrDetails(Array.isArray(err?.data?.errors) ? err.data.errors : []);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {formErr ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <p>{formErr}</p>
          {formErrDetails.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
              {formErrDetails.map((e, idx) => (
                <li key={idx}>
                  <span className="font-medium">{String(e?.property ?? "field")}</span>
                  {e?.constraints
                    ? `: ${Object.values(e.constraints).join(", ")}`
                    : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <Section title="Branding" description="Public name + logo used in the header.">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label
              htmlFor="admin-app-name"
              className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              App name
            </label>
            <input
              id="admin-app-name"
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              autoComplete="off"
              className={inputClass}
            />
          </div>

          <div>
            <p className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Logo
            </p>
            {logoPreviewSrc ? (
              <div className="mb-2">
                <img
                  src={logoPreviewSrc}
                  alt=""
                  className="h-16 w-auto max-w-full rounded-md border border-zinc-200 object-contain dark:border-zinc-600"
                />
              </div>
            ) : null}
            <input
              id="admin-app-logo-file"
              type="file"
              accept="image/*"
              className={`${inputClass} cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:file:bg-zinc-800`}
              onChange={(e) => {
                const f = e.target.files?.[0];
                setLogoFile(f ?? null);
              }}
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Upload stores the image on the server and sets a public URL for the header.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Access" description="Controls login/registration availability.">
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={openRegister}
              onChange={(e) => setOpenRegister(e.target.checked)}
              className="rounded border-zinc-400"
            />
            <span>Open registration</span>
          </label>

          <div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
              <input
                type="checkbox"
                checked={openLogin}
                onChange={(e) => setOpenLogin(e.target.checked)}
                className="rounded border-zinc-400"
              />
              <span>Open login</span>
            </label>
            {!openLogin ? (
              <div
                role="alert"
                className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
              >
                <p className="font-medium">You may lock yourself out</p>
                <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
                  With login closed, normal users (and you, if you are not a super-admin) cannot
                  sign in. If you lose access, set{" "}
                  <code className="rounded bg-amber-100/80 px-1 font-mono text-[0.8rem] dark:bg-amber-900/50">
                    openLogin
                  </code>{" "}
                  to{" "}
                  <code className="rounded bg-amber-100/80 px-1 font-mono text-[0.8rem] dark:bg-amber-900/50">
                    true
                  </code>{" "}
                  on the app document.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </Section>

      <Section title="Company information" description="Used for documents and quotations.">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Company name
            </label>
            <input
              type="text"
              value={companyInformation.companyName}
              onChange={(e) =>
                setCompanyInformation((p) => ({ ...p, companyName: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Company phone
            </label>
            <input
              type="text"
              value={companyInformation.companyPhone}
              onChange={(e) =>
                setCompanyInformation((p) => ({ ...p, companyPhone: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Company email
            </label>
            <input
              type="email"
              value={companyInformation.companyEmail}
              onChange={(e) =>
                setCompanyInformation((p) => ({ ...p, companyEmail: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Company website
            </label>
            <input
              type="text"
              value={companyInformation.companyWebsite}
              onChange={(e) =>
                setCompanyInformation((p) => ({ ...p, companyWebsite: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Company address
            </label>
            <textarea
              value={companyInformation.companyAddress}
              onChange={(e) =>
                setCompanyInformation((p) => ({ ...p, companyAddress: e.target.value }))
              }
              rows={3}
              className={inputClass}
            />
          </div>
        </div>
      </Section>

      <Section title="Quotation information" description="Shown as standard terms on quotation documents.">
        <div className="grid gap-6 md:grid-cols-3">
          <ListEditor
            label="Terms of payment"
            value={quotationInformation.termsOfPayment}
            onChange={(next) =>
              setQuotationInformation((p) => ({ ...p, termsOfPayment: next }))
            }
            addLabel="Add payment term"
            inputClassName={inputClass}
          />
          <ListEditor
            label="Terms of delivery"
            value={quotationInformation.termsOfDelivery}
            onChange={(next) =>
              setQuotationInformation((p) => ({ ...p, termsOfDelivery: next }))
            }
            addLabel="Add delivery term"
            inputClassName={inputClass}
          />
          <ListEditor
            label="Terms of warranty"
            value={quotationInformation.termsOfWarranty}
            onChange={(next) =>
              setQuotationInformation((p) => ({ ...p, termsOfWarranty: next }))
            }
            addLabel="Add warranty term"
            inputClassName={inputClass}
          />
        </div>
      </Section>

      <Section title="Person suffixes" description="Reusable suffix list for people names (e.g. Mr, Mrs, PT).">
        <ListEditor
          label="Suffix list"
          value={personSuffix}
          onChange={setPersonSuffix}
          addLabel="Add suffix"
          inputClassName={inputClass}
        />
      </Section>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

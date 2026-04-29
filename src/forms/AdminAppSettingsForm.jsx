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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");

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
      try {
        const res = await apiGet(paths.adminApp);
        const d = res?.data;
        if (!cancelled && d) {
          setAppName(String(d.appName ?? ""));
          setAppLogo(String(d.appLogo ?? ""));
          setOpenRegister(Boolean(d.openRegister));
          setOpenLogin(Boolean(d.openLogin));
        }
      } catch (e) {
        if (!cancelled) {
          setFormErr(e?.message ?? "Failed to load app settings");
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
      });
      await onSaved?.();
    } catch (err) {
      setFormErr(err?.message ?? "Could not save");
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
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {formErr}
        </p>
      ) : null}

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
          Upload stores the image on the server and sets a public URL for the
          header. Max 2&nbsp;MiB. Save also updates app name and login/register
          flags.
        </p>
      </div>

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
              With login closed, normal users (and you, if you are not a
              super-admin) cannot sign in through the app. If you lose access,
              connect to your MongoDB and set{" "}
              <code className="rounded bg-amber-100/80 px-1 font-mono text-[0.8rem] dark:bg-amber-900/50">
                openLogin
              </code>{" "}
              to{" "}
              <code className="rounded bg-amber-100/80 px-1 font-mono text-[0.8rem] dark:bg-amber-900/50">
                true
              </code>{" "}
              on the app document (e.g. in{" "}
              <code className="rounded bg-amber-100/80 px-1 font-mono text-[0.8rem] dark:bg-amber-900/50">
                mongosh
              </code>
              :{" "}
              <code className="mt-1 block whitespace-pre-wrap break-all rounded bg-amber-100/80 p-2 font-mono text-[0.75rem] dark:bg-amber-900/50">
                {`db.apps.updateOne({}, { $set: { openLogin: true } })`}
              </code>
              ).
            </p>
          </div>
        ) : null}
      </div>

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

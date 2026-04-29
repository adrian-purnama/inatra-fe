import { useState } from "react";
import { apiPost, paths } from "../lib/api.js";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

const modeBtn =
  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border";

/**
 * @param {object} props
 * @param {string} props.path
 * @param {string} props.method
 * @param {string} [props.suggestedName]
 * @param {() => Promise<void> | void} props.onSuccess
 * @param {() => void} props.onCancel
 */
export function AddRoutePermissionForm({
  path,
  method,
  suggestedName,
  onSuccess,
  onCancel,
}) {
  const [mode, setMode] = useState("auto");
  const [name, setName] = useState(suggestedName ?? "");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");

  async function createSpecialPermissionNow(nextMode) {
    setFormErr("");
    setSubmitting(true);
    try {
      await apiPost(paths.adminRbacPermissions, { path, method, mode: nextMode });
      await onSuccess();
    } catch (err) {
      setFormErr(err?.message ?? "Could not create permission");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setFormErr("");
    setSubmitting(true);
    try {
      const body = { path, method, mode };
      if (mode === "custom") {
        const n = name.trim();
        if (!n) {
          setFormErr("Permission name is required");
          setSubmitting(false);
          return;
        }
        body.name = n;
        body.description = description.trim();
      }
      await apiPost(paths.adminRbacPermissions, body);
      await onSuccess();
    } catch (err) {
      setFormErr(err?.message ?? "Could not create permission");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="rounded-lg bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        <span className="font-semibold text-zinc-500 dark:text-zinc-400">
          {method}
        </span>{" "}
        {path}
      </p>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Type
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "auto", label: "Auto", hint: "Name + description generated" },
            { id: "custom", label: "Custom", hint: "You choose name & description" },
            { id: "all_user", label: "All users", hint: "Any logged-in user" },
            { id: "all_guest", label: "All users & guests", hint: "Public route" },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={async () => {
                setMode(m.id);
                setFormErr("");
                if ((m.id === "all_user" || m.id === "all_guest") && !submitting) {
                  await createSpecialPermissionNow(m.id);
                }
              }}
              title={m.hint}
              className={`${modeBtn} ${
                mode === m.id
                  ? "border-primary bg-primary/10 text-primary dark:bg-primary/20"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "custom" ? (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Permission name
            </label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. admin_reports_export"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Description
            </label>
            <textarea
              className={`${inputClass} resize-y`}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this permission allows"
            />
          </div>
        </div>
      ) : null}

      {mode === "all_user" || mode === "all_guest" ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Selecting <strong>{mode === "all_guest" ? "All users & guests" : "All users"}</strong> creates the permission immediately.
        </p>
      ) : null}

      {mode === "auto" ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          A unique permission name and an auto description will be created for
          this route.
        </p>
      ) : null}

      {formErr ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {formErr}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Create permission"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onCancel}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

import { useState } from "react";
import { apiPatch, paths } from "../lib/api.js";
import { SearchableDropdown } from "../components/SearchableDropdown.jsx";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

/**
 * @param {object} props
 * @param {{ id: string; name: string; description?: string; source?: string; path: string; method: string }} props.permission
 * @param {() => Promise<void> | void} props.onSuccess
 * @param {() => void} props.onCancel
 */
export function EditPermissionForm({ permission, onSuccess, onCancel }) {
  const [name, setName] = useState(permission.name ?? "");
  const [description, setDescription] = useState(permission.description ?? "");
  const [source, setSource] = useState(permission.source ?? "custom");
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");
  const sourceOptions = [
    { value: "auto", label: "Auto" },
    { value: "custom", label: "Custom" },
    { value: "all_user", label: "All users" },
    { value: "all_guest", label: "All users & guests" },
  ];

  async function onSubmit(e) {
    e.preventDefault();
    setFormErr("");
    setSubmitting(true);
    try {
      await apiPatch(`${paths.adminRbacPermissions}/${permission.id}`, {
        name: name.trim(),
        description: description.trim(),
        source,
      });
      await onSuccess();
    } catch (err) {
      setFormErr(err?.message ?? "Could not update permission");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="rounded-lg bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        <span className="font-semibold text-zinc-500 dark:text-zinc-400">
          {permission.method}
        </span>{" "}
        {permission.path}
      </p>

      {formErr ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {formErr}
        </p>
      ) : null}

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Permission name
        </label>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
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
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Source
        </label>
        <SearchableDropdown
          options={sourceOptions}
          value={source}
          onChange={setSource}
          placeholder="Select source"
          searchPlaceholder="Search source..."
        />
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save permission"}
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

import { useState } from "react";
import { apiPatch, apiPost, paths } from "../lib/api.js";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

/**
 * @param {object} props
 * @param {{ id?: string; name?: string; description?: string; category?: string; color?: string; isActive?: boolean } | null} [props.initial]
 * @param {string} [props.defaultCategory]
 * @param {() => Promise<void> | void} props.onSuccess
 * @param {() => void} props.onCancel
 */
export function StatusForm({
  initial = null,
  defaultCategory = "opportunity",
  onSuccess,
  onCancel,
}) {
  const isEdit = Boolean(initial?.id);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? defaultCategory);
  const [color, setColor] = useState(initial?.color ?? "#6b7280");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setFormErr("");
    setSubmitting(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        color: color.trim(),
        isActive,
      };
      if (isEdit) {
        await apiPatch(`${paths.adminStatus}/${initial.id}`, body);
      } else {
        await apiPost(paths.adminStatus, body);
      }
      await onSuccess();
    } catch (err) {
      setFormErr(err?.message ?? "Could not save status");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {formErr ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {formErr}
        </p>
      ) : null}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="New"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Category
        </label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputClass}
          placeholder="opportunity"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Color (hex)
        </label>
        <input
          type="text"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className={inputClass}
          placeholder="#6b7280"
          pattern="^#([0-9a-fA-F]{6})$"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputClass} min-h-24`}
          placeholder="Optional description..."
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded border-zinc-400"
        />
        <span>Active</span>
      </label>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Saving..." : isEdit ? "Save status" : "Create status"}
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

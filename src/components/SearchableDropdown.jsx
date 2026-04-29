import { useEffect, useMemo, useRef, useState } from "react";

const triggerClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-left text-sm text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

const panelClass =
  "absolute z-[120] mt-1 w-full rounded-md border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900";

/**
 * Searchable dropdown that supports:
 * - static options + client-side search
 * - dynamic options + server-side search via `fetchOptions`
 *
 * @param {object} props
 * @param {Array<{ value: string; label: string }>} [props.options]
 * @param {(search: string) => Promise<Array<{ value: string; label: string }>>} [props.fetchOptions]
 * @param {string} props.value
 * @param {(nextValue: string) => void} props.onChange
 * @param {boolean} [props.multiple]
 * @param {string[]} [props.values]
 * @param {(nextValues: string[]) => void} [props.onValuesChange]
 * @param {string} [props.placeholder]
 * @param {string} [props.searchPlaceholder]
 * @param {string} [props.emptyMessage]
 * @param {boolean} [props.disabled]
 */
export function SearchableDropdown({
  options = [],
  fetchOptions,
  value,
  onChange,
  multiple = false,
  values = [],
  onValuesChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No options.",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [dynamicOptions, setDynamicOptions] = useState([]);
  const rootRef = useRef(null);

  useEffect(() => {
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!open || typeof fetchOptions !== "function") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchOptions(search);
        if (!cancelled) {
          setDynamicOptions(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setDynamicOptions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, search, fetchOptions]);

  const list = useMemo(() => {
    if (typeof fetchOptions === "function") {
      return dynamicOptions;
    }
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, dynamicOptions, search, fetchOptions]);

  const selected = useMemo(() => {
    const fromStatic = options.find((o) => o.value === value);
    if (fromStatic) return fromStatic;
    return dynamicOptions.find((o) => o.value === value) ?? null;
  }, [options, dynamicOptions, value]);

  const selectedMulti = useMemo(
    () => [...new Set((values ?? []).map(String))],
    [values],
  );
  const selectedMultiLabel = useMemo(() => {
    if (!multiple) return "";
    if (selectedMulti.length === 0) return placeholder;
    const labels = selectedMulti
      .map((id) => options.find((o) => o.value === id)?.label)
      .filter(Boolean);
    if (labels.length <= 2) return labels.join(", ");
    return `${selectedMulti.length} selected`;
  }, [multiple, selectedMulti, options, placeholder]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        className={`${triggerClass} ${disabled ? "opacity-60" : ""} flex items-center justify-between gap-2`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">
          {multiple ? selectedMultiLabel : (selected?.label ?? placeholder)}
        </span>
        <span
          className={`shrink-0 text-zinc-500 transition-transform dark:text-zinc-400 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          ▼
        </span>
      </button>
      {open ? (
        <div className={panelClass}>
          {multiple && selectedMulti.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1">
              {selectedMulti.map((id) => {
                const label =
                  options.find((o) => o.value === id)?.label ??
                  dynamicOptions.find((o) => o.value === id)?.label ??
                  id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onValuesChange?.(selectedMulti.filter((x) => x !== id))}
                    className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    title="Remove"
                  >
                    {label} ×
                  </button>
                );
              })}
            </div>
          ) : null}
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className={triggerClass}
          />
          <div className="mt-2 max-h-48 overflow-y-auto">
            {loading ? (
              <p className="px-2 py-1 text-sm text-zinc-500">Loading…</p>
            ) : list.length === 0 ? (
              <p className="px-2 py-1 text-sm text-zinc-500">{emptyMessage}</p>
            ) : (
              list.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (multiple) {
                      const has = selectedMulti.includes(opt.value);
                      const next = has
                        ? selectedMulti.filter((x) => x !== opt.value)
                        : [...selectedMulti, opt.value];
                      onValuesChange?.(next);
                    } else {
                      onChange(opt.value);
                      setOpen(false);
                      setSearch("");
                    }
                  }}
                  className={`block w-full rounded px-2 py-1 text-left text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                    multiple ? selectedMulti.includes(opt.value) : opt.value === value
                      ? "bg-primary/10 text-primary dark:bg-primary/20"
                      : "text-zinc-800 dark:text-zinc-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

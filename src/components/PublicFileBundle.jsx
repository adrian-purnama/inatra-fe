import { useEffect, useMemo, useState } from "react";
import { apiPost, paths } from "../lib/api.js";

function extFrom(item) {
  const ext = String(item?.extension ?? "").trim();
  if (ext) return ext.toUpperCase();
  const name = String(item?.filename ?? "");
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toUpperCase() : "FILE";
}

function isImage(item) {
  const ct = String(item?.contentType ?? "").toLowerCase();
  if (ct.startsWith("image/")) return true;
  const name = String(item?.filename ?? "");
  return /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(name);
}

function isPdf(item) {
  const ct = String(item?.contentType ?? "").toLowerCase();
  if (ct.includes("pdf")) return true;
  const name = String(item?.filename ?? "");
  return /\.pdf$/i.test(name);
}

function isVideo(item) {
  const ct = String(item?.contentType ?? "").toLowerCase();
  if (ct.startsWith("video/")) return true;
  const name = String(item?.filename ?? "");
  return /\.(mp4|webm|ogg|mov|m4v)$/i.test(name);
}

function isAudio(item) {
  const ct = String(item?.contentType ?? "").toLowerCase();
  if (ct.startsWith("audio/")) return true;
  const name = String(item?.filename ?? "");
  return /\.(mp3|wav|ogg|aac|m4a|flac)$/i.test(name);
}

function renderPreview(item, idx) {
  if (isImage(item)) {
    return (
      <img
        src={item.url}
        alt={item.filename || `File ${idx + 1}`}
        className="h-40 w-full rounded object-cover"
      />
    );
  }
  if (isPdf(item)) {
    return (
      <iframe
        title={item.filename || `PDF ${idx + 1}`}
        src={item.url}
        className="h-40 w-full rounded border border-zinc-200 dark:border-zinc-700"
      />
    );
  }
  if (isVideo(item)) {
    return (
      <video controls className="h-40 w-full rounded bg-black">
        <source src={item.url} type={item.contentType || undefined} />
      </video>
    );
  }
  if (isAudio(item)) {
    return (
      <div className="flex h-40 w-full items-center justify-center rounded bg-zinc-100 px-2 dark:bg-zinc-800">
        <audio controls className="w-full">
          <source src={item.url} type={item.contentType || undefined} />
        </audio>
      </div>
    );
  }
  return (
    <div className="flex h-40 w-full flex-col items-center justify-center rounded border border-zinc-200 bg-zinc-50 px-3 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
        Preview not available inline
      </span>
      <span className="mt-1 text-[11px] text-zinc-500">
        Use Preview or Download below
      </span>
      <span className="mt-2 rounded bg-zinc-200 px-2 py-0.5 text-[10px] text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
        {extFrom(item)}
      </span>
    </div>
  );
}

/**
 * Resolve one or many file ids to authorized temporary URLs and render a gallery.
 * @param {{ fileIds: string|string[], className?: string, emptyText?: string }} props
 */
export function PublicFileBundle({ fileIds, className = "", emptyText = "No files." }) {
  const ids = useMemo(() => {
    const list = Array.isArray(fileIds) ? fileIds : fileIds ? [fileIds] : [];
    return [...new Set(list.map((x) => String(x).trim()))].filter(Boolean);
  }, [fileIds]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");


  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (ids.length === 0) {
        if (!cancelled) {
          setItems([]);
          setErr("");
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      setErr("");
      try {
        const res = await apiPost(paths.publicFilesResolve, { fileIds: ids });
        if (!cancelled) {
          setItems(Array.isArray(res?.data?.items) ? res.data.items : []);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || "Could not load files");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  if (loading) {
    return <p className={`text-xs text-zinc-500 ${className}`}>Loading files...</p>;
  }
  if (err) {
    return <p className={`text-xs text-red-600 dark:text-red-300 ${className}`}>{err}</p>;
  }
  if (items.length === 0) {
    return <p className={`text-sm text-zinc-500 dark:text-zinc-400 ${className}`}>{emptyText}</p>;
  }

  return (
    <div className={`grid gap-2 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {items.map((item, idx) => (
        <div
          key={`${item.fileId}-${idx}`}
          className="rounded-md border border-zinc-200 p-2 dark:border-zinc-700"
          title={item.filename || item.fileId}
        >
          {renderPreview(item, idx)}
          <div className="mt-2">
            <p className="line-clamp-2 text-xs font-medium text-zinc-800 dark:text-zinc-100">
              {item.filename || item.fileId}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">{extFrom(item)}</p>
          </div>
          <div className="mt-2 flex gap-2">
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="rounded bg-zinc-100 px-2 py-1 text-xs hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              Preview
            </a>
            <a
              href={item.url}
              download={item.filename || `file-${item.fileId}`}
              className="rounded bg-primary px-2 py-1 text-xs text-white hover:opacity-90"
            >
              Download
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  apiGet,
  apiPatch,
  apiPost,
  apiPostFormData,
  paths,
} from "../lib/api.js";
import { publicAssetUrlForDisplay } from "../lib/publicAssetDisplayUrl.js";
import { SearchableDropdown } from "../components/SearchableDropdown.jsx";
import { Modal } from "../components/Modal.jsx";
import { useUser } from "../context/UserContext.jsx";
import {
  ESIGN_SIZE,
  coverBaseScale,
  eSignViewPx,
  exportESignPng,
  initialPan,
} from "./eSignCrop.js";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm transition-colors placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

const labelClass =
  "mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

const btnPrimaryClass =
  "inline-flex justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-2 active:bg-primary-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:ring-offset-zinc-950";

const btnSecondaryClass =
  "inline-flex justify-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800";

export function ProfileForm() {
  const {
    email,
    fullName: sessionFullName,
    suffix: sessionSuffix,
    eSignFileId: sessionESignFileId,
    applyMeUser,
  } = useUser();

  const [fullName, setFullName] = useState(sessionFullName || "");
  const [suffix, setSuffix] = useState(sessionSuffix || "");
  const [suffixOptions, setSuffixOptions] = useState([]);
  const [eSignFileId, setESignFileId] = useState(sessionESignFileId || null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const [cropImg, setCropImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const dragRef = useRef(null);
  const fileInputRef = useRef(null);
  const viewPx = eSignViewPx();

  useEffect(() => {
    setFullName(sessionFullName || "");
    setSuffix(sessionSuffix || "");
    setESignFileId(sessionESignFileId || null);
  }, [sessionFullName, sessionSuffix, sessionESignFileId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const appInfoRes = await apiGet(paths.appInfo);
        if (cancelled) return;
        const list = (appInfoRes?.data?.personSuffix ?? [])
          .map((s) => String(s ?? "").trim())
          .filter(Boolean)
          .map((s) => ({ value: s, label: s }));
        setSuffixOptions([{ value: "", label: "(none)" }, ...list]);
      } catch {
        if (!cancelled) setSuffixOptions([{ value: "", label: "(none)" }]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!eSignFileId) {
        if (!cancelled) setPreviewUrl("");
        return;
      }
      try {
        const res = await apiPost(paths.publicFilesResolve, {
          fileIds: [eSignFileId],
        });
        const item = Array.isArray(res?.data?.items) ? res.data.items[0] : null;
        if (!cancelled) {
          setPreviewUrl(
            item?.url ? publicAssetUrlForDisplay(item.url) : "",
          );
        }
      } catch {
        if (!cancelled) setPreviewUrl("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eSignFileId]);

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  async function onSaveProfile(e) {
    e.preventDefault();
    setError("");
    setOk("");
    setSaving(true);
    try {
      const res = await apiPatch(paths.authMe, {
        fullName,
        suffix,
      });
      applyMeUser(res?.data);
      setOk(res?.message || "Profile saved");
    } catch (err) {
      setError(err?.message || "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  function onPickESign(e) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    setError("");
    setOk("");
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setCropImg(null);
    setZoom(1);
    setCropOpen(true);
  }

  function onCropImageLoad(e) {
    const img = e.currentTarget;
    setCropImg(img);
    const { panX: x, panY: y } = initialPan(
      img.naturalWidth,
      img.naturalHeight,
      1,
      viewPx,
    );
    setPanX(x);
    setPanY(y);
    setZoom(1);
  }

  function closeCrop() {
    setCropOpen(false);
    setCropImg(null);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc("");
  }

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: panX,
      originY: panY,
    };
  }

  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    setPanX(d.originX + (e.clientX - d.startX));
    setPanY(d.originY + (e.clientY - d.startY));
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  async function onCropUpload() {
    if (!cropImg) return;
    setError("");
    setOk("");
    setUploading(true);
    try {
      const blob = await exportESignPng(cropImg, { zoom, panX, panY, viewPx });
      const fd = new FormData();
      fd.append("file", blob, "esign.png");
      const res = await apiPostFormData(paths.authMeEsign, fd);
      applyMeUser(res?.data);
      const nextId =
        typeof res?.data?.eSignFileId === "string" ? res.data.eSignFileId : null;
      setESignFileId(nextId);
      closeCrop();
      setOk(res?.message || "E-Sign uploaded");
    } catch (err) {
      setError(err?.message || "Could not upload E-Sign");
    } finally {
      setUploading(false);
    }
  }

  const base =
    cropImg != null
      ? coverBaseScale(cropImg.naturalWidth, cropImg.naturalHeight, viewPx)
      : 1;
  const dispScale = base * Math.max(zoom, 1);

  return (
    <div className="flex flex-col gap-8">
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
          {ok}
        </p>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={onSaveProfile} noValidate>
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Profile
        </h2>
        <label className="block text-left">
          <span className={labelClass}>Email</span>
          <input
            type="email"
            className={`${inputClass} opacity-70`}
            value={email || ""}
            disabled
            readOnly
          />
        </label>
        <label className="block text-left">
          <span className={labelClass}>Full Name</span>
          <input
            name="fullName"
            type="text"
            autoComplete="name"
            className={inputClass}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={200}
          />
        </label>
        <div className="text-left">
          <span className={labelClass}>Suffix</span>
          <SearchableDropdown
            value={suffix}
            onChange={setSuffix}
            options={suffixOptions}
            placeholder="Select suffix"
          />
        </div>
        <button type="submit" className={btnPrimaryClass} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          E-Sign
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          PNG or JPG. Cropped to {ESIGN_SIZE}×{ESIGN_SIZE}. Visible only to you.
        </p>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Your e-sign"
            width={ESIGN_SIZE}
            height={ESIGN_SIZE}
            className="size-40 rounded-md border border-zinc-200 bg-white object-contain p-1 dark:border-zinc-700"
          />
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No e-sign uploaded yet.
          </p>
        )}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={onPickESign}
          />
          <button
            type="button"
            className={btnPrimaryClass}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload E-Sign
          </button>
        </div>
      </div>

      <Modal
        open={cropOpen}
        onClose={() => {
          if (!uploading) closeCrop();
        }}
        title={`Crop e-sign (${ESIGN_SIZE}×${ESIGN_SIZE})`}
        closeOnOverlayClick={!uploading}
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Drag to position. Use zoom so the signature fills the square.
          </p>
          <div
            className="relative mx-auto overflow-hidden rounded-md border border-zinc-300 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800"
            style={{ width: viewPx, height: viewPx, touchAction: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {cropSrc ? (
              <img
                src={cropSrc}
                alt=""
                draggable={false}
                onLoad={onCropImageLoad}
                className="absolute max-w-none select-none"
                style={{
                  width: cropImg
                    ? cropImg.naturalWidth * dispScale
                    : undefined,
                  height: cropImg
                    ? cropImg.naturalHeight * dispScale
                    : undefined,
                  transform: `translate(${panX}px, ${panY}px)`,
                  cursor: "grab",
                }}
              />
            ) : null}
          </div>
          <label className="block text-left">
            <span className={labelClass}>Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnSecondaryClass}
              disabled={uploading}
              onClick={closeCrop}
            >
              Cancel
            </button>
            <button
              type="button"
              className={btnPrimaryClass}
              disabled={uploading || !cropImg}
              onClick={onCropUpload}
            >
              {uploading ? "Uploading…" : "Crop & upload"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

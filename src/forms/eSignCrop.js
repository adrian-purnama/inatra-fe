/** Must match backend `ESIGN_SIZE` in `lib/imageDimensions.ts`. */
export const ESIGN_SIZE = 500;

const VIEW_PX = 280;

export function eSignViewPx() {
  return VIEW_PX;
}

/** Scale so the image covers the square viewport at zoom=1. */
export function coverBaseScale(natW, natH, viewPx = VIEW_PX) {
  if (!natW || !natH) return 1;
  return Math.max(viewPx / natW, viewPx / natH);
}

export function initialPan(natW, natH, zoom = 1, viewPx = VIEW_PX) {
  const base = coverBaseScale(natW, natH, viewPx);
  const dispW = natW * base * zoom;
  const dispH = natH * base * zoom;
  return {
    panX: (viewPx - dispW) / 2,
    panY: (viewPx - dispH) / 2,
  };
}

/**
 * Export the visible square crop as a PNG blob at ESIGN_SIZE×ESIGN_SIZE.
 * @param {HTMLImageElement} img
 * @param {{ zoom: number; panX: number; panY: number; viewPx?: number }} state
 * @returns {Promise<Blob>}
 */
export function exportESignPng(img, { zoom, panX, panY, viewPx = VIEW_PX }) {
  const base = coverBaseScale(img.naturalWidth, img.naturalHeight, viewPx);
  const dispScale = base * Math.max(zoom, 1);
  const sx = -panX / dispScale;
  const sy = -panY / dispScale;
  const sSize = viewPx / dispScale;

  const canvas = document.createElement("canvas");
  canvas.width = ESIGN_SIZE;
  canvas.height = ESIGN_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas unavailable"));
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ESIGN_SIZE, ESIGN_SIZE);
  ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, ESIGN_SIZE, ESIGN_SIZE);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))),
      "image/png",
    );
  });
}

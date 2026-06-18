"use client";

import { useState, useEffect, useRef } from "react";
import { Download, Image as ImageIcon, Instagram } from "lucide-react";
import { loadPhotosForGroup } from "@/lib/photoStorage";

interface CollageGeneratorProps {
  groupId: string;
  teamName: string;
  adventureName: string;
  completionTime: string;
  riddleIds: string[];
}

// ── Canvas constants ──────────────────────────────────────────────────────────
const CANVAS_W  = 1080;
const CANVAS_H  = 1350;   // 4:5 Instagram portrait
const PAD       = 12;
const GAP       = 8;
const CORNER_R  = 12;
const BADGE_H   = 100;    // dedicated brand strip at bottom of canvas
const BADGE_GAP = 8;      // gap between photo grid and badge strip

// Available photo area (everything above the badge)
const PW  = CANVAS_W - PAD * 2;                       // 1056
const PH  = CANVAS_H - PAD * 2 - BADGE_H - BADGE_GAP; // 1218

// Reusable column widths (last column absorbs pixel rounding)
const HW  = Math.floor((PW - GAP) / 2);        // ~524 — 2-col half width
const TW  = Math.floor((PW - GAP * 2) / 3);    // ~346 — 3-col third width
const QW  = Math.floor((PW - GAP * 3) / 4);    // ~258 — 4-col quarter width
const HW2 = PW - HW - GAP;                     // right half (absorbs rounding)
const TW3 = PW - TW * 2 - GAP * 2;             // right third
const QW4 = PW - QW * 3 - GAP * 3;             // right quarter

// Reusable row heights (last row absorbs pixel rounding)
const HH  = Math.floor((PH - GAP) / 2);        // ~605
const TH  = Math.floor((PH - GAP * 2) / 3);    // ~400
const HH2 = PH - HH - GAP;
const TH3 = PH - TH * 2 - GAP * 2;

interface Tile { x: number; y: number; w: number; h: number }

// ── Adaptive template selection ───────────────────────────────────────────────
// Picks the layout whose slot aspect ratio best matches the photos' actual AR.
// avgAR < 1.0 → mostly portrait shots; ≥ 1.0 → mostly landscape.
function getTemplate(count: number, avgAR: number): Tile[] {
  const p = avgAR < 1.0; // portrait-oriented?
  const n = Math.min(count, 9);

  switch (n) {
    case 1:
      return [{ x: PAD, y: PAD, w: PW, h: PH }];

    case 2:
      return p
        ? [
            // Side-by-side → tall portrait slots (0.43 AR) ≈ 9:16 ✓
            { x: PAD,        y: PAD, w: HW,  h: PH },
            { x: PAD+HW+GAP, y: PAD, w: HW2, h: PH },
          ]
        : [
            // Stacked → wide landscape slots (1.75 AR) ≈ 16:9 ✓
            { x: PAD, y: PAD,        w: PW, h: HH  },
            { x: PAD, y: PAD+HH+GAP, w: PW, h: HH2 },
          ];

    case 3:
      return p
        ? [
            // Left full-height column + right two stacked
            { x: PAD,        y: PAD,         w: HW,  h: PH  },
            { x: PAD+HW+GAP, y: PAD,         w: HW2, h: HH  },
            { x: PAD+HW+GAP, y: PAD+HH+GAP,  w: HW2, h: HH2 },
          ]
        : [
            // One wide landscape on top + two below
            { x: PAD,        y: PAD,         w: PW,  h: HH  },
            { x: PAD,        y: PAD+HH+GAP,  w: HW,  h: HH2 },
            { x: PAD+HW+GAP, y: PAD+HH+GAP,  w: HW2, h: HH2 },
          ];

    case 4:
      // 2×2 works well for both orientations (0.87 AR per slot)
      return [
        { x: PAD,        y: PAD,         w: HW,  h: HH  },
        { x: PAD+HW+GAP, y: PAD,         w: HW2, h: HH  },
        { x: PAD,        y: PAD+HH+GAP,  w: HW,  h: HH2 },
        { x: PAD+HW+GAP, y: PAD+HH+GAP,  w: HW2, h: HH2 },
      ];

    case 5:
      return p
        ? [
            // 2 wide top + 3 narrow bottom — bottom slots 0.57 AR ≈ 9:16 ✓
            { x: PAD,             y: PAD,        w: HW,  h: HH  },
            { x: PAD+HW+GAP,      y: PAD,        w: HW2, h: HH  },
            { x: PAD,             y: PAD+HH+GAP, w: TW,  h: HH2 },
            { x: PAD+TW+GAP,      y: PAD+HH+GAP, w: TW,  h: HH2 },
            { x: PAD+TW*2+GAP*2,  y: PAD+HH+GAP, w: TW3, h: HH2 },
          ]
        : [
            // 3 wide top + 2 below
            { x: PAD,             y: PAD,        w: TW,  h: HH  },
            { x: PAD+TW+GAP,      y: PAD,        w: TW,  h: HH  },
            { x: PAD+TW*2+GAP*2,  y: PAD,        w: TW3, h: HH  },
            { x: PAD,             y: PAD+HH+GAP, w: HW,  h: HH2 },
            { x: PAD+HW+GAP,      y: PAD+HH+GAP, w: HW2, h: HH2 },
          ];

    case 6:
      return p
        ? [
            // 3 cols × 2 rows → 346×605 = 0.57 AR — near-perfect for 9:16 ✓✓
            { x: PAD,            y: PAD,        w: TW,  h: HH  },
            { x: PAD+TW+GAP,     y: PAD,        w: TW,  h: HH  },
            { x: PAD+TW*2+GAP*2, y: PAD,        w: TW3, h: HH  },
            { x: PAD,            y: PAD+HH+GAP, w: TW,  h: HH2 },
            { x: PAD+TW+GAP,     y: PAD+HH+GAP, w: TW,  h: HH2 },
            { x: PAD+TW*2+GAP*2, y: PAD+HH+GAP, w: TW3, h: HH2 },
          ]
        : [
            // 2 cols × 3 rows → 524×400 = 1.31 AR ≈ 4:3 landscape ✓
            { x: PAD,        y: PAD,              w: HW,  h: TH  },
            { x: PAD+HW+GAP, y: PAD,              w: HW2, h: TH  },
            { x: PAD,        y: PAD+TH+GAP,       w: HW,  h: TH  },
            { x: PAD+HW+GAP, y: PAD+TH+GAP,      w: HW2, h: TH  },
            { x: PAD,        y: PAD+TH*2+GAP*2,   w: HW,  h: TH3 },
            { x: PAD+HW+GAP, y: PAD+TH*2+GAP*2,  w: HW2, h: TH3 },
          ];

    case 7: {
      // 3 top + 4 bottom
      const b = HH2;
      return [
        { x: PAD,            y: PAD,        w: TW,  h: HH },
        { x: PAD+TW+GAP,     y: PAD,        w: TW,  h: HH },
        { x: PAD+TW*2+GAP*2, y: PAD,        w: TW3, h: HH },
        { x: PAD,            y: PAD+HH+GAP, w: QW,  h: b  },
        { x: PAD+QW+GAP,     y: PAD+HH+GAP, w: QW,  h: b  },
        { x: PAD+QW*2+GAP*2, y: PAD+HH+GAP, w: QW,  h: b  },
        { x: PAD+QW*3+GAP*3, y: PAD+HH+GAP, w: QW4, h: b  },
      ];
    }

    case 8:
      if (p) {
        // 4 cols × 2 rows → 258×605 = 0.43 AR — great for portrait
        return [
          { x: PAD,            y: PAD,        w: QW,  h: HH  },
          { x: PAD+QW+GAP,     y: PAD,        w: QW,  h: HH  },
          { x: PAD+QW*2+GAP*2, y: PAD,        w: QW,  h: HH  },
          { x: PAD+QW*3+GAP*3, y: PAD,        w: QW4, h: HH  },
          { x: PAD,            y: PAD+HH+GAP, w: QW,  h: HH2 },
          { x: PAD+QW+GAP,     y: PAD+HH+GAP, w: QW,  h: HH2 },
          { x: PAD+QW*2+GAP*2, y: PAD+HH+GAP, w: QW,  h: HH2 },
          { x: PAD+QW*3+GAP*3, y: PAD+HH+GAP, w: QW4, h: HH2 },
        ];
      } else {
        // 2 cols × 4 rows → 524×298 = 1.76 AR — great for landscape
        const rh = Math.floor((PH - GAP * 3) / 4);
        const rh4 = PH - rh * 3 - GAP * 3;
        return [
          { x: PAD,        y: PAD,              w: HW, h: rh  },
          { x: PAD+HW+GAP, y: PAD,              w: HW2,h: rh  },
          { x: PAD,        y: PAD+rh+GAP,       w: HW, h: rh  },
          { x: PAD+HW+GAP, y: PAD+rh+GAP,       w: HW2,h: rh  },
          { x: PAD,        y: PAD+rh*2+GAP*2,   w: HW, h: rh  },
          { x: PAD+HW+GAP, y: PAD+rh*2+GAP*2,   w: HW2,h: rh  },
          { x: PAD,        y: PAD+rh*3+GAP*3,   w: HW, h: rh4 },
          { x: PAD+HW+GAP, y: PAD+rh*3+GAP*3,   w: HW2,h: rh4 },
        ];
      }

    default: // 9  →  3×3 grid (0.87 AR — works for mixed orientations)
      return [
        { x: PAD,            y: PAD,              w: TW,  h: TH  },
        { x: PAD+TW+GAP,     y: PAD,              w: TW,  h: TH  },
        { x: PAD+TW*2+GAP*2, y: PAD,              w: TW3, h: TH  },
        { x: PAD,            y: PAD+TH+GAP,       w: TW,  h: TH  },
        { x: PAD+TW+GAP,     y: PAD+TH+GAP,      w: TW,  h: TH  },
        { x: PAD+TW*2+GAP*2, y: PAD+TH+GAP,      w: TW3, h: TH  },
        { x: PAD,            y: PAD+TH*2+GAP*2,   w: TW,  h: TH3 },
        { x: PAD+TW+GAP,     y: PAD+TH*2+GAP*2,  w: TW,  h: TH3 },
        { x: PAD+TW*2+GAP*2, y: PAD+TH*2+GAP*2,  w: TW3, h: TH3 },
      ];
  }
}

// ── Drawing helpers ───────────────────────────────────────────────────────────
function drawPhotoInTile(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  tile: Tile
) {
  const imgAR  = img.width / img.height;
  const tileAR = tile.w / tile.h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;

  if (imgAR > tileAR) {
    // Photo wider than slot → crop sides, keep centre
    sw = img.height * tileAR;
    sx = (img.width - sw) / 2;
  } else {
    // Photo taller than slot → crop top/bottom, keep centre
    sh = img.width / tileAR;
    sy = (img.height - sh) / 2;
  }

  ctx.save();
  const r = CORNER_R;
  ctx.beginPath();
  ctx.moveTo(tile.x + r, tile.y);
  ctx.lineTo(tile.x + tile.w - r, tile.y);
  ctx.arcTo(tile.x + tile.w, tile.y,      tile.x + tile.w, tile.y + r,      r);
  ctx.lineTo(tile.x + tile.w, tile.y + tile.h - r);
  ctx.arcTo(tile.x + tile.w, tile.y + tile.h, tile.x + tile.w - r, tile.y + tile.h, r);
  ctx.lineTo(tile.x + r, tile.y + tile.h);
  ctx.arcTo(tile.x, tile.y + tile.h, tile.x, tile.y + tile.h - r, r);
  ctx.lineTo(tile.x, tile.y + r);
  ctx.arcTo(tile.x, tile.y, tile.x + r, tile.y, r);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, tile.x, tile.y, tile.w, tile.h);
  ctx.restore();
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CollageGeneratorV2({
  groupId,
  teamName,
  adventureName: _adventureName,
  completionTime: _completionTime,
  riddleIds,
}: CollageGeneratorProps) {
  const [photos, setPhotos]       = useState<{ [key: string]: string }>({});
  const [collageUrl, setCollageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadPhotosForGroup(groupId, riddleIds).then((loaded) => {
      if (!cancelled) setPhotos(loaded);
    });
    return () => { cancelled = true; };
  }, [groupId, riddleIds]);

  const photoCount = Object.keys(photos).length;

  // ── Collage generation ──────────────────────────────────────────────────────
  const generateCollage = async () => {
    if (photoCount === 0 || !canvasRef.current) return;
    setIsGenerating(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setIsGenerating(false); return; }

    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;

    // Dark background
    ctx.fillStyle = "#0f0f0f";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Shuffle entries
    const photoEntries = Object.entries(photos);
    for (let i = photoEntries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [photoEntries[i], photoEntries[j]] = [photoEntries[j], photoEntries[i]];
    }

    // Cap at 9 photos (largest supported template)
    const selected = photoEntries.slice(0, 9);

    // Load all images in parallel to get their real dimensions
    const imgs = await Promise.all(
      selected.map(([, url]) =>
        new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => {
            // Placeholder with a sensible AR so the layout doesn't break
            const ph = document.createElement("canvas");
            ph.width = 4; ph.height = 3;
            const placeholder = new Image();
            placeholder.width = 4; placeholder.height = 3;
            resolve(placeholder);
          };
          img.src = url;
        })
      )
    );

    // Detect dominant orientation from actual photo dimensions
    const avgAR = imgs.reduce((s, img) => s + img.width / img.height, 0) / imgs.length;

    // Choose the best-fitting template
    const tiles = getTemplate(imgs.length, avgAR);

    // Draw photos into tiles
    for (let i = 0; i < imgs.length && i < tiles.length; i++) {
      drawPhotoInTile(ctx, imgs[i], tiles[i]);
    }

    // Draw brand badge strip at bottom
    const stamp = new Image();
    await new Promise<void>((resolve) => {
      stamp.onload = () => resolve();
      stamp.onerror = () => resolve();
      stamp.src = "/collagestamp.png";
    });

    if (stamp.complete && stamp.width > 0) {
      const badgeY  = PAD + PH + BADGE_GAP;
      const stampH  = Math.floor(BADGE_H * 0.80);
      const stampW  = Math.floor(stampH * (stamp.width / stamp.height));
      const stampX  = (CANVAS_W - stampW) / 2;
      const stampYp = badgeY + (BADGE_H - stampH) / 2;
      ctx.drawImage(stamp, stampX, stampYp, stampW, stampH);
    }

    canvas.toBlob(
      (blob) => {
        if (blob) setCollageUrl(URL.createObjectURL(blob));
        setIsGenerating(false);
      },
      "image/jpeg",
      0.95
    );
  };

  const downloadCollage = () => {
    if (!collageUrl) return;
    const a = document.createElement("a");
    a.href = collageUrl;
    a.download = `riddle-city-${teamName.toLowerCase().replace(/\s+/g, "-")}-collage.jpg`;
    a.click();
  };

  // ── Download all individual photos with watermark ───────────────────────────
  const downloadAllPhotos = async () => {
    const photoEntries = Object.entries(photos);
    if (photoEntries.length === 0) return;

    const stamp = new Image();
    stamp.crossOrigin = "anonymous";
    await new Promise<void>((resolve) => {
      stamp.onload = () => resolve();
      stamp.onerror = () => resolve();
      stamp.src = "/collagestamp.png";
    });

    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    for (let i = 0; i < photoEntries.length; i++) {
      const [, dataUrl] = photoEntries[i];
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => {
          tempCanvas.width  = img.width;
          tempCanvas.height = img.height;
          tempCtx.drawImage(img, 0, 0);
          if (stamp.complete && stamp.width > 0) {
            const ww = Math.floor(img.width * 0.22);
            const wh = Math.floor(ww * 1.015);
            const wp = Math.floor(img.width * 0.08);
            tempCtx.drawImage(stamp, img.width - ww - wp, img.height - wh - wp, ww, wh);
          }
          tempCanvas.toBlob(
            (blob) => {
              if (blob) {
                const url  = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href  = url;
                link.download = `riddle-city-${teamName.toLowerCase().replace(/\s+/g, "-")}-photo-${i + 1}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(url), 100);
              }
              resolve();
            },
            "image/jpeg",
            0.9
          );
        };
        img.onerror = () => resolve();
        img.src = dataUrl;
      });

      if (i < photoEntries.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-5">
      {photoCount > 0 ? (
        <>
          {/* Photo count + thumbnail strip */}
          <div>
            <p className="text-white/50 text-sm mb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              {photoCount} photo{photoCount !== 1 ? "s" : ""} from your adventure
              {photoCount > 9 && (
                <span className="text-white/30 text-xs">(first 9 used in collage)</span>
              )}
            </p>
            <div className="grid grid-cols-5 gap-1">
              {Object.values(photos)
                .slice(0, 10)
                .map((url, i) => (
                  <div key={i} className="aspect-square rounded-md overflow-hidden bg-neutral-800">
                    <img
                      src={url}
                      alt={`Adventure photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              {photoCount > 10 && (
                <div className="aspect-square rounded-md bg-neutral-800 flex items-center justify-center text-white/40 text-xs font-medium">
                  +{photoCount - 10}
                </div>
              )}
            </div>
          </div>

          {/* Generate / re-shuffle button */}
          <button
            onClick={generateCollage}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-700 hover:via-pink-700 hover:to-rose-700 disabled:from-gray-600 disabled:via-gray-600 disabled:to-gray-600 text-white font-semibold py-4 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
          >
            <Instagram className="w-5 h-5" />
            {isGenerating
              ? "Creating collage…"
              : collageUrl
              ? "Shuffle & Regenerate"
              : "Create Photo Collage"}
          </button>

          {collageUrl && (
            <div className="space-y-3">
              {/* Preview */}
              <div className="relative w-full aspect-[4/5] bg-neutral-900 rounded-xl overflow-hidden border border-white/10">
                <img
                  src={collageUrl}
                  alt="Your adventure collage"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Download collage */}
              <button
                onClick={downloadCollage}
                className="w-full bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-700 hover:via-pink-700 hover:to-rose-700 text-white font-semibold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-3 shadow-lg"
              >
                <Download className="w-5 h-5" />
                Download Collage &amp; Tag @riddlecity.co.uk
              </button>

              {/* Download individual photos */}
              <button
                onClick={downloadAllPhotos}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 border border-white/20"
              >
                <Download className="w-4 h-4" />
                Download All {photoCount} Photos
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No photos captured</p>
          <p className="text-sm mt-1 opacity-60">
            Take photos during your adventure to create a collage
          </p>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

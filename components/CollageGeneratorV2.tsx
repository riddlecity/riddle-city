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

// ── Canvas: 1080×1350 (4:5 Instagram portrait, white background) ─────────────
const CW  = 1080;
const CH  = 1350;
const PAD = 12;
const GAP = 8;
const CR  = 12; // corner radius

const PW = CW - PAD * 2; // 1056 — usable width
const PH = CH - PAD * 2; // 1326 — usable height (full canvas, logo lives in a slot)

interface Tile { x: number; y: number; w: number; h: number; isLogo: boolean }

// Logo banner height when used as overlay (2, 4, 6 photos)
const LOGO_BANNER_H = 110;

// Does this photo count fit a perfect rectangle with the logo as last slot?
// True for: 1,3,5,7,8,9 — False for: 2,4,6
function usesLogoSlot(photoCount: number): boolean {
  const n = Math.min(photoCount, 9);
  return n % 2 !== 0 || n === 8 || n === 9;
}

// Grid for photos only (no logo slot). Used when logo is overlaid.
function calcPhotoGrid(n: number): { cols: number; rows: number } {
  if (n <= 2)  return { cols: 1, rows: 2 };
  if (n <= 4)  return { cols: 2, rows: 2 };
  return               { cols: 2, rows: 3 }; // 6
}

// Grid for photos + logo slot (logo = last tile).
function calcSlotGrid(total: number): { cols: number; rows: number } {
  if (total <= 2)  return { cols: 1, rows: 2 };
  if (total <= 4)  return { cols: 2, rows: 2 };
  if (total <= 6)  return { cols: 2, rows: 3 };
  if (total <= 8)  return { cols: 2, rows: 4 };
  if (total <= 9)  return { cols: 3, rows: 3 };
  return                   { cols: 2, rows: 5 };
}

function buildPhotoTiles(photoCount: number, gridH: number): Tile[] {
  const n = Math.min(photoCount, 9);
  const { cols, rows } = calcPhotoGrid(n);
  const tiles: Tile[] = [];
  let count = 0;
  for (let r = 0; r < rows && count < n; r++) {
    for (let c = 0; c < cols && count < n; c++) {
      const x  = PAD + Math.round(c * (PW + GAP) / cols);
      const y  = PAD + Math.round(r * (gridH + GAP) / rows);
      const x2 = c < cols - 1 ? PAD + Math.round((c + 1) * (PW + GAP) / cols) - GAP : PAD + PW;
      const y2 = r < rows - 1 ? PAD + Math.round((r + 1) * (gridH + GAP) / rows) - GAP : PAD + gridH;
      tiles.push({ x, y, w: x2 - x, h: y2 - y, isLogo: false });
      count++;
    }
  }
  return tiles;
}

// Build all tile rects. Returns photo tiles + optional logo tile.
function buildTiles(photoCount: number): Tile[] {
  const n = Math.min(photoCount, 9);
  if (usesLogoSlot(n)) {
    // Logo fills the last slot in a perfect rectangle
    const total = n + 1;
    const { cols, rows } = calcSlotGrid(total);
    const tiles: Tile[] = [];
    let count = 0;
    for (let r = 0; r < rows && count < total; r++) {
      for (let c = 0; c < cols && count < total; c++) {
        const x  = PAD + Math.round(c * (PW + GAP) / cols);
        const y  = PAD + Math.round(r * (PH + GAP) / rows);
        const x2 = c < cols - 1 ? PAD + Math.round((c + 1) * (PW + GAP) / cols) - GAP : PAD + PW;
        const y2 = r < rows - 1 ? PAD + Math.round((r + 1) * (PH + GAP) / rows) - GAP : PAD + PH;
        tiles.push({ x, y, w: x2 - x, h: y2 - y, isLogo: count === total - 1 });
        count++;
      }
    }
    return tiles;
  } else {
    // Logo overlaid as bottom banner — photos fill available height above it
    const gridH = PH - LOGO_BANNER_H - GAP;
    const photoTiles = buildPhotoTiles(n, gridH);
    // Logo banner spans full width at the bottom
    const bannerY = PAD + gridH + GAP;
    photoTiles.push({ x: PAD, y: bannerY, w: PW, h: LOGO_BANNER_H, isLogo: true });
    return photoTiles;
  }
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}

function drawPhotoInTile(ctx: CanvasRenderingContext2D, img: HTMLImageElement, tile: Tile) {
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
  roundedRectPath(ctx, tile.x, tile.y, tile.w, tile.h, CR);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, tile.x, tile.y, tile.w, tile.h);
  ctx.restore();
}

function drawLogoTile(ctx: CanvasRenderingContext2D, tile: Tile, stamp: HTMLImageElement, isBanner: boolean) {
  ctx.save();
  roundedRectPath(ctx, tile.x, tile.y, tile.w, tile.h, CR);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Stamp centred — banners use 55% width, slots use 75%
  if (stamp.complete && stamp.width > 0 && stamp.height > 0) {
    const fillFrac = isBanner ? 0.55 : 0.75;
    const maxW    = tile.w * fillFrac;
    const maxH    = tile.h * 0.75;
    const stampAR = stamp.width / stamp.height;
    let sW = maxW;
    let sH = sW / stampAR;
    if (sH > maxH) { sH = maxH; sW = sH * stampAR; }
    const sx = tile.x + (tile.w - sW) / 2;
    const sy = tile.y + (tile.h - sH) / 2;
    ctx.drawImage(stamp, sx, sy, sW, sH);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CollageGeneratorV2({
  groupId,
  teamName,
  adventureName: _adventureName,
  completionTime: _completionTime,
  riddleIds,
}: CollageGeneratorProps) {
  const [photos, setPhotos]           = useState<{ [key: string]: string }>({});
  const [collageUrl, setCollageUrl]   = useState<string | null>(null);
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

  const generateCollage = async () => {
    if (photoCount === 0 || !canvasRef.current) return;
    setIsGenerating(true);

    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    if (!ctx) { setIsGenerating(false); return; }

    canvas.width  = CW;
    canvas.height = CH;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CW, CH);

    // Load stamp first
    const stamp = new Image();
    await new Promise<void>((resolve) => {
      stamp.onload  = () => resolve();
      stamp.onerror = () => resolve();
      stamp.src     = "/collagestamp.png";
    });

    // Shuffle photo entries
    const photoEntries = Object.entries(photos);
    for (let i = photoEntries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [photoEntries[i], photoEntries[j]] = [photoEntries[j], photoEntries[i]];
    }

    // Build grid layout
    const tiles      = buildTiles(photoCount);
    const photoTiles = tiles.filter(t => !t.isLogo);
    const logoTile   = tiles.find(t => t.isLogo);

    // Load and draw photos
    const selected = photoEntries.slice(0, photoTiles.length);
    for (let i = 0; i < selected.length; i++) {
      const img = await new Promise<HTMLImageElement>((resolve) => {
        const image   = new Image();
        image.onload  = () => resolve(image);
        image.onerror = () => resolve(image);
        image.src     = selected[i][1];
      });
      if (img.width > 0) {
        drawPhotoInTile(ctx, img, photoTiles[i]);
      }
    }

    // Draw logo slot or banner
    if (logoTile) {
      const isBanner = !usesLogoSlot(Math.min(photoCount, 9));
      drawLogoTile(ctx, logoTile, stamp, isBanner);
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
    const a      = document.createElement("a");
    a.href       = collageUrl;
    a.download   = `riddle-city-${teamName.toLowerCase().replace(/\s+/g, "-")}-collage.jpg`;
    a.click();
  };

  const downloadAllPhotos = async () => {
    const photoEntries = Object.entries(photos);
    if (photoEntries.length === 0) return;

    const stamp = new Image();
    stamp.crossOrigin = "anonymous";
    await new Promise<void>((resolve) => {
      stamp.onload  = () => resolve();
      stamp.onerror = () => resolve();
      stamp.src     = "/collagestamp.png";
    });

    const tempCanvas = document.createElement("canvas");
    const tempCtx    = tempCanvas.getContext("2d");
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
            const ww = Math.floor(img.width  * 0.22);
            const wh = Math.floor(ww * (stamp.height / stamp.width));
            const wp = Math.floor(img.width  * 0.05);
            const hp = Math.floor(img.height * 0.05);
            tempCtx.drawImage(stamp, img.width - ww - wp, img.height - wh - hp, ww, wh);
          }
          tempCanvas.toBlob(
            (blob) => {
              if (blob) {
                const url  = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href      = url;
                link.download  = `riddle-city-${teamName.toLowerCase().replace(/\s+/g, "-")}-photo-${i + 1}.jpg`;
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
              {Object.values(photos).slice(0, 10).map((url, i) => (
                <div key={i} className="aspect-square rounded-md overflow-hidden bg-neutral-800">
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
              {photoCount > 10 && (
                <div className="aspect-square rounded-md bg-neutral-800 flex items-center justify-center text-white/40 text-xs font-medium">
                  +{photoCount - 10}
                </div>
              )}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={generateCollage}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-700 hover:via-pink-700 hover:to-rose-700 disabled:from-gray-600 disabled:via-gray-600 disabled:to-gray-600 text-white font-semibold py-4 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
          >
            <Instagram className="w-5 h-5" />
            {isGenerating ? "Creating collage…" : collageUrl ? "Shuffle & Regenerate" : "Create Photo Collage"}
          </button>

          {collageUrl && (
            <div className="space-y-3">
              <div className="relative w-full aspect-[4/5] bg-neutral-900 rounded-xl overflow-hidden border border-white/10">
                <img src={collageUrl} alt="Your adventure collage" className="w-full h-full object-contain" />
              </div>
              <button
                onClick={downloadCollage}
                className="w-full bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-700 hover:via-pink-700 hover:to-rose-700 text-white font-semibold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-3 shadow-lg"
              >
                <Download className="w-5 h-5" />
                Download Collage &amp; Tag @riddlecity.co.uk
              </button>
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
          <p className="text-sm mt-1 opacity-60">Take photos during your adventure to create a collage</p>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}


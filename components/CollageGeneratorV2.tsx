"use client";

import { useState, useEffect, useRef } from "react";
import { Download, Image as ImageIcon, Instagram } from "lucide-react";
import { toJpeg } from "html-to-image";
import { loadPhotosForGroup } from "@/lib/photoStorage";

interface CollageGeneratorProps {
  groupId: string;
  teamName: string;
  adventureName: string;
  completionTime: string;
  riddleIds: string[];
}

const MAX_COLLAGE_PHOTOS = 9;
const CELL_ASPECT = 0.8; // portrait, close to a typical phone photo
const EXPORT_WIDTH = 480; // on-screen render width in px; upscaled via pixelRatio on export

// Picks a near-square cols x rows grid for however many photos there are, so
// the overall collage shape itself goes from a single portrait tile (1
// photo) to a wide rectangle (e.g. 2x1) to a tall square (e.g. 3x3), instead
// of forcing every group size into one fixed canvas shape. The grid is real
// CSS Grid rendered in the DOM (see JSX below) and snapshotted with
// html-to-image, so the browser's own layout engine handles sizing/cropping
// instead of hand-rolled canvas math.
function gridFor(n: number): { cols: number; rows: number } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  const rows = Math.ceil(n / cols);
  return { cols, rows };
}

function shuffledCopy<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CollageGeneratorV2({
  groupId,
  teamName,
  adventureName: _adventureName,
  completionTime: _completionTime,
  riddleIds,
}: CollageGeneratorProps) {
  const [photos, setPhotos] = useState<{ [key: string]: string }>({});
  const [gridUrls, setGridUrls] = useState<string[]>([]);
  const [collageUrl, setCollageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const collageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadPhotosForGroup(groupId, riddleIds).then((loaded) => {
      if (!cancelled) setPhotos(loaded);
    });
    return () => { cancelled = true; };
  }, [groupId, riddleIds]);

  const photoCount = Object.keys(photos).length;

  const generateCollage = async () => {
    if (photoCount === 0 || !collageRef.current) return;
    setIsGenerating(true);

    // Render the actual grid DOM before snapshotting it - wait two animation
    // frames so the browser has committed styles/layout for the new photo
    // order before html-to-image reads it.
    setGridUrls(shuffledCopy(Object.values(photos)).slice(0, MAX_COLLAGE_PHOTOS));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    try {
      const dataUrl = await toJpeg(collageRef.current, {
        quality: 0.95,
        pixelRatio: 3,
        backgroundColor: "#ffffff",
      });
      setCollageUrl(dataUrl);
    } catch (err) {
      console.error("Collage generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
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

  const clampedCount = Math.min(photoCount, MAX_COLLAGE_PHOTOS) || 1;
  // Odd counts never tile a rectangle evenly on their own - giving the logo
  // its own full cell (instead of a small corner watermark) makes the total
  // an even number of slots, so the grid comes out clean either way.
  const logoTakesSlot = clampedCount % 2 === 1;
  const { cols: gridCols, rows: gridRows } = gridFor(logoTakesSlot ? clampedCount + 1 : clampedCount);

  return (
    <div className="w-full space-y-5">
      {photoCount > 0 ? (
        <>
          {/* Photo count + thumbnail strip */}
          <div>
            <p className="text-white/50 text-sm mb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              {photoCount} photo{photoCount !== 1 ? "s" : ""} from your adventure
              {photoCount > MAX_COLLAGE_PHOTOS && (
                <span className="text-white/30 text-xs">(first {MAX_COLLAGE_PHOTOS} used in collage)</span>
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

          {/* Off-screen live grid that gets snapshotted into collageUrl above.
              Rendered with real CSS Grid so the browser's layout engine
              handles sizing/cropping instead of hand-rolled canvas math. */}
          <div className="overflow-hidden" style={{ height: 0 }}>
            <div
              ref={collageRef}
              style={{
                width: EXPORT_WIDTH,
                display: "grid",
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                gridTemplateRows: `repeat(${gridRows}, 1fr)`,
                gap: 6,
                padding: 10,
                aspectRatio: `${gridCols * CELL_ASPECT} / ${gridRows}`,
                background: "#ffffff",
                position: "relative",
              }}
            >
              {gridUrls.map((url, i) => (
                <div key={i} style={{ borderRadius: 10, overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
              ))}
              {logoTakesSlot ? (
                <div
                  style={{
                    borderRadius: 10,
                    background: "#ffffff",
                    border: "1.5px solid #e0e0e0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/collagestamp.png" alt="" style={{ width: "70%", objectFit: "contain" }} />
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/collagestamp.png"
                  alt=""
                  style={{ position: "absolute", bottom: 14, right: 14, width: "18%", opacity: 0.92 }}
                />
              )}
            </div>
          </div>

          {collageUrl && (
            <div className="space-y-3">
              <div className="relative w-full bg-neutral-900 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center p-2">
                <img src={collageUrl} alt="Your adventure collage" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
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
    </div>
  );
}


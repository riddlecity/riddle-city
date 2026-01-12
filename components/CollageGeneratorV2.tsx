"use client";

import { useState, useEffect, useRef } from "react";
import { Download, Image as ImageIcon, Instagram } from "lucide-react";

interface CollageGeneratorProps {
  groupId: string;
  teamName: string;
  adventureName: string;
  completionTime: string;
  riddleIds: string[];
}

// Instagram 4:5 aspect ratio
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;
const PADDING = 12;
const CORNER_RADIUS = 12;

// Badge styling
const BADGE_STYLES = {
  light: { bg: "#f5f5f0", text: "#1a1a1a", logo: "#1a1a1a" },
  dark: { bg: "#2d3436", text: "#ffffff", logo: "#ffffff" }
};

interface PhotoTile {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Layout {
  photoTiles: PhotoTile[];
  badgeArea: PhotoTile;
  badgeOverlay: boolean;
}

export default function CollageGeneratorV2({ 
  groupId, 
  teamName,
  adventureName: _adventureName,
  completionTime: _completionTime, 
  riddleIds 
}: CollageGeneratorProps) {
  const [photos, setPhotos] = useState<{ [key: string]: string }>({});
  const [collageUrl, setCollageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadedPhotos: { [key: string]: string } = {};
    riddleIds.forEach(riddleId => {
      const photo = localStorage.getItem(`riddlecity_photo_${groupId}_${riddleId}`);
      if (photo) loadedPhotos[riddleId] = photo;
    });
    setPhotos(loadedPhotos);
  }, [groupId, riddleIds]);

  const photoCount = Object.keys(photos).length;

  // Smart layout calculator - all landscape-oriented tiles
  const calculateLayout = (count: number): Layout => {
    const w = CANVAS_WIDTH - PADDING * 2;
    const h = CANVAS_HEIGHT - PADDING * 2;
    const gap = 8;

    // Badge dimensions
    const badgeW = Math.floor(w * 0.68);
    const badgeH = Math.floor(h * 0.16);
    const badgeX = PADDING + (w - badgeW) / 2;
    const badgeY = PADDING + (h - badgeH) / 2;

    const photoTiles: PhotoTile[] = [];

    if (count === 1) {
      // Single large photo with badge below
      const photoH = Math.floor(h * 0.72);
      photoTiles.push({ x: PADDING, y: PADDING, width: w, height: photoH });
      return {
        photoTiles,
        badgeArea: { x: PADDING, y: PADDING + photoH + gap, width: w, height: h - photoH - gap },
        badgeOverlay: false
      };
    }

    if (count === 2) {
      // 2 stacked landscape photos
      const photoH = (h - gap) / 2;
      photoTiles.push({ x: PADDING, y: PADDING, width: w, height: photoH });
      photoTiles.push({ x: PADDING, y: PADDING + photoH + gap, width: w, height: photoH });
      return { photoTiles, badgeArea: { x: badgeX, y: badgeY, width: badgeW, height: badgeH }, badgeOverlay: true };
    }

    if (count === 3) {
      // 1 large top + 2 below
      const topH = Math.floor(h * 0.52);
      const botH = h - topH - gap;
      const botW = (w - gap) / 2;
      photoTiles.push({ x: PADDING, y: PADDING, width: w, height: topH });
      photoTiles.push({ x: PADDING, y: PADDING + topH + gap, width: botW, height: botH });
      photoTiles.push({ x: PADDING + botW + gap, y: PADDING + topH + gap, width: botW, height: botH });
      return { photoTiles, badgeArea: { x: badgeX, y: badgeY, width: badgeW, height: badgeH }, badgeOverlay: true };
    }

    if (count === 4) {
      // 2x2 grid
      const photoH = (h - gap) / 2;
      const photoW = (w - gap) / 2;
      photoTiles.push({ x: PADDING, y: PADDING, width: photoW, height: photoH });
      photoTiles.push({ x: PADDING + photoW + gap, y: PADDING, width: photoW, height: photoH });
      photoTiles.push({ x: PADDING, y: PADDING + photoH + gap, width: photoW, height: photoH });
      photoTiles.push({ x: PADDING + photoW + gap, y: PADDING + photoH + gap, width: photoW, height: photoH });
      return { photoTiles, badgeArea: { x: badgeX, y: badgeY, width: badgeW, height: badgeH }, badgeOverlay: true };
    }

    if (count === 5) {
      // 2 + 2 + 1 pattern
      const rowH = Math.floor(h * 0.31);
      const botH = h - rowH * 2 - gap * 2;
      const halfW = (w - gap) / 2;
      photoTiles.push({ x: PADDING, y: PADDING, width: halfW, height: rowH });
      photoTiles.push({ x: PADDING + halfW + gap, y: PADDING, width: halfW, height: rowH });
      photoTiles.push({ x: PADDING, y: PADDING + rowH + gap, width: halfW, height: rowH });
      photoTiles.push({ x: PADDING + halfW + gap, y: PADDING + rowH + gap, width: halfW, height: rowH });
      photoTiles.push({ x: PADDING, y: PADDING + rowH * 2 + gap * 2, width: w, height: botH });
      return { photoTiles, badgeArea: { x: badgeX, y: badgeY, width: badgeW, height: badgeH }, badgeOverlay: true };
    }

    if (count === 6) {
      // 3 rows of 2
      const photoH = (h - gap * 2) / 3;
      const photoW = (w - gap) / 2;
      for (let row = 0; row < 3; row++) {
        const y = PADDING + (photoH + gap) * row;
        photoTiles.push({ x: PADDING, y, width: photoW, height: photoH });
        photoTiles.push({ x: PADDING + photoW + gap, y, width: photoW, height: photoH });
      }
      return { photoTiles, badgeArea: { x: badgeX, y: badgeY, width: badgeW, height: badgeH }, badgeOverlay: true };
    }

    if (count === 7) {
      // 1 large top + 3 rows of 2
      const topH = Math.floor(h * 0.30);
      const rowH = (h - topH - gap * 3) / 3;
      const halfW = (w - gap) / 2;
      photoTiles.push({ x: PADDING, y: PADDING, width: w, height: topH });
      for (let row = 0; row < 3; row++) {
        const y = PADDING + topH + gap + (rowH + gap) * row;
        photoTiles.push({ x: PADDING, y, width: halfW, height: rowH });
        photoTiles.push({ x: PADDING + halfW + gap, y, width: halfW, height: rowH });
      }
      return { photoTiles, badgeArea: { x: badgeX, y: badgeY, width: badgeW, height: badgeH }, badgeOverlay: true };
    }

    if (count === 8) {
      // 4 rows of 2
      const photoH = (h - gap * 3) / 4;
      const photoW = (w - gap) / 2;
      for (let row = 0; row < 4; row++) {
        const y = PADDING + (photoH + gap) * row;
        photoTiles.push({ x: PADDING, y, width: photoW, height: photoH });
        photoTiles.push({ x: PADDING + photoW + gap, y, width: photoW, height: photoH });
      }
      return { photoTiles, badgeArea: { x: badgeX, y: badgeY, width: badgeW, height: Math.floor(h * 0.14) }, badgeOverlay: true };
    }

    if (count === 9) {
      // 1 large top + 4 rows of 2
      const topH = Math.floor(h * 0.26);
      const rowH = (h - topH - gap * 4) / 4;
      const halfW = (w - gap) / 2;
      photoTiles.push({ x: PADDING, y: PADDING, width: w, height: topH });
      for (let row = 0; row < 4; row++) {
        const y = PADDING + topH + gap + (rowH + gap) * row;
        photoTiles.push({ x: PADDING, y, width: halfW, height: rowH });
        photoTiles.push({ x: PADDING + halfW + gap, y, width: halfW, height: rowH });
      }
      return { photoTiles, badgeArea: { x: badgeX, y: badgeY, width: badgeW, height: Math.floor(h * 0.14) }, badgeOverlay: true };
    }

    // 10+ photos: 5 rows of 2
    const photoH = (h - gap * 4) / 5;
    const photoW = (w - gap) / 2;
    for (let row = 0; row < 5; row++) {
      const y = PADDING + (photoH + gap) * row;
      photoTiles.push({ x: PADDING, y, width: photoW, height: photoH });
      photoTiles.push({ x: PADDING + photoW + gap, y, width: photoW, height: photoH });
    }
    return { photoTiles, badgeArea: { x: badgeX, y: badgeY, width: badgeW, height: Math.floor(h * 0.13) }, badgeOverlay: true };
  };

  // Smart crop with center bias - minimizes cropping of landscape photos
  const drawCroppedPhoto = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    tile: PhotoTile
  ) => {
    const imgAspect = img.width / img.height;
    const tileAspect = tile.width / tile.height;

    let sx = 0, sy = 0, sw = img.width, sh = img.height;

    if (imgAspect > tileAspect) {
      // Image is wider - crop sides, keep center
      sw = img.height * tileAspect;
      sx = (img.width - sw) / 2;
    } else {
      // Image is taller - crop top/bottom, keep center
      sh = img.width / tileAspect;
      sy = (img.height - sh) / 2;
    }

    // Draw with rounded corners
    ctx.save();
    ctx.beginPath();
    const r = CORNER_RADIUS;
    ctx.moveTo(tile.x + r, tile.y);
    ctx.lineTo(tile.x + tile.width - r, tile.y);
    ctx.arcTo(tile.x + tile.width, tile.y, tile.x + tile.width, tile.y + r, r);
    ctx.lineTo(tile.x + tile.width, tile.y + tile.height - r);
    ctx.arcTo(tile.x + tile.width, tile.y + tile.height, tile.x + tile.width - r, tile.y + tile.height, r);
    ctx.lineTo(tile.x + r, tile.y + tile.height);
    ctx.arcTo(tile.x, tile.y + tile.height, tile.x, tile.y + tile.height - r, r);
    ctx.lineTo(tile.x, tile.y + r);
    ctx.arcTo(tile.x, tile.y, tile.x + r, tile.y, r);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(img, sx, sy, sw, sh, tile.x, tile.y, tile.width, tile.height);
    ctx.restore();
  };

  // Analyze average brightness
  const analyzeBrightness = async (photoUrls: string[]): Promise<number> => {
    let totalBrightness = 0;
    
    for (const url of photoUrls.slice(0, 3)) {
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = 100;
          tempCanvas.height = 100;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.drawImage(img, 0, 0, 100, 100);
            const data = tempCtx.getImageData(0, 0, 100, 100).data;
            let sum = 0;
            for (let i = 0; i < data.length; i += 4) {
              sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
            }
            totalBrightness += sum / (data.length / 4);
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = url;
      });
    }
    
    return totalBrightness / Math.min(3, photoUrls.length);
  };

  // Draw badge with logo
  const drawBadge = (
    ctx: CanvasRenderingContext2D,
    tile: PhotoTile,
    stamp: HTMLImageElement,
    useDarkBadge: boolean
  ) => {
    const colors = useDarkBadge ? BADGE_STYLES.dark : BADGE_STYLES.light;

    // Badge background with rounded corners
    ctx.save();
    ctx.fillStyle = colors.bg;
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;
    
    const r = CORNER_RADIUS;
    ctx.beginPath();
    ctx.moveTo(tile.x + r, tile.y);
    ctx.lineTo(tile.x + tile.width - r, tile.y);
    ctx.arcTo(tile.x + tile.width, tile.y, tile.x + tile.width, tile.y + r, r);
    ctx.lineTo(tile.x + tile.width, tile.y + tile.height - r);
    ctx.arcTo(tile.x + tile.width, tile.y + tile.height, tile.x + tile.width - r, tile.y + tile.height, r);
    ctx.lineTo(tile.x + r, tile.y + tile.height);
    ctx.arcTo(tile.x, tile.y + tile.height, tile.x, tile.y + tile.height - r, r);
    ctx.lineTo(tile.x, tile.y + r);
    ctx.arcTo(tile.x, tile.y, tile.x + r, tile.y, r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Logo
    if (stamp.complete) {
      const logoSize = Math.floor(tile.height * 0.65);
      const logoX = tile.x + (tile.width - logoSize) / 2;
      const logoY = tile.y + (tile.height - logoSize) / 2;
      
      ctx.save();
      if (colors.logo === "#ffffff") {
        ctx.filter = "brightness(0) invert(1)";
      }
      ctx.drawImage(stamp, logoX, logoY, logoSize, logoSize);
      ctx.restore();
    }

    // Team name
    ctx.fillStyle = colors.text;
    ctx.font = `bold ${Math.floor(tile.height * 0.16)}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(teamName, tile.x + tile.width / 2, tile.y + tile.height * 0.85);
  };

  const generateCollage = async () => {
    if (photoCount === 0 || !canvasRef.current) return;
    
    setIsGenerating(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsGenerating(false);
      return;
    }

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Load stamp
    const stamp = new Image();
    const stampLoaded = new Promise<void>((resolve) => {
      stamp.onload = () => resolve();
      stamp.onerror = () => resolve();
      stamp.src = "/collagestamp.png";
    });
    await stampLoaded;

    // Get layout
    const layout = calculateLayout(photoCount);
    const photoEntries = Object.entries(photos);
    
    // Shuffle photos
    for (let i = photoEntries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [photoEntries[i], photoEntries[j]] = [photoEntries[j], photoEntries[i]];
    }

    // Analyze brightness
    const avgBrightness = await analyzeBrightness(photoEntries.map(([, url]) => url));
    const useDarkBadge = avgBrightness > 128;

    // Load and draw photos
    for (let i = 0; i < Math.min(photoEntries.length, layout.photoTiles.length); i++) {
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => {
          drawCroppedPhoto(ctx, img, layout.photoTiles[i]);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = photoEntries[i][1];
      });
    }

    // Draw badge
    drawBadge(ctx, layout.badgeArea, stamp, useDarkBadge);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        setCollageUrl(URL.createObjectURL(blob));
      }
      setIsGenerating(false);
    }, "image/png");
  };

  const downloadCollage = () => {
    if (!collageUrl) return;
    const link = document.createElement("a");
    link.href = collageUrl;
    link.download = `riddle-city-${teamName.toLowerCase().replace(/\s+/g, "-")}-collage.png`;
    link.click();
  };

  return (
    <div className="w-full space-y-6">
      {photoCount > 0 && (
        <>
          <button
            onClick={generateCollage}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-700 hover:via-pink-700 hover:to-rose-700 disabled:from-gray-600 disabled:via-gray-600 disabled:to-gray-600 text-white font-semibold py-4 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
          >
            <Instagram className="w-5 h-5" />
            {isGenerating ? "Generating Collage..." : "Generate Instagram Collage"}
          </button>

          {collageUrl && (
            <div className="space-y-4">
              <div className="relative w-full aspect-[4/5] bg-gray-900/50 rounded-xl overflow-hidden border-2 border-red-400/30">
                <img
                  src={collageUrl}
                  alt="Team collage"
                  className="w-full h-full object-contain"
                />
              </div>
              <button
                onClick={downloadCollage}
                className="w-full bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-700 hover:via-pink-700 hover:to-rose-700 text-white font-semibold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-3 shadow-lg"
              >
                <Download className="w-5 h-5" />
                Download Collage
              </button>
            </div>
          )}
        </>
      )}

      {photoCount === 0 && (
        <div className="text-center py-12 text-gray-400">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No photos captured yet</p>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

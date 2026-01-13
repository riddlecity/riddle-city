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
      // 2x2 grid with badge in smaller 4th spot
      const row1H = Math.floor(h * 0.58); // Top row larger
      const row2H = h - row1H - gap; // Bottom row smaller
      const col1W = Math.floor(w * 0.52);
      const col2W = w - col1W - gap;
      
      photoTiles.push({ x: PADDING, y: PADDING, width: col1W, height: row1H });
      photoTiles.push({ x: PADDING + col1W + gap, y: PADDING, width: col2W, height: row1H });
      photoTiles.push({ x: PADDING, y: PADDING + row1H + gap, width: col1W, height: row2H });
      
      return {
        photoTiles,
        badgeArea: { x: PADDING + col1W + gap, y: PADDING + row1H + gap, width: col2W, height: row2H },
        badgeOverlay: false
      };
    }

    if (count === 4) {
      // 2x2 staggered grid - photos criss-cross for visual interest
      const row1H = Math.floor(h * 0.45);
      const row2H = Math.floor(h * 0.48);
      const bottomGap = Math.floor(gap * 1.5); // Slightly larger gap for offset
      
      // Top row
      const col1W = Math.floor(w * 0.48);
      const col2W = w - col1W - gap;
      photoTiles.push({ x: PADDING, y: PADDING, width: col1W, height: row1H });
      photoTiles.push({ x: PADDING + col1W + gap, y: PADDING, width: col2W, height: row1H });
      
      // Bottom row - wider left (picture 3), narrower right (picture 4), slightly offset down
      const col3W = Math.floor(w * 0.54); // Picture 3 wider than picture 1
      const col4W = w - col3W - gap; // Picture 4 narrower than picture 2
      const row2Y = PADDING + row1H + bottomGap;
      
      photoTiles.push({ x: PADDING, y: row2Y, width: col3W, height: row2H });
      photoTiles.push({ x: PADDING + col3W + gap, y: row2Y, width: col4W, height: row2H });
      return { photoTiles, badgeArea: { x: badgeX, y: badgeY, width: badgeW, height: badgeH }, badgeOverlay: true };
    }

    if (count === 5) {
      // 3 rows of 2 with badge in 6th spot
      const row1H = Math.floor(h * 0.32);
      const row2H = Math.floor(h * 0.36);
      const row3H = h - row1H - row2H - gap * 2;
      const col1W = Math.floor(w * 0.58);
      const col2W = w - col1W - gap;
      
      // Row 1: 58/42 split
      photoTiles.push({ x: PADDING, y: PADDING, width: col1W, height: row1H });
      photoTiles.push({ x: PADDING + col1W + gap, y: PADDING, width: col2W, height: row1H });
      
      // Row 2: 42/58 split (alternated)
      photoTiles.push({ x: PADDING, y: PADDING + row1H + gap, width: col2W, height: row2H });
      photoTiles.push({ x: PADDING + col2W + gap, y: PADDING + row1H + gap, width: col1W, height: row2H });
      
      // Row 3: Photo on left, badge on right
      photoTiles.push({ x: PADDING, y: PADDING + row1H + gap + row2H + gap, width: col1W, height: row3H });
      
      return {
        photoTiles,
        badgeArea: { x: PADDING + col1W + gap, y: PADDING + row1H + gap + row2H + gap, width: col2W, height: row3H },
        badgeOverlay: false
      };
    }

    if (count === 6) {
      // 3 rows of 2 with varied heights
      const row1H = Math.floor(h * 0.30);
      const row2H = Math.floor(h * 0.38);
      const row3H = h - row1H - row2H - gap * 2;
      const col1W = Math.floor(w * 0.48);
      const col2W = w - col1W - gap;
      
      photoTiles.push({ x: PADDING, y: PADDING, width: col1W, height: row1H });
      photoTiles.push({ x: PADDING + col1W + gap, y: PADDING, width: col2W, height: row1H });
      
      photoTiles.push({ x: PADDING, y: PADDING + row1H + gap, width: col2W, height: row2H });
      photoTiles.push({ x: PADDING + col2W + gap, y: PADDING + row1H + gap, width: col1W, height: row2H });
      
      photoTiles.push({ x: PADDING, y: PADDING + row1H + gap + row2H + gap, width: col1W, height: row3H });
      photoTiles.push({ x: PADDING + col1W + gap, y: PADDING + row1H + gap + row2H + gap, width: col2W, height: row3H });
      
      return { photoTiles, badgeArea: { x: badgeX, y: badgeY, width: badgeW, height: badgeH }, badgeOverlay: true };
    }

    if (count === 7) {
      // 4 rows of 2 with badge in 8th spot - largest rows in middle
      const row1H = Math.floor(h * 0.22);
      const row2H = Math.floor(h * 0.30);
      const row3H = Math.floor(h * 0.26);
      const row4H = h - row1H - row2H - row3H - gap * 3;
      const col1W = Math.floor(w * 0.54);
      const col2W = w - col1W - gap;
      
      // Bottom row: wider photo on left, more square badge on right
      const row4PhotoW = Math.floor(w * 0.65);
      const row4BadgeW = w - row4PhotoW - gap;
      
      // Row 1: 54/46 split
      photoTiles.push({ x: PADDING, y: PADDING, width: col1W, height: row1H });
      photoTiles.push({ x: PADDING + col1W + gap, y: PADDING, width: col2W, height: row1H });
      
      // Row 2: 46/54 split (alternated)
      photoTiles.push({ x: PADDING, y: PADDING + row1H + gap, width: col2W, height: row2H });
      photoTiles.push({ x: PADDING + col2W + gap, y: PADDING + row1H + gap, width: col1W, height: row2H });
      
      // Row 3: 54/46 split
      photoTiles.push({ x: PADDING, y: PADDING + row1H + gap + row2H + gap, width: col1W, height: row3H });
      photoTiles.push({ x: PADDING + col1W + gap, y: PADDING + row1H + gap + row2H + gap, width: col2W, height: row3H });
      
      // Row 4: Wider photo on left (65%), more square badge on right (35%)
      photoTiles.push({ x: PADDING, y: PADDING + row1H + gap + row2H + gap + row3H + gap, width: row4PhotoW, height: row4H });
      
      return {
        photoTiles,
        badgeArea: { x: PADDING + row4PhotoW + gap, y: PADDING + row1H + gap + row2H + gap + row3H + gap, width: row4BadgeW, height: row4H },
        badgeOverlay: false
      };
    }

    if (count === 8) {
      // 4 rows of 2 with varied dimensions - largest rows in middle
      const row1H = Math.floor(h * 0.22);
      const row2H = Math.floor(h * 0.30);
      const row3H = Math.floor(h * 0.26);
      const row4H = h - row1H - row2H - row3H - gap * 3;
      const col1W = Math.floor(w * 0.54);
      const col2W = w - col1W - gap;
      
      // Alternate column widths for visual interest
      photoTiles.push({ x: PADDING, y: PADDING, width: col1W, height: row1H });
      photoTiles.push({ x: PADDING + col1W + gap, y: PADDING, width: col2W, height: row1H });
      
      photoTiles.push({ x: PADDING, y: PADDING + row1H + gap, width: col2W, height: row2H });
      photoTiles.push({ x: PADDING + col2W + gap, y: PADDING + row1H + gap, width: col1W, height: row2H });
      
      photoTiles.push({ x: PADDING, y: PADDING + row1H + gap + row2H + gap, width: col1W, height: row3H });
      photoTiles.push({ x: PADDING + col1W + gap, y: PADDING + row1H + gap + row2H + gap, width: col2W, height: row3H });
      
      photoTiles.push({ x: PADDING, y: PADDING + row1H + gap + row2H + gap + row3H + gap, width: col2W, height: row4H });
      photoTiles.push({ x: PADDING + col2W + gap, y: PADDING + row1H + gap + row2H + gap + row3H + gap, width: col1W, height: row4H });
      
      return { photoTiles, badgeArea: { x: badgeX, y: badgeY, width: badgeW, height: Math.floor(h * 0.14) }, badgeOverlay: true };
    }

    if (count === 9) {
      // 5 rows of 2 with badge in 10th spot
      const row1H = Math.floor(h * 0.22);
      const row2H = Math.floor(h * 0.20);
      const row3H = Math.floor(h * 0.21);
      const row4H = Math.floor(h * 0.19);
      const row5H = h - row1H - row2H - row3H - row4H - gap * 4;
      const col1W = Math.floor(w * 0.52);
      const col2W = w - col1W - gap;
      
      // Row 1
      photoTiles.push({ x: PADDING, y: PADDING, width: col1W, height: row1H });
      photoTiles.push({ x: PADDING + col1W + gap, y: PADDING, width: col2W, height: row1H });
      
      // Row 2
      photoTiles.push({ x: PADDING, y: PADDING + row1H + gap, width: col2W, height: row2H });
      photoTiles.push({ x: PADDING + col2W + gap, y: PADDING + row1H + gap, width: col1W, height: row2H });
      
      // Row 3
      photoTiles.push({ x: PADDING, y: PADDING + row1H + gap + row2H + gap, width: col1W, height: row3H });
      photoTiles.push({ x: PADDING + col1W + gap, y: PADDING + row1H + gap + row2H + gap, width: col2W, height: row3H });
      
      // Row 4
      photoTiles.push({ x: PADDING, y: PADDING + row1H + gap + row2H + gap + row3H + gap, width: col2W, height: row4H });
      photoTiles.push({ x: PADDING + col2W + gap, y: PADDING + row1H + gap + row2H + gap + row3H + gap, width: col1W, height: row4H });
      
      // Row 5: Photo on left, badge on right
      photoTiles.push({ x: PADDING, y: PADDING + row1H + gap + row2H + gap + row3H + gap + row4H + gap, width: col1W, height: row5H });
      
      return {
        photoTiles,
        badgeArea: { x: PADDING + col1W + gap, y: PADDING + row1H + gap + row2H + gap + row3H + gap + row4H + gap, width: col2W, height: row5H },
        badgeOverlay: false
      };
    }

    // 10+ photos: 5 rows of 2 with varied dimensions
    const row1H = Math.floor(h * 0.22);
    const row2H = Math.floor(h * 0.19);
    const row3H = Math.floor(h * 0.21);
    const row4H = Math.floor(h * 0.18);
    const row5H = h - row1H - row2H - row3H - row4H - gap * 4;
    const col1W = Math.floor(w * 0.54);
    const col2W = w - col1W - gap;
    
    // Row 1
    photoTiles.push({ x: PADDING, y: PADDING, width: col1W, height: row1H });
    photoTiles.push({ x: PADDING + col1W + gap, y: PADDING, width: col2W, height: row1H });
    
    // Row 2
    photoTiles.push({ x: PADDING, y: PADDING + row1H + gap, width: col2W, height: row2H });
    photoTiles.push({ x: PADDING + col2W + gap, y: PADDING + row1H + gap, width: col1W, height: row2H });
    
    // Row 3
    photoTiles.push({ x: PADDING, y: PADDING + row1H + gap + row2H + gap, width: col1W, height: row3H });
    photoTiles.push({ x: PADDING + col1W + gap, y: PADDING + row1H + gap + row2H + gap, width: col2W, height: row3H });
    
    // Row 4
    photoTiles.push({ x: PADDING, y: PADDING + row1H + gap + row2H + gap + row3H + gap, width: col2W, height: row4H });
    photoTiles.push({ x: PADDING + col2W + gap, y: PADDING + row1H + gap + row2H + gap + row3H + gap, width: col1W, height: row4H });
    
    // Row 5
    photoTiles.push({ x: PADDING, y: PADDING + row1H + gap + row2H + gap + row3H + gap + row4H + gap, width: col1W, height: row5H });
    photoTiles.push({ x: PADDING + col1W + gap, y: PADDING + row1H + gap + row2H + gap + row3H + gap + row4H + gap, width: col2W, height: row5H });
    
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
    _useDarkBadge: boolean,
    scale: number = 0.50 // Default 50% width, can be overridden
  ) => {
    // Just draw the stamp logo - moderate size, slightly stretched
    if (stamp.complete) {
      // Make logo scale% of tile width and stretch vertically 1.015x
      const logoWidth = Math.floor(tile.width * scale);
      const logoHeight = Math.floor(logoWidth * 1.015); // Very slightly taller
      const logoX = tile.x + (tile.width - logoWidth) / 2;
      const logoY = tile.y + (tile.height - logoHeight) / 2;
      
      // Draw stamp directly without any filters or backgrounds
      ctx.drawImage(stamp, logoX, logoY, logoWidth, logoHeight);
    }
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

    // Draw badge (larger for specific layouts: 5, 7 photos)
    const badgeScale = photoCount === 5 ? 0.70 : photoCount === 3 ? 0.65 : photoCount === 7 ? 0.85 : 0.50;
    drawBadge(ctx, layout.badgeArea, stamp, useDarkBadge, badgeScale);

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

  const downloadAllPhotos = async () => {
    const photoEntries = Object.entries(photos);
    if (photoEntries.length === 0) return;

    // Load stamp
    const stamp = new Image();
    stamp.crossOrigin = "anonymous";
    const stampLoaded = new Promise<void>((resolve) => {
      stamp.onload = () => resolve();
      stamp.onerror = () => resolve();
      stamp.src = "/collagestamp.png";
    });
    await stampLoaded;

    // Create temporary canvas for watermarking
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    for (let i = 0; i < photoEntries.length; i++) {
      const [, dataUrl] = photoEntries[i];
      
      // Load photo
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => {
          // Set canvas to image size
          tempCanvas.width = img.width;
          tempCanvas.height = img.height;
          
          // Draw original photo
          tempCtx.drawImage(img, 0, 0);
          
          // Add watermark in bottom-right corner (22% of image width, positioned left from edge)
          if (stamp.complete && stamp.width > 0) {
            const watermarkWidth = Math.floor(img.width * 0.22); // Increased from 0.15 to 0.22
            const watermarkHeight = Math.floor(watermarkWidth * 1.015);
            const padding = Math.floor(img.width * 0.08); // Increased from 0.03 to 0.08 - more left
            const x = img.width - watermarkWidth - padding;
            const y = img.height - watermarkHeight - padding;
            
            tempCtx.drawImage(stamp, x, y, watermarkWidth, watermarkHeight);
          }
          
          // Download
          tempCanvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `riddle-city-${teamName.toLowerCase().replace(/\s+/g, "-")}-photo-${i + 1}.jpg`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              setTimeout(() => URL.revokeObjectURL(url), 100);
            }
            resolve();
          }, "image/jpeg", 0.9);
        };
        img.onerror = () => resolve();
        img.src = dataUrl;
      });
      
      // Stagger downloads
      if (i < photoEntries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
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
            {isGenerating ? "Generating Collage..." : collageUrl ? "Randomize Collage" : "Generate Instagram Collage"}
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
                className="w-full bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-700 hover:via-pink-700 hover:to-rose-700 text-white font-semibold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-3 shadow-lg whitespace-nowrap"
              >
                <Download className="w-5 h-5 flex-shrink-0" />
                <span className="whitespace-nowrap">Download Collage & Tag @riddlecity.co.uk</span>
              </button>
              <button
                onClick={downloadAllPhotos}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 border border-white/20"
              >
                <Download className="w-4 h-4" />
                Download All Photos
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

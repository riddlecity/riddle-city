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

// Instagram-first canvas dimensions (4:5 aspect ratio)
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;
const GUTTER = 16;
const CORNER_RADIUS = 14;

// Completion badge color options
const LIGHT_BADGE = {
  bg: "#f5f5f0", // Off-white/stone
  text: "#1a1a1a", // Near-black
  logo: "#1a1a1a"
};

const DARK_BADGE = {
  bg: "#2d3436", // Charcoal
  text: "#ffffff",
  logo: "#ffffff"
};

interface Tile {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'photo' | 'badge';
}

export default function CollageGenerator({ 
  groupId, 
  teamName,
  adventureName,
  completionTime, 
  riddleIds 
}: CollageGeneratorProps) {
  const [photos, setPhotos] = useState<{ [key: string]: string }>({});
  const [collageUrl, setCollageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Load all photos from localStorage
    const loadedPhotos: { [key: string]: string } = {};
    riddleIds.forEach(riddleId => {
      const photo = localStorage.getItem(`riddlecity_photo_${groupId}_${riddleId}`);
      if (photo) {
        loadedPhotos[riddleId] = photo;
      }
    });
    setPhotos(loadedPhotos);
  }, [groupId, riddleIds]);

  const photoCount = Object.keys(photos).length;

  // Helper function to draw rounded rectangle
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  // Analyze photo brightness for badge color selection
  const analyzePhotoBrightness = async (photoDataUrls: string[]): Promise<number> => {
    let totalBrightness = 0;
    let count = 0;
    
    for (const dataUrl of photoDataUrls.slice(0, 3)) {
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 100;
          canvas.height = 100;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 100, 100);
            const imageData = ctx.getImageData(0, 0, 100, 100);
            let brightness = 0;
            for (let i = 0; i < imageData.data.length; i += 4) {
              const r = imageData.data[i];
              const g = imageData.data[i + 1];
              const b = imageData.data[i + 2];
              brightness += (r + g + b) / 3;
            }
            totalBrightness += brightness / (imageData.data.length / 4);
            count++;
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = dataUrl;
      });
    }
    
    return count > 0 ? totalBrightness / count : 128;
  };

  // Get layout based on photo count
  const getLayout = (count: number): { tiles: Tile[], overlayBadge?: { x: number, y: number, width: number, height: number } } => {
    const tiles: Tile[] = [];
    const contentWidth = CANVAS_WIDTH - (GUTTER * 2);
    const contentHeight = CANVAS_HEIGHT - (GUTTER * 3) - 80;

    if (count === 1) {
      // 1 photo: large photo + badge below
      const photoHeight = Math.floor(contentHeight * 0.68);
      const badgeHeight = contentHeight - photoHeight - GUTTER;
      tiles.push({ x: GUTTER, y: GUTTER, width: contentWidth, height: photoHeight, type: 'photo' });
      tiles.push({ x: GUTTER, y: GUTTER + photoHeight + GUTTER, width: contentWidth, height: badgeHeight, type: 'badge' });
      return { tiles };
    } 
    else if (count === 2) {
      // 2 photos: full height, badge overlays center
      const photoHeight = Math.floor((contentHeight - GUTTER) / 2);
      tiles.push({ x: GUTTER, y: GUTTER, width: contentWidth, height: photoHeight, type: 'photo' });
      tiles.push({ x: GUTTER, y: GUTTER + photoHeight + GUTTER, width: contentWidth, height: photoHeight, type: 'photo' });
      
      // Badge overlays center
      const badgeWidth = Math.floor(contentWidth * 0.7);
      const badgeHeight = Math.floor(contentHeight * 0.25);
      return { 
        tiles,
        overlayBadge: {
          x: GUTTER + (contentWidth - badgeWidth) / 2,
          y: GUTTER + (contentHeight - badgeHeight) / 2,
          width: badgeWidth,
          height: badgeHeight
        }
      };
    }
    else if (count === 3) {
      // 3 photos: 2 top, 1 bottom left, badge bottom right
      const row1Height = Math.floor(contentHeight * 0.50);
      const row2Height = contentHeight - row1Height - GUTTER;
      const col1Width = Math.floor(contentWidth * 0.58);
      const col2Width = contentWidth - col1Width - GUTTER;
      
      tiles.push({ x: GUTTER, y: GUTTER, width: col1Width, height: row1Height, type: 'photo' });
      tiles.push({ x: GUTTER + col1Width + GUTTER, y: GUTTER, width: col2Width, height: row1Height, type: 'photo' });
      tiles.push({ x: GUTTER, y: GUTTER + row1Height + GUTTER, width: col1Width, height: row2Height, type: 'photo' });
      tiles.push({ x: GUTTER + col1Width + GUTTER, y: GUTTER + row1Height + GUTTER, width: col2Width, height: row2Height, type: 'badge' });
      return { tiles };
    }
    else if (count === 4) {
      // 4 photos: 2x2 grid, badge overlays center
      const photoRowHeight = Math.floor((contentHeight - GUTTER) / 2);
      const col1Width = Math.floor(contentWidth * 0.48);
      const col2Width = contentWidth - col1Width - GUTTER;
      
      // 2x2 grid
      tiles.push({ x: GUTTER, y: GUTTER, width: col1Width, height: photoRowHeight, type: 'photo' });
      tiles.push({ x: GUTTER + col1Width + GUTTER, y: GUTTER, width: col2Width, height: photoRowHeight, type: 'photo' });
      tiles.push({ x: GUTTER, y: GUTTER + photoRowHeight + GUTTER, width: col1Width, height: photoRowHeight, type: 'photo' });
      tiles.push({ x: GUTTER + col1Width + GUTTER, y: GUTTER + photoRowHeight + GUTTER, width: col2Width, height: photoRowHeight, type: 'photo' });
      
      // Badge overlays center
      const badgeWidth = Math.floor(contentWidth * 0.65);
      const badgeHeight = Math.floor(contentHeight * 0.22);
      return { 
        tiles,
        overlayBadge: {
          x: GUTTER + (contentWidth - badgeWidth) / 2,
          y: GUTTER + (contentHeight - badgeHeight) / 2,
          width: badgeWidth,
          height: badgeHeight
        }
      };
    }
    else {
      // 5+ photos: simple grid
      const isEven = count % 2 === 0;
      const rows = Math.ceil(count / 2);
      const rowHeight = Math.floor((contentHeight - (GUTTER * (rows - 1))) / rows);
      const col1Width = Math.floor(contentWidth * 0.52);
      const col2Width = contentWidth - col1Width - GUTTER;
      
      let photoIndex = 0;
      for (let row = 0; row < rows; row++) {
        const y = GUTTER + (row * (rowHeight + GUTTER));
        
        if (photoIndex < count) {
          if (photoIndex + 1 < count) {
            tiles.push({ x: GUTTER, y, width: col1Width, height: rowHeight, type: 'photo' });
            tiles.push({ x: GUTTER + col1Width + GUTTER, y, width: col2Width, height: rowHeight, type: 'photo' });
            photoIndex += 2;
          } else {
            tiles.push({ x: GUTTER, y, width: contentWidth, height: rowHeight, type: 'photo' });
            photoIndex++;
          }
        }
      }
      
      if (isEven) {
        // Badge overlays center for even counts
        const badgeWidth = Math.floor(contentWidth * 0.70);
        const badgeHeight = Math.floor(contentHeight * 0.20);
        return { 
          tiles,
          overlayBadge: {
            x: GUTTER + (contentWidth - badgeWidth) / 2,
            y: GUTTER + (contentHeight - badgeHeight) / 2,
            width: badgeWidth,
            height: badgeHeight
          }
        };
      } else {
        // Badge at end for odd counts
        const lastY = GUTTER + (rows * (rowHeight + GUTTER));
        tiles.push({ x: GUTTER, y: lastY, width: contentWidth, height: rowHeight, type: 'badge' });
        return { tiles };
      }
    }
  };

  const generateCollage = async () => {
    if (photoCount === 0 || !canvasRef.current) return;
    
    setIsGenerating(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load logo
    const logo = new Image();
    const logoLoaded = new Promise<void>((resolve) => {
      logo.onload = () => resolve();
      logo.onerror = () => resolve();
      logo.src = "/collagelogo.png";
    });
    await logoLoaded;

    // Get layout and photos
    const { tiles, overlayBadge } = getLayout(photoCount);
    const photoEntries = Object.entries(photos).sort(() => Math.random() - 0.5);
    
    // Analyze brightness
    const avgBrightness = await analyzePhotoBrightness(photoEntries.map(([, url]) => url));
    const badgeColors = avgBrightness > 128 ? DARK_BADGE : LIGHT_BADGE;

    // Draw tiles
    let photoIndex = 0;
    const imagePromises: Promise<void>[] = [];

    for (const tile of tiles) {
      if (tile.type === 'badge') {
        // Draw completion badge
        ctx.fillStyle = badgeColors.bg;
        ctx.save();
        drawRoundedRect(ctx, tile.x, tile.y, tile.width, tile.height, CORNER_RADIUS);
        ctx.fill();
        ctx.restore();
        
        // Draw logo
        if (logo.complete) {
          const logoScale = 0.60;
          const logoMaxWidth = tile.width * logoScale;
          const logoMaxHeight = tile.height * logoScale * 0.65;
          
          const logoAspect = logo.width / logo.height;
          let logoWidth, logoHeight;
          
          if (logoMaxWidth / logoAspect < logoMaxHeight) {
            logoWidth = logoMaxWidth;
            logoHeight = logoMaxWidth / logoAspect;
          } else {
            logoHeight = logoMaxHeight;
            logoWidth = logoMaxHeight * logoAspect;
          }
          
          const logoX = tile.x + (tile.width - logoWidth) / 2;
          const logoY = tile.y + (tile.height - logoHeight) / 2 - 25;
          
          // Draw logo directly (already in brand colors)
          ctx.save();
          drawRoundedRect(ctx, tile.x, tile.y, tile.width, tile.height, CORNER_RADIUS);
          ctx.clip();
          ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
          ctx.restore();
        }
        
        // Draw text
        const fontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
        ctx.fillStyle = "#dc2626"; // Always use brand red for text
        ctx.textAlign = "center";
        
        const primarySize = Math.max(18, Math.floor(tile.height * 0.09));
        ctx.font = `bold ${primarySize}px ${fontStack}`;
        ctx.fillText("COMPLETED", tile.x + tile.width / 2, tile.y + tile.height - 42);
        
        const secondarySize = Math.max(13, Math.floor(tile.height * 0.065));
        ctx.font = `${secondarySize}px ${fontStack}`;
        ctx.fillText(completionTime, tile.x + tile.width / 2, tile.y + tile.height - 20);
      } else if (photoIndex < photoEntries.length) {
        // Draw photo
        const [, dataUrl] = photoEntries[photoIndex++];
        
        imagePromises.push(new Promise<void>((resolve, reject) => {
          const img = new Image();
          
          const timeout = setTimeout(() => reject(new Error(`Image failed to load`)), 5000);
          
          img.onload = () => {
            clearTimeout(timeout);
            
            const imgAspect = img.width / img.height;
            const tileAspect = tile.width / tile.height;
            
            let drawWidth, drawHeight, offsetX, offsetY;
            
            if (imgAspect > tileAspect) {
              drawHeight = tile.height;
              drawWidth = tile.height * imgAspect;
              offsetX = (tile.width - drawWidth) / 2;
              offsetY = 0;
            } else {
              drawWidth = tile.width;
              drawHeight = tile.width / imgAspect;
              offsetX = 0;
              offsetY = (tile.height - drawHeight) / 2;
            }
            
            ctx.save();
            drawRoundedRect(ctx, tile.x, tile.y, tile.width, tile.height, CORNER_RADIUS);
            ctx.clip();
            ctx.drawImage(img, tile.x + offsetX, tile.y + offsetY, drawWidth, drawHeight);
            ctx.restore();
            
            resolve();
          };
          
          img.onerror = () => {
            clearTimeout(timeout);
            reject(new Error(`Image failed to load`));
          };
          
          img.src = dataUrl;
        }));
      }
    }

    try {
      await Promise.all(imagePromises);
    } catch (error) {
      console.error("Error loading images:", error);
      setIsGenerating(false);
      alert("Some photos couldn't be loaded. Please try capturing them again.");
      return;
    }

    // Draw overlay badge if needed
    if (overlayBadge) {
      const tile = overlayBadge;
      
      // No background - transparent overlay
      // Draw logo
      if (logo.complete) {
        const logoScale = 0.60;
        const logoMaxWidth = tile.width * logoScale;
        const logoMaxHeight = tile.height * logoScale * 0.65;
        
        const logoAspect = logo.width / logo.height;
        let logoWidth, logoHeight;
        
        if (logoMaxWidth / logoAspect < logoMaxHeight) {
          logoWidth = logoMaxWidth;
          logoHeight = logoMaxWidth / logoAspect;
        } else {
          logoHeight = logoMaxHeight;
          logoWidth = logoMaxHeight * logoAspect;
        }
        
        const logoX = tile.x + (tile.width - logoWidth) / 2;
        const logoY = tile.y + (tile.height - logoHeight) / 2 - 25;
        
        // Draw logo directly (already in brand colors)
        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
      }
      
      // Draw text
      const fontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = "#dc2626";
      ctx.textAlign = "center";
      
      const primarySize = Math.max(18, Math.floor(tile.height * 0.09));
      ctx.font = `bold ${primarySize}px ${fontStack}`;
      ctx.fillText("COMPLETED", tile.x + tile.width / 2, tile.y + tile.height - 42);
      
      const secondarySize = Math.max(13, Math.floor(tile.height * 0.065));
      ctx.font = `${secondarySize}px ${fontStack}`;
      ctx.fillText(completionTime, tile.x + tile.width / 2, tile.y + tile.height - 20);
    }

    // Draw footer
    const footerY = CANVAS_HEIGHT - 80;
    const fontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
    
    let adventureColor = "#ec4899";
    if (adventureName.toLowerCase().includes("pub")) {
      adventureColor = "#f59e0b";
    } else if (adventureName.toLowerCase().includes("mystery")) {
      adventureColor = "#8b5cf6";
    }
    
    ctx.fillStyle = adventureColor;
    ctx.font = `bold 20px ${fontStack}`;
    ctx.textAlign = "center";
    ctx.fillText(adventureName, CANVAS_WIDTH / 2, footerY + 20);
    
    ctx.fillStyle = "#1f2937";
    ctx.font = `bold 16px ${fontStack}`;
    ctx.fillText(teamName, CANVAS_WIDTH / 2, footerY + 44);
    
    ctx.fillStyle = "#dc2626";
    ctx.font = `bold 18px ${fontStack}`;
    ctx.fillText("RIDDLECITY.CO.UK", CANVAS_WIDTH / 2, footerY + 70);

    const url = canvas.toDataURL("image/jpeg", 0.9);
    setCollageUrl(url);
    setIsGenerating(false);
  };

  const downloadCollage = () => {
    if (!collageUrl) return;
    
    const link = document.createElement("a");
    link.download = `riddlecity-${teamName.replace(/\s+/g, "-")}-collage.png`;
    link.href = collageUrl;
    link.click();
  };

  if (photoCount === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 text-center border-2 border-gray-200">
        <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No team photos were taken during this adventure</p>
        <p className="text-xs text-gray-500 mt-2">Leaders can capture photos at each riddle location</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 rounded-xl p-6 border-2 border-neutral-700">
      <div className="flex items-center gap-2 mb-4">
        <ImageIcon className="w-6 h-6 text-purple-600" />
        <h2 className="text-xl font-bold text-white">Your Team Collage</h2>
      </div>

      <p className="text-gray-300 mb-4">
        📸 You captured <strong>{photoCount}</strong> photo{photoCount !== 1 ? "s" : ""} during your adventure!
      </p>

      {!collageUrl ? (
        <button
          onClick={generateCollage}
          disabled={isGenerating}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {isGenerating ? "⏳ Creating Your Collage..." : "🎨 Generate Collage"}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="bg-white p-2 rounded-xl border-2 border-pink-300 shadow-2xl">
            <img src={collageUrl} alt="Team collage" className="w-full h-auto rounded-lg" />
          </div>
          
          <button
            onClick={() => {
              downloadCollage();
              alert("📱 Collage downloaded! Share it on Instagram and tag riddlecity.co.uk with #RiddleCity");
            }}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg"
          >
            <Download className="w-5 h-5" />
            <Instagram className="w-5 h-5" />
            Download and Share to Instagram
          </button>

          <p className="text-sm text-center text-gray-400">
            💜 Tag <strong>riddlecity.co.uk</strong> and use <strong>#RiddleCity</strong> when you post!
          </p>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

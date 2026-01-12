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
const GUTTER = 8;
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
  teamName: _teamName,
  adventureName: _adventureName,
  completionTime: _completionTime, 
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
    const contentHeight = CANVAS_HEIGHT - (GUTTER * 2);

    if (count === 1) {
      // 1 photo: Single landscape photo with badge at bottom
      const photoHeight = Math.floor(contentHeight * 0.70);
      const badgeHeight = contentHeight - photoHeight - GUTTER;
      tiles.push({ x: GUTTER, y: GUTTER, width: contentWidth, height: photoHeight, type: 'photo' });
      tiles.push({ x: GUTTER, y: GUTTER + photoHeight + GUTTER, width: contentWidth, height: badgeHeight, type: 'badge' });
      return { tiles };
    } 
    else if (count === 2) {
      // 2 photos: Stack 2 landscape photos vertically, badge overlays center
      const photoHeight = Math.floor((contentHeight - GUTTER) / 2);
      tiles.push({ x: GUTTER, y: GUTTER, width: contentWidth, height: photoHeight, type: 'photo' });
      tiles.push({ x: GUTTER, y: GUTTER + photoHeight + GUTTER, width: contentWidth, height: photoHeight, type: 'photo' });
      
      // Badge overlays center
      const badgeWidth = Math.floor(contentWidth * 0.75);
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
    else if (count === 3) {
      // 3 photos: 1 large top, 2 landscape below, badge overlays
      const topHeight = Math.floor(contentHeight * 0.50);
      const bottomHeight = contentHeight - topHeight - GUTTER;
      const bottomWidth = Math.floor((contentWidth - GUTTER) / 2);
      
      tiles.push({ x: GUTTER, y: GUTTER, width: contentWidth, height: topHeight, type: 'photo' });
      tiles.push({ x: GUTTER, y: GUTTER + topHeight + GUTTER, width: bottomWidth, height: bottomHeight, type: 'photo' });
      tiles.push({ x: GUTTER + bottomWidth + GUTTER, y: GUTTER + topHeight + GUTTER, width: bottomWidth, height: bottomHeight, type: 'photo' });
      
      // Badge overlays center
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
    }
    else if (count === 4) {
      // 4 photos: 2 rows of 2 landscape photos, badge overlays center
      const photoHeight = Math.floor((contentHeight - GUTTER) / 2);
      const photoWidth = Math.floor((contentWidth - GUTTER) / 2);
      
      tiles.push({ x: GUTTER, y: GUTTER, width: photoWidth, height: photoHeight, type: 'photo' });
      tiles.push({ x: GUTTER + photoWidth + GUTTER, y: GUTTER, width: photoWidth, height: photoHeight, type: 'photo' });
      tiles.push({ x: GUTTER, y: GUTTER + photoHeight + GUTTER, width: photoWidth, height: photoHeight, type: 'photo' });
      tiles.push({ x: GUTTER + photoWidth + GUTTER, y: GUTTER + photoHeight + GUTTER, width: photoWidth, height: photoHeight, type: 'photo' });
      
      // Badge overlays center
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
    }
    else if (count === 5) {
      // 5 photos: 2 top landscape, 2 middle landscape, 1 bottom landscape, badge overlays
      const topHeight = Math.floor(contentHeight * 0.30);
      const midHeight = Math.floor(contentHeight * 0.30);
      const botHeight = contentHeight - topHeight - midHeight - (GUTTER * 2);
      const halfWidth = Math.floor((contentWidth - GUTTER) / 2);
      
      tiles.push({ x: GUTTER, y: GUTTER, width: halfWidth, height: topHeight, type: 'photo' });
      tiles.push({ x: GUTTER + halfWidth + GUTTER, y: GUTTER, width: halfWidth, height: topHeight, type: 'photo' });
      tiles.push({ x: GUTTER, y: GUTTER + topHeight + GUTTER, width: halfWidth, height: midHeight, type: 'photo' });
      tiles.push({ x: GUTTER + halfWidth + GUTTER, y: GUTTER + topHeight + GUTTER, width: halfWidth, height: midHeight, type: 'photo' });
      tiles.push({ x: GUTTER, y: GUTTER + topHeight + GUTTER + midHeight + GUTTER, width: contentWidth, height: botHeight, type: 'photo' });
      
      // Badge overlays center
      const badgeWidth = Math.floor(contentWidth * 0.70);
      const badgeHeight = Math.floor(contentHeight * 0.18);
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
    else if (count === 6) {
      // 6 photos: 3 rows of 2 landscape photos each, badge overlays center
      const photoHeight = Math.floor((contentHeight - (GUTTER * 2)) / 3);
      const photoWidth = Math.floor((contentWidth - GUTTER) / 2);
      
      // Row 1
      tiles.push({ x: GUTTER, y: GUTTER, width: photoWidth, height: photoHeight, type: 'photo' });
      tiles.push({ x: GUTTER + photoWidth + GUTTER, y: GUTTER, width: photoWidth, height: photoHeight, type: 'photo' });
      
      // Row 2
      tiles.push({ x: GUTTER, y: GUTTER + photoHeight + GUTTER, width: photoWidth, height: photoHeight, type: 'photo' });
      tiles.push({ x: GUTTER + photoWidth + GUTTER, y: GUTTER + photoHeight + GUTTER, width: photoWidth, height: photoHeight, type: 'photo' });
      
      // Row 3
      tiles.push({ x: GUTTER, y: GUTTER + (photoHeight + GUTTER) * 2, width: photoWidth, height: photoHeight, type: 'photo' });
      tiles.push({ x: GUTTER + photoWidth + GUTTER, y: GUTTER + (photoHeight + GUTTER) * 2, width: photoWidth, height: photoHeight, type: 'photo' });
      
      // Badge overlays center
      const badgeWidth = Math.floor(contentWidth * 0.70);
      const badgeHeight = Math.floor(contentHeight * 0.18);
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
    else if (count === 7) {
      // 7 photos: 1 large top, 3 rows of 2 below, badge overlays
      const topHeight = Math.floor(contentHeight * 0.28);
      const rowHeight = Math.floor((contentHeight - topHeight - (GUTTER * 3)) / 3);
      const halfWidth = Math.floor((contentWidth - GUTTER) / 2);
      
      tiles.push({ x: GUTTER, y: GUTTER, width: contentWidth, height: topHeight, type: 'photo' });
      
      // 3 rows of 2
      for (let i = 0; i < 3; i++) {
        const y = GUTTER + topHeight + GUTTER + (rowHeight + GUTTER) * i;
        tiles.push({ x: GUTTER, y, width: halfWidth, height: rowHeight, type: 'photo' });
        tiles.push({ x: GUTTER + halfWidth + GUTTER, y, width: halfWidth, height: rowHeight, type: 'photo' });
      }
      
      // Badge overlays center
      const badgeWidth = Math.floor(contentWidth * 0.70);
      const badgeHeight = Math.floor(contentHeight * 0.16);
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
    else if (count === 8) {
      // 8 photos: 4 rows of 2 landscape photos each, badge overlays
      const photoHeight = Math.floor((contentHeight - (GUTTER * 3)) / 4);
      const photoWidth = Math.floor((contentWidth - GUTTER) / 2);
      
      for (let i = 0; i < 4; i++) {
        const y = GUTTER + (photoHeight + GUTTER) * i;
        tiles.push({ x: GUTTER, y, width: photoWidth, height: photoHeight, type: 'photo' });
        tiles.push({ x: GUTTER + photoWidth + GUTTER, y, width: photoWidth, height: photoHeight, type: 'photo' });
      }
      
      // Badge overlays center
      const badgeWidth = Math.floor(contentWidth * 0.70);
      const badgeHeight = Math.floor(contentHeight * 0.15);
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
    else if (count === 9) {
      // 9 photos: 1 large top, 4 rows of 2 below, badge overlays
      const topHeight = Math.floor(contentHeight * 0.24);
      const rowHeight = Math.floor((contentHeight - topHeight - (GUTTER * 4)) / 4);
      const halfWidth = Math.floor((contentWidth - GUTTER) / 2);
      
      tiles.push({ x: GUTTER, y: GUTTER, width: contentWidth, height: topHeight, type: 'photo' });
      
      // 4 rows of 2
      for (let i = 0; i < 4; i++) {
        const y = GUTTER + topHeight + GUTTER + (rowHeight + GUTTER) * i;
        tiles.push({ x: GUTTER, y, width: halfWidth, height: rowHeight, type: 'photo' });
        tiles.push({ x: GUTTER + halfWidth + GUTTER, y, width: halfWidth, height: rowHeight, type: 'photo' });
      }
      
      // Badge overlays center
      const badgeWidth = Math.floor(contentWidth * 0.70);
      const badgeHeight = Math.floor(contentHeight * 0.15);
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
      // 10+ photos: 5 rows of 2 landscape photos each, badge overlays
      const photoHeight = Math.floor((contentHeight - (GUTTER * 4)) / 5);
      const photoWidth = Math.floor((contentWidth - GUTTER) / 2);
      
      for (let i = 0; i < 5; i++) {
        const y = GUTTER + (photoHeight + GUTTER) * i;
        tiles.push({ x: GUTTER, y, width: photoWidth, height: photoHeight, type: 'photo' });
        tiles.push({ x: GUTTER + photoWidth + GUTTER, y, width: photoWidth, height: photoHeight, type: 'photo' });
      }
      
      // Badge overlays center
      const badgeWidth = Math.floor(contentWidth * 0.70);
      const badgeHeight = Math.floor(contentHeight * 0.14);
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

    // Load stamp
    const stamp = new Image();
    const stampLoaded = new Promise<void>((resolve) => {
      stamp.onload = () => resolve();
      stamp.onerror = () => resolve();
      stamp.src = "/collagestamp.png";
    });
    await stampLoaded;

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
        
        // Draw stamp - fills entire tile
        if (stamp.complete) {
          const stampScale = 0.95;
          const stampMaxWidth = tile.width * stampScale;
          const stampMaxHeight = tile.height * stampScale;
          
          // Make stamp taller by stretching height
          const stampAspect = stamp.width / stamp.height;
          let stampWidth, stampHeight;
          
          // Calculate base dimensions
          stampHeight = stampMaxHeight;
          stampWidth = stampMaxHeight * stampAspect;
          
          // If too wide, constrain by width
          if (stampWidth > stampMaxWidth) {
            stampWidth = stampMaxWidth;
            stampHeight = stampMaxWidth / stampAspect;
          }
          
          // Elongate vertically by 30%
          stampHeight = stampHeight * 1.3;
          
          // Re-check if too tall after stretching
          if (stampHeight > stampMaxHeight) {
            stampHeight = stampMaxHeight;
          }
          
          const stampX = tile.x + (tile.width - stampWidth) / 2;
          const stampY = tile.y + (tile.height - stampHeight) / 2;
          
          // Draw stamp directly
          ctx.save();
          drawRoundedRect(ctx, tile.x, tile.y, tile.width, tile.height, CORNER_RADIUS);
          ctx.clip();
          ctx.drawImage(stamp, stampX, stampY, stampWidth, stampHeight);
          ctx.restore();
        }
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
            
            // Use "cover" style - fill tile completely but minimize cropping
            if (imgAspect > tileAspect) {
              // Image is wider than tile - fit to height, center horizontally
              drawHeight = tile.height;
              drawWidth = tile.height * imgAspect;
              offsetX = (tile.width - drawWidth) / 2; // Center the crop
              offsetY = 0;
            } else {
              // Image is taller than tile - fit to width, center vertically  
              drawWidth = tile.width;
              drawHeight = tile.width / imgAspect;
              offsetX = 0;
              offsetY = (tile.height - drawHeight) / 2; // Center the crop
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
      
      // No background - transparent overlay with big stamp
      if (stamp.complete) {
        const stampScale = 0.98;
        const stampMaxWidth = tile.width * stampScale;
        const stampMaxHeight = tile.height * stampScale;
        
        // Make stamp taller by stretching height
        const stampAspect = stamp.width / stamp.height;
        let stampWidth, stampHeight;
        
        // Calculate base dimensions
        stampHeight = stampMaxHeight;
        stampWidth = stampMaxHeight * stampAspect;
        
        // If too wide, constrain by width
        if (stampWidth > stampMaxWidth) {
          stampWidth = stampMaxWidth;
          stampHeight = stampMaxWidth / stampAspect;
        }
        
        // Elongate vertically by 30%
        stampHeight = stampHeight * 1.3;
        
        // Re-check if too tall after stretching
        if (stampHeight > stampMaxHeight) {
          stampHeight = stampMaxHeight;
        }
        
        const stampX = tile.x + (tile.width - stampWidth) / 2;
        const stampY = tile.y + (tile.height - stampHeight) / 2;
        
        // Draw stamp directly - overlays photos
        ctx.drawImage(stamp, stampX, stampY, stampWidth, stampHeight);
      }
    }

    const url = canvas.toDataURL("image/jpeg", 0.9);
    setCollageUrl(url);
    setIsGenerating(false);
  };

  const downloadCollage = () => {
    if (!collageUrl) return;
    
    const link = document.createElement("a");
    link.download = `riddlecity-collage.png`;
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

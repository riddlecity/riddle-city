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
const BRAND_COLOR = "#dc2626"; // Riddle City red

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

  // Helper to analyze photo brightness (for badge color selection)
  const analyzePhotoBrightness = async (photoDataUrls: string[]): Promise<number> => {
    let totalBrightness = 0;
    let count = 0;
    
    for (const dataUrl of photoDataUrls.slice(0, 3)) { // Sample first 3 photos
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
    
    return count > 0 ? totalBrightness / count : 128; // Return average or middle gray
  };

  // Instagram-optimized asymmetric layouts
  interface Tile {
    x: number;
    y: number;
    width: number;
    height: number;
    isLogo?: boolean;
  }

  const getInstagramLayout = (count: number): Tile[] => {
    const tiles: Tile[] = [];
    const contentWidth = CANVAS_WIDTH - (GUTTER * 2);
    const contentHeight = CANVAS_HEIGHT - (GUTTER * 3) - 80; // Reserve 80px for footer
    
    // Badge can be up to 15% larger than standard tiles
    const badgeSizeMultiplier = 1.10;
    
    // Helper to split area into columns
    const splitCols = (x: number, y: number, _width: number, height: number, widths: number[]): Tile[] => {
      const result: Tile[] = [];
      let currentX = x;
      widths.forEach((w) => {
        result.push({ x: currentX, y, width: w, height });
        currentX += w + GUTTER;
      });
      return result;
    };

    switch (count) {
      case 1: {
        // Single large photo (70%) + completion badge at bottom (final tile)
        const photoHeight = Math.floor(contentHeight * 0.70);
        const badgeHeight = Math.floor((contentHeight - photoHeight - GUTTER) * badgeSizeMultiplier);
        tiles.push({ x: GUTTER, y: GUTTER, width: contentWidth, height: photoHeight });
        tiles.push({ 
          x: GUTTER, 
          y: GUTTER + photoHeight + GUTTER, 
          width: contentWidth, 
          height: badgeHeight, 
          isLogo: true 
        });
        break;
      }
      
      case 2: {
        // Row 1: 1 photo
        // Row 2: 1 photo 
        // Row 3: Completion badge (final tile)
        const row1Height = Math.floor(contentHeight * 0.40);
        const row2Height = Math.floor(contentHeight * 0.35);
        const row3Height = Math.floor((contentHeight - row1Height - row2Height - (GUTTER * 2)) * badgeSizeMultiplier);
        
        tiles.push({ x: GUTTER, y: GUTTER, width: contentWidth, height: row1Height });
        tiles.push({ x: GUTTER, y: GUTTER + row1Height + GUTTER, width: contentWidth, height: row2Height });
        tiles.push({ 
          x: GUTTER, 
          y: GUTTER + row1Height + GUTTER + row2Height + GUTTER, 
          width: contentWidth, 
          height: row3Height, 
          isLogo: true 
        });
        break;
      }
      
      case 3: {
        // Row 1: 2 photos (58/42 split)
        // Row 2: 2 photos, but last one is completion badge (final tile)
        const row1Height = Math.floor(contentHeight * 0.50);
        const row2Height = contentHeight - row1Height - GUTTER;
        const col1Width = Math.floor(contentWidth * 0.58);
        const col2Width = contentWidth - col1Width - GUTTER;
        
        // Top row: 2 photos
        tiles.push(...splitCols(GUTTER, GUTTER, contentWidth, row1Height, [col1Width, col2Width]));
        
        // Bottom row: photo + completion badge (final tile)
        tiles.push({ x: GUTTER, y: GUTTER + row1Height + GUTTER, width: col1Width, height: row2Height });
        tiles.push({ 
          x: GUTTER + col1Width + GUTTER, 
          y: GUTTER + row1Height + GUTTER, 
          width: Math.floor(col2Width * badgeSizeMultiplier), 
          height: Math.floor(row2Height * badgeSizeMultiplier), 
          isLogo: true 
        });
        break;
      }
      
      case 4: {
        // Row 1: 2 photos (45/55)
        // Row 2: 2 photos (55/45)
        // Row 3: Completion badge (full width, final tile)
        const row1Height = Math.floor(contentHeight * 0.38);
        const row2Height = Math.floor(contentHeight * 0.38);
        const row3Height = Math.floor((contentHeight - row1Height - row2Height - (GUTTER * 2)) * badgeSizeMultiplier);
        const col1Width = Math.floor(contentWidth * 0.45);
        const col2Width = contentWidth - col1Width - GUTTER;
        
        // Top row: 45% left, 55% right
        tiles.push(...splitCols(GUTTER, GUTTER, contentWidth, row1Height, [col1Width, col2Width]));
        
        // Middle row: 55% left, 45% right
        tiles.push(...splitCols(GUTTER, GUTTER + row1Height + GUTTER, contentWidth, row2Height, [col2Width, col1Width]));
        
        // Completion badge at bottom (final tile)
        tiles.push({ 
          x: GUTTER, 
          y: GUTTER + row1Height + GUTTER + row2Height + GUTTER, 
          width: contentWidth, 
          height: row3Height, 
          isLogo: true 
        });
        break;
      }
      
      case 5: {
        // Row 1: 2 photos (40/60 split)
        // Row 2: 2 photos (60/40 split)
        // Row 3: Completion badge (full width, final tile)
        const row1Height = Math.floor(contentHeight * 0.40);
        const row2Height = Math.floor(contentHeight * 0.28);
        const row3Height = Math.floor((contentHeight - row1Height - row2Height - (GUTTER * 2)) * badgeSizeMultiplier);
        
        const col1Width = Math.floor(contentWidth * 0.40);
        const col2Width = contentWidth - col1Width - GUTTER;
        const col3Width = Math.floor(contentWidth * 0.60);
        const col4Width = contentWidth - col3Width - GUTTER;
        
        tiles.push(...splitCols(GUTTER, GUTTER, contentWidth, row1Height, [col1Width, col2Width]));
        tiles.push(...splitCols(GUTTER, GUTTER + row1Height + GUTTER, contentWidth, row2Height, [col3Width, col4Width]));
        tiles.push({ 
          x: GUTTER, 
          y: GUTTER + row1Height + GUTTER + row2Height + GUTTER, 
          width: contentWidth, 
          height: row3Height, 
          isLogo: true 
        });
        break;
      }
      
      case 6: {
        // Row 1: 2 photos (58/42)
        // Row 2: 2 photos (42/58)
        // Row 3: 2 photos (58/42)
        // Row 4: Completion badge (full width, final tile)
        const rowHeight = Math.floor(contentHeight * 0.24);
        const row4Height = Math.floor((contentHeight - (rowHeight * 3) - (GUTTER * 3)) * badgeSizeMultiplier);
        const col1Width = Math.floor(contentWidth * 0.58);
        const col2Width = contentWidth - col1Width - GUTTER;
        
        // Rows 1-3: alternating asymmetry
        tiles.push(...splitCols(GUTTER, GUTTER, contentWidth, rowHeight, [col1Width, col2Width]));
        tiles.push(...splitCols(GUTTER, GUTTER + rowHeight + GUTTER, contentWidth, rowHeight, [col2Width, col1Width]));
        tiles.push(...splitCols(GUTTER, GUTTER + (rowHeight + GUTTER) * 2, contentWidth, rowHeight, [col1Width, col2Width]));
        
        // Completion badge at bottom (final tile)
        tiles.push({ 
          x: GUTTER, 
          y: GUTTER + (rowHeight + GUTTER) * 3, 
          width: contentWidth, 
          height: row4Height, 
          isLogo: true 
        });
        break;
      }
      
      case 7: {
        // Row 1: 2 photos (55/45)
        // Row 2: 2 photos (45/55)
        // Row 3: 2 photos (60/40)
        // Row 4: Completion badge (full width, final tile)
        const rowHeights = [
          Math.floor(contentHeight * 0.28),
          Math.floor(contentHeight * 0.28),
          Math.floor(contentHeight * 0.24)
        ];
        const row4Height = Math.floor((contentHeight - rowHeights[0] - rowHeights[1] - rowHeights[2] - (GUTTER * 3)) * badgeSizeMultiplier);
        
        const col1Width = Math.floor(contentWidth * 0.55);
        const col2Width = contentWidth - col1Width - GUTTER;
        
        // Rows 1-3: alternating asymmetry
        tiles.push(...splitCols(GUTTER, GUTTER, contentWidth, rowHeights[0], [col1Width, col2Width]));
        tiles.push(...splitCols(GUTTER, GUTTER + rowHeights[0] + GUTTER, contentWidth, rowHeights[1], [col2Width, col1Width]));
        tiles.push(...splitCols(GUTTER, GUTTER + rowHeights[0] + GUTTER + rowHeights[1] + GUTTER, contentWidth, rowHeights[2], [col1Width, col2Width]));
        
        // Completion badge at bottom (final tile)
        tiles.push({ 
          x: GUTTER, 
          y: GUTTER + rowHeights[0] + GUTTER + rowHeights[1] + GUTTER + rowHeights[2] + GUTTER, 
          width: contentWidth, 
          height: row4Height, 
          isLogo: true 
        });
        break;
      }
      
      case 8: {
        // 4 rows of 2 photos with alternating asymmetry
        // Row 5: Completion badge (full width, final tile)
        const rowHeight = Math.floor(contentHeight * 0.21);
        const row5Height = Math.floor((contentHeight - (rowHeight * 4) - (GUTTER * 4)) * badgeSizeMultiplier);
        const col1Width = Math.floor(contentWidth * 0.55);
        const col2Width = contentWidth - col1Width - GUTTER;
        
        // Rows 1-4: alternating asymmetry
        for (let row = 0; row < 4; row++) {
          const y = GUTTER + (row * (rowHeight + GUTTER));
          if (row % 2 === 0) {
            tiles.push(...splitCols(GUTTER, y, contentWidth, rowHeight, [col1Width, col2Width]));
          } else {
            tiles.push(...splitCols(GUTTER, y, contentWidth, rowHeight, [col2Width, col1Width]));
          }
        }
        
        // Completion badge at bottom (final tile)
        tiles.push({ 
          x: GUTTER, 
          y: GUTTER + (rowHeight + GUTTER) * 4, 
          width: contentWidth, 
          height: row5Height, 
          isLogo: true 
        });
        break;
      }
      
      case 9: {
        // 3×3 grid with middle column wider (30/40/30) + completion badge replaces bottom-right (final tile)
        const rowHeight = Math.floor((contentHeight - (GUTTER * 2)) / 3);
        const colWidths = [
          Math.floor(contentWidth * 0.30),
          Math.floor(contentWidth * 0.40)
        ];
        colWidths.push(contentWidth - colWidths[0] - colWidths[1] - (GUTTER * 2));
        
        for (let row = 0; row < 3; row++) {
          const y = GUTTER + (row * (rowHeight + GUTTER));
          const rowTiles = splitCols(GUTTER, y, contentWidth, rowHeight, colWidths);
          
          // Replace last tile of last row with completion badge (final tile in reading order)
          if (row === 2) {
            const lastTile = rowTiles[rowTiles.length - 1];
            lastTile.isLogo = true;
            lastTile.width = Math.floor(lastTile.width * badgeSizeMultiplier);
            lastTile.height = Math.floor(lastTile.height * badgeSizeMultiplier);
          }
          
          tiles.push(...rowTiles);
        }
        break;
      }
      
      case 10:
      default: {
        // 5 rows of 2 photos with alternating asymmetry
        // Row 6: Completion badge (full width, final tile)
        const rowHeight = Math.floor(contentHeight * 0.18);
        const row6Height = Math.floor((contentHeight - (rowHeight * 5) - (GUTTER * 5)) * badgeSizeMultiplier);
        const col1Width = Math.floor(contentWidth * 0.58);
        const col2Width = contentWidth - col1Width - GUTTER;
        
        // Rows 1-5: alternating asymmetry
        for (let row = 0; row < 5; row++) {
          const y = GUTTER + (row * (rowHeight + GUTTER));
          if (row % 2 === 0) {
            tiles.push(...splitCols(GUTTER, y, contentWidth, rowHeight, [col1Width, col2Width]));
          } else {
            tiles.push(...splitCols(GUTTER, y, contentWidth, rowHeight, [col2Width, col1Width]));
          }
        }
        
        // Completion badge at bottom (final tile)
        tiles.push({ 
          x: GUTTER, 
          y: GUTTER + (rowHeight + GUTTER) * 5, 
          width: contentWidth, 
          height: row6Height, 
          isLogo: true 
        });
        break;
      }
    }
    
    return tiles;
  };

  const generateCollage = async () => {
    if (photoCount === 0 || !canvasRef.current) return;
    
    setIsGenerating(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size (Instagram 4:5)
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

    // Get layout
    const layout = getInstagramLayout(photoCount);
    
    // Randomize photo order
    const photoEntries = Object.entries(photos).sort(() => Math.random() - 0.5);
    
    // Analyze photo brightness to determine badge color
    const avgBrightness = await analyzePhotoBrightness(photoEntries.map(([, url]) => url));
    const badgeColors = avgBrightness > 128 ? DARK_BADGE : LIGHT_BADGE; // If photos are bright, use dark badge
    
    // Draw tiles
    let photoIndex = 0;
    const imagePromises: Promise<void>[] = [];

    for (const tile of layout) {
      if (tile.isLogo) {
        // Draw completion badge (end stamp)
        ctx.fillStyle = badgeColors.bg;
        ctx.save();
        drawRoundedRect(ctx, tile.x, tile.y, tile.width, tile.height, CORNER_RADIUS);
        ctx.fill();
        ctx.restore();
        
        // Draw logo centered (60-65% of tile width, single color, no effects)
        if (logo.complete) {
          const logoScale = 0.62; // 62% of tile width
          const logoMaxWidth = tile.width * logoScale;
          const logoMaxHeight = tile.height * logoScale * 0.65; // Leave room for text
          
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
          const logoY = tile.y + (tile.height - logoHeight) / 2 - 25; // Shift up for text
          
          // Create temporary canvas to colorize logo
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = logoWidth;
          tempCanvas.height = logoHeight;
          const tempCtx = tempCanvas.getContext('2d');
          
          if (tempCtx) {
            tempCtx.drawImage(logo, 0, 0, logoWidth, logoHeight);
            tempCtx.globalCompositeOperation = 'source-in';
            tempCtx.fillStyle = badgeColors.logo;
            tempCtx.fillRect(0, 0, logoWidth, logoHeight);
            
            ctx.save();
            drawRoundedRect(ctx, tile.x, tile.y, tile.width, tile.height, CORNER_RADIUS);
            ctx.clip();
            ctx.drawImage(tempCanvas, logoX, logoY);
            ctx.restore();
          }
        }
        
        // Draw completion text (single word in caps, sans-serif, strong contrast)
        const fontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
        ctx.fillStyle = badgeColors.text;
        ctx.textAlign = "center";
        
        // Primary word: COMPLETED (all caps, bold)
        const primarySize = Math.max(18, Math.floor(tile.height * 0.09));
        ctx.font = `bold ${primarySize}px ${fontStack}`;
        ctx.letterSpacing = "0.05em";
        ctx.fillText("COMPLETED", tile.x + tile.width / 2, tile.y + tile.height - 42);
        
        // Secondary line: completion time (small, optional)
        const secondarySize = Math.max(13, Math.floor(tile.height * 0.065));
        ctx.font = `${secondarySize}px ${fontStack}`;
        ctx.letterSpacing = "0"
        ctx.textAlign = "center";
        ctx.font = `bold ${Math.max(16, Math.floor(tile.height * 0.08))}px ${fontStack}`;
        ctx.fillText("COMPLETED", tile.x + tile.width / 2, tile.y + tile.height - 40);
        ctx.font = `${Math.max(12, Math.floor(tile.height * 0.06))}px ${fontStack}`;
        ctx.fillText(completionTime, tile.x + tile.width / 2, tile.y + tile.height - 20);
      } else {
        // Draw photo
        if (photoIndex < photoEntries.length) {
          const [, dataUrl] = photoEntries[photoIndex++];
          
          imagePromises.push(new Promise<void>((resolve, reject) => {
            const img = new Image();
            
            const timeout = setTimeout(() => {
              reject(new Error(`Image failed to load`));
            }, 5000);
            
            img.onload = () => {
              clearTimeout(timeout);
              
              // Calculate dimensions to fill tile (cover behavior)
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
              
              // Clip to rounded rect and draw
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
    }

    try {
      await Promise.all(imagePromises);
    } catch (error) {
      console.error("Error loading images:", error);
      setIsGenerating(false);
      alert("Some photos couldn't be loaded. Please try capturing them again.");
      return;
    }

    // Draw footer at bottom
    const footerY = CANVAS_HEIGHT - 80;
    const fontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
    
    // Get adventure color
    let adventureColor = "#ec4899";
    if (adventureName.toLowerCase().includes("pub")) {
      adventureColor = "#f59e0b";
    } else if (adventureName.toLowerCase().includes("mystery")) {
      adventureColor = "#8b5cf6";
    }
    
    // Adventure name
    ctx.fillStyle = adventureColor;
    ctx.font = `bold 20px ${fontStack}`;
    ctx.textAlign = "center";
    ctx.fillText(adventureName, CANVAS_WIDTH / 2, footerY + 20);
    
    // Team name
    ctx.fillStyle = "#1f2937";
    ctx.font = `bold 16px ${fontStack}`;
    ctx.fillText(teamName, CANVAS_WIDTH / 2, footerY + 44);
    
    // Website URL
    ctx.fillStyle = BRAND_COLOR;
    ctx.font = `bold 18px ${fontStack}`;
    ctx.fillText("RIDDLECITY.CO.UK", CANVAS_WIDTH / 2, footerY + 70);

    // Convert to downloadable URL
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

      {/* Hidden canvas for generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

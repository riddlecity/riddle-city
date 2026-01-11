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

  const generateCollage = async () => {
    if (photoCount === 0 || !canvasRef.current) return;
    
    setIsGenerating(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Randomize photo order for variety
    const photoEntries = Object.entries(photos).sort(() => Math.random() - 0.5);

    // Define layouts based on photo count
    interface LayoutConfig {
      cols: number;
      rows: number;
      hasFooter: boolean;
      infoBoxPosition?: number; // Which cell position for info (if no footer)
    }

    const getLayoutConfig = (count: number): LayoutConfig => {
      switch (count) {
        case 1: return { cols: 1, rows: 1, hasFooter: true };
        case 2: return { cols: 1, rows: 2, hasFooter: true };
        case 3: return { cols: 1, rows: 3, hasFooter: true };
        case 4: return { cols: 2, rows: 2, hasFooter: true };
        case 5: return { cols: 2, rows: 3, hasFooter: false, infoBoxPosition: 5 }; // Last position
        case 6: return { cols: 2, rows: 3, hasFooter: true };
        case 7: return { cols: 2, rows: 4, hasFooter: false, infoBoxPosition: 7 }; // Last position
        case 8: return { cols: 2, rows: 4, hasFooter: true };
        case 9: return { cols: 3, rows: 3, hasFooter: true };
        case 10: return { cols: 3, rows: 4, hasFooter: false, infoBoxPosition: 11 }; // Position 11-12 (takes 2 boxes)
        default: return { cols: 3, rows: 4, hasFooter: true };
      }
    };

    const config = getLayoutConfig(photoCount);
    const cellSize = 400;
    const borderSize = 8; // White border between photos
    const footerHeight = config.hasFooter ? 150 : 0;

    canvas.width = config.cols * cellSize + (config.cols + 1) * borderSize;
    canvas.height = config.rows * cellSize + (config.rows + 1) * borderSize + footerHeight;

    // Background - White
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load logo first
    const logo = new Image();
    const logoLoaded = new Promise<void>((resolve) => {
      logo.onload = () => resolve();
      logo.onerror = () => resolve();
      logo.src = "/riddle-city-logo.png";
    });
    await logoLoaded;

    // Draw photos and info box
    let photoIndex = 0;
    const totalCells = config.cols * config.rows;
    const imagePromises: Promise<void>[] = [];

    for (let i = 0; i < totalCells; i++) {
      const col = i % config.cols;
      const row = Math.floor(i / config.cols);
      const x = col * cellSize + (col + 1) * borderSize;
      const y = row * cellSize + (row + 1) * borderSize;

      // Check if this is the info box position
      const isInfoBox = !config.hasFooter && config.infoBoxPosition && i === config.infoBoxPosition - 1;
      const isDoubleWideInfo = photoCount === 10 && i === 10; // For 10 photos, info takes 2 boxes

      if (isInfoBox) {
        // Draw info box with website style
        const infoWidth = isDoubleWideInfo ? cellSize * 2 + borderSize : cellSize;
        
        // Black background for contrast
        ctx.fillStyle = "#000000";
        ctx.fillRect(x, y, infoWidth, cellSize);
        
        // Logo at top - MUCH BIGGER
        if (logo.complete) {
          const logoSize = 140;
          ctx.drawImage(logo, x + (infoWidth - logoSize) / 2, y + 20, logoSize, logoSize);
        }
        
        // "Your Mystery Awaits" text - styled like website
        ctx.fillStyle = "white";
        ctx.font = "bold 26px Arial";
        ctx.textAlign = "center";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 4;
        ctx.strokeText("Your Mystery Awaits", x + infoWidth / 2, y + 180);
        ctx.fillText("Your Mystery Awaits", x + infoWidth / 2, y + 180);
        
        // Get emoji for adventure type
        let adventureEmoji = "🎉";
        if (adventureName.toLowerCase().includes("date")) adventureEmoji = "💕";
        else if (adventureName.toLowerCase().includes("pub")) adventureEmoji = "🍺";
        else if (adventureName.toLowerCase().includes("mystery")) adventureEmoji = "🔍";
        
        // Colored adventure name box
        const boxY = y + 200;
        const boxHeight = 50;
        const boxPadding = 15;
        const gradient = ctx.createLinearGradient(x + boxPadding, boxY, x + infoWidth - boxPadding, boxY);
        gradient.addColorStop(0, "#db2777");
        gradient.addColorStop(1, "#be185d");
        ctx.fillStyle = gradient;
        ctx.fillRect(x + boxPadding, boxY, infoWidth - (boxPadding * 2), boxHeight);
        
        // Adventure name with emoji in white on colored box
        ctx.fillStyle = "white";
        ctx.font = "bold 20px Arial";
        ctx.fillText(`${adventureEmoji} ${adventureName}`, x + infoWidth / 2, boxY + 32);
        
        // Congratulations message
        ctx.fillStyle = "white";
        ctx.font = "bold 18px Arial";
        ctx.fillText("COMPLETED!", x + infoWidth / 2, y + 280);
        
        // Team name below
        ctx.font = "16px Arial";
        ctx.fillStyle = "#cccccc";
        ctx.fillText(teamName, x + infoWidth / 2, y + 305);
        
        // Time
        ctx.font = "bold 16px Arial";
        ctx.fillStyle = "white";
        ctx.fillText(`⏱️ ${completionTime}`, x + infoWidth / 2, y + 330);
        
        // Hashtag
        ctx.font = "14px Arial";
        ctx.fillStyle = "#db2777";
        ctx.fillText("#RiddleCity", x + infoWidth / 2, y + 355);
        
        if (isDoubleWideInfo) {
          i++; // Skip next cell
        }
        continue;
      }

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
            
            // Calculate dimensions to fill cell (cover behavior)
            const imgAspect = img.width / img.height;
            const cellAspect = 1; // Square cells
            
            let drawWidth, drawHeight, offsetX, offsetY;
            
            if (imgAspect > cellAspect) {
              drawHeight = cellSize;
              drawWidth = cellSize * imgAspect;
              offsetX = (cellSize - drawWidth) / 2;
              offsetY = 0;
            } else {
              drawWidth = cellSize;
              drawHeight = cellSize / imgAspect;
              offsetX = 0;
              offsetY = (cellSize - drawHeight) / 2;
            }
            
            // Clip and draw
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, cellSize, cellSize);
            ctx.clip();
            ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);
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

    // Draw footer if needed
    if (config.hasFooter) {
      const footerY = config.rows * cellSize + (config.rows + 1) * borderSize;
      
      // Black background for contrast
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, footerY, canvas.width, footerHeight);
      
      // Logo - bigger
      if (logo.complete) {
        const logoSize = 80;
        ctx.drawImage(logo, (canvas.width - logoSize) / 2, footerY + 8, logoSize, logoSize);
      }
      
      // Get emoji for adventure type
      let adventureEmoji = "🎉";
      if (adventureName.toLowerCase().includes("date")) adventureEmoji = "💕";
      else if (adventureName.toLowerCase().includes("pub")) adventureEmoji = "🍺";
      else if (adventureName.toLowerCase().includes("mystery")) adventureEmoji = "🔍";
      
      // Colored adventure name box
      const boxY = footerY + 95;
      const boxHeight = 38;
      const boxWidth = canvas.width * 0.75;
      const boxX = (canvas.width - boxWidth) / 2;
      const gradient = ctx.createLinearGradient(boxX, boxY, boxX + boxWidth, boxY);
      gradient.addColorStop(0, "#db2777");
      gradient.addColorStop(1, "#be185d");
      ctx.fillStyle = gradient;
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      
      // Adventure name with emoji in white on colored box
      ctx.fillStyle = "white";
      ctx.font = "bold 17px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`${adventureEmoji} ${adventureName}`, canvas.width / 2, boxY + 24);
      
      // Team name and time below
      ctx.fillStyle = "white";
      ctx.font = "bold 13px Arial";
      ctx.fillText(`${teamName} • ⏱️ ${completionTime}`, canvas.width / 2, footerY + 145);
    }

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
          
          <div className="flex gap-3">
            <button
              onClick={downloadCollage}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg"
            >
              <Download className="w-5 h-5" />
              Download
            </button>
            
            <button
              onClick={() => {
                downloadCollage();
                alert("📱 Collage downloaded! Share it on Instagram and tag us @RiddleCity with #RiddleCity");
              }}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg"
            >
              <Instagram className="w-5 h-5" />
              Share to Instagram
            </button>
          </div>

          <p className="text-sm text-center text-gray-400">
            💜 Tag <strong>@RiddleCity</strong> and use <strong>#RiddleCity</strong> when you post!
          </p>
        </div>
      )}

      {/* Hidden canvas for generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

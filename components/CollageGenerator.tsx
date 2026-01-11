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

    // Define custom layouts for different photo counts
    const getLayout = (count: number): number[] => {
      switch (count) {
        case 1: return [1]; // 1 centered
        case 2: return [2]; // 2 side by side
        case 3: return [1, 2]; // Triangle: 1 on top, 2 on bottom
        case 4: return [2, 2]; // Square
        case 5: return [2, 1, 2]; // Diamond: 2-1-2
        case 6: return [2, 2, 2]; // 2x3 grid
        case 7: return [2, 3, 2]; // Cross: 2-3-2
        case 8: return [2, 3, 3]; // 2-3-3
        default: {
          // For 9+ photos, use standard 3-column grid
          const rows = Math.ceil(count / 3);
          const layout: number[] = [];
          for (let i = 0; i < rows; i++) {
            const remaining = count - i * 3;
            layout.push(Math.min(3, remaining));
          }
          return layout;
        }
      }
    };

    const layout = getLayout(photoCount);
    const rows = layout.length;
    const maxCols = Math.max(...layout);
    
    const cellWidth = 450;
    const cellHeight = 450;
    const padding = 15;
    const headerHeight = 200;
    const footerHeight = 100;

    canvas.width = maxCols * cellWidth + (maxCols + 1) * padding;
    canvas.height = rows * cellHeight + (rows + 1) * padding + headerHeight + footerHeight;

    // Background - Dark neutral
    ctx.fillStyle = "#171717";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load logo
    const logo = new Image();
    const logoLoaded = new Promise<void>((resolve) => {
      logo.onload = () => resolve();
      logo.onerror = () => resolve(); // Continue even if logo fails
      logo.src = "/riddle-city-logo.png";
    });
    await logoLoaded;

    // Header with gradient - Dark to darker
    const gradient = ctx.createLinearGradient(0, 0, 0, headerHeight);
    gradient.addColorStop(0, "#262626");
    gradient.addColorStop(1, "#171717");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, headerHeight);
    
    // Draw logo in header
    if (logo.complete) {
      const logoSize = 120;
      ctx.drawImage(logo, (canvas.width - logoSize) / 2, 20, logoSize, logoSize);
    }
    
    // Adventure name
    ctx.fillStyle = "white";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText(adventureName, canvas.width / 2, 165);
    
    // Team name with red accent
    ctx.font = "32px Arial";
    ctx.fillStyle = "#dc2626";
    ctx.fillText(teamName, canvas.width / 2, 195);

    // Load and draw photos with proper aspect ratio
    let photoIndex = 0;
    const imagePromises = layout.flatMap((colsInRow, rowIndex) => {
      return Array.from({ length: colsInRow }, (_, colIndex) => {
        const currentPhotoIndex = photoIndex++;
        if (currentPhotoIndex >= photoEntries.length) return Promise.resolve();
        
        const [, dataUrl] = photoEntries[currentPhotoIndex];
        
        return new Promise<void>((resolve, reject) => {
          const img = new Image();
          
          const timeout = setTimeout(() => {
            reject(new Error(`Image ${currentPhotoIndex + 1} failed to load`));
          }, 5000);
          
          img.onload = () => {
            clearTimeout(timeout);
            
            // Calculate position with centering for the row
            const totalRowWidth = colsInRow * cellWidth + (colsInRow - 1) * padding;
            const canvasContentWidth = maxCols * cellWidth + (maxCols - 1) * padding;
            const rowOffsetX = (canvasContentWidth - totalRowWidth) / 2;
            
            const x = colIndex * cellWidth + (colIndex + 1) * padding + rowOffsetX;
            const y = rowIndex * cellHeight + (rowIndex + 1) * padding + headerHeight;

            // Draw red border
            ctx.fillStyle = "#dc2626";
            ctx.fillRect(x - 8, y - 8, cellWidth + 16, cellHeight + 16);
            
            // Draw dark background
            ctx.fillStyle = "#171717";
            ctx.fillRect(x, y, cellWidth, cellHeight);
            
            // Calculate dimensions to fit image while maintaining aspect ratio
            const imgAspect = img.width / img.height;
            const cellAspect = cellWidth / cellHeight;
            
            let drawWidth, drawHeight, imgOffsetX, imgOffsetY;
            
            if (imgAspect > cellAspect) {
              // Image is wider - fit to width
              drawWidth = cellWidth;
              drawHeight = cellWidth / imgAspect;
              imgOffsetX = 0;
              imgOffsetY = (cellHeight - drawHeight) / 2;
            } else {
              // Image is taller - fit to height
              drawHeight = cellHeight;
              drawWidth = cellHeight * imgAspect;
              imgOffsetX = (cellWidth - drawWidth) / 2;
              imgOffsetY = 0;
            }
            
            ctx.drawImage(img, x + imgOffsetX, y + imgOffsetY, drawWidth, drawHeight);
            
            resolve();
          };
          
          img.onerror = () => {
            clearTimeout(timeout);
            reject(new Error(`Image ${currentPhotoIndex + 1} failed to load`));
          };
          
          img.src = dataUrl;
        });
      });
    });

    try {
      await Promise.all(imagePromises);
    } catch (error) {
      console.error("Error loading images:", error);
      setIsGenerating(false);
      alert("Some photos couldn't be loaded. Please try capturing them again.");
      return;
    }

    // Footer - Dark gradient
    const footerGradient = ctx.createLinearGradient(0, canvas.height - footerHeight, 0, canvas.height);
    footerGradient.addColorStop(0, "#171717");
    footerGradient.addColorStop(1, "#262626");
    ctx.fillStyle = footerGradient;
    ctx.fillRect(0, canvas.height - footerHeight, canvas.width, footerHeight);
    
    ctx.fillStyle = "white";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`⏱️ Completed in ${completionTime}`, canvas.width / 2, canvas.height - 55);
    ctx.font = "24px Arial";
    ctx.fillStyle = "#dc2626";
    ctx.fillText("#RiddleCity", canvas.width / 2, canvas.height - 20);

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
        <ImageIcon className="w-6 h-6 text-red-600" />
        <h2 className="text-xl font-bold text-white">Your Team Collage</h2>
      </div>

      <p className="text-gray-300 mb-4">
        📸 You captured <strong>{photoCount}</strong> photo{photoCount !== 1 ? "s" : ""} during your adventure!
      </p>

      {!collageUrl ? (
        <button
          onClick={generateCollage}
          disabled={isGenerating}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {isGenerating ? "⏳ Creating Your Collage..." : "🎨 Generate Collage"}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="bg-neutral-800 p-4 rounded-lg border-2 border-red-600">
            <img src={collageUrl} alt="Team collage" className="w-full h-auto rounded" />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={downloadCollage}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-5 h-5" />
              Download
            </button>
            
            <button
              onClick={() => {
                downloadCollage();
                alert("📱 Collage downloaded! Share it on Instagram and tag us @RiddleCity with #RiddleCity");
              }}
              className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Instagram className="w-5 h-5" />
              Share to Instagram
            </button>
          </div>

          <p className="text-sm text-center text-gray-400">
            ❤️ Tag <strong>@RiddleCity</strong> and use <strong>#RiddleCity</strong> when you post!
          </p>
        </div>
      )}

      {/* Hidden canvas for generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

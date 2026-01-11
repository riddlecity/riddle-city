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

    // Calculate grid layout - dynamic to avoid gaps
    const cols = 3;
    const rows = Math.ceil(photoCount / cols);
    const lastRowCount = photoCount % cols || cols; // How many photos in last row
    const cellWidth = 450;
    const cellHeight = 450;
    const padding = 15;
    const headerHeight = 200;
    const footerHeight = 100;

    canvas.width = cols * cellWidth + (cols + 1) * padding;
    canvas.height = rows * cellHeight + (rows + 1) * padding + headerHeight + footerHeight;

    // Background - Dark purple/black
    ctx.fillStyle = "#1a0b2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load logo
    const logo = new Image();
    const logoLoaded = new Promise<void>((resolve) => {
      logo.onload = () => resolve();
      logo.onerror = () => resolve(); // Continue even if logo fails
      logo.src = "/riddle-city-logo.png";
    });
    await logoLoaded;

    // Header with gradient - Purple to dark
    const gradient = ctx.createLinearGradient(0, 0, 0, headerHeight);
    gradient.addColorStop(0, "#7c3aed"); // Purple
    gradient.addColorStop(0.5, "#5b21b6"); // Darker purple
    gradient.addColorStop(1, "#1a0b2e"); // Very dark purple
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
    
    // Team name with pink accent
    ctx.font = "32px Arial";
    ctx.fillStyle = "#f472b6"; // Pink
    ctx.fillText(teamName, canvas.width / 2, 195);

    // Load and draw photos with proper aspect ratio
    const imagePromises = photoEntries.map(([, dataUrl], index) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        
        const timeout = setTimeout(() => {
          reject(new Error(`Image ${index + 1} failed to load`));
        }, 5000);
        
        img.onload = () => {
          clearTimeout(timeout);
          const row = Math.floor(index / cols);
          const isLastRow = row === rows - 1;
          
          // Center the last row if it's incomplete
          let col = index % cols;
          let offsetX = 0;
          if (isLastRow && lastRowCount < cols) {
            const totalLastRowWidth = lastRowCount * cellWidth + (lastRowCount - 1) * padding;
            const canvasContentWidth = cols * cellWidth + (cols - 1) * padding;
            offsetX = (canvasContentWidth - totalLastRowWidth) / 2;
          }
          
          const x = col * cellWidth + (col + 1) * padding + offsetX;
          const y = row * cellHeight + (row + 1) * padding + headerHeight;

          // Draw purple/pink gradient border
          const borderGradient = ctx.createLinearGradient(x - 8, y - 8, x + cellWidth + 8, y + cellHeight + 8);
          borderGradient.addColorStop(0, "#7c3aed"); // Purple
          borderGradient.addColorStop(1, "#ec4899"); // Pink
          ctx.fillStyle = borderGradient;
          ctx.fillRect(x - 8, y - 8, cellWidth + 16, cellHeight + 16);
          
          // Draw dark inner border
          ctx.fillStyle = "#1a0b2e";
          ctx.fillRect(x, y, cellWidth, cellHeight);
          
          // Calculate dimensions to fit image while maintaining aspect ratio
          const imgAspect = img.width / img.height;
          const cellAspect = cellWidth / cellHeight;
          
          let drawWidth, drawHeight, offsetX, offsetY;
          
          if (imgAspect > cellAspect) {
            // Image is wider - fit to width
            drawWidth = cellWidth;
            drawHeight = cellWidth / imgAspect;
            offsetX = 0;
            offsetY = (cellHeight - drawHeight) / 2;
          } else {
            // Image is taller - fit to height
            drawHeight = cellHeight;
            drawWidth = cellHeight * imgAspect;
            offsetX = (cellWidth - drawWidth) / 2;
            offsetY = 0;
          }
          
          ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);
          
          resolve();
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          reject(new Error(`Image ${index + 1} failed to load`));
        };
        
        img.src = dataUrl;
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

    // Footer - Purple gradient
    const footerGradient = ctx.createLinearGradient(0, canvas.height - footerHeight, 0, canvas.height);
    footerGradient.addColorStop(0, "#1a0b2e");
    footerGradient.addColorStop(0.5, "#5b21b6");
    footerGradient.addColorStop(1, "#7c3aed");
    ctx.fillStyle = footerGradient;
    ctx.fillRect(0, canvas.height - footerHeight, canvas.width, footerHeight);
    
    ctx.fillStyle = "white";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`⏱️ Completed in ${completionTime}`, canvas.width / 2, canvas.height - 55);
    ctx.font = "24px Arial";
    ctx.fillStyle = "#f472b6"; // Pink
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
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-300">
      <div className="flex items-center gap-2 mb-4">
        <ImageIcon className="w-6 h-6 text-purple-600" />
        <h2 className="text-xl font-bold text-gray-900">Your Team Collage</h2>
      </div>

      <p className="text-gray-700 mb-4">
        📸 You captured <strong>{photoCount}</strong> photo{photoCount !== 1 ? "s" : ""} during your adventure!
      </p>

      {!collageUrl ? (
        <button
          onClick={generateCollage}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {isGenerating ? "⏳ Creating Your Collage..." : "🎨 Generate Collage"}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-purple-900 to-pink-900 p-4 rounded-lg border-2 border-purple-500">
            <img src={collageUrl} alt="Team collage" className="w-full h-auto rounded" />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={downloadCollage}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-5 h-5" />
              Download
            </button>
            
            <button
              onClick={() => {
                downloadCollage();
                alert("📱 Collage downloaded! Share it on Instagram and tag us @RiddleCity with #RiddleCity");
              }}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Instagram className="w-5 h-5" />
              Share to Instagram
            </button>
          </div>

          <p className="text-sm text-center text-gray-600">
            💜 Tag <strong>@RiddleCity</strong> and use <strong>#RiddleCity</strong> when you post!
          </p>
        </div>
      )}

      {/* Hidden canvas for generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

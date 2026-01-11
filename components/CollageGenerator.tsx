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

    // Calculate grid layout (3 columns, however many rows needed)
    const cols = 3;
    const rows = Math.ceil(photoCount / cols);
    const photoWidth = 400;
    const photoHeight = 300;
    const padding = 20;
    const headerHeight = 150;
    const footerHeight = 80;

    canvas.width = cols * photoWidth + (cols + 1) * padding;
    canvas.height = rows * photoHeight + (rows + 1) * padding + headerHeight + footerHeight;

    // Background
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header
    ctx.fillStyle = "#7c3aed";
    ctx.fillRect(0, 0, canvas.width, headerHeight);
    
    ctx.fillStyle = "white";
    ctx.font = "bold 42px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🎉 " + adventureName, canvas.width / 2, 45);
    
    ctx.font = "28px Arial";
    ctx.fillText(teamName, canvas.width / 2, 85);
    
    ctx.font = "20px Arial";
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillText("Riddle City Adventure", canvas.width / 2, 115);

    // Load and draw photos
    const photoEntries = Object.entries(photos);
    const imagePromises = photoEntries.map(([riddleId, dataUrl], index) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const col = index % cols;
          const row = Math.floor(index / cols);
          const x = col * photoWidth + (col + 1) * padding;
          const y = row * photoHeight + (row + 1) * padding + headerHeight;

          // Draw photo with border
          ctx.fillStyle = "white";
          ctx.fillRect(x - 5, y - 5, photoWidth + 10, photoHeight + 10);
          
          ctx.drawImage(img, x, y, photoWidth, photoHeight);
          
          // Add riddle number
          ctx.fillStyle = "#7c3aed";
          ctx.font = "bold 20px Arial";
          ctx.textAlign = "left";
          ctx.fillText(`📍 Riddle ${index + 1}`, x + 10, y + photoHeight - 10);
          
          resolve();
        };
        img.src = dataUrl;
      });
    });

    await Promise.all(imagePromises);

    // Footer
    ctx.fillStyle = "#7c3aed";
    ctx.fillRect(0, canvas.height - footerHeight, canvas.width, footerHeight);
    
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`⏱️ ${completionTime}`, canvas.width / 2, canvas.height - 45);
    ctx.fillText("📸 Share with #RiddleCity", canvas.width / 2, canvas.height - 15);

    // Convert to downloadable URL
    const url = canvas.toDataURL("image/png");
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
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
      <div className="flex items-center gap-2 mb-4">
        <ImageIcon className="w-6 h-6 text-purple-600" />
        <h2 className="text-xl font-bold text-purple-900">Your Team Collage</h2>
      </div>

      <p className="text-gray-700 mb-4">
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
          <div className="bg-white p-4 rounded-lg border-2 border-purple-300">
            <img src={collageUrl} alt="Team collage" className="w-full h-auto rounded" />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={downloadCollage}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
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

"use client";

import { useState, useRef } from "react";
import { Camera, X, Check, ChevronDown, ChevronUp } from "lucide-react";

interface PhotoCaptureProps {
  riddleId: string;
  groupId: string;
  onPhotoTaken?: () => void;
}

export default function PhotoCapture({ riddleId, groupId, onPhotoTaken }: PhotoCaptureProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLandscapeTip, setShowLandscapeTip] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if photo already exists for this riddle
  const existingPhoto = typeof window !== "undefined" 
    ? localStorage.getItem(`riddlecity_photo_${groupId}_${riddleId}`)
    : null;

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const TARGET_WIDTH = 1280;
        const TARGET_HEIGHT = 720;
        const TARGET_ASPECT = TARGET_WIDTH / TARGET_HEIGHT; // 16:9 landscape
        
        let sourceWidth = img.width;
        let sourceHeight = img.height;
        const sourceAspect = sourceWidth / sourceHeight;
        
        // Always output landscape dimensions
        canvas.width = TARGET_WIDTH;
        canvas.height = TARGET_HEIGHT;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        
        // Calculate crop dimensions to fit landscape aspect ratio
        let cropWidth, cropHeight, cropX, cropY;
        
        if (sourceAspect > TARGET_ASPECT) {
          // Source is wider - crop sides
          cropHeight = sourceHeight;
          cropWidth = sourceHeight * TARGET_ASPECT;
          cropX = (sourceWidth - cropWidth) / 2;
          cropY = 0;
        } else {
          // Source is taller - crop top/bottom
          cropWidth = sourceWidth;
          cropHeight = sourceWidth / TARGET_ASPECT;
          cropX = 0;
          cropY = (sourceHeight - cropHeight) / 2;
        }
        
        // Draw cropped and scaled image
        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight, // source crop
          0, 0, TARGET_WIDTH, TARGET_HEIGHT // destination
        );
        
        const compressedPhoto = canvas.toDataURL("image/jpeg", 0.7);
        
        localStorage.setItem(`riddlecity_photo_${groupId}_${riddleId}`, compressedPhoto);
        setPhoto(compressedPhoto);
        setIsCollapsed(true); // Auto-collapse after photo taken
        
        if (onPhotoTaken) onPhotoTaken();
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const deletePhoto = () => {
    localStorage.removeItem(`riddlecity_photo_${groupId}_${riddleId}`);
    setPhoto(null);
  };

  const currentPhoto = photo || existingPhoto;
  const hasPhoto = !!currentPhoto;

  return (
    <>
      {/* Compact button at top-right */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`${
            hasPhoto 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-purple-600 hover:bg-purple-700'
          } text-white text-sm font-semibold py-2 px-3 rounded-lg flex items-center gap-2 transition-colors focus:outline-none shadow-lg`}
        >
          {hasPhoto ? (
            <>
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">Photo taken</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Take photo</span>
            </>
          )}
          {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>
        
        {!isCollapsed && (
          <div className="absolute top-full right-0 mt-2 bg-neutral-800 rounded-lg shadow-xl border border-neutral-700 p-3 min-w-[280px]">
            {showLandscapeTip && !hasPhoto && (
              <div className="mb-3 p-2 bg-blue-500/20 border border-blue-500/50 rounded text-xs text-blue-300 flex items-start gap-2">
                <span className="text-sm">�</span>
                <div className="flex-1">
                  <p className="font-medium">Photos auto-crop to landscape</p>
                  <p className="text-blue-200/80 mt-0.5">Portrait photos will be center-cropped to 16:9. Turn phone sideways for best results!</p>
                </div>
                <button 
                  onClick={() => setShowLandscapeTip(false)}
                  className="text-blue-300 hover:text-blue-100"
                >
                  ×
                </button>
              </div>
            )}
            
            <div className="flex gap-2 items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors focus:outline-none"
              >
                <Camera className="w-4 h-4" />
                {hasPhoto ? 'Retake' : 'Capture'}
              </button>
              
              {hasPhoto && (
                <>
                  <div className="relative">
                    <img src={currentPhoto} alt="Team photo" className="w-12 h-12 rounded object-cover" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePhoto();
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors focus:outline-none"
                    title="Delete photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input that triggers camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
      />
    </>
  );
}

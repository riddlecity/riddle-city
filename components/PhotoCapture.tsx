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
        // Compress image
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 720;
        
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        const compressedPhoto = canvas.toDataURL("image/jpeg", 0.7);
        
        localStorage.setItem(`riddlecity_photo_${groupId}_${riddleId}`, compressedPhoto);
        setPhoto(compressedPhoto);
        
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
      {/* Fixed button at top */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-neutral-900 border-b border-neutral-800 shadow-lg">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`w-full ${
            hasPhoto 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-purple-600 hover:bg-purple-700'
          } text-white text-sm font-semibold py-3 px-4 flex items-center justify-between transition-colors focus:outline-none`}
        >
          <div className="flex items-center gap-2">
            {hasPhoto ? (
              <>
                <Check className="w-4 h-4" />
                <span>Team photo taken</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>Take team photo</span>
              </>
            )}
          </div>
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
        
        {!isCollapsed && (
          <div className="bg-neutral-800 p-3">
            <div className="flex gap-3 items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors focus:outline-none"
              >
                <Camera className="w-4 h-4" />
                {hasPhoto ? 'Retake photo' : 'Capture photo'}
              </button>
              
              {hasPhoto && (
                <>
                  <div className="relative">
                    <img src={currentPhoto} alt="Team photo" className="w-16 h-16 rounded object-cover" />
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

"use client";

import { useState, useRef } from "react";
import { Camera, X, Check } from "lucide-react";

interface PhotoCaptureProps {
  riddleId: string;
  groupId: string;
  onPhotoTaken?: () => void;
}

export default function PhotoCapture({ riddleId, groupId, onPhotoTaken }: PhotoCaptureProps) {
  const [photo, setPhoto] = useState<string | null>(null);
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
      {/* Compact button - top right */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className={`fixed top-20 right-4 z-20 ${
          hasPhoto 
            ? 'bg-green-600 hover:bg-green-700' 
            : 'bg-purple-600 hover:bg-purple-700'
        } text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2`}
        style={{ minHeight: '40px' }}
      >
        {hasPhoto ? (
          <>
            <Check className="w-4 h-4" />
            <span>Photo saved</span>
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" />
            <span>Team photo</span>
          </>
        )}
      </button>

      {/* Hidden file input that triggers camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
      />

      {/* Preview modal when photo exists */}
      {hasPhoto && (
        <div className="fixed top-20 right-4 z-30 mt-12 bg-black/90 backdrop-blur-sm rounded-lg p-2 shadow-2xl">
          <div className="relative">
            <img src={currentPhoto} alt="Team photo" className="w-32 h-auto rounded" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                deletePhoto();
              }}
              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full transition-colors"
              title="Delete photo"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

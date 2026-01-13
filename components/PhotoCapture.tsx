"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Check } from "lucide-react";

interface PhotoCaptureProps {
  riddleId: string;
  groupId: string;
  onPhotoTaken?: () => void;
}

export default function PhotoCapture({ riddleId, groupId, onPhotoTaken }: PhotoCaptureProps) {
  // Initialize photo state from localStorage
  const [photo, setPhoto] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`riddlecity_photo_${groupId}_${riddleId}`);
    }
    return null;
  });
  const [showTipModal, setShowTipModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update photo state when riddleId changes (navigating between riddles)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedPhoto = localStorage.getItem(`riddlecity_photo_${groupId}_${riddleId}`);
      setPhoto(storedPhoto);
    }
  }, [riddleId, groupId]);

  // For backwards compatibility
  const existingPhoto = photo;

  // Track how many times user has seen the modal
  const getTipModalCount = () => {
    if (typeof window === "undefined") return 0;
    const count = localStorage.getItem(`riddlecity_tip_modal_count_${groupId}`);
    return count ? parseInt(count) : 0;
  };

  const incrementTipModalCount = () => {
    if (typeof window === "undefined") return;
    const count = getTipModalCount();
    localStorage.setItem(`riddlecity_tip_modal_count_${groupId}`, String(count + 1));
  };

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('handlePhotoCapture called, file:', file);
    if (!file) {
      console.log('No file selected');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('FileReader loaded');
      const img = new Image();
      img.onload = () => {
        console.log('Image loaded, processing...');
        const canvas = document.createElement("canvas");
        const TARGET_WIDTH = 1280;
        const TARGET_HEIGHT = 720;
        const TARGET_ASPECT = TARGET_WIDTH / TARGET_HEIGHT; // 16:9 landscape
        
        const sourceWidth = img.width;
        const sourceHeight = img.height;
        const sourceAspect = sourceWidth / sourceHeight;
        
        // Always output landscape dimensions
        canvas.width = TARGET_WIDTH;
        canvas.height = TARGET_HEIGHT;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          console.error('Failed to get canvas context');
          return;
        }
        
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
        console.log('Photo compressed, size:', compressedPhoto.length);
        
        const storageKey = `riddlecity_photo_${groupId}_${riddleId}`;
        localStorage.setItem(storageKey, compressedPhoto);
        console.log('Photo saved to localStorage with key:', storageKey);
        
        setPhoto(compressedPhoto);
        console.log('Photo state updated');
        
        if (onPhotoTaken) {
          onPhotoTaken();
          console.log('onPhotoTaken callback called');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  const currentPhoto = photo || existingPhoto;
  const hasPhoto = !!currentPhoto;

  const handleButtonClick = () => {
    console.log('Button clicked. hasPhoto:', hasPhoto, 'groupId:', groupId, 'riddleId:', riddleId);
    console.log('fileInputRef.current:', fileInputRef.current);
    
    if (hasPhoto) {
      // If photo exists, directly open camera to retake
      console.log('Photo exists, opening camera for retake');
      fileInputRef.current?.click();
    } else {
      // If no photo, check if we should show modal (first 2 times only)
      const modalCount = getTipModalCount();
      console.log('No photo yet, modal count:', modalCount);
      if (modalCount < 2) {
        console.log('Showing tip modal');
        setShowTipModal(true);
        incrementTipModalCount();
      } else {
        // After 2 times, directly open camera
        console.log('Opening camera directly (after 2 modals)');
        fileInputRef.current?.click();
      }
    }
  };

  const handleProceedToCamera = () => {
    console.log('Proceed to camera clicked');
    setShowTipModal(false);
    fileInputRef.current?.click();
  };

  return (
    <>
      {/* Tip Modal */}
      {showTipModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-xl p-6 max-w-sm w-full shadow-2xl border border-purple-500/30">
            <div className="text-center mb-4">
              <Camera className="w-12 h-12 text-purple-300 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-white mb-2">📸 Team Check-In</h3>
              <p className="text-purple-200 text-sm">Check in with a team selfie at each stop to build your adventure collage!</p>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 bg-white/10 rounded-lg p-3">
                <span className="text-2xl">🎨</span>
                <div>
                  <p className="text-white font-medium text-sm">Generate your collage at the end</p>
                  <p className="text-purple-200 text-xs">All team selfies combined into one Instagram-ready image</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 bg-white/10 rounded-lg p-3">
                <span className="text-2xl">🌄</span>
                <div>
                  <p className="text-white font-medium text-sm">Landscape works best</p>
                  <p className="text-purple-200 text-xs">Turn your phone sideways for better results</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 bg-white/10 rounded-lg p-3">
                <span className="text-2xl">🤳</span>
                <div>
                  <p className="text-white font-medium text-sm">Get everyone in the shot!</p>
                  <p className="text-purple-200 text-xs">Selfie mode recommended</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleProceedToCamera}
              className="w-full bg-white hover:bg-purple-50 text-purple-900 font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Open Camera
            </button>
            
            <button
              onClick={() => setShowTipModal(false)}
              className="w-full text-purple-300 hover:text-white text-sm mt-3 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Compact floating button - bottom right */}
      <div className="fixed bottom-20 right-4 z-40">
        {hasPhoto ? (
          <button
            onClick={handleButtonClick}
            className="inline-flex flex-row items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 active:scale-[0.98] text-white font-semibold rounded-full transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Check className="w-4 h-4" />
            <span className="text-sm">Checked in</span>
          </button>
        ) : (
          <button
            onClick={handleButtonClick}
            className="inline-flex flex-col items-center justify-center gap-1.5 w-[110px] h-[110px] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-[0.98] text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl animate-pulse p-2"
          >
            <Camera className="w-5 h-5" />
            <span className="text-xs text-center leading-tight">Check in with a team selfie</span>
            <span className="text-[9px] font-normal text-white/80 text-center leading-tight">For your adventure collage</span>
          </button>
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

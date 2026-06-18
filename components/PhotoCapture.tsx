"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Check } from "lucide-react";
import { savePhoto, loadPhoto } from "@/lib/photoStorage";

interface PhotoCaptureProps {
  riddleId: string;
  groupId: string;
  onPhotoTaken?: () => void;
}

export default function PhotoCapture({ riddleId, groupId, onPhotoTaken }: PhotoCaptureProps) {
  // Photo state – loaded asynchronously from IndexedDB (see useEffect below)
  const [photo, setPhoto] = useState<string | null>(null);
  const [showTipModal, setShowTipModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load photo from IndexedDB (with localStorage fallback) on mount and when riddleId changes
  useEffect(() => {
    let cancelled = false;
    loadPhoto(groupId, riddleId).then((stored) => {
      if (!cancelled) setPhoto(stored);
    });
    return () => { cancelled = true; };
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
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onerror = () => {
        // Silently handle error
      };
      
      reader.onload = (e) => {
        try {
          const img = new Image();
          img.onerror = () => {
            // Silently handle error
          };
          
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");

              // Preserve natural orientation — compress to max 1200px on longest side
              const MAX = 1200;
              const nw = img.width;
              const nh = img.height;
              let outW: number, outH: number;
              if (nw >= nh) {
                outW = Math.min(nw, MAX);
                outH = Math.round(outW / nw * nh);
              } else {
                outH = Math.min(nh, MAX);
                outW = Math.round(outH / nh * nw);
              }

              canvas.width  = outW;
              canvas.height = outH;

              const ctx = canvas.getContext("2d");
              if (!ctx) return;

              // Draw without any flip — the saved file is already correctly oriented
              // whether taken with the front or back camera
              ctx.drawImage(img, 0, 0, outW, outH);

              const compressedPhoto = canvas.toDataURL("image/jpeg", 0.75);
              // Save to IndexedDB (primary) and localStorage (fallback)
              savePhoto(groupId, riddleId, compressedPhoto);
              setPhoto(compressedPhoto);

              if (onPhotoTaken) {
                onPhotoTaken();
              }
            } catch (error) {
              // Silently handle error
            }
          };
          img.src = e.target?.result as string;
        } catch (error) {
          // Silently handle error
        }
      };
      reader.readAsDataURL(file);
      
      // Reset input value
      event.target.value = '';
      
    } catch (error) {
      // Silently handle error
    }
  };

  const currentPhoto = photo || existingPhoto;
  const hasPhoto = !!currentPhoto;

  const handleButtonClick = () => {
    if (hasPhoto) {
      fileInputRef.current?.click();
    } else {
      const modalCount = getTipModalCount();
      if (modalCount < 2) {
        setShowTipModal(true);
        incrementTipModalCount();
      } else {
        fileInputRef.current?.click();
      }
    }
  };

  const handleProceedToCamera = () => {
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
        capture="user"
        onChange={handlePhotoCapture}
        className="hidden"
      />
    </>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Check, FlipHorizontal, SwitchCamera } from "lucide-react";
import { savePhoto, loadPhoto } from "@/lib/photoStorage";

interface PhotoCaptureProps {
  riddleId: string;
  groupId: string;
  onPhotoTaken?: () => void;
}

// Re-draws the captured image onto a canvas at the given output size, with an
// optional horizontal flip. Used both for the initial (unflipped) preview and
// to regenerate the preview whenever the user taps "Flip".
const AUTO_FLIP_STORAGE_KEY = "riddlecity_selfie_auto_flip";

function getAutoFlipPreference(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTO_FLIP_STORAGE_KEY) === "true";
}

function renderPhotoDataUrl(img: HTMLImageElement, outW: number, outH: number, flip: boolean): string {
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  if (flip) {
    ctx.translate(outW, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, 0, 0, outW, outH);

  return canvas.toDataURL("image/jpeg", 0.75);
}

export default function PhotoCapture({ riddleId, groupId, onPhotoTaken }: PhotoCaptureProps) {
  // Photo state – loaded asynchronously from IndexedDB (see useEffect below)
  const [photo, setPhoto] = useState<string | null>(null);
  const [showTipModal, setShowTipModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview step shown right after capture, before saving — front cameras on
  // some phones/browsers save selfies mirrored and some don't, and there's no
  // reliable way to detect this from the file alone, so we let the user flip
  // it themselves if it looks backwards instead of guessing and getting it
  // wrong for some devices.
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const capturedImageRef = useRef<HTMLImageElement | null>(null);
  const captureDimsRef = useRef<{ outW: number; outH: number } | null>(null);

  // Defaults to the front/selfie camera since teams almost always check in
  // with a group selfie - "Switch Camera" in the preview flips this and
  // immediately retakes with the other camera.
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const pendingRetakeRef = useRef(false);

  useEffect(() => {
    if (pendingRetakeRef.current) {
      pendingRetakeRef.current = false;
      fileInputRef.current?.click();
    }
  }, [cameraFacing]);

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

              // Don't save yet — show a preview first so the user can flip it
              // themselves if their phone saved the selfie mirrored. Applies
              // their remembered preference automatically, since the same
              // phone/camera app mirrors (or doesn't) consistently every time.
              const autoFlip = getAutoFlipPreference();
              capturedImageRef.current = img;
              captureDimsRef.current = { outW, outH };
              setIsFlipped(autoFlip);
              setPreviewData(renderPhotoDataUrl(img, outW, outH, autoFlip));
              setShowPreview(true);
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

  const toggleFlip = () => {
    const next = !isFlipped;
    setIsFlipped(next);
    localStorage.setItem(AUTO_FLIP_STORAGE_KEY, String(next));
    if (capturedImageRef.current && captureDimsRef.current) {
      const { outW, outH } = captureDimsRef.current;
      setPreviewData(renderPhotoDataUrl(capturedImageRef.current, outW, outH, next));
    }
  };

  const confirmPhoto = () => {
    if (!previewData) return;
    savePhoto(groupId, riddleId, previewData);
    setPhoto(previewData);
    setShowPreview(false);
    capturedImageRef.current = null;
    captureDimsRef.current = null;

    if (onPhotoTaken) {
      onPhotoTaken();
    }
  };

  const retakePhoto = () => {
    setShowPreview(false);
    setPreviewData(null);
    capturedImageRef.current = null;
    captureDimsRef.current = null;
    fileInputRef.current?.click();
  };

  const switchCameraAndRetake = () => {
    setShowPreview(false);
    setPreviewData(null);
    capturedImageRef.current = null;
    captureDimsRef.current = null;
    pendingRetakeRef.current = true;
    setCameraFacing((prev) => (prev === "user" ? "environment" : "user"));
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

      {/* Photo Preview Modal — lets the user flip a mirrored selfie before saving */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/20 rounded-xl p-4 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-3 text-center">Check-in photo</h3>

            <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-neutral-800 mb-4">
              <img src={previewData} alt="Preview" className="w-full h-full object-cover" />
            </div>

            <button
              onClick={toggleFlip}
              className="w-full mb-3 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 border border-white/20"
            >
              <FlipHorizontal className="w-4 h-4" />
              {isFlipped ? "Unflip photo" : "Photo looks backwards? Flip it"}
            </button>

            <button
              onClick={switchCameraAndRetake}
              className="w-full mb-3 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 border border-white/20"
            >
              <SwitchCamera className="w-4 h-4" />
              {cameraFacing === "user" ? "Wrong camera? Switch & retake" : "Switch back to selfie camera"}
            </button>

            <div className="flex gap-3">
              <button
                onClick={retakePhoto}
                className="flex-1 min-h-[48px] bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-all duration-200"
              >
                Retake
              </button>
              <button
                onClick={confirmPhoto}
                className="flex-1 min-h-[48px] bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200"
              >
                Use this photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact floating button - bottom right */}
      <div className="fixed bottom-12 right-4 z-40">
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
        capture={cameraFacing}
        onChange={handlePhotoCapture}
        className="hidden"
      />
    </>
  );
}
